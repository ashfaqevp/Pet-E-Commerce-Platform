<script setup lang="ts">
const authStore = useAuthStore()
const { loginWithGoogle } = useAuth()
</script>

<template>
  <Dialog :open="authStore.showAuthDialog" @update:open="authStore.showAuthDialog = $event">
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
