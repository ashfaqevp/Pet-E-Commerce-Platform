<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Shipping' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Shipping'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Shipping' }]

useSeoMeta({
  title: 'Shipping | Buypets.om',
  description: 'Learn about delivery coverage, timelines, charges, and Cash on Delivery.',
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Shipping'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Delivery Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 text-sm sm:text-base text-muted-foreground">
          <p class="text-foreground">Coverage: Muscat and selected areas across Oman.</p>
          <p class="text-foreground">Estimated delivery: 1–3 business days depending on location.</p>
          <p class="text-foreground">Charges: Calculated at checkout if applicable.</p>
          <p class="text-foreground">Cash on Delivery: Available for eligible orders.</p>
          <p class="text-foreground">If delivery fails: We will contact you to reschedule.</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

