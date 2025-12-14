<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Payments',
})

type PaymentStatus = 'success' | 'failed' | 'refunded'

interface AdminPayment {
  id: string
  order_id?: string | null
  amount: number | null
  status: PaymentStatus
  provider?: string | null
  created_at: string
}

const status = ref<PaymentStatus | 'all'>('all')
const provider = ref<string | 'all'>('all')
const sortBy = ref<'created_at' | 'amount'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  status: status.value === 'all' ? undefined : status.value,
  provider: provider.value === 'all' ? undefined : provider.value,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-payments',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('payments').select('id,order_id,amount,status,provider,created_at', { count: 'exact' })
    if (params.value.status) q = q.eq('status', params.value.status)
    if (params.value.provider) q = q.eq('provider', params.value.provider)
    q = q.order(params.value.sortBy, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rows = ((data || []) as unknown as Array<{ id: string; order_id?: string | null; amount: number | null; status: string | null; provider?: string | null; created_at: string | Date }>)
      .map((r) => ({
        id: String(r.id),
        order_id: r.order_id || null,
        amount: r.amount ?? 0,
        status: (r.status || 'success') as PaymentStatus,
        provider: r.provider || null,
        created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
      })) as AdminPayment[]
    return { rows, count: count ?? rows.length }
  },
  { server: true }
)

watch(params, () => {
  refresh()
})

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:payments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))
const rows = computed(() => data.value?.rows || [])

const refundId = ref<string | null>(null)

const requestRefund = (id: string) => {
  refundId.value = id
}

const confirmRefund = async () => {
  if (!refundId.value) return
  const supabase = useSupabaseClient()
  const { error: e } = await supabase.from('payments').update({ status: 'refunded' } as unknown as never).eq('id', refundId.value)
  if (e) {
    toast.error(e.message)
  } else {
    toast.success('Payment refunded')
  }
  refundId.value = null
  refresh()
}

const formatCurrency = (v: number | null | undefined) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(v || 0))
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Select v-model="status">
          <SelectTrigger class="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="provider">
          <SelectTrigger class="w-44"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="razorpay">Razorpay</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" @click="sortBy = 'created_at'; ascending = false">Newest</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'amount'; ascending = false">Amount</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Payments</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead class="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="7"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="7">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="7">
                <TableEmpty>No payments found</TableEmpty>
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="p in rows" :key="p.id">
              <TableCell>#{{ p.id }}</TableCell>
              <TableCell>
                <NuxtLink :to="p.order_id ? `/admin/orders/${p.order_id}` : '#'" class="text-foreground underline">{{ p.order_id || '—' }}</NuxtLink>
              </TableCell>
              <TableCell>{{ formatDate(p.created_at) }}</TableCell>
              <TableCell class="text-right">{{ formatCurrency(p.amount) }}</TableCell>
              <TableCell>
                <Badge :variant="p.status === 'success' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'">{{ p.status }}</Badge>
              </TableCell>
              <TableCell>{{ p.provider || '—' }}</TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon">
                      <Icon name="lucide:ellipsis" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem as="button" :disabled="p.status === 'refunded'" @click="requestRefund(p.id)">
                      <Icon name="lucide:rotate-ccw" class="h-4 w-4 mr-2" /> Refund
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Button variant="outline" :disabled="page === 1" @click="page = Math.max(1, page - 1)">Prev</Button>
          <Button variant="outline" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">Next</Button>
        </div>
        <div class="text-sm">Page {{ page }} of {{ totalPages }}</div>
      </CardFooter>
    </Card>

    <AlertDialog :open="!!refundId" @update:open="refundId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund payment?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-secondary text-white" @click="confirmRefund">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
