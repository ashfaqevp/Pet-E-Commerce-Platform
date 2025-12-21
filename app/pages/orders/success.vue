<script setup lang="ts">
import { definePageMeta, useSupabaseClient, useSupabaseUser, useLazyAsyncData, navigateTo } from '#imports'
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
    toast.success('Payment successful. Cart cleared.')
    return { cleared: true }
  },
  { server: false }
)

const cleared = computed(() => Boolean(data.value?.cleared))

const goOrders = () => navigateTo('/profile')
const continueShopping = () => navigateTo('/products')
</script>

<template>
  <div class="container mx-auto px-4 py-6 sm:py-10">
    <Card class="bg-white rounded-xl border">
      <CardHeader>
        <CardTitle class="text-secondary">Payment Successful</CardTitle>
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
        <div v-else class="space-y-2">
          <p class="text-foreground font-medium">Your order has been placed successfully.</p>
          <p class="text-muted-foreground text-sm">{{ cleared ? 'Your cart has been cleared.' : 'Signed out. Sign in to view orders.' }}</p>
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <Button class="w-full sm:w-auto" @click="goOrders">View Orders</Button>
            <Button variant="outline" class="w-full sm:w-auto" @click="continueShopping">Continue Shopping</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  </template>

