<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Contact' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Contact'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Contact' }]

useSeoMeta({
  title: 'Contact | Buypets.om',
  description: 'Reach our support team by email or WhatsApp.',
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Contact'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Get in touch</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 text-sm sm:text-base text-muted-foreground">
          <p class="text-foreground">Email: support@buypets.om</p>
          <p class="text-foreground">WhatsApp: +968 7918 8368</p>
          <p class="text-foreground">Business hours: 10:00–22:00 (Oman)</p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink to="mailto:support@buypets.om">
            <Button>Email us</Button>
          </NuxtLink>
          <NuxtLink to="https://wa.me/96879188368" external target="_blank">
            <Button variant="outline">Open WhatsApp</Button>
          </NuxtLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

