<script setup lang="ts">
import { DollarSign, ShoppingBag, Users, Package, CreditCard } from 'lucide-vue-next'
import { formatOMR } from '@/utils'
import AdminDashboardStatCard from '@/components/admin/AdminDashboardStatCard.vue'
import AdminRevenueChart from '@/components/admin/AdminRevenueChart.vue'
import AdminOrdersStatusChart from '@/components/admin/AdminOrdersStatusChart.vue'
import AdminRecentOrdersTable from '@/components/admin/AdminRecentOrdersTable.vue'

definePageMeta({ layout: 'admin', middleware: 'admin', title: 'Dashboard' })

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed' | 'awaiting_payment' | 'confirmed'
type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'

interface RecentOrderRow {
  id: string
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
  created_at: string
}

interface Metrics {
  totalRevenue: number
  totalOrders: number
  paidOrders: number
  totalCustomers: number
  totalProducts: number
  pendingOrders: number
  codOrders: number
  failedOrders: number
}

const days = ref<'7' | '14' | '30'>('30')
const route = useRoute()

const { data: metrics, pending: metricsPending, error: metricsError, refresh: refreshMetrics } = await useLazyAsyncData(
  'admin-metrics',
  async () => {
    const supabase = useSupabaseClient()
    const productsCountReq = supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true)
    const ordersCountReq = supabase.from('orders').select('id', { count: 'exact' })
    const customersCountReq = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer')
    const paidOrdersCountReq = supabase.from('orders').select('id', { count: 'exact' }).eq('payment_status', 'paid')
    const paidTotalsReq = supabase.from('orders').select('total,created_at').eq('payment_status', 'paid')
    const pendingOrdersCountReq = supabase.from('orders').select('id', { count: 'exact' }).eq('payment_status', 'pending')
    const codOrdersCountReq = supabase.from('orders').select('id', { count: 'exact' }).eq('payment_method', 'cod')
    const failedOrdersCountReq = supabase.from('orders').select('id', { count: 'exact' }).eq('payment_status', 'failed')

    const [productsCountRes, ordersCountRes, customersCountRes, paidOrdersCountRes, paidTotalsRes, pendingOrdersCountRes, codOrdersCountRes, failedOrdersCountRes] = await Promise.all([
      productsCountReq,
      ordersCountReq,
      customersCountReq,
      paidOrdersCountReq,
      paidTotalsReq,
      pendingOrdersCountReq,
      codOrdersCountReq,
      failedOrdersCountReq,
    ])

    if (productsCountRes.error) throw productsCountRes.error
    if (ordersCountRes.error) throw ordersCountRes.error
    if (customersCountRes.error) throw customersCountRes.error
    if (paidOrdersCountRes.error) throw paidOrdersCountRes.error
    if (paidTotalsRes.error) throw paidTotalsRes.error
    if (pendingOrdersCountRes.error) throw pendingOrdersCountRes.error
    if (codOrdersCountRes.error) throw codOrdersCountRes.error
    if (failedOrdersCountRes.error) throw failedOrdersCountRes.error

    const paidTotals = ((paidTotalsRes.data ?? []) as Array<{ total: number | null }>).
      map((o) => Number(o.total || 0))
    const totalRevenue = paidTotals.reduce((sum, v) => sum + v, 0)

    return {
      totalRevenue,
      totalOrders: ordersCountRes.count || 0,
      paidOrders: paidOrdersCountRes.count || 0,
      totalCustomers: customersCountRes.count || 0,
      totalProducts: productsCountRes.count || 0,
      pendingOrders: pendingOrdersCountRes.count || 0,
      codOrders: codOrdersCountRes.count || 0,
      failedOrders: failedOrdersCountRes.count || 0,
    } as Metrics
  },
  { server: true }
)

const { data: revenueSeries, pending: revenuePending, error: revenueError, refresh: refreshRevenue } = await useLazyAsyncData(
  'admin-revenue-series',
  async () => {
    const supabase = useSupabaseClient()
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - Number(days.value))
    const { data, error } = await supabase
      .from('orders')
      .select('total,created_at')
      .eq('payment_status', 'paid')
      .gte('created_at', start.toISOString())
    if (error) throw error
    const rows = ((data ?? []) as Array<{ total: number | null; created_at: string | Date }>)
    const map = new Map<string, number>()
    for (let i = 0; i < Number(days.value); i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const k = d.toISOString().slice(0, 10)
      map.set(k, 0)
    }
    for (const r of rows) {
      const d = typeof r.created_at === 'string' ? new Date(r.created_at) : new Date(r.created_at)
      const k = d.toISOString().slice(0, 10)
      if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(r.total || 0))
    }
    const labels = Array.from(map.keys()).map((k) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(k)))
    const values = Array.from(map.values())
    return { labels, values }
  },
  { server: true, watch: [days] }
)

const { data: paymentDist, pending: distPending, error: distError, refresh: refreshDist } = await useLazyAsyncData(
  'admin-payment-dist',
  async () => {
    const supabase = useSupabaseClient()
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - Number(days.value))
    const { data, error } = await supabase
      .from('orders')
      .select('payment_status,created_at')
      .gte('created_at', start.toISOString())
    if (error) throw error
    const rows = ((data ?? []) as Array<{ payment_status: string | null; created_at: string | Date }>)
    const counts: Record<'paid' | 'pending' | 'unpaid' | 'failed', number> = { paid: 0, pending: 0, unpaid: 0, failed: 0 }
    for (const r of rows) {
      const s = (r.payment_status || 'pending').toLowerCase() as 'paid' | 'pending' | 'unpaid' | 'failed'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  },
  { server: true, watch: [days] }
)

const { data: recentOrders, pending: ordersPending, error: ordersError, refresh: refreshOrders } = await useLazyAsyncData(
  'admin-recent-orders',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('orders')
      .select('id,total,status,payment_status,created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    if (error) throw error
    const rows = ((data ?? []) as Array<{ id: string; total: number | null; status: string | null; payment_status: string | null; created_at: string | Date }>)
    return rows.map((r) => ({
      id: String(r.id),
      total: Number(r.total || 0),
      status: (r.status || 'pending') as OrderStatus,
      payment_status: (r.payment_status || 'pending') as PaymentStatus,
      created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
    })) as RecentOrderRow[]
  },
  { server: true }
)

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      refreshMetrics()
      refreshRevenue()
      refreshDist()
      refreshOrders()
    })
    .subscribe()
  onUnmounted(() => { supabase.removeChannel(channel) })
})

const formatCurrency = (v: number) => formatOMR(v)
const combinedPendingCod = computed(() => (metrics.value?.pendingOrders || 0) + (metrics.value?.codOrders || 0))
const hasRevenue = computed(() => (revenueSeries.value?.values || []).some(v => v > 0))
const hasPaymentDist = computed(() => {
  const c = paymentDist.value || { paid: 0, pending: 0, unpaid: 0, failed: 0 }
  return Object.values(c).some(v => v > 0)
})
const hasRecentOrders = computed(() => (recentOrders.value?.length || 0) > 0)


watch(days, () => {
  refreshRevenue()
  refreshDist()
})

</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <AdminDashboardStatCard :icon="DollarSign" label="Total Revenue" :value="formatCurrency(metrics?.totalRevenue || 0)" accent="teal" :loading="metricsPending" currency /> 
      <AdminDashboardStatCard :icon="ShoppingBag" label="Total Orders" :value="metrics?.totalOrders || 0" accent="blue" :loading="metricsPending" /> 
      <AdminDashboardStatCard :icon="CreditCard" label="Paid Orders" :value="metrics?.paidOrders || 0" accent="green" :loading="metricsPending && !metrics" />
      <AdminDashboardStatCard :icon="Users" label="Total Customers" :value="metrics?.totalCustomers || 0" accent="blue" :loading="metricsPending && !metrics" />
      <AdminDashboardStatCard :icon="Package" label="Active Products" :value="metrics?.totalProducts || 0" accent="orange" :loading="metricsPending && !metrics" />
    </div>

    <Alert v-if="metricsError" variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ metricsError.message }}</AlertDescription>
    </Alert>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2 rounded-md bg-white">
        <CardHeader class="flex items-center justify-between">
          <CardTitle >Revenue Over Time</CardTitle>
          <div class="flex items-center gap-3">
          <Select v-model="days">
            <SelectTrigger class="w-32">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="revenuePending" class="h-64 w-full" />
          <div v-else-if="!hasRevenue" class="h-64 grid place-items-center text-sm text-muted-foreground">No paid revenue in selected range</div>
          <AdminRevenueChart v-else :labels="revenueSeries?.labels || []" :values="revenueSeries?.values || []" />
          <Alert v-if="revenueError" variant="destructive" class="mt-3">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ revenueError.message }}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card class="rounded-md bg-white">
        <CardHeader>
          <CardTitle >Orders by Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="distPending" class="h-64 w-full" />
          <div v-else-if="!hasPaymentDist" class="h-64 grid place-items-center text-sm text-muted-foreground">No orders in selected range</div>
          <AdminOrdersStatusChart v-else :counts="paymentDist || { paid: 0, pending: 0, unpaid: 0, failed: 0 }" />
          <Alert v-if="distError" variant="destructive" class="mt-3">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ distError.message }}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2 rounded-md bg-white">
        <CardHeader class="flex items-center justify-between">
          <CardTitle >Recent Orders</CardTitle>
          <Badge variant="outline">Last 5</Badge>
        </CardHeader>
        <CardContent>
          <AdminRecentOrdersTable :rows="recentOrders || []" :pending="ordersPending" :error="ordersError?.message" />
          <div v-if="!ordersPending && !ordersError && !hasRecentOrders" class="text-sm text-muted-foreground py-10 text-center">No recent orders</div>
        </CardContent>
      </Card>

      <Card class="rounded-md bg-white">
        <CardHeader>
          <CardTitle >Quick Insights</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CreditCard class="h-4 w-4" />
              </span>
              <span>Paid Orders</span>
            </div>
            <span class="font-medium">{{ metrics?.paidOrders || 0 }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <ShoppingBag class="h-4 w-4" />
              </span>
              <span>Pending/COD Orders</span>
            </div>
            <span class="font-medium">{{ combinedPendingCod }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <ShoppingBag class="h-4 w-4" />
              </span>
              <span>COD Orders</span>
            </div>
            <span class="font-medium">{{ metrics?.codOrders || 0 }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                <ShoppingBag class="h-4 w-4" />
              </span>
              <span>Failed Orders</span>
            </div>
            <span class="font-medium">{{ metrics?.failedOrders || 0 }}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
  
</template>
