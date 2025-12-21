<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NuxtRouteAnnouncer />
  <Toaster richColors position="top-right" />
  <AuthGateDialog />
  <PhoneRequiredDialog />
</template>

<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
</script>

<style src="./assets/css/main.css"></style>
