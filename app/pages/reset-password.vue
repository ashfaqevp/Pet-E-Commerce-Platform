<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

definePageMeta({ title: 'Reset Password' })

const supabase = useSupabaseClient()

const schema = toTypedSchema(z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string().min(8, 'Minimum 8 characters'),
}).refine((v) => v.password === v.confirm, { message: 'Passwords must match', path: ['confirm'] }))

const { handleSubmit, isSubmitting } = useForm({ validationSchema: schema })
const { value: password, errorMessage: passwordError } = useField<string>('password')
const { value: confirm, errorMessage: confirmError } = useField<string>('confirm')

const onSubmit = handleSubmit(async (values) => {
  try {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) throw error
    toast.success('Password updated')
    navigateTo('/login')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-sm bg-white">
      <CardHeader>
        <CardTitle class="text-foreground">Reset Password</CardTitle>
        <CardDescription>Enter a new password to secure your account</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-2">
          <Label for="password">New Password</Label>
          <Input id="password" v-model="password" type="password" placeholder="••••••••" />
          <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
        </div>
        <div class="grid gap-2">
          <Label for="confirm">Confirm Password</Label>
          <Input id="confirm" v-model="confirm" type="password" placeholder="••••••••" />
          <p v-if="confirmError" class="text-sm text-destructive">{{ confirmError }}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button class="w-full" :disabled="isSubmitting" @click="onSubmit">
          <span v-if="!isSubmitting">Update Password</span>
          <span v-else>Updating…</span>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>

