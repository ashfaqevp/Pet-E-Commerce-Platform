<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Support' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Support'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Support' }]

useSeoMeta({
  title: 'Support | Buypets.om',
  description: 'Get help with orders, payments, delivery issues, and returns.',
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Support'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">How we can help</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm sm:text-base text-muted-foreground">Use the links below for quick answers and assistance.</p>
        <div class="mt-4 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-foreground">Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">Issues with placing orders or order updates.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-foreground">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">Payment status, failures, and refunds.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-foreground">Delivery issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">Delays, address changes, and missed deliveries.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-foreground">Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">Return eligibility and process.</p>
            </CardContent>
          </Card>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink to="/contact"><Button>Contact</Button></NuxtLink>
          <NuxtLink to="/faq"><Button variant="outline">FAQ</Button></NuxtLink>
          <NuxtLink to="/shipping"><Button variant="outline">Shipping</Button></NuxtLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

