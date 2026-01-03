<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'About' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'About'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'About' }]

useSeoMeta({
  title: 'About Us | Buypets.om',
  description: 'Learn about Black Horse Authentic LLC — pet shop in Oman, Al Seeb Souq.',
})

interface ProductType { id: string; label: string }
const PRODUCT_TYPES: ReadonlyArray<ProductType> = [
  { id: 'food', label: 'Food & Nutrition' },
  { id: 'treats', label: 'Treats & Supplements' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'grooming', label: 'Grooming & Hygiene' },
  { id: 'accessories', label: 'Accessories & Essentials' },
  { id: 'equipment', label: 'Equipment & Hardware' },
  { id: 'habitat', label: 'Tanks, Cages & Habitat' },
] as const
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'About'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Black Horse Authentic LLC</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 text-sm sm:text-base text-muted-foreground">
          <p class="text-foreground">Parent company: Black Horse Authentic LLC</p>
          <p class="text-foreground">Pets shop — Sultanate of Oman</p>
          <p class="text-foreground">Location: Al Seeb Souq</p>
          <p class="text-foreground">WhatsApp: +968 7918 8368</p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink to="https://www.instagram.com/black_horse_authentic/?" external target="_blank">
            <Button variant="outline">Instagram</Button>
          </NuxtLink>
          <NuxtLink to="https://www.facebook.com/p/Black-Horse-Authentic-100071719360687/" external target="_blank">
            <Button variant="outline">Facebook</Button>
          </NuxtLink>
        </div>
      </CardContent>
    </Card>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 text-sm sm:text-base text-muted-foreground">
          <p class="text-foreground">We operate a modern e‑commerce store delivering pet products across Oman.</p>
          <p class="text-foreground">Our catalog covers core categories to support everyday pet care.</p>
        </div>
        <ul class="mt-4 list-disc pl-6">
          <li v-for="t in PRODUCT_TYPES" :key="t.id" class="text-foreground">{{ t.label }}</li>
        </ul>
      </CardContent>
    </Card>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Delivery & Service</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 text-sm sm:text-base text-muted-foreground">
          <p class="text-foreground">Coverage: Muscat and selected regions nationwide.</p>
          <p class="text-foreground">Typical delivery: 1–3 business days depending on area.</p>
          <p class="text-foreground">Payment: Online payments and Cash on Delivery for eligible orders.</p>
          <p class="text-foreground">If a delivery fails, we contact you to reschedule promptly.</p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink to="/support"><Button>Support</Button></NuxtLink>
          <NuxtLink to="/shipping"><Button variant="outline">Shipping</Button></NuxtLink>
          <NuxtLink to="/faq"><Button variant="outline">FAQ</Button></NuxtLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
