<script setup lang="ts">
import { toast } from 'vue-sonner'
import { paymentStatusStyle } from '@/utils'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Payments',
})

type PaymentStatus = 'success' | 'failed' | 'refunded' | 'pending'

interface AdminPayment {
  id: string
  order_id?: string | null
  amount: number | null
  status: PaymentStatus
  provider?: string | null
  created_at: string
}

const status = ref<PaymentStatus | 'all'>('all')
const sortBy = ref<'created_at' | 'amount'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  status: status.value === 'all' ? undefined : status.value,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-payments',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('orders').select('id,total,payment_status,payment_provider,created_at', { count: 'exact' })
    if (params.value.status === 'success') q = q.eq('payment_status', 'paid')
    else if (params.value.status === 'failed') q = q.eq('payment_status', 'failed')
    else if (params.value.status === 'refunded') q = q.eq('payment_status', 'refunded')
    // provider filter removed
    const sortField = params.value.sortBy === 'amount' ? 'total' : 'created_at'
    q = q.order(sortField, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    console.info('admin:payments:raw', data)
    const rows = ((data || []) as unknown as Array<{ id: string; total: number | null; payment_status: string | null; payment_provider?: string | null; created_at: string | Date }>)
      .map((r) => {
        const ps = (r.payment_status || '').toLowerCase()
        const status: PaymentStatus = ps === 'paid' ? 'success' : ps === 'failed' ? 'failed' : 'pending'
        return {
          id: String(r.id),
          order_id: String(r.id),
          amount: r.total ?? 0,
          status,
          provider: r.payment_provider || 'paytabs',
          created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
        } as AdminPayment
      })
    console.info('admin:payments:rows', rows)
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
    .channel('public:orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))
const rows = computed(() => data.value?.rows || [])

// refund actions removed

const formatCurrency = (v: number | null | undefined) => formatOMR(Number(v || 0))
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
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="6"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="6">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="6">
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
                <Badge :variant="paymentStatusStyle(p.status).variant">{{ p.status }}</Badge>
              </TableCell>
              <TableCell>{{ p.provider || '—' }}</TableCell>
              
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

    
  </div>
</template>
