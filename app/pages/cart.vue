<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseUser, navigateTo } from '#imports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'default' })

const { loadCartWithProducts, updateQty, removeFromCart, refreshCart } = useCart()
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

const refreshCartList = async () => {
  if (supabaseUser.value) await refreshServer()
  else await refreshGuest()
  await refreshCart()
}

watchEffect(() => { refreshCartList() })
refreshCartList()

const pending = computed(() => (supabaseUser.value ? serverPending.value : guestPending.value))
const error = computed(() => (supabaseUser.value ? serverError.value : guestError.value))
const items = computed(() => (supabaseUser.value ? (serverData.value as CartItemWithProduct[]) || [] : (guestData.value as CartItemWithProduct[]) || []))

const qtyById = ref<Record<string, number>>({})
watchEffect(() => {
  const map: Record<string, number> = {}
  for (const i of items.value) map[i.id] = Math.max(1, i.quantity ?? 1)
  qtyById.value = map
})

const loadingById = ref<Record<string, boolean>>({})
const isItemLoading = (id: string) => !!loadingById.value[id]
const setItemLoading = (id: string, v: boolean) => { loadingById.value[id] = v }

const formatOMR = (v: number) => new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR', minimumFractionDigits: 3 }).format(v)

const subtotal = computed(() => items.value.reduce((sum, i) => sum + (Number(i.product.retail_price ?? 0) * Number(qtyById.value[i.id] ?? i.quantity ?? 1)), 0))

const applyQty = async (item: CartItemWithProduct, next: number) => {
  const id = item.id
  if (isItemLoading(id)) return
  const prev = qtyById.value[id] ?? Math.max(1, item.quantity ?? 1)
  qtyById.value[id] = Math.max(1, next)
  setItemLoading(id, true)
  try {
    await updateQty(id, qtyById.value[id])
    await refreshCartList()
    toast.success('Quantity updated')
  } catch (e) {
    qtyById.value[id] = prev
    const msg = e instanceof Error ? e.message : 'Failed to update'
    toast.error(msg)
  } finally {
    setItemLoading(id, false)
  }
}

const onInc = async (item: CartItemWithProduct) => applyQty(item, (qtyById.value[item.id] ?? item.quantity ?? 1) + 1)
const onDec = async (item: CartItemWithProduct) => applyQty(item, Math.max(1, (qtyById.value[item.id] ?? item.quantity ?? 1) - 1))

const onQtyInput = (id: string, ev: Event) => {
  const el = ev.target as HTMLInputElement
  const val = Math.max(1, Number(el.value) || 1)
  qtyById.value[id] = val
}
const onQtyCommit = async (item: CartItemWithProduct) => {
  await applyQty(item, qtyById.value[item.id] ?? item.quantity ?? 1)
}

const onRemove = async (item: CartItemWithProduct) => {
  const id = item.id
  if (isItemLoading(id)) return
  setItemLoading(id, true)
  try {
    await removeFromCart(id)
    await refreshCartList()
    toast.success('Removed from cart')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to remove'
    toast.error(msg)
  } finally {
    setItemLoading(id, false)
  }
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
  <div class="container mx-auto px-4 py-6">
    <h1 class="text-2xl font-semibold">Cart</h1>

    <div class="mt-4">

    <div v-if="pending" class="space-y-4">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-24 w-full" />
    </div>

    <Alert v-else-if="error" variant="destructive">
      <AlertTitle>Error loading cart</AlertTitle>
      <AlertDescription>Try again later.</AlertDescription>
    </Alert>

    <div v-else class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle class="text-[#0f766e]">Items in Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="!items.length" class="text-gray-600">
              Your cart is empty. <NuxtLink to="/" class="text-teal-700 underline">Continue shopping</NuxtLink>
            </div>
              <div v-else>
                <template v-for="(item, idx) in items" :key="item.id">
                  <div class="py-4 flex gap-4 items-center">
                    <img :src="item.product.thumbnail_url || '/images/placeholder.svg'" alt="Product image" class="w-20 h-20 object-cover rounded" />
                    <div class="flex-1">
                      <h4 class="font-medium text-foreground">{{ item.product.name }}</h4>
                      <p class="text-sm text-muted-foreground">{{ formatOMR(Number(item.product.retail_price ?? 0)) }}</p>
                      <div class="flex items-center gap-3 mt-2">
                        <Button
                          variant="outline"
                          class="w-8 h-8 rounded-full grid place-items-center disabled:opacity-60 disabled:cursor-not-allowed"
                          :disabled="isItemLoading(item.id) || pending"
                          aria-label="Decrease quantity"
                          @click="onDec(item)"
                        >
                          <Icon name="lucide:minus"/>
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          class="w-16 text-center"
                          :value="qtyById[item.id] ?? item.quantity"
                          :disabled="isItemLoading(item.id) || pending"
                          aria-label="Quantity"
                          @input="onQtyInput(item.id, $event)"
                          @change="onQtyCommit(item)"
                        />
                        <Button
                          variant="outline"
                          class="w-8 h-8 rounded-full grid place-items-center disabled:opacity-60 disabled:cursor-not-allowed"
                          :disabled="isItemLoading(item.id) || pending"
                          aria-label="Increase quantity"
                          @click="onInc(item)"
                        >
                          <Icon name="lucide:plus"/>
                        </Button>
                      </div>
                    </div>
                    <div class="text-right">
                      <Button
                        variant="ghost"
                        class="mt-2 text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="isItemLoading(item.id) || pending"
                        aria-label="Remove from cart"
                        @click="onRemove(item)"
                      >
                        <Icon name="lucide:trash"/>
                      </Button>
                    </div>
                  </div>
                  <Separator v-if="idx < items.length - 1" class="my-4" />
                </template>
              </div>
          </CardContent>
        </Card>
      </div>

      <div class="bg-white rounded-xl border p-6 h-fit">
        <h3 class="text-lg font-medium text-foreground mb-4">Order Summary</h3>
        <div class="space-y-3">
          <div class="flex justify-between"><span>Items:</span><span>{{ items.length }}</span></div>
          <div class="flex justify-between"><span>Subtotal:</span><span>{{ formatOMR(subtotal) }}</span></div>
          <Button
            class="w-full mt-4"
            :disabled="pending || !items.length"
            aria-label="Proceed to checkout"
            @click="goCheckout"
          >
            Checkout
          </Button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
