<script setup lang="ts">
import { toast } from 'vue-sonner'
import { formatOMR, formatOmanPhone } from '@/utils'
import AdminDashboardStatCard from '@/components/admin/AdminDashboardStatCard.vue'
import { DollarSign, ShoppingCart, Calendar } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Customer Details',
})

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed' | 'confirmed' | 'awaiting_payment'
type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'
type PaymentMethod = 'online' | 'cod'

interface CustomerProfile {
  id: string
  phone?: string | null
  role?: string | null
  full_name?: string | null
  avatar_url?: string | null
  created_at?: string | null
}

interface CustomerAddress {
  id: string
  full_name: string
  phone: string
  address_line_1: string
  address_line_2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
  created_at?: string | null
}

interface CustomerOrder {
  id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null
  total: number | null
  created_at: string
}

interface CustomerData {
  profile: CustomerProfile | null
  addresses: CustomerAddress[]
  orders: CustomerOrder[]
  ordersCount: number
  totalPaid: number
  lastOrderDate?: string | null
}

const route = useRoute()
const customerId = computed(() => String(route.params.id))

const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  id: customerId.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  () => `admin-customer-${params.value.id}-${params.value.page}`,
  async () => {
    const supabase = useSupabaseClient()
    const profileReq = supabase
      .from('profiles')
      .select('id,phone,role,created_at,full_name,avatar_url')
      .eq('id', params.value.id)
      .maybeSingle()
    const addressesReq = supabase
      .from('addresses')
      .select('id,full_name,phone,address_line_1,address_line_2,city,state,postal_code,country,is_default,created_at')
      .eq('user_id', params.value.id)
      .order('created_at', { ascending: false })
    const ordersCountReq = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', params.value.id)
    const paidTotalsReq = supabase
      .from('orders')
      .select('total')
      .eq('user_id', params.value.id)
      .eq('payment_status', 'paid')
    const lastOrderReq = supabase
      .from('orders')
      .select('created_at')
      .eq('user_id', params.value.id)
      .order('created_at', { ascending: false })
      .limit(1)
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    const ordersPageReq = supabase
      .from('orders')
      .select('id,status,payment_status,payment_method,total,created_at')
      .eq('user_id', params.value.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    const [profileRes, addressesRes, ordersCountRes, paidTotalsRes, lastOrderRes, ordersPageRes] = await Promise.all([
      profileReq,
      addressesReq,
      ordersCountReq,
      paidTotalsReq,
      lastOrderReq,
      ordersPageReq,
    ])

    if (profileRes.error) throw profileRes.error
    if (addressesRes.error) throw addressesRes.error
    if (ordersCountRes.error) throw ordersCountRes.error
    if (paidTotalsRes.error) throw paidTotalsRes.error
    if (lastOrderRes.error) throw lastOrderRes.error
    if (ordersPageRes.error) throw ordersPageRes.error

    const totals = (paidTotalsRes.data as unknown as Array<{ total: number | string | null }> | null) || []
    const totalPaid = totals.reduce((sum, o) => sum + Number(o.total || 0), 0)
    const lastOrderDate = ((lastOrderRes.data as unknown as Array<{ created_at: string | Date }> | null)?.[0]?.created_at) || null

    const profile = (profileRes.data as unknown as { id: string; phone?: string | null; role?: string | null; full_name?: string | null; avatar_url?: string | null; created_at?: string | Date | null } | null)
    const addresses = ((addressesRes.data || []) as unknown as Array<CustomerAddress>)
    const orders = ((ordersPageRes.data || []) as unknown as Array<{ id: string; status: string | null; payment_status: string | null; payment_method?: string | null; total: number | string | null; created_at: string | Date }>)
      .map((o) => ({
        id: String(o.id),
        status: ((o.status || 'pending') as OrderStatus),
        payment_status: ((o.payment_status || 'pending') as PaymentStatus),
        payment_method: ((o.payment_method || 'online') as PaymentMethod),
        total: o.total == null ? 0 : Number(o.total),
        created_at: typeof o.created_at === 'string' ? o.created_at : new Date(o.created_at).toISOString(),
      })) as CustomerOrder[]

    const normalizedProfile: CustomerProfile | null = profile
      ? {
          id: String(profile.id),
          phone: profile.phone || null,
          role: profile.role || null,
          full_name: profile.full_name || null,
          avatar_url: profile.avatar_url || null,
          created_at: profile.created_at ? (typeof profile.created_at === 'string' ? profile.created_at : new Date(profile.created_at).toISOString()) : null,
        }
      : null

    return {
      profile: normalizedProfile,
      addresses,
      orders,
      ordersCount: ordersCountRes.count || 0,
      totalPaid,
      lastOrderDate: lastOrderDate ? (typeof lastOrderDate === 'string' ? lastOrderDate : new Date(lastOrderDate).toISOString()) : null,
    } as CustomerData
  },
  { server: true }
)

watch(params, () => {
  refresh()
})

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:customer-details')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      refresh()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'addresses' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalOrderPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.ordersCount || 0) / pageSize.value)))
const orders = computed(() => data.value?.orders || [])
const addresses = computed(() => data.value?.addresses || [])
const profile = computed(() => data.value?.profile || null)

const expanded = ref<Set<string>>(new Set())
const itemsByOrder = ref<Record<string, Array<{ id: string; product_name: string; quantity: number; unit_price: number; total_price: number; product_thumbnail?: string | null }>>>({})
const loadingItems = ref<Set<string>>(new Set())

const toggleExpand = async (orderId: string) => {
  const set = new Set(expanded.value)
  if (set.has(orderId)) {
    set.delete(orderId)
    expanded.value = set
    return
  }
  set.add(orderId)
  expanded.value = set
  if (!itemsByOrder.value[orderId]) await loadItems(orderId)
}

const loadItems = async (orderId: string) => {
  loadingItems.value.add(orderId)
  const supabase = useSupabaseClient()
  const { data: it, error: e } = await supabase
    .from('order_items')
    .select('id,product_name,quantity,unit_price,total_price,product_thumbnail')
    .eq('order_id', orderId)
  if (e) {
    toast.error(e.message)
    loadingItems.value.delete(orderId)
    return
  }
  const rows = ((it || []) as unknown as Array<{ id: string; product_name: string; quantity: number; unit_price: number; total_price: number; product_thumbnail?: string | null }>)
  itemsByOrder.value[orderId] = rows.map(r => ({
    id: String(r.id),
    product_name: r.product_name,
    quantity: Number(r.quantity || 0),
    unit_price: Number(r.unit_price || 0),
    total_price: Number(r.total_price || 0),
    product_thumbnail: r.product_thumbnail || null,
  }))
  loadingItems.value.delete(orderId)
}

const formatCurrency = (v: number | null | undefined) => formatOMR(Number(v || 0))
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
}
const formatPhone = (v: string | null | undefined) => formatOmanPhone(v || '')
const getInitials = (name?: string | null, fallback?: string | null) => {
  const n = (name || '').trim()
  if (n) {
    const parts = n.split(' ').filter(Boolean)
    const a = parts[0]?.[0] || ''
    const b = parts[1]?.[0] || ''
    const letters = (a + b) || n.slice(0, 2)
    return letters.toUpperCase()
  }
  const f = (fallback || '').replace(/[^A-Za-z0-9]/g, '')
  const letters = f.slice(0, 2) || 'CU'
  return letters.toUpperCase()
}
const getDisplayName = (name?: string | null, id?: string | null) => {
  if (name && name.trim().length) return name
  const short = (id || '').slice(0, 5)
  return short ? `Customer ${short}` : 'Customer'
}

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
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Avatar>
            <AvatarImage v-if="profile?.avatar_url" :src="profile?.avatar_url" :alt="profile?.full_name || profile?.id || 'Customer'" />
            <AvatarFallback>{{ getInitials(profile?.full_name, profile?.phone) }}</AvatarFallback>
          </Avatar>
          <div class="flex flex-col">
            <span class="text-xl font-semibold">{{ getDisplayName(profile?.full_name, profile?.id) }}</span>
            <span class="text-xs text-muted-foreground">#{{ profile?.id }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Badge variant="outline">{{ formatPhone(profile?.phone || null) }}</Badge>
          <Badge variant="outline">{{ profile?.role || 'customer' }}</Badge>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" as="button" @click="$router.push('/admin/customers')">Back</Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AdminDashboardStatCard :label="'Total Orders'" :value="data?.ordersCount || 0" :icon="ShoppingCart" :loading="pending" accent="teal" />
      <AdminDashboardStatCard :label="'Total Paid'" :value="formatCurrency(data?.totalPaid || 0)" :icon="DollarSign" :loading="pending" accent="orange" currency />
      <AdminDashboardStatCard :label="'Account Created'" :value="formatDate(profile?.created_at || null)" :icon="Calendar" :loading="pending" accent="slate" />
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Addresses</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="pending">
          <Skeleton class="h-10 w-full" />
        </div>
        <div v-else-if="addresses.length === 0">
          <TableEmpty>No addresses found</TableEmpty>
        </div>
        <div v-else class="space-y-3">
          <div v-for="a in addresses" :key="a.id" class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-sm p-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ a.full_name }}</span>
                <Badge v-if="a.is_default" variant="success">Default</Badge>
              </div>
              <div class="text-sm">{{ a.address_line_1 }}<span v-if="a.address_line_2">, {{ a.address_line_2 }}</span></div>
              <div class="text-sm">{{ a.city }}, {{ a.state }}, {{ a.country }} {{ a.postal_code }}</div>
            </div>
            <div class="text-sm">
              {{ formatPhone(a.phone) }}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="flex flex-col mx-auto h-[calc(100vh-280px)] md:h-[calc(100vh-260px)]">
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Orders</CardTitle>
        <Badge variant="outline">{{ data?.ordersCount || 0 }}</Badge>
      </CardHeader>
      <CardContent class="p-0 flex-1 overflow-hidden min-h-0">
        <div class="h-full overflow-x-auto">
          <div class="h-full overflow-y-auto max-h-[65vh] px-2 sm:px-3">
            <Table>
              <TableHeader>
                <TableRow class="sticky top-0 bg-white z-10">
                  <TableHead>Order</TableHead>
                  <TableHead class="">Amount</TableHead>
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
                <TableRow v-else-if="orders.length === 0">
                  <TableCell colspan="6">
                    <TableEmpty>No orders found</TableEmpty>
                  </TableCell>
                </TableRow>
                <TableRow v-else v-for="o in orders" :key="o.id">
                  <TableCell>
                    <div class="space-y-0.5">
                      <div class="text-foreground font-medium">#{{ o.id.slice(0, 8) }}</div>
                      <div class="text-xs text-muted-foreground">{{ formatDate(o.created_at) }}</div>
                    </div>
                  </TableCell>
                  <TableCell class="">{{ formatCurrency(o.total) }}</TableCell>
                  <TableCell>
                  <Badge variant="outline" :class="[statusBadgeClass(o.status), 'capitalize']">{{ o.status === 'awaiting_payment' ? 'Awaiting' : o.status }}</Badge>
                  </TableCell>
                  <TableCell>
                  <Badge variant="outline" :class="[paymentBadgeClass(o.payment_status), 'capitalize']">{{ o.payment_status }}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{{ o.payment_method === 'cod' ? 'COD' : 'Online' }}</Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button variant="default" size="sm" @click="navigateTo(`/admin/orders/${o.id}`)">
                        <Icon name="lucide:eye" class="h-4 w-4 mr-2" /> View
                      </Button>
                      <Button variant="outline" size="sm" @click="toggleExpand(o.id)">
                        <span v-if="expanded.has(o.id)">Hide Items</span>
                        <span v-else>Show Items</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-for="o in orders" :key="`${o.id}-items`" v-show="expanded.has(o.id)">
                  <TableCell colspan="6">
                    <div class="border rounded-sm p-3 space-y-2">
                      <div v-if="loadingItems.has(o.id)"><Skeleton class="h-10 w-full" /></div>
                      <div v-else-if="(itemsByOrder[o.id] || []).length === 0">
                        <TableEmpty>No items</TableEmpty>
                      </div>
                      <div v-else>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead class="text-right">Unit Price</TableHead>
                              <TableHead class="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow v-for="it in itemsByOrder[o.id]" :key="it.id">
                              <TableCell>{{ it.product_name }}</TableCell>
                              <TableCell>{{ it.quantity }}</TableCell>
                              <TableCell class="text-right">{{ formatCurrency(it.unit_price) }}</TableCell>
                              <TableCell class="text-right">{{ formatCurrency(it.total_price) }}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
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
          <Button variant="outline" :disabled="page >= totalOrderPages" @click="page = Math.min(totalOrderPages, page + 1)">Next</Button>
        </div>
        <div class="text-sm">Page {{ page }} of {{ totalOrderPages }}</div>
      </CardFooter>
    </Card>
  </div>
</template>
