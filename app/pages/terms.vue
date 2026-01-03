<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Terms of Service' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Terms of Service'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Legal', href: '/legal' }, { label: 'Terms of Service' }]

useSeoMeta({
  title: 'Terms of Service | Buypets.om',
  description: 'User obligations, ordering and payment terms, and delivery policy.',
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Terms of Service'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Terms of Service</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-6 text-sm sm:text-base text-muted-foreground">
          <section>
            <h2 class="text-foreground font-semibold">User obligations</h2>
            <p>Provide accurate information, keep account secure, and follow local regulations.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">Ordering & payment</h2>
            <p>Orders are confirmed upon payment authorization. Prices and availability may change.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">Delivery & cancellation</h2>
            <p>Delivery timelines are estimates. Cancellation is possible before dispatch.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">Limitation of liability</h2>
            <p>We are not liable for indirect, incidental, or consequential damages.</p>
          </section>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

