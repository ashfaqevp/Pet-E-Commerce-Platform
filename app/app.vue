<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NuxtRouteAnnouncer />
  <Toaster richColors position="top-right" />
  <AuthGateDialog />
</template>

<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
</script>

<style src="./assets/css/main.css"></style>
