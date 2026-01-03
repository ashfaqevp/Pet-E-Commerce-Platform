<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Legal' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Legal'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Legal' }]

useSeoMeta({
  title: 'Legal | Buypets.om',
  description: 'Overview of Terms of Service and Privacy Policy.',
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Legal'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Legal Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm sm:text-base text-muted-foreground">Read our policies to understand your rights and how we use data.</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink to="/terms"><Button>Terms of Service</Button></NuxtLink>
          <NuxtLink to="/privacy"><Button variant="outline">Privacy Policy</Button></NuxtLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

