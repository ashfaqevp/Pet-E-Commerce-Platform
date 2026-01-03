<script setup lang="ts">
import { toast } from 'vue-sonner'
import { formatOMR, canOrderTransition } from '@/utils'
import AdminDashboardStatCard from '@/components/admin/AdminDashboardStatCard.vue'
import { DollarSign, CreditCard, ShoppingBag } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Order Details',
})

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed' | 'confirmed' | 'awaiting_payment'
type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'
type PaymentMethod = 'online' | 'cod'

interface Address {
  full_name?: string
  phone?: string
  address_line_1?: string
  address_line_2?: string | null
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

interface OrderDetail {
  id: string
  user_id: string | null
  user_email?: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod | null
  total: number
  subtotal?: number | null
  shipping_fee?: number | null
  tax?: number | null
  created_at: string
  paid_at?: string | null
  tran_ref?: string | null
  payment_provider?: string | null
  shipping_address?: Address | null
  billing_address?: Address | null
}

interface OrderItemRow {
  id: string
  product_id: string
  product_name: string
  product_thumbnail?: string | null
  unit_price: number
  quantity: number
  total_price: number
}

const route = useRoute()
const orderId = computed(() => String(route.params.id))

const { data: order, pending: orderPending, error: orderError, refresh: refreshOrder } = await useLazyAsyncData(
  () => `admin-order-${orderId.value}`,
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,status,payment_status,payment_method,total,subtotal,shipping_fee,tax,created_at,paid_at,tran_ref,payment_provider,shipping_address,billing_address')
      .eq('id', orderId.value)
      .single()
    if (error) throw error
    const o = data as unknown as {
      id: string
      user_id: string | null
      status: string | null
      payment_status: string | null
      payment_method?: string | null
      total: number | string | null
      subtotal?: number | string | null
      shipping_fee?: number | string | null
      tax?: number | string | null
      created_at: string | Date
      paid_at?: string | Date | null
      tran_ref?: string | null
      payment_provider?: string | null
      shipping_address?: Address | string | null
      billing_address?: Address | string | null
    }
    const parseAddr = (a: Address | string | null | undefined): Address | null => {
      if (!a) return null
      if (typeof a === 'string') {
        try {
          return JSON.parse(a) as Address
        } catch {
          return null
        }
      }
      return a as Address
    }
    let user_email: string | null = null
    if (o.user_id) {
      const { data: u, error: ue } = await supabase
        .from('user_profiles_view')
        .select('email')
        .eq('id', o.user_id)
        .maybeSingle()
      if (!ue && u) {
        const row = u as unknown as { email?: string | null }
        user_email = row.email || null
      }
    }
    return {
      id: String(o.id),
      user_id: o.user_id || null,
      user_email,
      status: (o.status || 'pending') as OrderStatus,
      payment_status: (o.payment_status || 'pending') as PaymentStatus,
      payment_method: ((o.payment_method || 'online') as PaymentMethod),
      total: Number(o.total || 0),
      subtotal: o.subtotal != null ? Number(o.subtotal) : null,
      shipping_fee: o.shipping_fee != null ? Number(o.shipping_fee) : null,
      tax: o.tax != null ? Number(o.tax) : null,
      created_at: typeof o.created_at === 'string' ? o.created_at : new Date(o.created_at).toISOString(),
      paid_at: o.paid_at ? (typeof o.paid_at === 'string' ? o.paid_at : new Date(o.paid_at).toISOString()) : null,
      tran_ref: o.tran_ref || null,
      payment_provider: o.payment_provider || null,
      shipping_address: parseAddr(o.shipping_address || null),
      billing_address: parseAddr(o.billing_address || null),
    } as OrderDetail
  },
  { server: true }
)

const { data: items, pending: itemsPending, error: itemsError, refresh: refreshItems } = await useLazyAsyncData(
  () => `admin-order-items-${orderId.value}`,
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('order_items')
      .select('id,product_id,product_name,product_thumbnail,unit_price,quantity,total_price')
      .eq('order_id', orderId.value)
      .order('created_at', { ascending: true })
    if (error) throw error
    const rows = (data as unknown as Array<{
      id: string
      product_id: string
      product_name: string
      product_thumbnail?: string | null
      unit_price: number | string | null
      quantity: number | null
      total_price: number | string | null
    }> | null) || []
    return rows.map((r) => ({
      id: String(r.id),
      product_id: String(r.product_id),
      product_name: String(r.product_name),
      product_thumbnail: r.product_thumbnail || null,
      unit_price: Number(r.unit_price || 0),
      quantity: Number(r.quantity || 0),
      total_price: Number(r.total_price || 0),
    })) as OrderItemRow[]
  },
  { server: true }
)

onMounted(() => {
  const supabase = useSupabaseClient()
  const ch1 = supabase
    .channel(`public:orders:${orderId.value}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId.value}` }, () => {
      refreshOrder()
    })
    .subscribe()
  const ch2 = supabase
    .channel(`public:order_items:${orderId.value}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId.value}` }, () => {
      refreshItems()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(ch1)
    supabase.removeChannel(ch2)
  })
})

const editing = ref(false)
const nextStatus = ref<OrderStatus>('pending')
const canTo = (to: OrderStatus) => canOrderTransition(order.value?.status, to, order.value?.payment_status, order.value?.payment_method)

const confirmStatusChange = async () => {
  if (!order.value) return
  const check = canOrderTransition(order.value.status, nextStatus.value, order.value.payment_status, order.value.payment_method)
  if (!check.allowed) {
    toast.error(check.reason || 'Status update blocked')
    editing.value = false
    return
  }
  const supabase = useSupabaseClient()
  const patch: Record<string, unknown> = { status: nextStatus.value, updated_at: new Date().toISOString() }
  if (nextStatus.value === 'delivered') {
    patch['delivered_at'] = new Date().toISOString()
    if ((order.value.payment_method || 'online') === 'cod') {
      patch['payment_status'] = 'paid'
      patch['paid_at'] = new Date().toISOString()
    }
  }
  if (nextStatus.value === 'cancelled') {
    patch['payment_status'] = 'failed'
  }
  const { error } = await supabase
    .from('orders')
    .update(patch as unknown as never)
    .eq('id', order.value.id)
  if (error) {
    toast.error(error.message)
  } else {
    toast.success('Order status updated')
  }
  editing.value = false
  refreshOrder()
}

const editingPayment = ref(false)
const nextPaymentStatus = ref<PaymentStatus>('pending')
const openPaymentChange = (s: PaymentStatus) => {
  nextPaymentStatus.value = s
  editingPayment.value = true
}

const confirmPaymentChange = async () => {
  if (!order.value) return
  if (order.value.payment_status === 'paid') {
    toast.error('Payment already marked as paid')
    editingPayment.value = false
    return
  }
  const isCOD = (order.value.payment_method || 'online') === 'cod'
  if (nextPaymentStatus.value === 'paid') {
    if (isCOD && order.value.status !== 'delivered') {
      toast.error('Mark order as delivered before recording COD payment')
      editingPayment.value = false
      return
    }
  }
  const supabase = useSupabaseClient()
  const patch: Record<string, unknown> = { payment_status: nextPaymentStatus.value, updated_at: new Date().toISOString() }
  if (nextPaymentStatus.value === 'paid') {
    patch['paid_at'] = new Date().toISOString()
    if (!isCOD) {
      patch['status'] = 'confirmed'
    }
  }
  if (nextPaymentStatus.value === 'failed' && !isCOD) {
    patch['status'] = 'awaiting_payment'
  }
  const { error } = await supabase
    .from('orders')
    .update(patch as unknown as never)
    .eq('id', order.value.id)
  if (error) {
    toast.error(error.message)
  } else {
    toast.success('Payment status updated')
  }
  editingPayment.value = false
  refreshOrder()
}

const editingRef = ref(false)
const refTran = ref('')
const refProvider = ref('')
const confirmEditRef = async () => {
  if (!order.value) return
  const supabase = useSupabaseClient()
  const { error } = await supabase
    .from('orders')
    .update({ tran_ref: refTran.value || null, payment_provider: refProvider.value || null, updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', order.value.id)
  if (error) {
    toast.error(error.message)
  } else {
    toast.success('Reference updated')
  }
  editingRef.value = false
  refreshOrder()
}

watch(order, (o) => {
  if (!o) return
  const action = String((route.query as any).action || '')
  const target = String((route.query as any).target || '')
  const edit = String((route.query as any).edit || '')
  if (action === 'status') {
    nextStatus.value = (target || o.status) as OrderStatus
    editing.value = true
  } else if (action === 'payment') {
    nextPaymentStatus.value = (target || o.payment_status) as PaymentStatus
    editingPayment.value = true
  } else if (edit === 'ref') {
    refTran.value = o.tran_ref || ''
    refProvider.value = o.payment_provider || ''
    editingRef.value = true
  }
  if (action || edit) {
    navigateTo({ path: route.path }, { replace: true })
  }
}, { immediate: true })

const formatCurrency = (v: number | null | undefined) => formatOMR(Number(v || 0))
const formatDate = (iso: string | Date | null | undefined) => {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
}
</script>

<template>
  <div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold">Order #{{ order?.id }}</h1>
      <div class="text-sm text-muted-foreground">
        Status: <span class="capitalize">{{ order?.status }}</span> • Payment: <span class="capitalize">{{ order?.payment_status }}</span>
      </div>
      <div class="text-sm text-muted-foreground">
        Customer: {{ order?.user_email || '—' }}
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" as="button" @click="$router.push('/admin/orders')">Back</Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="default">Update Status</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" :disabled="!canTo('processing').allowed" @click="editing = true; nextStatus = 'processing'">Processing</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="!canTo('shipped').allowed" @click="editing = true; nextStatus = 'shipped'">Shipped</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="!canTo('delivered').allowed" @click="editing = true; nextStatus = 'delivered'">Delivered</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="!canTo('completed').allowed" @click="editing = true; nextStatus = 'completed'">Completed</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem as="button" class="text-destructive" :disabled="!canTo('cancelled').allowed" @click="editing = true; nextStatus = 'cancelled'">Cancel</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="!canTo('returned').allowed" @click="editing = true; nextStatus = 'returned'">Return</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">Update Payment</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" :disabled="order?.payment_status === 'paid'" @click="openPaymentChange('unpaid')">Unpaid</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="order?.payment_status === 'paid'" @click="openPaymentChange('pending')">Pending</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="order?.payment_status === 'paid' || ((order?.payment_method || 'online') === 'cod' && order?.status !== 'delivered')" @click="openPaymentChange('paid')">Paid</DropdownMenuItem>
            <DropdownMenuItem as="button" :disabled="order?.payment_status === 'paid'" @click="openPaymentChange('failed')">Failed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" @click="refProvider = order?.payment_provider || ''; refTran = order?.tran_ref || ''; editingRef = true">Edit Reference</Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AdminDashboardStatCard :label="'Total'" :value="formatOMR(order?.total || 0)" :icon="DollarSign" :loading="orderPending" accent="orange" currency />
      <AdminDashboardStatCard :label="'Order Status'" :value="order?.status || '—'" :icon="ShoppingBag" :loading="orderPending" accent="teal" />
      <AdminDashboardStatCard :label="'Payment Status'" :value="order?.payment_status || '—'" :icon="CreditCard" :loading="orderPending" accent="slate" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2 bg-white rounded-sm">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead class="text-right">Unit</TableHead>
                <TableHead class="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="itemsPending">
                <TableCell colspan="4"><Skeleton class="h-10 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="itemsError">
                <TableCell colspan="4">
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ itemsError.message }}</AlertDescription>
                  </Alert>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="(items?.length || 0) === 0">
                <TableCell colspan="4">
                  <TableEmpty>No items</TableEmpty>
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="it in items" :key="it.id">
                <TableCell>
                  <div class="flex items-center gap-3">
                    <img v-if="it.product_thumbnail" :src="it.product_thumbnail" alt="" class="h-10 w-10 rounded object-cover" />
                    <span class="font-medium">{{ it.product_name }}</span>
                  </div>
                </TableCell>
                <TableCell>{{ it.quantity }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(it.unit_price) }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(it.total_price) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card class="bg-white rounded-sm">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center justify-between"><span>Subtotal</span><span class="font-medium">{{ formatCurrency(order?.subtotal || 0) }}</span></div>
          <div class="flex items-center justify-between"><span>Shipping</span><span class="font-medium">{{ formatCurrency(order?.shipping_fee || 0) }}</span></div>
          <div class="flex items-center justify-between"><span>Tax</span><span class="font-medium">{{ formatCurrency(order?.tax || 0) }}</span></div>
          <div class="flex items-center justify-between"><span>Total</span><span class="font-semibold">{{ formatCurrency(order?.total || 0) }}</span></div>
          <Separator />
          <div class="space-y-2">
            <div class="text-sm text-muted-foreground">Created</div>
            <div class="font-medium">{{ formatDate(order?.created_at || '') }}</div>
          </div>
          <div v-if="order?.paid_at" class="space-y-2">
            <div class="text-sm text-muted-foreground">Paid At</div>
            <div class="font-medium">{{ formatDate(order?.paid_at || '') }}</div>
          </div>
          <div class="space-y-2">
            <div class="text-sm text-muted-foreground">Provider</div>
            <div class="font-medium">{{ order?.payment_provider || '—' }}</div>
          </div>
          <div class="space-y-2">
            <div class="text-sm text-muted-foreground">Transaction Ref</div>
            <div class="font-medium">{{ order?.tran_ref || '—' }}</div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card class="bg-white rounded-sm">
        <CardHeader><CardTitle>Shipping Address</CardTitle></CardHeader>
        <CardContent>
          <div v-if="orderPending"><Skeleton class="h-16 w-full" /></div>
          <div v-else-if="order?.shipping_address" class="space-y-1 text-sm">
            <div class="font-medium">{{ order.shipping_address?.full_name }}</div>
            <div>{{ order.shipping_address?.address_line_1 }}</div>
            <div v-if="order.shipping_address?.address_line_2">{{ order.shipping_address?.address_line_2 }}</div>
            <div>{{ order.shipping_address?.city }}, {{ order.shipping_address?.state }} {{ order.shipping_address?.postal_code }}</div>
            <div>{{ order.shipping_address?.country }}</div>
            <div>{{ order.shipping_address?.phone }}</div>
          </div>
          <div v-else><TableEmpty>No address</TableEmpty></div>
        </CardContent>
      </Card>
      <Card class="bg-white rounded-sm">
        <CardHeader><CardTitle>Billing Address</CardTitle></CardHeader>
        <CardContent>
          <div v-if="orderPending"><Skeleton class="h-16 w-full" /></div>
          <div v-else-if="order?.billing_address" class="space-y-1 text-sm">
            <div class="font-medium">{{ order.billing_address?.full_name }}</div>
            <div>{{ order.billing_address?.address_line_1 }}</div>
            <div v-if="order.billing_address?.address_line_2">{{ order.billing_address?.address_line_2 }}</div>
            <div>{{ order.billing_address?.city }}, {{ order.billing_address?.state }} {{ order.billing_address?.postal_code }}</div>
            <div>{{ order.billing_address?.country }}</div>
            <div>{{ order.billing_address?.phone }}</div>
          </div>
          <div v-else><TableEmpty>No address</TableEmpty></div>
        </CardContent>
      </Card>
    </div>

    <AlertDialog :open="editing" @update:open="editing = false">
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

    <AlertDialog :open="editingPayment" @update:open="editingPayment = false">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change payment status?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-secondary text-white" @click="confirmPaymentChange">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="editingRef" @update:open="editingRef = false">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit reference</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <div class="space-y-3">
          <div class="space-y-2">
            <Label>Provider</Label>
            <Input v-model="refProvider" placeholder="paytabs" />
          </div>
          <div class="space-y-2">
            <Label>Tran Ref</Label>
            <Input v-model="refTran" placeholder="XXX-YYY" />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-secondary text-white" @click="confirmEditRef">Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
