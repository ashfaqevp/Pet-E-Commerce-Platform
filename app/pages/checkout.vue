<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseUser, navigateTo, useHead, useState } from '#imports'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableEmpty } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { toast } from 'vue-sonner'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { useAddresses, type AddressRow } from '@/composables/useAddresses'
import { useCheckoutOrder } from '@/composables/useCheckoutOrder'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Checkout' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Checkout'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Checkout' }]

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
watchEffect(() => {
  if (!selectedAddressId.value) selectedAddressId.value = defaultAddress.value?.id || null
})
const hasDefaultAddress = computed(() => addresses.value.some(a => a.is_default))
const goToProfile = () => navigateTo('/profile')
const setSelectedAsDefault = async () => {
  if (!selectedAddressId.value) return
  await setDefault(selectedAddressId.value)
  await refreshAddresses()
}

const subtotal = computed(() => items.value.reduce((sum, i) => sum + Number(i.product.retail_price || 0) * Number(i.quantity || 1), 0))
const shipping = computed(() => (items.value.length ? 10 : 0))
const tax = computed(() => Math.round(subtotal.value * 0.05 * 1000) / 1000)
const total = computed(() => Math.round((subtotal.value + shipping.value + tax.value) * 1000) / 1000)

const { create, creating } = useCheckoutOrder()

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
    const orderId = await create(selectedAddressId.value)
    if (process.client) {
      localStorage.setItem('last_order_id', orderId)
    }
    toast.success('Order created')
    await pay(orderId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Order failed'
    toast.error(msg)
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 sm:py-8">
    <PageHeader :title="'Checkout'" :items="breadcrumbs" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <Button variant="default" class="w-full" @click="goToProfile">Add address in Profile</Button>
            </div>
            <div v-else class="space-y-3">
              <Label class="text-sm">Select address</Label>
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
              <div v-if="selectedAddressId" class="text-sm text-muted-foreground">
                <p>{{ addresses.find(a => a.id === selectedAddressId)?.full_name }}</p>
                <p>{{ addresses.find(a => a.id === selectedAddressId)?.phone }}</p>
                <p>{{ addresses.find(a => a.id === selectedAddressId)?.address_line_1 }}</p>
                <p v-if="addresses.find(a => a.id === selectedAddressId)?.address_line_2">{{ addresses.find(a => a.id === selectedAddressId)?.address_line_2 }}</p>
                <p>{{ addresses.find(a => a.id === selectedAddressId)?.city }}, {{ addresses.find(a => a.id === selectedAddressId)?.state }} {{ addresses.find(a => a.id === selectedAddressId)?.postal_code }}</p>
                <p>{{ addresses.find(a => a.id === selectedAddressId)?.country }}</p>
              </div>
              <div v-if="selectedAddressId" class="flex items-center gap-2">
                <Button variant="default" size="sm" @click="setSelectedAsDefault">Use selected address</Button>
                <Button variant="outline" size="sm" @click="goToProfile">Manage addresses in Profile</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-white rounded-xl border">
          <CardHeader>
            <CardTitle class="text-secondary">Cart Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead class="text-right">Qty</TableHead>
                  <TableHead class="text-right">Price</TableHead>
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
                <TableRow v-else-if="items.length === 0">
                  <TableCell colspan="4">
                    <TableEmpty>Your cart is empty</TableEmpty>
                  </TableCell>
                </TableRow>
                <TableRow v-else v-for="i in items" :key="i.id">
                  <TableCell class="max-w-[220px] truncate">{{ i.product.name }}</TableCell>
                  <TableCell class="text-right">{{ i.quantity }}</TableCell>
                  <TableCell class="text-right">{{ formatOMR(Number(i.product.retail_price || 0)) }}</TableCell>
                  <TableCell class="text-right">{{ formatOMR(Number(i.product.retail_price || 0) * Number(i.quantity || 1)) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4 sm:space-y-6">
        <Card class="bg-white rounded-xl border h-fit">
          <CardHeader>
            <CardTitle class="text-secondary">Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <span>Subtotal</span>
              <span class="font-medium">{{ formatOMR(subtotal) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Shipping</span>
              <span class="font-medium">{{ formatOMR(shipping) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Tax (5%)</span>
              <span class="font-medium">{{ formatOMR(tax) }}</span>
            </div>
            <Separator />
            <div class="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{{ formatOMR(total) }}</span>
            </div>
            <Button
              class="mt-4 w-full"
              :disabled="creating || itemsPending || addressesPending || items.length === 0 || !selectedAddressId"
              @click="placeOrder"
            >
              <span v-if="creating">Placing order...</span>
              <span v-else>Confirm & Place Order</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
