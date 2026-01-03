<script setup lang="ts">
import { toast } from 'vue-sonner'
import { formatOMR } from '@/utils'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Payments',
})

type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'
type PaymentMethod = 'online' | 'cod'

interface AdminPayment {
  id: string
  order_id?: string | null
  amount: number | null
  status: PaymentStatus
  provider?: string | null
  created_at: string
  tran_ref?: string | null
  payment_method?: PaymentMethod | null
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
    let q = supabase.from('orders').select('id,total,payment_status,payment_provider,created_at,tran_ref,payment_method', { count: 'exact' })
    if (params.value.status === 'paid') q = q.eq('payment_status', 'paid')
    else if (params.value.status === 'failed') q = q.eq('payment_status', 'failed')
    else if (params.value.status === 'pending') q = q.eq('payment_status', 'pending')
    else if (params.value.status === 'unpaid') q = q.eq('payment_status', 'unpaid')
    // provider filter removed
    const sortField = params.value.sortBy === 'amount' ? 'total' : 'created_at'
    q = q.order(sortField, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rows = ((data || []) as unknown as Array<{ id: string; total: number | null; payment_status: string | null; payment_provider?: string | null; created_at: string | Date; tran_ref?: string | null; payment_method?: string | null }>)
      .map((r) => ({
        id: String(r.id),
        order_id: String(r.id),
        amount: r.total ?? 0,
        status: ((r.payment_status || 'pending') as PaymentStatus),
        provider: r.payment_provider || null,
        created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
        tran_ref: r.tran_ref || null,
        payment_method: ((r.payment_method || 'online') as PaymentMethod),
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

const formatCurrency = (v: number | null | undefined) => formatOMR(Number(v || 0))
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))

const paymentBadgeClass = (s: PaymentStatus) => {
  const v = (s || 'pending').toLowerCase()
  if (v === 'paid') return 'text-green-700 border-green-300'
  if (v === 'failed') return 'text-red-700 border-red-300'
  if (v === 'pending' || v === 'unpaid') return 'text-orange-700 border-orange-300'
  return 'text-slate-700 border-slate-300'
}
</script>

<template>
  <div class="space-y-4 overflow-hidden">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Select v-model="status">
          <SelectTrigger class="w-44 min-w-[160px] shrink-0 bg-white">
            <SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
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

    <Card class="flex flex-col mx-auto h-[calc(100vh-280px)] md:h-[calc(100vh-260px)]">
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Payments</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent class="p-0 flex-1 overflow-hidden min-h-0">
        <div class="h-full overflow-x-auto">
          <div class="h-full overflow-y-auto max-h-[65vh] px-2 sm:px-3">
            <Table>
              <TableHeader>
                <TableRow class="sticky top-0 bg-white z-10">
                  <TableHead>Order</TableHead>
                  <TableHead class="">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Transaction Ref</TableHead>
                  <TableHead>Method</TableHead>
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
                  <TableCell>
                    <div class="space-y-0.5">
                      <NuxtLink :to="p.order_id ? `/admin/orders/${p.order_id}` : '#'" class="text-foreground font-medium underline">#{{ (p.order_id || '').slice(0,8) }}</NuxtLink>
                      <div class="text-xs text-muted-foreground">{{ formatDate(p.created_at) }}</div>
                    </div>
                  </TableCell>
                  <TableCell class="">{{ formatCurrency(p.amount) }}</TableCell>
                  <TableCell>
                    <Badge variant="outline" :class="[paymentBadgeClass(p.status), 'capitalize']">{{ p.status }}</Badge>
                  </TableCell>
                  <TableCell class="font-mono text-xs">{{ p.tran_ref || '—' }}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{{ p.payment_method === 'cod' ? 'COD' : 'Online' }}</Badge>
                  </TableCell>
                  <TableCell>{{ p.provider || '—' }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button variant="default" size="sm" @click="navigateTo(`/admin/orders/${p.order_id}`)">
                        <Icon name="lucide:eye" class="h-4 w-4 mr-2" /> View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <Button variant="outline" size="icon"><Icon name="lucide:ellipsis" class="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Update Payment</DropdownMenuLabel>
                          <DropdownMenuItem as="button" :disabled="p.status === 'paid'" @click="navigateTo(`/admin/orders/${p.order_id}?action=payment&target=unpaid`)">Unpaid</DropdownMenuItem>
                          <DropdownMenuItem as="button" :disabled="p.status === 'paid'" @click="navigateTo(`/admin/orders/${p.order_id}?action=payment&target=pending`)">Pending</DropdownMenuItem>
                          <DropdownMenuItem as="button" :disabled="p.status === 'paid'" @click="navigateTo(`/admin/orders/${p.order_id}?action=payment&target=paid`)">Paid</DropdownMenuItem>
                          <DropdownMenuItem as="button" :disabled="p.status === 'paid'" @click="navigateTo(`/admin/orders/${p.order_id}?action=payment&target=failed`)">Failed</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
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
