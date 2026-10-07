<script setup lang="ts">
import { definePageMeta, navigateTo, onMounted, onUnmounted } from '#imports'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/composables/useCart'
import { useAnalytics } from '@/composables/useAnalytics'

definePageMeta({ layout: 'default' })

interface LastOrder {
  id: string
  total: number
  guest: boolean
  fromCart: boolean
  handled?: boolean
  items: { product_id: string; product_name: string; unit_price: number; quantity: number }[]
}

const { clearCart } = useCart()
const { trackPurchase } = useAnalytics()

/**
 * Checkout leaves the order summary in localStorage — a guest cannot read the
 * order back from the database, so this page never queries it. The cart is
 * emptied here rather than at checkout so a failed online payment keeps it, and
 * only for a cart order: Buy Now leaves the cart alone. `handled` stops a reload
 * from clearing the cart or counting the purchase twice.
 */
const { data, pending, error } = await useLazyAsyncData<LastOrder | null>(
  'orders-success',
  async () => {
    let order: LastOrder | null = null
    try {
      order = JSON.parse(localStorage.getItem('last_order') || 'null') as LastOrder | null
    } catch {
      return null
    }
    if (!order || order.handled) return order

    if (order.fromCart) {
      // The order is already placed; a cart that fails to clear must not hide that.
      try { await clearCart() } catch (e) { console.warn('[orders:success] cart not cleared', e) }
    }
    trackPurchase({
      transaction_id: order.id,
      value: order.total,
      items: order.items.map(i => ({ id: i.product_id, name: i.product_name, price: i.unit_price, quantity: i.quantity })),
    })
    order.handled = true
    localStorage.setItem('last_order', JSON.stringify(order))
    return order
  },
  { server: false }
)

const orderRef = computed(() => (data.value?.id ? data.value.id.slice(0, 8) : null))
const isGuestOrder = computed(() => !!data.value?.guest)

let confettiTimer: ReturnType<typeof setTimeout> | null = null
onMounted(async () => {
  if (process.client) {
    const { default: confetti } = await import('canvas-confetti')
    confettiTimer = setTimeout(() => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      confetti({ particleCount: 60, startVelocity: 45, ticks: 200, spread: 100, origin: { y: 0.6 } })
    }, 1000)
  }
})
onUnmounted(() => {
  if (confettiTimer) clearTimeout(confettiTimer)
})

const goOrders = () => navigateTo('/profile')
const continueShopping = () => navigateTo('/products')
</script>

<template>
  <div class="container mx-auto px-4 py-6 sm:py-10">
    <Card class="bg-white rounded-xl border">
      <CardHeader>
        <CardTitle class="text-secondary">Order Successful</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-if="pending" class="space-y-2">
          <Skeleton class="h-6 w-48" />
          <Skeleton class="h-10 w-64" />
        </div>
        <Alert v-else-if="error" variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ error.message }}</AlertDescription>
        </Alert>
        <div v-else class="space-y-4 text-center">
          <div class="flex justify-center">
            <div class="size-20 rounded-full bg-green-600/10 ring-4 ring-green-600/20 grid place-items-center">
              <Icon name="lucide:check-circle-2" class="w-12 h-12 text-green-600" />
            </div>
          </div>
          <p class="text-foreground text-lg font-semibold">Your order has been placed successfully.</p>
          <p v-if="orderRef" class="text-sm">Order number <span class="font-semibold">#{{ orderRef }}</span></p>
          <p class="text-muted-foreground text-sm">
            {{ isGuestOrder ? 'Keep this order number for reference. Thank you for your purchase.' : 'Thank you for your purchase.' }}
          </p>
          <p v-if="isGuestOrder" class="text-xs text-muted-foreground max-w-md mx-auto">
            This order was placed as a guest, so it won't appear in an account. Sign in before your next order to track it from your profile.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 pt-1 justify-center">
            <Button v-if="!isGuestOrder" class="w-full sm:w-auto" @click="goOrders">View Orders</Button>
            <Button variant="outline" class="w-full sm:w-auto" @click="continueShopping">Continue Shopping</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  </template>
