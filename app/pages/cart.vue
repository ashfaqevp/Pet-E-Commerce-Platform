<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseUser, navigateTo } from '#imports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'default' })

const { loadCartWithProducts, updateQty, removeFromCart } = useCart()
const supabaseUser = useSupabaseUser()

const { data: serverData, pending: serverPending, error: serverError, refresh: refreshServer } = await useLazyAsyncData(
  'cart-items',
  async () => {
    if (!supabaseUser.value) return []
    return await loadCartWithProducts()
  },
  { server: true }
)

const { data: guestData, pending: guestPending, error: guestError, refresh: refreshGuest } = await useLazyAsyncData(
  'guest-cart-items',
  async () => {
    if (supabaseUser.value) return []
    return await loadCartWithProducts()
  },
  { server: false }
)

watchEffect(() => {
  if (supabaseUser.value) refreshServer()
  else refreshGuest()
})

const pending = computed(() => (supabaseUser.value ? serverPending.value : guestPending.value))
const error = computed(() => (supabaseUser.value ? serverError.value : guestError.value))
const items = computed(() => (supabaseUser.value ? (serverData.value as CartItemWithProduct[]) || [] : (guestData.value as CartItemWithProduct[]) || []))
const subtotal = computed(() => items.value.reduce((sum, i) => sum + ((i.product.retail_price ?? 0) * (i.quantity ?? 1)), 0))

const onInc = async (item: CartItemWithProduct) => {
  const next = (item.quantity ?? 1) + 1
  try { await updateQty(item.id, next); toast.success('Quantity updated'); if (supabaseUser.value) refreshServer(); else refreshGuest() } catch { toast.error('Failed to update') }
}
const onDec = async (item: CartItemWithProduct) => {
  const next = Math.max(1, (item.quantity ?? 1) - 1)
  try { await updateQty(item.id, next); toast.success('Quantity updated'); if (supabaseUser.value) refreshServer(); else refreshGuest() } catch { toast.error('Failed to update') }
}
const onRemove = async (item: CartItemWithProduct) => {
  try { await removeFromCart(item.id); toast.success('Removed from cart'); if (supabaseUser.value) refreshServer(); else refreshGuest() } catch { toast.error('Failed to remove') }
}

const goCheckout = () => {
  if (!supabaseUser.value) {
    useAuthStore().requireAuth()
    return
  }
  navigateTo('/checkout')
}
</script>


<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Cart</h1>

    <div v-if="pending" class="space-y-4">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-24 w-full" />
    </div>

    <Alert v-else-if="error">
      <AlertTitle>Error loading cart</AlertTitle>
      <AlertDescription>Try again later.</AlertDescription>
    </Alert>

    <div v-else class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <div v-if="!items.length" class="bg-white rounded-xl border p-6 text-gray-600">
          Your cart is empty. <NuxtLink to="/" class="text-teal-700 underline">Continue shopping</NuxtLink>
        </div>

        <div v-else>
          <div v-for="item in items" :key="item.id" class="bg-white rounded-xl border p-4 flex gap-4 items-center">
            <img :src="item.product.thumbnail_url || '/images/placeholder.svg'" alt="Product" class="w-20 h-20 object-cover rounded" />
            <div class="flex-1">
              <h4 class="font-semibold">{{ item.product.name }}</h4>
              <p class="text-sm text-muted-foreground">OMR {{ (item.product.retail_price ?? 0).toFixed(3) }}</p>
              <div class="flex items-center gap-3 mt-2">
                <Button variant="outline" class="w-8 h-8 rounded-full grid place-items-center" @click="onDec(item)"><Icon name="lucide:minus"/></Button>
                <Input type="number" min="1" class="w-16 text-center" v-model.number="item.quantity" @change="updateQty(item.id, item.quantity).then(()=>{ toast.success('Quantity updated'); if (supabaseUser) refreshServer(); else refreshGuest() }).catch(()=>toast.error('Failed to update'))" />
                <Button variant="outline" class="w-8 h-8 rounded-full grid place-items-center" @click="onInc(item)"><Icon name="lucide:plus"/></Button>
              </div>
            </div>
            <div class="text-right">
              <Button variant="ghost" class="mt-2 text-gray-500" @click="onRemove(item)"><Icon name="lucide:trash"/></Button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-6 h-fit">
        <h3 class="text-lg font-bold mb-4">Order Summary</h3>
        <div class="space-y-3">
          <div class="flex justify-between"><span>Items:</span><span>{{ items.length }}</span></div>
          <div class="flex justify-between"><span>Subtotal:</span><span>OMR {{ subtotal.toFixed(3) }}</span></div>
          <Button class="w-full mt-4" @click="goCheckout">Checkout</Button>
        </div>
      </div>
    </div>
  </div>
  
</template>
