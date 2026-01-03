<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'FAQ' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'FAQ'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'FAQ' }]

useSeoMeta({
  title: 'FAQ | Buypets.om',
  description: 'Answers to common questions about ordering, payment, and shipping.',
})

interface FaqItem { q: string; a: string }
const items: FaqItem[] = [
  { q: 'How do I place an order?', a: 'Browse products, add to cart, and checkout with your preferred payment method.' },
  { q: 'What payment methods are supported?', a: 'Online payments and Cash on Delivery where available.' },
  { q: 'How long does delivery take?', a: 'Orders in Muscat typically deliver within 1–2 days; other areas may vary.' },
  { q: 'How do I track my order?', a: 'You can view order status in your profile under Orders.' },
]
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'FAQ'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Frequently Asked Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem v-for="(it, idx) in items" :key="idx" :value="String(idx)">
            <AccordionTrigger class="text-foreground">{{ it.q }}</AccordionTrigger>
            <AccordionContent class="text-muted-foreground">{{ it.a }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  </div>
</template>

