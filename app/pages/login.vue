<script setup lang="ts">
import { ref } from 'vue'
import { useSupabaseClient, navigateTo, definePageMeta, useRoute } from '#imports'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'

definePageMeta({
  title: 'Login',
})

const supabase = useSupabaseClient()

const schema = toTypedSchema(
  z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Minimum 6 characters'),
  })
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
})

const { value: email, errorMessage: emailError } = useField<string>('email')
const { value: password, errorMessage: passwordError } = useField<string>('password')

const route = useRoute()
const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  })
  if (error) {
    errorMessage.value = error.message
    toast.error(error.message || 'Login failed')
    return
  }
  toast.success('Signed in successfully')
  const auth = useAuthStore()
  if (data?.user) {
    auth.login({ id: data.user.id, email: data.user.email || values.email })
  }
  const redirect = (route.query.redirect as string) || '/'
  navigateTo(redirect)
})

const errorMessage = ref('')
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow">
      <h1 class="mb-1 text-xl font-semibold">Login</h1>
      <p class="mb-6 text-sm text-gray-600">Sign in with your email and password.</p>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium">Email</label>
          <Input v-model="email" type="email" placeholder="you@example.com" />
          <p v-if="emailError" class="mt-1 text-xs text-red-600">{{ emailError }}</p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Password</label>
          <Input v-model="password" type="password" placeholder="••••••" />
          <p v-if="passwordError" class="mt-1 text-xs text-red-600">{{ passwordError }}</p>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <Button type="submit" :disabled="isSubmitting" class="w-full">Sign In</Button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        Don’t have an account?
        <NuxtLink to="/signup" class="text-blue-600 hover:underline">Sign up</NuxtLink>
      </p>
    </div>
  </div>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator />
</template>