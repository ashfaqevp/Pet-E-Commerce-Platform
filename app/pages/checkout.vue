<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseUser, useSupabaseClient, navigateTo, useHead, useState, useSeoMeta } from '#imports'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'vue-sonner'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { useAddresses, type AddressRow } from '@/composables/useAddresses'
import { useCheckoutOrder } from '@/composables/useCheckoutOrder'
import PageHeader from '@/components/common/PageHeader.vue'
import AddressFormContent from '@/components/profile/AddressFormContent.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Checkout' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Checkout'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Checkout' }]

useSeoMeta({
  title: 'Checkout | Buypets.om',
  description: 'Secure checkout for your pet products order.',
  robots: 'noindex, nofollow',
})

const user = useSupabaseUser()
watchEffect(() => {
  if (!user.value) useAuthStore().requireAuth()
})

const { loadCartWithProducts } = useCart()
const { listAddresses, setDefault } = useAddresses()

const { data: itemsData, pending: itemsPending, error: itemsError, refresh: refreshItems } = await useLazyAsyncData(
  'checkout-cart',
  async () => {
    if (!user.value) return []
    return await loadCartWithProducts()
  },
  { server: true }
)

const { data: addressesData, pending: addressesPending, error: addressesError, refresh: refreshAddresses } = await useLazyAsyncData(
  'checkout-addresses',
  async () => {
    if (!user.value) return []
    return await listAddresses()
  },
  { server: true }
)

watchEffect(async () => {
  if (user.value) {
    await refreshItems()
    await refreshAddresses()
  }
})

const items = computed(() => (itemsData.value as CartItemWithProduct[]) || [])
const addresses = computed(() => (addressesData.value as AddressRow[]) || [])
const defaultAddress = computed(() => addresses.value.find(a => a.is_default) || addresses.value[0] || null)
const selectedAddressId = ref<string | null>(null)
const paymentMethod = ref<'online' | 'cod'>('cod')
const addressDialogOpen = ref(false)
const addressForm = ref({
  full_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Oman',
  is_default: true,
})
watchEffect(() => {
  if (!selectedAddressId.value) selectedAddressId.value = defaultAddress.value?.id || null
})
const hasDefaultAddress = computed(() => addresses.value.some(a => a.is_default))
const selectedAddress = computed(() => addresses.value.find(a => a.id === selectedAddressId.value) || null)
const goToProfile = () => navigateTo('/profile')
const setSelectedAsDefault = async () => {
  if (!selectedAddressId.value) return
  await setDefault(selectedAddressId.value)
  await refreshAddresses()
}

const onAddressSaved = async () => {
  addressDialogOpen.value = false
  await refreshAddresses()
  selectedAddressId.value = addresses.value[0]?.id || null
}

const round3 = (v: number) => Math.round(v * 1000) / 1000
const subtotal = computed(() => items.value.reduce((sum, i) => sum + Number(i.product.retail_price || 0) * Number(i.quantity || 1), 0))

interface SiteConfigRow { shipping_fee: number; tax_rate: number }
const { data: configData } = await useLazyAsyncData(
  'checkout-site-config',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('site_config')
      .select('shipping_fee, tax_rate')
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) throw error
    const row = (data?.[0] ?? null) as Partial<SiteConfigRow> | null
    return {
      shipping_fee: Number(row?.shipping_fee ?? 10),
      tax_rate: Number(row?.tax_rate ?? 0.05),
    } as SiteConfigRow
  },
  { server: true }
)
const siteConfig = computed<SiteConfigRow>(() => (configData.value as SiteConfigRow) || { shipping_fee: 10, tax_rate: 0.05 })

const shipping = computed(() => (items.value.length ? siteConfig.value.shipping_fee : 0))
const tax = computed(() => round3(subtotal.value * siteConfig.value.tax_rate))
const total = computed(() => round3(subtotal.value + shipping.value + tax.value))
const taxLabel = computed(() => `Tax (${Math.round((siteConfig.value.tax_rate || 0) * 100)}%)`)

const { create, creating } = useCheckoutOrder()
const isPlaceDisabled = computed(() => (
  creating.value ||
  itemsPending.value ||
  addressesPending.value ||
  items.value.length === 0 ||
  !selectedAddressId.value
))

interface PayTabsCreateResponse {
  redirect_url?: string
  tran_ref?: string
  payment_result?: {
    response_status?: string
  }
}

const pay = async (orderId: string) => {
  const res = await $fetch<PayTabsCreateResponse>('/api/paytabs/create', {
    method: 'POST',
    body: { orderId },
  })
  if (res.redirect_url) {
    console.info('[paytabs:create] redirecting', { url: res.redirect_url })
    window.location.href = res.redirect_url
    return
  }
  console.info('[paytabs:create] no redirect_url, sending to return page')
  navigateTo('/payment/return')
}

const placeOrder = async () => {
  if (!user.value) {
    toast.error('Please sign in')
    return
  }
  if (!items.value.length) {
    toast.error('Cart is empty')
    return
  }
  if (!selectedAddressId.value) {
    toast.error('Select a delivery address')
    return
  }
  try {
    const orderId = await create(selectedAddressId.value, { shippingFee: siteConfig.value.shipping_fee, taxRate: siteConfig.value.tax_rate }, paymentMethod.value)
    if (process.client) {
      localStorage.setItem('last_order_id', orderId)
    }
    if (paymentMethod.value === 'online') {
      toast.success('Order created')
      await pay(orderId)
    } else {
      toast.success('Order created')
      navigateTo('/orders/success')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Order failed'
    toast.error(msg)
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
    <PageHeader :title="'Checkout'" :items="breadcrumbs" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-4">
      <div class="lg:col-span-2 space-y-4 sm:space-y-6">
        <Card class="bg-white rounded-xl border">
          <CardHeader>
            <CardTitle class="text-secondary">Delivery Address</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-if="addressesPending">
              <Skeleton class="h-10 w-full" />
            </div>
            <Alert v-else-if="addressesError" variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ addressesError.message }}</AlertDescription>
            </Alert>
            <div v-else-if="addresses.length === 0" class="space-y-3">
              <TableEmpty>No addresses found.</TableEmpty>
              <Dialog v-model:open="addressDialogOpen">
                <DialogTrigger as-child>
                  <Button variant="default" class="w-full">Add Delivery Address</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle class="text-secondary">Add Delivery Address</DialogTitle>
                  </DialogHeader>
                  <AddressFormContent v-model="addressForm" @save="onAddressSaved" />
                </DialogContent>
              </Dialog>
            </div>
            <div v-else class="space-y-3">
              <!-- <Label class="text-sm">Select address</Label> -->
              <Select v-model="selectedAddressId">
                <SelectTrigger class="bg-white">
                  <SelectValue placeholder="Choose address" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="a in addresses" :key="a.id" :value="a.id">{{ a.full_name }} — {{ a.city }}</SelectItem>
                </SelectContent>
              </Select>
              <Alert v-if="!hasDefaultAddress" variant="default">
                <AlertTitle>No default address</AlertTitle>
                <AlertDescription>
                  Select an address and set it as default for faster checkout.
                </AlertDescription>
              </Alert>
              <div v-if="selectedAddressId" class="text-sm text-muted-foreground rounded-lg border bg-muted/20 p-3 space-y-2">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:user" class="w-4 h-4" />
                  <span class="font-medium text-foreground">{{ selectedAddress?.full_name }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon name="lucide:phone" class="w-4 h-4" />
                  <span>{{ selectedAddress?.phone }}</span>
                </div>
                <div class="flex items-start gap-2">
                  <Icon name="lucide:home" class="w-4 h-4 mt-0.5" />
                  <div class="space-y-0.5">
                    <p>{{ selectedAddress?.address_line_1 }}</p>
                    <p v-if="selectedAddress?.address_line_2">{{ selectedAddress?.address_line_2 }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Icon name="lucide:map-pin" class="w-4 h-4" />
                  <span>{{ selectedAddress?.city }}, {{ selectedAddress?.state }} {{ selectedAddress?.postal_code }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon name="lucide:globe" class="w-4 h-4" />
                  <span>{{ selectedAddress?.country }}</span>
                </div>
              </div>
              <div v-if="selectedAddressId" class="flex flex-wrap items-center gap-2">
                <Button variant="default" class="flex-1" size="sm" @click="setSelectedAsDefault">Use selected address</Button>
                <Button variant="outline" class="flex-1" size="sm" @click="goToProfile">Manage addresses in Profile</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        

        <Card class="bg-white rounded-xl border">
          <CardHeader>
            <CardTitle class="text-secondary">Cart Summary</CardTitle>
          </CardHeader>
          <CardContent class="w-full ">
            <Table class="max-sm:hidden w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead class="text-right w-16">Qty</TableHead>
                  <TableHead class="text-right w-24">Price</TableHead>
                  <TableHead class="text-right w-28">Total</TableHead>
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
                <TableRow v-else-if="items.length === 0">
                  <TableCell colspan="4">
                    <TableEmpty>Your cart is empty</TableEmpty>
                  </TableCell>
                </TableRow>
                <TableRow v-else v-for="i in items" :key="i.id">
                  <TableCell>
                    <div class="flex items-center gap-4 min-w-0">
                      <Avatar class="size-10 rounded-md">
                        <AvatarImage v-if="i.product.thumbnail_url" :src="String(i.product.thumbnail_url)" alt="product" />
                        <AvatarFallback>IMG</AvatarFallback>
                      </Avatar>
                      <span class="flex-1 min-w-0 truncate">{{ i.product.name }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="text-right w-16">{{ i.quantity }}</TableCell>
                  <TableCell class="text-right w-24 whitespace-nowrap">{{ formatOMR(Number(i.product.retail_price || 0)) }}</TableCell>
                  <TableCell class="text-right w-28 whitespace-nowrap">{{ formatOMR(Number(i.product.retail_price || 0) * Number(i.quantity || 1)) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div class="sm:hidden space-y-3">
              <div v-if="itemsPending">
                <Skeleton class="h-10 w-full" />
              </div>
              <Alert v-else-if="itemsError" variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ itemsError.message }}</AlertDescription>
              </Alert>
              <div v-else-if="items.length === 0">
                <TableEmpty>Your cart is empty</TableEmpty>
              </div>
              <div v-else v-for="i in items" :key="i.id" class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <Avatar class="size-10 rounded-md">
                    <AvatarImage v-if="i.product.thumbnail_url" :src="String(i.product.thumbnail_url)" alt="product" />
                    <AvatarFallback>IMG</AvatarFallback>
                  </Avatar>
                  <div>
                    <div class="text-sm font-medium max-w-[180px] truncate">{{ i.product.name }}</div>
                    <div class="text-xs text-muted-foreground">{{ formatOMR(Number(i.product.retail_price || 0)) }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium">x{{ i.quantity }}</div>
                  <div class="text-sm">{{ formatOMR(Number(i.product.retail_price || 0) * Number(i.quantity || 1)) }}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4 sm:space-y-6">
        <Card class="bg-white rounded-xl border">
          <CardHeader>
            <CardTitle class="text-secondary">Payment Method</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <RadioGroup v-model="paymentMethod" class="grid gap-3">
              <Label for="pm-cod" class="block">
                <div class="flex items-start gap-3 rounded-lg border px-4 py-3 hover:bg-muted transition">
                  <RadioGroupItem id="pm-cod" value="cod" />
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">Cash on Delivery (COD)</span>
                    </div>
                    <p class="text-sm text-muted-foreground">Pay with cash upon delivery. No online payment required.</p>
                  </div>
                </div>
              </Label>
              <Label for="pm-online" class="block">
                <div class="flex items-start gap-3 rounded-lg border px-4 py-3 opacity-60 cursor-not-allowed">
                  <RadioGroupItem id="pm-online" value="online" disabled />
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">Online Payment</span>
                      <Badge variant="warning">
                        <Icon name="lucide:alert-triangle" class="w-4 h-4" />
                        Currently Unavailable
                      </Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">Online payment is currently not available.</p>
                  </div>
                </div>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
        <Card class="bg-white rounded-xl border h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle class="text-secondary">Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <span>Subtotal</span>
              <span class="font-medium">{{ formatOMR(subtotal) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Delivery Fee</span>
              <span class="font-medium">{{ formatOMR(shipping) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ taxLabel }}</span>
              <span class="font-medium">{{ formatOMR(tax) }}</span>
            </div>
            <Separator />
            <div class="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{{ formatOMR(total) }}</span>
            </div>
            <Button
              class="mt-4 w-full"
              :disabled="isPlaceDisabled"
              @click="placeOrder"
            >
              <span v-if="creating">Placing order...</span>
              <span v-else>Confirm & Place Order</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    <!-- <div class="fixed bottom-0 left-0 right-0 sm:hidden border-t bg-white p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm">Total</span>
        <span class="text-lg font-bold">{{ formatOMR(total) }}</span>
      </div>
      <Button class="w-full" :disabled="isPlaceDisabled" @click="placeOrder">
        <span v-if="creating">Placing order...</span>
        <span v-else>Confirm & Place Order</span>
      </Button>
    </div> -->
  </div>
</template>
