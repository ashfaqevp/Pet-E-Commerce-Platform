<script setup lang="ts">
import { navigateTo } from '#imports'
const authStore = useAuthStore()
const { loginWithGoogle } = useAuth()

const signingIn = ref(false)

const onUpdateOpen = (v: boolean) => {
  authStore.showAuthDialog = v
  if (!v) navigateTo('/')
}

const onGoogle = async () => {
  try {
    signingIn.value = true
    await loginWithGoogle()
  } finally {
    signingIn.value = false
  }
}
</script>

<template>
  <Dialog :open="authStore.showAuthDialog" @update:open="onUpdateOpen">
    <DialogContent class="rounded-xl sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle class="text-foreground">Sign in to continue</DialogTitle>
        <DialogDescription>
          Access faster checkout, order tracking, and synced cart across devices.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <Badge variant="outline" class="border-accent text-accent">Secure by Google</Badge>
        </div>

        <Button variant="outline" class="w-full" :disabled="signingIn" @click="onGoogle">
          <Avatar class="size-5 mr-2">
            <AvatarImage src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            <AvatarFallback>G</AvatarFallback>
          </Avatar>
          <span v-if="!signingIn">Continue with Google</span>
          <span v-else>Connecting…</span>
        </Button>

        <p class="text-xs text-muted-foreground">
          By continuing, you agree to our
          <NuxtLink to="/terms" class="underline underline-offset-4">Terms</NuxtLink>
          and
          <NuxtLink to="/privacy" class="underline underline-offset-4">Privacy Policy</NuxtLink>.
        </p>

        <div class="flex justify-center">
          <Button variant="ghost" size="sm" class="text-muted-foreground" @click="onUpdateOpen(false)">Not now</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
