<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Settings',
})

const { data: sessionData, pending, error, refresh } = await useLazyAsyncData(
  'admin-settings-session',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session || null
  },
  { server: true }
)

const user = computed(() => sessionData.value?.user || null)

const schema = toTypedSchema(z.object({ full_name: z.string().min(1) }))

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: {
    full_name: (user.value?.user_metadata as Record<string, unknown>)?.full_name as string || '',
  },
})

const { value: fullName, errorMessage: fullNameError } = useField<string>('full_name')

const onSubmit = handleSubmit(async (values) => {
  const supabase = useSupabaseClient()
  try {
    const { error: e } = await supabase.auth.updateUser({ data: { full_name: values.full_name } })
    if (e) throw e
    toast.success('Account updated')
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="pending"><Skeleton class="h-10 w-full" /></div>
        <div v-else-if="error">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ error.message }}</AlertDescription>
          </Alert>
        </div>
        <div v-else>
          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label for="email">Email</Label>
                <Input id="email" :value="user?.email || ''" disabled />
              </div>
              <div>
                <Label for="full-name">Full Name</Label>
                <Input id="full-name" v-model="fullName" placeholder="Your name" />
                <p v-if="fullNameError" class="text-destructive text-xs mt-1">{{ fullNameError }}</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <Button type="submit" :disabled="isSubmitting">Save</Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

