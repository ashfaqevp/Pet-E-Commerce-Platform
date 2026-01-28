<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ title: 'Reset Password' })

const supabase = useSupabaseClient()
const password = ref('')
const confirm = ref('')
const resetting = ref(false)
const errorMsg = ref<string | null>(null)
const hasSession = ref(false)

onMounted(async () => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
  if (error) console.error(error)
  hasSession.value = !!data?.session
})

const onResetPassword = async () => {
  if (resetting.value) return
  errorMsg.value = null
  const p = password.value
  const c = confirm.value
  if (p.length < 8) { errorMsg.value = 'Password must be at least 8 characters'; return }
  if (p !== c) { errorMsg.value = 'Passwords do not match'; return }
  resetting.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: p })
    if (error) throw error
    toast.success('Password reset successfully')
    navigateTo('/login')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to reset password'
    errorMsg.value = msg
    toast.error(msg)
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md bg-white">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Reset Password</CardTitle>
        <CardDescription>Set a new password to access your account.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div v-if="!hasSession" class="text-sm text-muted-foreground">
          Invalid or expired link. Request a new one from the Forgot Password page.
        </div>
        <div v-else class="space-y-3">
          <div class="grid gap-2">
            <Label for="new-password">New Password</Label>
            <Input id="new-password" v-model="password" type="password" placeholder="At least 8 characters" class="bg-white" />
          </div>
          <div class="grid gap-2">
            <Label for="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" v-model="confirm" type="password" placeholder="Re-enter password" class="bg-white" />
          </div>
          <Alert v-if="errorMsg" variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMsg }}</AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter class="flex items-center justify-between">
        <NuxtLink to="/profile"><Button variant="outline">Back to login</Button></NuxtLink>
        <Button :disabled="resetting || !hasSession" @click="onResetPassword">
          <span v-if="!resetting">Reset Password</span>
          <span v-else>Resetting…</span>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
