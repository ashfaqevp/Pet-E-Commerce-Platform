<script setup lang="ts">
import { useHead, useSeoMeta, definePageMeta, useState } from '#imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Privacy Policy' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Privacy Policy'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Legal', href: '/legal' }, { label: 'Privacy Policy' }]

useSeoMeta({
  title: 'Privacy Policy | Buypets.om',
  description: 'What data we collect, how it is used, storage, and user rights.',
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Privacy Policy'" :items="breadcrumbs" />
    <Card class="mt-4">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Privacy Policy</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-6 text-sm sm:text-base text-muted-foreground">
          <section>
            <h2 class="text-foreground font-semibold">Data collection</h2>
            <p>We collect account details, order information, and usage data to operate our services.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">Use of data</h2>
            <p>Data is used to process orders, provide support, and improve the experience.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">Storage & security</h2>
            <p>Data is stored securely and access is restricted. We follow best practices.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">User rights</h2>
            <p>You may request access, correction, or deletion of your personal data.</p>
          </section>
          <section>
            <h2 class="text-foreground font-semibold">Contact</h2>
            <p>For privacy concerns, contact support@buypets.om.</p>
          </section>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

