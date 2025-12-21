<script setup lang="ts">
import { definePageMeta, navigateTo } from '#imports'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

definePageMeta({ layout: 'default' })

const retryCheckout = () => navigateTo('/checkout')
const goCart = () => navigateTo('/cart')
</script>

<template>
  <div class="container mx-auto px-4 py-6 sm:py-10">
    <Card class="bg-white rounded-xl border">
      <CardHeader>
        <CardTitle class="text-secondary">Payment Failed</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>We couldn’t complete your payment</AlertTitle>
          <AlertDescription>Please review your payment details or try a different method.</AlertDescription>
        </Alert>
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <Button class="w-full sm:w-auto" @click="retryCheckout">Try Again</Button>
          <Button variant="outline" class="w-full sm:w-auto" @click="goCart">Go to Cart</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

