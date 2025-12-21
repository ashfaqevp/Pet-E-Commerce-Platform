<script setup lang="ts">
import { definePageMeta, useSupabaseClient, useLazyAsyncData, navigateTo } from '#imports'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()

type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'
interface OrderLite { id: string; payment_status: PaymentStatus | null }

const { data, pending, error } = await useLazyAsyncData(
  'payment-return-status',
  async (): Promise<{ status: PaymentStatus | null; reason?: string }> => {
    const orderId = process.client ? localStorage.getItem('last_order_id') : null
    console.info('[payment:return] orderId', orderId)
    if (!orderId) return { status: null, reason: 'no-order-id' }

    // Poll DB briefly to allow webhook to arrive
    let status: PaymentStatus | null = null
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from('orders')
        .select('id,payment_status')
        .eq('id', orderId as string)
        .single()
      if (error) {
        console.error('[payment:return] load error', error.message)
        break
      }
      const order = data as unknown as OrderLite
      status = (order?.payment_status || null) as PaymentStatus | null
      console.info('[payment:return] order status', status)
      if (status === 'paid' || status === 'failed') break
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    return { status }
  },
  { server: false }
)

watchEffect(() => {
  if (pending.value) return

  const status = data.value?.status
  console.info('[payment:return] final status', status)

  if (status === 'paid') {
    navigateTo('/orders/success')
    return
  }

  if (status === 'failed') {
    navigateTo('/orders/failed')
    return
  }

  // still pending → stay on page
})

</script>

<template>
  <div class="container mx-auto px-4 py-6 sm:py-10">
    <Card class="bg-white rounded-xl border">
      <CardHeader>
        <CardTitle class="text-secondary">Processing Payment</CardTitle>
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
          <p class="text-muted-foreground text-sm">Verifying your payment status...</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
