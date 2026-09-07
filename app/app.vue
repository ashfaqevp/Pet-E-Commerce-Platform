<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NuxtRouteAnnouncer />
  <Toaster richColors position="top-right" />

  <!--
    The sign-in dialog is on every page but shown on almost none of them — it
    appears only when something demands auth (adding to a cart while signed out,
    reaching /checkout). Mounting it eagerly put it, and the whole Dialog stack it
    pulls in, into the entry chunk that first paint has to parse.

    `Lazy` + `v-if` fetches that chunk on first open instead. The flag latches on
    rather than tracking the store directly, so closing the dialog unmounts
    nothing and its close animation still plays; reopening is instant.

    `ClientOnly` because /profile and /checkout call `requireAuth()` from a
    `watchEffect`, which runs during the server render too — so the server would
    start resolving the async component while the client mounts it for real, and
    the two disagree. A sign-in dialog has nothing to offer a crawler and cannot
    be interacted with before hydration, so rendering it server-side is pure cost.
  -->
  <ClientOnly>
    <LazyAuthGateDialog v-if="authDialogMounted" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const authStore = useAuthStore()
const authDialogMounted = ref(false)
watch(
  () => authStore.showAuthDialog,
  (open) => { if (open) authDialogMounted.value = true },
  { immediate: true },
)
</script>

<style src="./assets/css/main.css"></style>
