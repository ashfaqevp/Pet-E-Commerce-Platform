<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Admin Dashboard',
})

type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed'

interface OrderRow {
  id: string
  customer_email?: string | null
  total_amount: number
  status: OrderStatus
  created_at: string
}

const { data: metrics, pending: metricsPending, error: metricsError, refresh: refreshMetrics } = await useLazyAsyncData(
  'admin-metrics',
  async () => {
    const supabase = useSupabaseClient()

    const productsCountReq = supabase.from('products').select('*', { count: 'exact', head: true })
    const ordersCountReq = supabase.from('orders').select('*', { count: 'exact', head: true })
    const customersCountReq = supabase.from('user_profiles').select('*', { count: 'exact', head: true })
    const completedSalesReq = supabase.from('orders').select('total_amount').eq('status', 'completed')

    const [productsCountRes, ordersCountRes, customersCountRes, completedSalesRes] = await Promise.all([
      productsCountReq,
      ordersCountReq,
      customersCountReq,
      completedSalesReq,
    ])

    if (productsCountRes.error) throw productsCountRes.error
    if (ordersCountRes.error) throw ordersCountRes.error
    if (customersCountRes.error) throw customersCountRes.error
    if (completedSalesRes.error) throw completedSalesRes.error

    const completed = (completedSalesRes.data as unknown as Array<{ total_amount: number | null }> | null) || []
    const totalSales = completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

    return {
      totalSales,
      customers: customersCountRes.count || 0,
      products: productsCountRes.count || 0,
      orders: ordersCountRes.count || 0,
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
      .select('id,total_amount,status,created_at,user_id')
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) throw error
    const rows = (data as unknown as Array<{ id: string; total_amount: number | null; status: string | null; created_at: string | Date }> | null) || []
    return rows.map((row) => ({
      id: String(row.id),
      total_amount: Number(row.total_amount || 0),
      status: (row.status || 'pending') as OrderStatus,
      created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
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

const formatCurrency = (v: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(v)
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-24" />
          <p v-else class="text-2xl font-semibold">{{ formatCurrency(metrics?.totalSales || 0) }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.customers || 0 }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.products || 0 }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.orders || 0 }}</p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="ordersPending">
                <TableCell colspan="4">
                  <Skeleton class="h-8 w-full" />
                </TableCell>
              </TableRow>
              <TableRow v-else-if="ordersError">
                <TableCell colspan="4">
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ ordersError.message }}</AlertDescription>
                  </Alert>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="(recentOrders?.length || 0) === 0">
                <TableCell colspan="4">
                  <TableEmpty>No orders found</TableEmpty>
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="row in recentOrders" :key="row.id">
                <TableCell>
                  <NuxtLink :to="`/admin/orders/${row.id}`" class="text-foreground underline">#{{ row.id }}</NuxtLink>
                </TableCell>
                <TableCell>{{ formatDate(row.created_at) }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(row.total_amount) }}</TableCell>
                <TableCell>
                  <Badge
                    :variant="row.status === 'completed' || row.status === 'delivered' ? 'default' : row.status === 'cancelled' || row.status === 'returned' ? 'destructive' : 'secondary'"
                  >
                    {{ row.status }}
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
            <span>Completed</span>
            <span class="font-medium">{{ formatCurrency(metrics?.totalSales || 0) }}</span>
          </div>
          <Progress :model-value="100" />
          <Separator />
          <div class="flex items-center justify-between">
            <span>Pending</span>
            <span class="font-medium">—</span>
          </div>
          <Progress :model-value="30" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
