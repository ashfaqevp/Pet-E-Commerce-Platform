<script setup lang="ts">
import { toast } from 'vue-sonner'
import { orderStatusStyle, paymentStatusStyle, canOrderTransition } from '@/utils'

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
  total: number | null
  status: OrderStatus
  created_at: string
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null
}

const status = ref<OrderStatus | 'all'>('all')
const sortBy = ref<'created_at' | 'total'>('created_at')
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
  'admin-orders',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('orders').select('id,total,status,created_at,user_id,payment_status,payment_method', { count: 'exact' })
    if (params.value.status) q = q.eq('status', params.value.status)
    q = q.order(params.value.sortBy, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rows = ((data || []) as unknown as Array<{ id: string; total: number | null; status: string | null; created_at: string | Date; user_id?: string | null; payment_status: string | null; payment_method?: string | null }>)
      .map((r) => ({
        id: String(r.id),
        total: r.total ?? 0,
        status: (r.status || 'pending') as OrderStatus,
        created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
        user_id: r.user_id || null,
        payment_status: ((r.payment_status || 'pending') as PaymentStatus),
        payment_method: ((r.payment_method || 'online') as PaymentMethod),
      })) as AdminOrder[]
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

const editingId = ref<string | null>(null)
const nextStatus = ref<OrderStatus>('pending')

const openStatusChange = (id: string, s: OrderStatus) => {
  editingId.value = id
  nextStatus.value = s
}

const confirmStatusChange = async () => {
  if (!editingId.value) return
  const current = rows.value.find(r => r.id === editingId.value)
  const check = canOrderTransition(current?.status, nextStatus.value, current?.payment_status, current?.payment_method)
  if (!check.allowed) {
    toast.error(check.reason || 'Status update blocked')
    editingId.value = null
    return
  }
  const supabase = useSupabaseClient()
  const { error: e } = await supabase
    .from('orders')
    .update({ status: nextStatus.value, updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', editingId.value)
  if (e) {
    toast.error(e.message)
  } else {
    toast.success('Order status updated')
  }
  editingId.value = null
  refresh()
  refreshMetrics()
}

const formatCurrency = (v: number | null | undefined) => formatOMR(Number(v || 0))
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Paid Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.paidCount || 0 }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-24" />
          <p v-else class="text-2xl font-semibold">{{ formatCurrency(metrics?.revenue || 0) }}</p>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle class="text-sm">Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="metricsPending" class="h-6 w-12" />
          <p v-else class="text-2xl font-semibold">{{ metrics?.pendingCount || 0 }}</p>
        </CardContent>
      </Card>
    </div>
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Select v-model="status">
          <SelectTrigger class="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
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
            <DropdownMenuItem as="button" @click="sortBy = 'total'; ascending = false">Amount</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Orders</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead class="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Method</TableHead>
          <TableHead class="text-right">Actions</TableHead>
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
                <TableEmpty>No orders found</TableEmpty>
              </TableCell>
            </TableRow>
        <TableRow v-else v-for="o in rows" :key="o.id">
              <TableCell>
                <NuxtLink :to="`/admin/orders/${o.id}`" class="text-foreground underline">#{{ o.id }}</NuxtLink>
              </TableCell>
              <TableCell>{{ formatDate(o.created_at) }}</TableCell>
              <TableCell>{{ o.user_id || '—' }}</TableCell>
              <TableCell class="text-right">{{ formatCurrency(o.total) }}</TableCell>
              <TableCell>
                <Badge :variant="orderStatusStyle(o.status).variant">{{ o.status }}</Badge>
              </TableCell>
          <TableCell>
            <Badge :variant="paymentStatusStyle(o.payment_status).variant">{{ o.payment_status }}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{{ o.payment_method === 'cod' ? 'COD' : 'Online' }}</Badge>
          </TableCell>
          <TableCell class="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon">
                  <Icon name="lucide:ellipsis" class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'processing', o.payment_status, o.payment_method).allowed" @click="openStatusChange(o.id, 'processing')">
                  <Icon name="lucide:badge" class="h-4 w-4 mr-2" /> Processing
                </DropdownMenuItem>
                <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'shipped', o.payment_status, o.payment_method).allowed" @click="openStatusChange(o.id, 'shipped')">
                  <Icon name="lucide:truck" class="h-4 w-4 mr-2" /> Shipped
                </DropdownMenuItem>
                <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'delivered', o.payment_status, o.payment_method).allowed" @click="openStatusChange(o.id, 'delivered')">
                  <Icon name="lucide:package-check" class="h-4 w-4 mr-2" /> Delivered
                </DropdownMenuItem>
                <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'completed', o.payment_status, o.payment_method).allowed" @click="openStatusChange(o.id, 'completed')">
                  <Icon name="lucide:check-circle" class="h-4 w-4 mr-2" /> Completed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem as="button" class="text-destructive" :disabled="!canOrderTransition(o.status, 'cancelled', o.payment_status, o.payment_method).allowed" @click="openStatusChange(o.id, 'cancelled')">
                  <Icon name="lucide:x-circle" class="h-4 w-4 mr-2" /> Cancel
                </DropdownMenuItem>
                <DropdownMenuItem as="button" :disabled="!canOrderTransition(o.status, 'returned', o.payment_status, o.payment_method).allowed" @click="openStatusChange(o.id, 'returned')">
                  <Icon name="lucide:undo-2" class="h-4 w-4 mr-2" /> Return
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

    <AlertDialog :open="!!editingId" @update:open="editingId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change status?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-secondary text-white" @click="confirmStatusChange">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
