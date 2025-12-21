<script setup lang="ts">
import { definePageMeta } from '#imports'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'

definePageMeta({ title: 'Sign In' })

const { loginWithGoogle } = useAuth()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="w-full max-w-sm rounded-xl border bg-white p-6 shadow">
      <h1 class="mb-4 text-xl font-semibold">Sign in</h1>
      <Button class="w-full" @click="loginWithGoogle">Continue with Google</Button>
    </div>
  </div>
</template>
