<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useLazyAsyncData, useSupabaseClient, useSupabaseUser } from '#imports'
import type { AddressInput } from '@/composables/useAddresses'
import { z } from 'zod'
import { toast } from 'vue-sonner'

const props = defineProps<{
  modelValue: AddressInput
  submitting?: boolean
  addressId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: AddressInput): void
  (e: 'save'): void
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const PHONE_SCHEMA = z.string().refine(v => /^\+968[927]\d{7}$/.test(v), 'Enter a valid Oman mobile number')

const Schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: PHONE_SCHEMA,
  address_line_1: z.string().min(3, 'Address line 1 is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(2, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  is_default: z.boolean().optional(),
})

const errors = ref<Record<keyof AddressInput | 'form', string | undefined>>({} as any)
const submitting = ref(false)
const COUNTRY_CODE = '+968'
const localNumber = ref('')
const sanitize = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 8)
const isValidOmanNumber = (v: string) => /^[927]\d{7}$/.test(v)

const onField = <K extends keyof AddressInput>(key: K, v: AddressInput[K]) => {
  const next = { ...props.modelValue, [key]: v }
  emit('update:modelValue', next)
  errors.value[key] = undefined
}

const { data: defaultsData } = await useLazyAsyncData(
  'address-defaults',
  async () => {
    if (!user.value) return null
    const name = (user.value.user_metadata as Record<string, unknown>)?.full_name as string | undefined
    const { data } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.value.id)
      .maybeSingle()
    const phone = (data as { phone?: string | null } | null)?.phone || undefined
    return { name, phone }
  },
  { server: false }
)

watchEffect(() => {
  const d = defaultsData.value
  if (!d) return
  if (!props.modelValue.full_name && d.name) onField('full_name', d.name)
  if (!props.modelValue.phone && d.phone) {
    const raw = d.phone.replace(/[^0-9]/g, '')
    const local = raw.startsWith('968') ? raw.slice(3) : raw
    localNumber.value = sanitize(local)
    if (localNumber.value.length === 8) onField('phone', COUNTRY_CODE + localNumber.value)
  } else {
    const raw = (props.modelValue.phone || '').replace(/[^0-9]/g, '')
    const local = raw.startsWith('968') ? raw.slice(3) : raw
    localNumber.value = sanitize(local)
  }
})

const save = async () => {
  const parsed = Schema.safeParse(props.modelValue)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    if (issue) {
      const path = (issue.path?.[0] as keyof AddressInput | undefined) || 'form'
      errors.value[path] = issue.message
    }
    return
  }
  if (!user.value) {
    toast.error('Please sign in')
    return
  }
  try {
    submitting.value = true
    const input = parsed.data
    if (input.is_default) {
      const { error: e1 } = await supabase
        .from('addresses')
        .update({ is_default: false } as unknown as never)
        .eq('user_id', user.value.id)
      if (e1) throw e1
    }
    if (props.addressId) {
      const { error } = await supabase
        .from('addresses')
        .update({ ...input, is_default: !!input.is_default } as unknown as never)
        .eq('id', props.addressId)
        .eq('user_id', user.value.id)
      if (error) throw error
      toast.success('Address updated')
    } else {
      const payload = { ...input, user_id: user.value.id, is_default: !!input.is_default }
      const { error } = await supabase
        .from('addresses')
        .insert([payload as unknown as never])
      if (error) throw error
      toast.success('Address added')
    }
    emit('save')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    toast.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-sm">Full name</Label>
      <Input :value="props.modelValue.full_name" placeholder="Full name" @input="onField('full_name', ($event.target as HTMLInputElement).value)" />
      <p v-if="errors.full_name" class="text-xs text-red-600">{{ errors.full_name }}</p>
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Phone</Label>
      <div class="flex items-center gap-2">
        <div class="px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground select-none">+968</div>
        <Input
          v-model="localNumber"
          type="tel"
          inputmode="numeric"
          autocomplete="tel-national"
          placeholder="91234567"
          @input="(e: Event) => { const v = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '').slice(0, 8); localNumber = v; errors.phone = undefined; onField('phone', COUNTRY_CODE + v) }"
          :aria-invalid="!!errors.phone"
        />
      </div>
      <p v-if="errors.phone" class="text-xs text-red-600">{{ errors.phone }}</p>
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Address line 1</Label>
      <Textarea :value="props.modelValue.address_line_1" placeholder="Address line 1" @input="onField('address_line_1', ($event.target as HTMLTextAreaElement).value)" />
      <p v-if="errors.address_line_1" class="text-xs text-red-600">{{ errors.address_line_1 }}</p>
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Address line 2 (optional)</Label>
      <Textarea :value="props.modelValue.address_line_2 || ''" placeholder="Address line 2 (optional)" @input="onField('address_line_2', ($event.target as HTMLTextAreaElement).value)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-sm">City</Label>
        <Input :value="props.modelValue.city" placeholder="City" @input="onField('city', ($event.target as HTMLInputElement).value)" />
        <p v-if="errors.city" class="text-xs text-red-600">{{ errors.city }}</p>
      </div>
      <div class="space-y-2">
        <Label class="text-sm">State</Label>
        <Input :value="props.modelValue.state" placeholder="State" @input="onField('state', ($event.target as HTMLInputElement).value)" />
        <p v-if="errors.state" class="text-xs text-red-600">{{ errors.state }}</p>
      </div>
    </div>
      <div class="space-y-2">
        <Label class="text-sm">Postal code</Label>
        <Input :value="props.modelValue.postal_code" placeholder="Postal code" @input="onField('postal_code', ($event.target as HTMLInputElement).value)" />
        <p v-if="errors.postal_code" class="text-xs text-red-600">{{ errors.postal_code }}</p>
      </div>
      <!-- <div class="space-y-2">
        <Label class="text-sm">Country</Label>
        <Input :value="props.modelValue.country" placeholder="Country" @input="onField('country', ($event.target as HTMLInputElement).value)" />
        <p v-if="errors.country" class="text-xs text-red-600">{{ errors.country }}</p>
      </div> -->
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-2 justify-end w-full">
        <input id="is_default" type="checkbox" :checked="!!props.modelValue.is_default" class="rounded" @change="onField('is_default', ($event.target as HTMLInputElement).checked)" />
        <Label for="is_default" class="text-sm mt-1.5">Set as default</Label>
      </div>
    </div>
      <Button
        class="bg-secondary text-white hover:bg-secondary/90 w-full"
        size="lg"
        :disabled="submitting || props.submitting"
        @click="save"
      >
        Save
      </Button>
  </div>
</template>

<style scoped></style>
