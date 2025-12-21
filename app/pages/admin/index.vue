<script setup lang="ts">
import { orderStatusStyle, paymentStatusStyle } from '@/utils'
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Admin Dashboard',
})

type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed'
type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'
type ExtendedOrderStatus = OrderStatus | 'awaiting_payment' | 'confirmed'

interface OrderRow {
  id: string
  total: number
  status: ExtendedOrderStatus
  payment_status: PaymentStatus
  created_at: string
  user_id: string
}

const { data: metrics, pending: metricsPending, error: metricsError, refresh: refreshMetrics } = await useLazyAsyncData(
  'admin-metrics',
  async () => {
    const supabase = useSupabaseClient()

    const productsCountReq = supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const ordersCountReq = supabase.from('orders').select('*', { count: 'exact', head: true })
    const customersCountReq = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
    const paidOrdersCountReq = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'paid')
    const paidTotalsReq = supabase.from('orders').select('total').eq('payment_status', 'paid')

    const [productsCountRes, ordersCountRes, customersCountRes, paidOrdersCountRes, paidTotalsRes] = await Promise.all([
      productsCountReq,
      ordersCountReq,
      customersCountReq,
      paidOrdersCountReq,
      paidTotalsReq,
    ])

    if (productsCountRes.error) throw productsCountRes.error
    if (ordersCountRes.error) throw ordersCountRes.error
    if (customersCountRes.error) throw customersCountRes.error
    if (paidOrdersCountRes.error) throw paidOrdersCountRes.error
    if (paidTotalsRes.error) throw paidTotalsRes.error

    const paidTotals = (paidTotalsRes.data as unknown as Array<{ total: number | null }> | null) || []
    const totalRevenue = paidTotals.reduce((sum, o) => sum + Number(o.total || 0), 0)

    return {
      totalRevenue,
      totalOrders: ordersCountRes.count || 0,
      paidOrders: paidOrdersCountRes.count || 0,
      totalCustomers: customersCountRes.count || 0,
      totalProducts: productsCountRes.count || 0,
    }
  },
  { server: true }
)

const { data: recentOrders, pending: ordersPending, error: ordersError, refresh: refreshOrders } = await useLazyAsyncData(
  'admin-recent-orders',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('orders')
      .select('id,created_at,total,status,payment_status,user_id')
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) throw error
    const rows = (data as unknown as Array<{
      id: string
      total: number | null
      status: string | null
      payment_status: string | null
      created_at: string | Date
      user_id: string | null
    }> | null) || []
    return rows.map((row) => ({
      id: String(row.id),
      total: Number(row.total || 0),
      status: (row.status || 'pending') as ExtendedOrderStatus,
      payment_status: (row.payment_status || 'pending') as PaymentStatus,
      created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
      user_id: String(row.user_id || ''),
    })) as OrderRow[]
  },
  { server: true }
)

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      refreshOrders()
      refreshMetrics()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const formatCurrency = (v: number) => formatOMR(v)
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
const paidProgress = computed(() => {
  const total = metrics.value?.totalOrders || 0
  const paid = metrics.value?.paidOrders || 0
  return total > 0 ? Math.round((paid / total) * 100) : 0
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-24" />
          <p v-else class="text-2xl font-semibold">{{ formatCurrency(metrics?.totalRevenue || 0) }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.totalCustomers || 0 }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Active Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.totalProducts || 0 }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.totalOrders || 0 }}</p>
        </CardContent>
      </Card>
    </div>

    <Alert v-if="metricsError" variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ metricsError.message }}</AlertDescription>
    </Alert>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2 bg-white rounded-sm">
        <CardHeader class="flex items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Badge variant="outline">Last 10</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead class="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="ordersPending">
                <TableCell colspan="5">
                  <Skeleton class="h-8 w-full" />
                </TableCell>
              </TableRow>
              <TableRow v-else-if="ordersError">
                <TableCell colspan="5">
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ ordersError.message }}</AlertDescription>
                  </Alert>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="(recentOrders?.length || 0) === 0">
                <TableCell colspan="5">
                  <TableEmpty>No orders found</TableEmpty>
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="row in recentOrders" :key="row.id">
                <TableCell>
                  <NuxtLink :to="`/admin/orders/${row.id}`" class="text-foreground underline">#{{ row.id }}</NuxtLink>
                </TableCell>
                <TableCell>{{ formatDate(row.created_at) }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(row.total) }}</TableCell>
                <TableCell>
                  <Badge
                    :variant="orderStatusStyle(row.status).variant"
                  >
                    {{ row.status }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="paymentStatusStyle(row.payment_status).variant"
                  >
                    {{ row.payment_status }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center justify-between">
            <span>Paid Orders</span>
            <span class="font-medium">{{ metrics?.paidOrders || 0 }}</span>
          </div>
          <Progress :model-value="paidProgress" />
          <Separator />
          <div class="flex items-center justify-between">
            <span>Unpaid/Pending Orders</span>
            <span class="font-medium">{{ (metrics?.totalOrders || 0) - (metrics?.paidOrders || 0) }}</span>
          </div>
          <Progress :model-value="Math.max(0, 100 - paidProgress)" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
