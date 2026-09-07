<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseUser, navigateTo, useHead, useState, useSeoMeta } from '#imports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default', title: 'Cart' })
useHead({ title: 'Cart' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Cart'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Cart' }]

useSeoMeta({
  title: 'Cart | Buypets.om',
  description: 'View items in your cart and proceed to checkout.',
  robots: 'noindex, nofollow',
})

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

/**
 * Client-only. The `useLazyAsyncData` calls above already resolved the right list
 * during the server render; refreshing again there re-marks them pending, so the
 * server writes a loading skeleton into HTML whose own payload already carries
 * the items. Vue then finds a skeleton where it expects a cart and discards the
 * server render.
 */
if (import.meta.client) {
  watchEffect(() => { refreshCartList() })
}

// Sync is handled globally by auth plugin to avoid double merges

const hydrated = ref(false)
onMounted(() => { hydrated.value = true })
/**
 * A guest's cart lives in localStorage, which the server cannot read — so its
 * `useLazyAsyncData` is `server: false` and there is genuinely nothing to render
 * until the browser takes over. Reporting "loading" until then is what makes the
 * server's HTML and the browser's first pass agree; without it the server writes
 * an empty cart and the client hydrates a skeleton over it.
 *
 * A signed-in cart is fetched server-side and needs none of this.
 */
const pending = computed(() => {
  if (!supabaseUser.value) return !hydrated.value || guestPending.value
  return serverPending.value
})
const error = computed(() => (supabaseUser.value ? serverError.value : guestError.value))
const items = computed(() => (supabaseUser.value ? (serverData.value as CartItemWithProduct[]) || [] : (guestData.value as CartItemWithProduct[]) || []))

// Same session-wide role the product cards read, resolved server-side before the
// HTML is written. This page used to query `profiles` itself under a separate
// asyncData key, which duplicated the lookup and could disagree with a card.
const userRole = useUserRole()

const qtyById = ref<Record<string, number>>({})
watchEffect(() => {
  const map: Record<string, number> = {}
  for (const i of items.value) map[i.id] = Math.max(1, i.quantity ?? 1)
  qtyById.value = map
})

const loadingById = ref<Record<string, boolean>>({})
const isItemLoading = (id: string) => !!loadingById.value[id]
const setItemLoading = (id: string, v: boolean) => { loadingById.value[id] = v }

const formatOMR = (v: number) => new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR', minimumFractionDigits: 2 }).format(v)

const unitPriceOf = (p: CartItemWithProduct['product']) => {
  const r = p.retail_price
  const w = p.wholesale_price
  if (userRole.value === 'wholesaler' && w != null) return Number(w || 0)
  return Number(r || 0)
}
const subtotal = computed(() => items.value.reduce((sum, i) => sum + unitPriceOf(i.product) * Number(qtyById.value[i.id] ?? i.quantity ?? 1), 0))

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
    <PageHeader :title="'Cart'" :items="breadcrumbs" />

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
                  <div class="relative py-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="absolute right-3 top-3 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="isItemLoading(item.id) || pending"
                      aria-label="Remove from cart"
                      @click="onRemove(item)"
                    >
                      <Icon name="lucide:trash"/>
                    </Button>
                    <img :src="productImage(item.product.thumbnail_url, 'cartThumb')" alt="Product image" width="80" height="80" loading="lazy" decoding="async" class="w-20 h-20 object-cover rounded-lg" />
                    <div class="flex-1">
                      <h4 class="font-medium text-foreground">{{ item.product.name }}</h4>
                      <p class="text-sm text-muted-foreground">{{ formatOMR(unitPriceOf(item.product)) }}</p>
                      <div class="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          class="rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
                          :disabled="isItemLoading(item.id) || pending"
                          aria-label="Decrease quantity"
                          @click="onDec(item)"
                        >
                          <Icon name="lucide:minus"/>
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          inputmode="numeric"
                          class="w-16 text-center"
                          v-model.number="qtyById[item.id]"
                          :default-value="item.quantity ?? 1"
                          :disabled="isItemLoading(item.id) || pending"
                          aria-label="Quantity"
                          @change="onQtyCommit(item)"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          class="rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
                          :disabled="isItemLoading(item.id) || pending"
                          aria-label="Increase quantity"
                          @click="onInc(item)"
                        >
                          <Icon name="lucide:plus"/>
                        </Button>
                      </div>
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
