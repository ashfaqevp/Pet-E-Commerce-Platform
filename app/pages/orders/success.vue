<script setup lang="ts">
import { definePageMeta, useSupabaseClient, useSupabaseUser, useLazyAsyncData, navigateTo, onMounted, onUnmounted } from '#imports'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'vue-sonner'
import { useCart } from '@/composables/useCart'

definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { refreshCart } = useCart()

const { data, pending, error } = await useLazyAsyncData(
  'orders-success-clear-cart',
  async () => {
    if (!user.value) return { cleared: false }
    const { error: clearErr } = await supabase.from('cart_items').delete().eq('user_id', user.value.id)
    if (clearErr) throw clearErr
    await refreshCart()
    return { cleared: true }
  },
  { server: false }
)

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
          <p class="text-muted-foreground text-sm">Thank you for your purchase.</p>
          <div class="flex flex-col sm:flex-row gap-3 pt-1 justify-center">
            <Button class="w-full sm:w-auto" @click="goOrders">View Orders</Button>
            <Button variant="outline" class="w-full sm:w-auto" @click="continueShopping">Continue Shopping</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  </template>
