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

interface SiteConfigRow {
  id: string
  shipping_fee: number
  tax_rate: number
  updated_at?: string
}

const { data: configData, pending: configPending, error: configError, refresh: refreshConfig } = await useLazyAsyncData(
  'admin-site-config',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('site_config')
      .select('id, shipping_fee, tax_rate, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) throw error
    const row = (data?.[0] ?? null) as Partial<SiteConfigRow> | null
    if (!row) return null
    return {
      id: String(row.id),
      shipping_fee: Number(row.shipping_fee ?? 10),
      tax_rate: Number(row.tax_rate ?? 0.05),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
    } as SiteConfigRow
  },
  { server: true }
)

const siteConfig = computed<SiteConfigRow | null>(() => (configData.value as SiteConfigRow | null) || null)

const configSchema = toTypedSchema(
  z.object({
    shipping_fee: z.coerce.number().min(0).max(10000),
    tax_rate: z.coerce.number().min(0).max(1),
  })
)

const { handleSubmit: handleSaveConfig, isSubmitting: savingConfig } = useForm({
  validationSchema: configSchema,
  initialValues: {
    shipping_fee: siteConfig.value?.shipping_fee ?? 10,
    tax_rate: siteConfig.value?.tax_rate ?? 0.05,
  },
})

const { value: shippingFee, errorMessage: shippingFeeError } = useField<number>('shipping_fee')
const { value: taxRate, errorMessage: taxRateError } = useField<number>('tax_rate')

const onSaveConfig = handleSaveConfig(async (values) => {
  const supabase = useSupabaseClient()
  try {
    if (siteConfig.value?.id) {
      const { error: e } = await supabase
        .from('site_config')
        .update({ shipping_fee: values.shipping_fee, tax_rate: values.tax_rate } as unknown as never)
        .eq('id', siteConfig.value.id)
      if (e) throw e
    } else {
      const { error: e } = await supabase
        .from('site_config')
        .insert([{ shipping_fee: values.shipping_fee, tax_rate: values.tax_rate }] as unknown as never)
      if (e) throw e
    }
    toast.success('Checkout settings updated')
    await refreshConfig()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update settings'
    toast.error(msg)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- <Card>
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
    </Card> -->

    <Card>
      <CardHeader>
        <CardTitle>Checkout Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="configPending"><Skeleton class="h-10 w-full" /></div>
        <div v-else-if="configError">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ configError.message }}</AlertDescription>
          </Alert>
        </div>
        <div v-else>
          <form class="space-y-4" @submit.prevent="onSaveConfig">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label for="shipping-fee">Shipping Fee (OMR)</Label>
                <Input id="shipping-fee" v-model.number="shippingFee" type="number" step="0.001" min="0" />
                <p v-if="shippingFeeError" class="text-destructive text-xs mt-1">{{ shippingFeeError }}</p>
              </div>
              <div>
                <Label for="tax-rate">Tax Rate (0–1)</Label>
                <Input id="tax-rate" v-model.number="taxRate" type="number" step="0.001" min="0" max="1" />
                <p v-if="taxRateError" class="text-destructive text-xs mt-1">{{ taxRateError }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs text-muted-foreground">Last updated: {{ siteConfig?.updated_at || '—' }}</p>
              <div class="flex justify-end gap-2">
                <Button type="submit" :disabled="savingConfig">Save Checkout Settings</Button>
              </div>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
