<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ title: 'Forgot Password' })

const supabase = useSupabaseClient()
const cfg = useRuntimeConfig()
const email = ref('')
const sending = ref(false)
const errorMsg = ref<string | null>(null)
const sent = ref(false)

const onSendResetLink = async () => {
  if (sending.value) return
  errorMsg.value = null
  const e = email.value.trim()
  if (!e) { errorMsg.value = 'Email is required'; return }
  sending.value = true
  try {
    const redirectTo = `${cfg.public.siteUrl}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo })
    if (error) throw error
    sent.value = true
    toast.success('Check your email for the reset link')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send reset link'
    errorMsg.value = msg
    toast.error(msg)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md bg-white">
      <CardHeader>
        <CardTitle class="text-[#0f766e]">Forgot Password</CardTitle>
        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div v-if="!sent" class="space-y-3">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="email" type="email" placeholder="you@company.com" class="bg-white" />
          </div>
          <Alert v-if="errorMsg" variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMsg }}</AlertDescription>
          </Alert>
        </div>
        <div v-else class="text-sm text-muted-foreground">
          We sent a reset link to {{ email }}. Open it to set a new password.
        </div>
      </CardContent>
      <CardFooter class="flex items-center justify-between">
        <NuxtLink to="/profile"><Button variant="outline">Back to login</Button></NuxtLink>
        <Button :disabled="sending || sent" @click="onSendResetLink">
          <span v-if="!sending">Send Reset Link</span>
          <span v-else>Sending…</span>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>

