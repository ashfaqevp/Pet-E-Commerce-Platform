<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'

definePageMeta({ layout: 'admin-auth', title: 'Admin Login' })

const supabase = useSupabaseClient()
const route = useRoute()
const { loginWithEmailPassword } = useAuth()

const schema = toTypedSchema(z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
}))

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
})

const { value: email, errorMessage: emailError } = useField<string>('email')
const { value: password, errorMessage: passwordError } = useField<string>('password')
const { value: remember } = useField<boolean>('remember')

const onSubmit = handleSubmit(async (values) => {
  try {
    await loginWithEmailPassword(values.email, values.password)

    const { role } = await $fetch<{ role: string | null }>('/api/auth/get-role')
    if (role !== 'admin') {
      toast.error('Admin access required')
      await supabase.auth.signOut()
      navigateTo('/')
      return
    }

    const redirect =
      typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/admin'

    navigateTo(redirect)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sign in failed'
    toast.error(msg)
  }
})

</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-foreground">Admin Login</CardTitle>
        <CardDescription>Enter credentials to access admin panel</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input id="email" v-model="email" type="email" placeholder="you@example.com" />
          <p v-if="emailError" class="text-sm text-destructive">{{ emailError }}</p>
        </div>
        <div class="grid gap-2">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" placeholder="••••••••" />
          <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Checkbox id="remember" v-model:checked="remember" />
            <Label for="remember">Remember me</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button class="w-full bg-secondary text-white" :disabled="isSubmitting" @click="onSubmit">
          <span v-if="!isSubmitting">Sign in</span>
          <span v-else>Signing in…</span>
        </Button>
      </CardFooter>
    </Card>
  </div>
  
</template>
