<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseClient, useSupabaseUser, navigateTo, useHead, useState } from '#imports'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useWindowSize } from '@vueuse/core'
import { useProfile, type ProfileRow } from '@/composables/useProfile'
import { useAddresses, type AddressRow, type AddressInput } from '@/composables/useAddresses'
import { useOrders, type OrderRow } from '@/composables/useOrders'
import PhoneEditContent from '@/components/profile/PhoneEditContent.vue'
import AddressFormContent from '@/components/profile/AddressFormContent.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Profile' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Profile'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Profile' }]

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { width } = useWindowSize()
const isLg = computed(() => width.value >= 1024)

const userMeta = computed(() => (user.value?.user_metadata as Record<string, unknown>) ?? {})
const avatarUrl = computed(() => {
  const meta = userMeta.value
  const s = (meta.avatar_url || meta.picture || meta.avatar) as string | undefined
  return s && s.length ? s : undefined
})
const userName = computed(() => {
  const full = userMeta.value.full_name as string | undefined
  return full && full.length ? full : (user.value?.email || '')
})
const initials = computed(() => {
  const name = userName.value || ''
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const chars = parts.map(p => p[0]?.toUpperCase()).filter(Boolean)
  if (chars.length) return chars.join('')
  const email = user.value?.email || ''
  return email ? email[0]!.toUpperCase() : 'U'
})

const { getProfile } = useProfile()
const { listAddresses, deleteAddress, setDefault } = useAddresses()
const { listRecent } = useOrders()

const { data: profileData, pending: profilePending, error: profileError, refresh: refreshProfile } = await useLazyAsyncData(
  'profile-self',
  async () => {
    if (!user.value) return null
    return await getProfile()
  },
  { server: true }
)

const { data: addressesData, pending: addressesPending, error: addressesError, refresh: refreshAddresses } = await useLazyAsyncData(
  'profile-addresses',
  async () => {
    if (!user.value) return []
    return await listAddresses()
  },
  { server: true }
)

interface OrderItemRow { order_id: string; product_id: string; product_name: string; unit_price: number; quantity: number }
interface OrderItemWithProduct { product_id: string; name: string; unit_price: number; quantity: number; thumbnail_url?: string | null }
interface OrderEntry { order: OrderRow; items: OrderItemWithProduct[]; itemsCount: number }
const page = ref(1)
const pageSize = 10
const ordersList = ref<OrderEntry[]>([])
const ordersTotal = ref(0)
const loadingMore = ref(false)
const { data: ordersData, pending: ordersPending, error: ordersError, refresh: refreshOrders } = await useLazyAsyncData(
  'profile-orders',
  async () => {
    if (!user.value) return { entries: [] as OrderEntry[], count: 0 }
    const from = (page.value - 1) * pageSize
    const to = from + pageSize - 1
    const { data: od, error: oe, count } = await supabase
      .from('orders')
      .select('id,user_id,total,status,payment_status,payment_method,created_at', { count: 'exact' })
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (oe) throw oe
    const orders = ((od ?? []) as unknown as Array<{ id: string; user_id: string; total: number | string | null; status?: string | null; payment_status?: string | null; payment_method?: string | null; created_at: string | Date }>).map<OrderRow>((o) => ({
      id: String(o.id),
      user_id: String(o.user_id),
      total: Number(o.total || 0),
      status: ((o.status || 'pending') as OrderRow['status']),
      payment_status: ((o.payment_status || 'pending') as OrderRow['payment_status']),
      payment_method: ((o.payment_method || 'online') as 'online' | 'cod'),
      created_at: typeof o.created_at === 'string' ? o.created_at : new Date(o.created_at).toISOString(),
    }))
    const ids = orders.map(o => o.id)
    let items: Array<OrderItemRow> = []
    if (ids.length) {
      const { data: idata, error: ierr } = await supabase
        .from('order_items')
        .select('order_id,product_id,product_name,unit_price,quantity')
        .in('order_id', ids)
      if (ierr) throw ierr
      items = ((idata ?? []) as unknown as Array<{ order_id: string; product_id: string; product_name: string; unit_price: number | string | null; quantity: number | string | null }>).map<OrderItemRow>((i) => ({
        order_id: String(i.order_id),
        product_id: String(i.product_id),
        product_name: String(i.product_name),
        unit_price: Number(i.unit_price || 0),
        quantity: Number(i.quantity || 1),
      }))
    }
    const productIds = Array.from(new Set(items.map(i => i.product_id)))
    let products: Array<{ id: string; thumbnail_url?: string | null }> = []
    if (productIds.length) {
      const { data: pdata, error: perr } = await supabase
        .from('products')
        .select('id,thumbnail_url')
        .in('id', productIds)
      if (perr) throw perr
      products = ((pdata ?? []) as unknown as Array<{ id: string; thumbnail_url?: string | null }>)
    }
    const pmap = new Map<string, string | null>()
    for (const p of products) pmap.set(String(p.id), p.thumbnail_url ?? null)
    const entries: OrderEntry[] = orders.map((o) => {
      const oitems: OrderItemWithProduct[] = items
        .filter(i => i.order_id === o.id)
        .map<OrderItemWithProduct>((i) => ({
          product_id: i.product_id,
          name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          thumbnail_url: pmap.get(i.product_id) ?? null,
        }))
      const itemsCount = oitems.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
      return { order: o, items: oitems, itemsCount }
    })
    return { entries, count: count ?? entries.length }
  },
  { server: true }
)
watch(ordersData, (val) => {
  const entries = (val?.entries || []) as OrderEntry[]
  ordersTotal.value = Number(val?.count || 0)
  if (page.value === 1) ordersList.value = entries
  else ordersList.value = [...ordersList.value, ...entries]
})
const orders = computed(() => ordersList.value)
const hasMore = computed(() => ordersList.value.length < ordersTotal.value)
const loadMore = async () => {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    page.value += 1
    await refreshOrders()
  } finally {
    loadingMore.value = false
  }
}

const orderStatusLabel = (s: OrderRow['status']): string => {
  switch (s) {
    case 'awaiting_payment': return 'Awaiting Payment'
    case 'confirmed': return 'Confirmed'
    case 'processing': return 'Processing'
    case 'shipped': return 'Shipped'
    case 'delivered': return 'Delivered'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    case 'returned': return 'Returned'
    case 'pending':
    default: return 'Pending'
  }
}
const orderStatusIcon = (s: OrderRow['status']): string => {
  switch (s) {
    case 'confirmed': return 'lucide:badge-check'
    case 'processing': return 'lucide:loader-circle'
    case 'shipped': return 'lucide:truck'
    case 'delivered': return 'lucide:check-circle-2'
    case 'completed': return 'lucide:check-circle-2'
    case 'cancelled': return 'lucide:x-circle'
    case 'returned': return 'lucide:undo-2'
    case 'awaiting_payment': return 'lucide:clock'
    case 'pending':
    default: return 'lucide:clock'
  }
}
const statusBadgeClass = (s: OrderRow['status']): string => {
  switch (s) {
    case 'confirmed':
    case 'processing':
    case 'shipped':
      return 'bg-[#0f766e]/10 text-[#0f766e] border-[#0f766e]/30'
    case 'delivered':
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'cancelled':
    case 'returned':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'awaiting_payment':
    case 'pending':
    default:
      return 'bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30'
  }
}
const paymentIcon = (m: 'cod' | 'online'): string => (m === 'cod' ? 'lucide:wallet' : 'lucide:credit-card')
const paymentBadgeClass = (_m: 'cod' | 'online'): string => 'border-muted-foreground/20 text-foreground'
const canCancel = (o: OrderRow): boolean => {
  const s = o.status
  const m = o.payment_method === 'cod' ? 'cod' : 'online'
  if (m === 'online') return s === 'pending' || s === 'awaiting_payment' || s === 'confirmed'
  if (m === 'cod') return s === 'pending' || s === 'confirmed'
  return false
}
watch(user, async (u) => {
  if (!u) {
    useAuthStore().requireAuth()
  } else {
    await refreshProfile()
    await refreshAddresses()
    await refreshOrders()
  }
}, { immediate: true })

const profile = computed(() => profileData.value as ProfileRow | null)
const addresses = computed(() => (addressesData.value as AddressRow[]) || [])

const phoneInput = ref('')
const phoneDialogOpen = ref(false)
watch(profile, (p) => { phoneInput.value = p?.phone ?? '' }, { immediate: true })
const afterPhoneSaved = async () => {
  phoneDialogOpen.value = false
  await refreshProfile()
}

const addressDialogOpen = ref(false)
const editingAddress = ref<AddressRow | null>(null)
const addressForm = ref<AddressInput>({
  full_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  is_default: false,
})

const openAddAddress = () => {
  editingAddress.value = null
  addressForm.value = {
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_default: addresses.value.length === 0,
  }
  addressDialogOpen.value = true
}

const openEditAddress = (a: AddressRow) => {
  editingAddress.value = a
  addressForm.value = {
    full_name: a.full_name,
    phone: a.phone,
    address_line_1: a.address_line_1,
    address_line_2: a.address_line_2 ?? '',
    city: a.city,
    state: a.state,
    postal_code: a.postal_code,
    country: a.country,
    is_default: a.is_default,
  }
  addressDialogOpen.value = true
}

const afterAddressSaved = async () => {
  addressDialogOpen.value = false
  await refreshAddresses()
}

const removeAddressClick = async (id: string) => {
  try {
    await deleteAddress(id)
    toast.success('Address deleted')
    await refreshAddresses()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    toast.error(msg)
  }
}

const setDefaultClick = async (id: string) => {
  try {
    await setDefault(id)
    toast.success('Default address set')
    await refreshAddresses()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
}

const detailsOpen = ref(false)
const selectedOrder = ref<OrderEntry | null>(null)
const openDetails = (entry: OrderEntry) => {
  selectedOrder.value = entry
  detailsOpen.value = true
}

const confirmCancelOpen = ref(false)
const cancelOrderId = ref<string | null>(null)
const cancelling = ref(false)
const askCancel = (entry: OrderEntry) => {
  cancelOrderId.value = entry.order.id
  confirmCancelOpen.value = true
}
const performCancel = async () => {
  if (!cancelOrderId.value || !user.value) return

  const entry = ordersList.value.find(e => e.order.id === cancelOrderId.value)
  if (!entry || !canCancel(entry.order)) {
    toast.error('Cancellation not allowed')
    confirmCancelOpen.value = false
    cancelOrderId.value = null
    return
  }

  cancelling.value = true
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', cancelOrderId.value)
      .eq('user_id', user.value.id)

    if (error) throw error

    toast.success('Order cancelled')
    confirmCancelOpen.value = false
    cancelOrderId.value = null
    await refreshOrders()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Cancel failed')
  } finally {
    cancelling.value = false
  }
}


const loggingOut = ref(false)
const logout = async () => {
  try {
    loggingOut.value = true
    await supabase.auth.signOut()
    useAuthStore().showAuthDialog = false
    navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Profile'" :items="breadcrumbs" />
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div></div>
        <Button variant="outline" class="text-red-600 border-red-300" :disabled="loggingOut" @click="logout">
            <Icon name="lucide:log-out" />
            Logout
        </Button>
      </div>

      <Card class="border-none rounded-2xl overflow-hidden shadow-sm bg-white">
        <CardHeader>
          <div class="flex items-center gap-2 ">
            <Icon name="lucide:user" class="h-5 w-5 " />
            <CardTitle>User Info</CardTitle>
          </div>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="profilePending" class="space-y-3">
            <Skeleton class="h-6 w-40" />
            <Skeleton class="h-6 w-56" />
          </div>
          <div v-else class="flex items-center justify-between gap-4">
            <Avatar class="size-20">
              <AvatarImage v-if="avatarUrl" :src="avatarUrl" />
              <AvatarFallback>{{ initials }}</AvatarFallback>
            </Avatar>
            <div class="flex-1 space-y-2">
              <p class="font-medium">{{ (user?.user_metadata as Record<string, unknown>)?.full_name as string || '—' }}</p>
              <p class="text-sm text-muted-foreground">{{ user?.email || '—' }}</p>
              <div class="flex items-start justify-between ">
                <p class="text-sm text-muted-foreground">Phone: {{ formatOmanPhone(profile?.phone) }}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        :variant="profile?.phone ? 'outline' : 'default'"
                        size="sm"
                        aria-label="Edit phone"
                        @click="phoneDialogOpen = true"
                      >
                        <Icon :name="profile?.phone ? 'lucide:pencil' : 'fluent:phone-add-24-regular'" />
                        <span v-if="!profile?.phone" class="hidden md:block">Add Phone number</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {{ profile?.phone ? 'Edit phone' : 'Add phone' }}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardContent>
  </Card>

    <Dialog :open="detailsOpen" @update:open="detailsOpen = $event">
      <DialogContent class="rounded-xl max-w-lg">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div class="space-y-3">
          <div v-for="it in (selectedOrder?.items || [])" :key="it.product_id" class="flex items-center gap-3">
            <Avatar class="size-12">
              <AvatarImage v-if="it.thumbnail_url" :src="it.thumbnail_url" />
              <AvatarFallback>{{ (it.name || '').slice(0,2).toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div class="flex-1">
              <p class="font-medium">{{ it.name }}</p>
              <p class="text-sm text-muted-foreground">Qty {{ it.quantity }} · {{ formatOMR(it.unit_price) }}</p>
            </div>
            <p class="font-medium">{{ formatOMR(it.unit_price * it.quantity) }}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="lucide:map-pin" class="h-5 w-5 " />
              <CardTitle>Delivery Addresses</CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="outline" size="sm" class="w-8 h-8 p-0" aria-label="Add address" @click="openAddAddress">
                    <Icon name="lucide:plus" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add address</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="addressesPending" class="space-y-3">
            <Skeleton class="h-24 w-full" />
            <Skeleton class="h-24 w-full" />
          </div>
          <div v-else-if="addresses.length === 0" class="text-sm text-muted-foreground">No addresses saved.</div>
          <div v-else class="space-y-3">
            <div v-for="a in addresses" :key="a.id" class="rounded-xl border p-4 md:p-5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 space-y-2">
                  <div class="flex items-center gap-2">
                    <Icon name="lucide:user" class="h-4 w-4" />
                    <p class="font-medium text-foreground">{{ a.full_name }}</p>
                    <Badge v-if="a.is_default" variant="outline">Default</Badge>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="lucide:phone" class="h-4 w-4" />
                    <span>{{ formatOmanPhone(a.phone) }}</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm text-muted-foreground">
                    <Icon name="lucide:home" class="h-4 w-4 mt-0.5" />
                    <div class="space-y-0.5">
                      <p>{{ a.address_line_1 }}</p>
                      <p v-if="a.address_line_2">{{ a.address_line_2 }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="lucide:map-pin" class="h-4 w-4" />
                    <span>{{ a.city }}, {{ a.state }} {{ a.postal_code }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="lucide:globe" class="h-4 w-4" />
                    <span>{{ a.country }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <TooltipProvider v-if="!a.is_default">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="outline" size="icon-sm" aria-label="Make default" @click="setDefaultClick(a.id)">
                          <Icon name="lucide:star" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Make default</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="outline" size="icon-sm" aria-label="Edit" @click="openEditAddress(a)">
                          <Icon name="lucide:pencil" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="outline" size="icon-sm" class="text-destructive" aria-label="Delete" @click="removeAddressClick(a.id)">
                          <Icon name="lucide:trash-2" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Icon name="lucide:shopping-bag" class="h-5 w-5 " />
            <CardTitle>Recent Orders</CardTitle>
          </div>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="ordersPending" class="space-y-3">
            <Skeleton class="h-20 w-full" />
            <Skeleton class="h-20 w-full" />
          </div>
          <div v-else-if="orders.length === 0" class="text-sm text-muted-foreground">No recent orders.</div>
          <div v-else class="space-y-3">
            <div v-for="o in orders" :key="o.order.id" class="rounded-xl border p-4 md:p-5">
              <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] items-center gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
                    <span>{{ new Date(o.order.created_at).toLocaleDateString() }}</span>
                    <span>•</span>
                    <span>Order #{{ String(o.order.id).slice(-6) }}</span>
                  </div>
                  <p class="text-sm font-medium">{{ o.itemsCount }} products</p>
                  <div class="flex items-center gap-2 mt-2">
                    <Badge :class="['gap-1', statusBadgeClass(o.order.status)]">
                      <Icon :name="orderStatusIcon(o.order.status)" class="h-3.5 w-3.5" />
                      {{ orderStatusLabel(o.order.status) }}
                    </Badge>
                    <Badge variant="outline" class="gap-1">
                      <Icon :name="paymentIcon(o.order.payment_method)" class="h-3.5 w-3.5" />
                      {{ o.order.payment_method === 'cod' ? 'COD' : 'Online' }}
                    </Badge>
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="flex">
                    <template v-for="(it, idx) in o.items.slice(0, 5)" :key="it.product_id + ':' + idx">
                      <Avatar :class="['size-9 border bg-white', idx > 0 ? '-ml-2' : '']">
                        <AvatarImage v-if="it.thumbnail_url" :src="it.thumbnail_url" />
                        <AvatarFallback>{{ (it.name || '').slice(0,2).toUpperCase() }}</AvatarFallback>
                      </Avatar>
                    </template>
                    <Avatar v-if="o.items.length > 5" class="size-9 border bg-white -ml-2">
                      <AvatarFallback>+{{ o.items.length - 5 }}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div class="flex items-center justify-end gap-3">
                  <p class="font-semibold">{{ formatOMR(o.order.total) }}</p>
                  <Button size="sm" variant="outline" @click="openDetails(o)">
                    <Icon name="lucide:eye" class="h-4 w-4" />
                    View
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="outline" size="icon-sm"><Icon name="lucide:ellipsis" class="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem as="button" :disabled="!canCancel(o.order)" @click="askCancel(o)">Cancel Order</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            <div v-if="hasMore" class="flex justify-center">
              <Button :disabled="ordersPending || loadingMore" @click="loadMore">Load more</Button>
            </div>
          </div>
  </CardContent>
  </Card>
    </div>

    <!-- Address: Mobile bottom sheet -->
    <Sheet :open="addressDialogOpen && !isLg" @update:open="addressDialogOpen = $event">
      <SheetContent side="bottom" class="rounded-t-2xl p-4 sm:p-6 py-0 sm:py-0 pb-5">
        <SheetHeader class="pt-8 px-0">
          <SheetTitle>{{ editingAddress ? 'Edit Address' : 'Add Address' }}</SheetTitle>
        </SheetHeader>
        <AddressFormContent v-model="addressForm" :address-id="editingAddress?.id || undefined" @save="afterAddressSaved" />
      </SheetContent>
    </Sheet>

    <!-- Address: Desktop dialog -->
    <Dialog :open="addressDialogOpen && isLg" @update:open="addressDialogOpen = $event">
      <DialogContent class="rounded-xl">
        <DialogHeader>
          <DialogTitle>{{ editingAddress ? 'Edit Address' : 'Add Address' }}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <AddressFormContent v-model="addressForm" :address-id="editingAddress?.id || undefined" @save="afterAddressSaved" />
      </DialogContent>
    </Dialog>

    <!-- Phone: Mobile bottom sheet -->
    <Sheet :open="phoneDialogOpen && !isLg" @update:open="phoneDialogOpen = $event">
      <SheetContent side="bottom" class="rounded-t-2xl p-4 sm:p-6 py-0 sm:py-0 pb-5">
        <SheetHeader class="pt-8 px-0">
          <SheetTitle>Edit Phone</SheetTitle>
        </SheetHeader>
        <PhoneEditContent v-model="phoneInput" @save="afterPhoneSaved" />
      </SheetContent>
    </Sheet>

    <!-- Phone: Desktop dialog -->
    <Dialog :open="phoneDialogOpen && isLg" @update:open="phoneDialogOpen = $event">
      <DialogContent class="rounded-xl">
        <DialogHeader>
          <DialogTitle>Edit Phone</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <PhoneEditContent v-model="phoneInput" @save="afterPhoneSaved" />
      </DialogContent>
    </Dialog>
    <AlertDialog :open="confirmCancelOpen" @update:open="(v) => confirmCancelOpen = v">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to cancel this order?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="cancelling">No, Keep Order</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground" :disabled="cancelling" @click="performCancel">Yes, Cancel Order</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
