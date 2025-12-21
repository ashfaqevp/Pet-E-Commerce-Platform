<script setup lang="ts">
import { navigateTo } from '#imports'
const authStore = useAuthStore()
const { loginWithGoogle } = useAuth()

const onUpdateOpen = (v: boolean) => {
  authStore.showAuthDialog = v
  if (!v) navigateTo('/')
}
</script>

<template>
  <Dialog :open="authStore.showAuthDialog" @update:open="onUpdateOpen">
    <DialogContent class="rounded-xl">
      <DialogHeader>
        <DialogTitle>Sign in to continue</DialogTitle>
        <DialogDescription>
          Please sign in to add items to cart
        </DialogDescription>
      </DialogHeader>

      <Button class="w-full" @click="loginWithGoogle">
        Continue with Google
      </Button>
    </DialogContent>
  </Dialog>
</template>
