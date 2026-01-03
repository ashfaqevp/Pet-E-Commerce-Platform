<script setup lang="ts">
import { toast } from 'vue-sonner'
import { formatOMR, canOrderTransition } from '@/utils'
import AdminDashboardStatCard from '@/components/admin/AdminDashboardStatCard.vue'
import { DollarSign, CreditCard, Clock } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Orders',
})

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed' | 'confirmed' | 'awaiting_payment'
type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'
type PaymentMethod = 'online' | 'cod'

interface AdminOrder {
  id: string
  user_id?: string | null
  user_email?: string | null
  total: number | null
  status: OrderStatus
  created_at: string
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null
  payment_provider?: string | null
  tran_ref?: string | null
}

const status = ref<OrderStatus | 'all'>('all')
const payment = ref<PaymentStatus | 'all'>('all')
const sortBy = ref<'created_at' | 'total'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  status: status.value === 'all' ? undefined : status.value,
  payment: payment.value === 'all' ? undefined : payment.value,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-orders',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('orders').select('id,total,status,created_at,user_id,payment_status,payment_method,payment_provider,tran_ref', { count: 'exact' })
    if (params.value.status) q = q.eq('status', params.value.status)
    if (params.value.payment) q = q.eq('payment_status', params.value.payment)
    q = q.order(params.value.sortBy, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rowsRaw = ((data || []) as unknown as Array<{ id: string; total: number | null; status: string | null; created_at: string | Date; user_id?: string | null; payment_status: string | null; payment_method?: string | null; payment_provider?: string | null; tran_ref?: string | null }>)
    const rows = rowsRaw.map((r) => ({
      id: String(r.id),
      total: r.total ?? 0,
      status: (r.status || 'pending') as OrderStatus,
      created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
      user_id: r.user_id || null,
      user_email: null,
      payment_status: ((r.payment_status || 'pending') as PaymentStatus),
      payment_method: ((r.payment_method || 'online') as PaymentMethod),
      payment_provider: r.payment_provider || null,
      tran_ref: r.tran_ref || null,
    })) as AdminOrder[]
    const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean))) as string[]
    if (ids.length) {
      let users: unknown[] | null = null
      const viewRes = await supabase.from('user_profiles_view').select('id,email').in('id', ids)
      if (!viewRes.error) users = (viewRes.data as unknown[] | null) || null
      else {
        const tblRes = await supabase.from('user_profiles').select('id,email').in('id', ids)
        users = (tblRes.data as unknown[] | null) || null
      }
      const map = new Map<string, string | null>((users || []).map(u => [String((u as { id: string }).id), ((u as { email?: string | null }).email || null)]))
      for (const r of rows) {
        r.user_email = r.user_id ? (map.get(String(r.user_id)) || null) : null
      }
    }
    return { rows, count: count ?? rows.length }
  },
  { server: true }
)

const { data: metrics, pending: metricsPending, error: metricsError, refresh: refreshMetrics } = await useLazyAsyncData(
  'admin-orders-metrics',
  async () => {
    const supabase = useSupabaseClient()
    const paidCountReq = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'paid')
    const pendingCountReq = supabase.from('orders').select('*', { count: 'exact', head: true }).in('payment_status', ['pending', 'unpaid'])
    const paidTotalsReq = supabase.from('orders').select('total').eq('payment_status', 'paid')
    const [paidCountRes, pendingCountRes, paidTotalsRes] = await Promise.all([paidCountReq, pendingCountReq, paidTotalsReq])
    if (paidCountRes.error) throw paidCountRes.error
    if (pendingCountRes.error) throw pendingCountRes.error
    if (paidTotalsRes.error) throw paidTotalsRes.error
    const totals = (paidTotalsRes.data as unknown as Array<{ total: number | null }> | null) || []
    const revenue = totals.reduce((sum, o) => sum + Number(o.total || 0), 0)
    return {
      paidCount: paidCountRes.count || 0,
      pendingCount: pendingCountRes.count || 0,
      revenue,
    }
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
      refreshMetrics()
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

const statusBadgeClass = (s: OrderStatus) => {
  const v = (s || 'pending').toLowerCase()
  if (v === 'completed' || v === 'delivered' || v === 'confirmed') return 'text-green-700 border-green-300'
  if (v === 'cancelled' || v === 'returned') return 'text-red-700 border-red-300'
  if (v === 'awaiting_payment') return 'text-orange-700 border-orange-300'
  return 'text-slate-700 border-slate-300'
}

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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AdminDashboardStatCard :label="'Paid Orders'" :value="metrics?.paidCount || 0" :icon="CreditCard" :loading="metricsPending" accent="teal" />
      <AdminDashboardStatCard :label="'Revenue'" :value="formatCurrency(metrics?.revenue || 0)" :icon="DollarSign" :loading="metricsPending" accent="orange" currency />
      <AdminDashboardStatCard :label="'Pending Payments'" :value="metrics?.pendingCount || 0" :icon="Clock" :loading="metricsPending" accent="slate" />
    </div>
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex flex-1 flex-wrap items-center gap-2 gap-y-3">
        <Select v-model="status">
          <SelectTrigger class="w-44 min-w-[160px] shrink-0 bg-white">
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground">Status:</span>
              <SelectValue placeholder="All" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="awaiting_payment">Awaiting</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="payment">
          <SelectTrigger class="w-44 min-w-[160px] shrink-0 bg-white">
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground">Payment:</span>
              <SelectValue placeholder="All" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" @click="sortBy = 'created_at'; ascending = false">Newest</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'total'; ascending = false">Amount</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <Card class="flex flex-col mx-auto h-[calc(100vh-280px)] md:h-[calc(100vh-260px)]">
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Orders</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent class="p-0 flex-1 overflow-hidden min-h-0">
    <div class="h-full overflow-x-auto">
      <div class="h-full overflow-y-auto max-h-[65vh] px-2 sm:px-3">
    <Table>
      <TableHeader>
        <TableRow class="sticky top-0 bg-white z-10">
          <TableHead>Order</TableHead>
          <TableHead>User</TableHead>
          <TableHead class="">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Transaction Ref</TableHead>
          <TableHead>Method</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="8"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="8">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="8">
                <TableEmpty>No orders found</TableEmpty>
              </TableCell>
            </TableRow>
        <TableRow v-else v-for="o in rows" :key="o.id">
          <TableCell>
            <div class="space-y-0.5">
              <div class="text-foreground font-medium">#{{ o.id.slice(0,8) }}</div>
              <div class="text-xs text-muted-foreground">{{ formatDate(o.created_at) }}</div>
            </div>
          </TableCell>
          <TableCell>{{ o.user_email || '—' }}</TableCell>
          <TableCell class="">{{ formatCurrency(o.total) }}</TableCell>
          <TableCell>
            <Badge variant="outline" :class="[statusBadgeClass(o.status), 'capitalize']">{{ o.status === 'awaiting_payment' ? 'Awaiting' : o.status }}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline" :class="[paymentBadgeClass(o.payment_status), 'capitalize']">{{ o.payment_status }}</Badge>
          </TableCell>
          <TableCell class="font-mono text-xs">{{ o.tran_ref || '—' }}</TableCell>
          <TableCell>
            <Badge variant="outline">{{ o.payment_method === 'cod' ? 'COD' : 'Online' }}</Badge>
          </TableCell>
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-2">
              <Button variant="default" size="sm" @click="navigateTo(`/admin/orders/${o.id}`)">
                <Icon name="lucide:eye" class="h-4 w-4 mr-2" /> View
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="outline" size="icon"><Icon name="lucide:ellipsis" class="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                  <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'processing', o.payment_status, o.payment_method).allowed" @click="navigateTo(`/admin/orders/${o.id}?action=status&target=processing`)">Processing</DropdownMenuItem>
                  <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'shipped', o.payment_status, o.payment_method).allowed" @click="navigateTo(`/admin/orders/${o.id}?action=status&target=shipped`)">Shipped</DropdownMenuItem>
                  <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'delivered', o.payment_status, o.payment_method).allowed" @click="navigateTo(`/admin/orders/${o.id}?action=status&target=delivered`)">Delivered</DropdownMenuItem>
                  <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'completed', o.payment_status, o.payment_method).allowed" @click="navigateTo(`/admin/orders/${o.id}?action=status&target=completed`)">Completed</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Update Payment</DropdownMenuLabel>
                  <DropdownMenuItem as="button" :disabled="o.payment_status === 'paid'" @click="navigateTo(`/admin/orders/${o.id}?action=payment&target=unpaid`)">Unpaid</DropdownMenuItem>
                  <DropdownMenuItem as="button" :disabled="o.payment_status === 'paid'" @click="navigateTo(`/admin/orders/${o.id}?action=payment&target=pending`)">Pending</DropdownMenuItem>
                  <DropdownMenuItem as="button" :disabled="o.payment_status === 'paid' || (o.payment_method === 'cod' && o.status !== 'delivered')" @click="navigateTo(`/admin/orders/${o.id}?action=payment&target=paid`)">Paid</DropdownMenuItem>
                  <DropdownMenuItem as="button" :disabled="o.payment_status === 'paid'" @click="navigateTo(`/admin/orders/${o.id}?action=payment&target=failed`)">Failed</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem as="button" @click="navigateTo(`/admin/orders/${o.id}?edit=ref`)">Edit Reference</DropdownMenuItem>
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
