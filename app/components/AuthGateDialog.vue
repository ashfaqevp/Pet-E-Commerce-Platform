<script setup lang="ts">
import { navigateTo } from '#imports'
const authStore = useAuthStore()
const { loginWithGoogle, loginWithEmailPassword } = useAuth()
const supabase = useSupabaseClient()

const signingIn = ref(false)
const email = ref('')
const password = ref('')
const errorMsg = ref<string | null>(null)

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

const onEmailPassword = async () => {
  if (signingIn.value) return
  errorMsg.value = null
  const e = email.value.trim()
  const p = password.value
  if (!e || !p) { errorMsg.value = 'Email and password are required'; return }
  try {
    signingIn.value = true
    await loginWithEmailPassword(e, p)
    const { role } = await $fetch<{ role: string | null }>(`/api/auth/get-role`)
    if (role === 'admin') navigateTo('/admin')
    else if (role === 'wholesaler') navigateTo('/profile')
    else navigateTo('/')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sign in failed'
    errorMsg.value = msg
  } finally {
    signingIn.value = false
  }
}
</script>

<template>
  <Dialog :open="authStore.showAuthDialog" @update:open="onUpdateOpen">
    <DialogContent class="rounded-xl sm:max-w-[420px] p-6">
      <DialogHeader class="items-center text-center">
        <DialogTitle class="text-foreground">Sign in to continue</DialogTitle>
        <DialogDescription class="text-center">
          Access faster checkout, order tracking, and synced cart across devices.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6">
        <div class="flex items-center justify-center gap-2">
          <Badge variant="outline" class="border-accent text-accent">Secure by Google</Badge>
        </div>

        <Button variant="outline" class="w-full justify-center" :disabled="signingIn" @click="onGoogle">
          <Avatar class="size-5 mr-2">
            <AvatarImage src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            <AvatarFallback>G</AvatarFallback>
          </Avatar>
          <span v-if="!signingIn">Continue with Google</span>
          <span v-else>Connecting…</span>
        </Button>

        <div class="space-y-3">
          <div class="grid gap-2 text-left">
            <Label for="email">Wholesale Partner Email</Label>
            <Input id="email" v-model="email" type="email" placeholder="you@company.com" class="bg-white" />
          </div>
          <div class="grid gap-2 text-left">
            <Label for="password">Password</Label>
            <Input id="password" v-model="password" type="password" placeholder="••••••••" class="bg-white" />
          </div>
          <Alert v-if="errorMsg" variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMsg }}</AlertDescription>
          </Alert>
          <Button class="w-full" :disabled="signingIn" @click="onEmailPassword">
            <span v-if="!signingIn">Sign in as Wholesale Partner</span>
            <span v-else>Signing in…</span>
          </Button>
          <p class="text-xs text-muted-foreground text-center">
            Forgot password? <NuxtLink to="/reset-password" class="underline underline-offset-4">Reset here</NuxtLink>
          </p>
        </div>

        <p class="text-xs text-muted-foreground text-center">
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
