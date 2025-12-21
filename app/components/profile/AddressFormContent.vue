<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { useLazyAsyncData, useSupabaseClient, useSupabaseUser } from '#imports'
import type { AddressInput } from '@/composables/useAddresses'
import { useAddresses } from '@/composables/useAddresses'
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
const { createAddress, updateAddress } = useAddresses()

const schema = toTypedSchema(
  z.object({
    full_name: z.string().min(1, 'Full name is required'),
    phone: z.string().refine(v => /^\+968[927]\d{7}$/.test(v), 'Enter a valid Oman mobile number'),
    address_line_1: z.string().min(3, 'Address line 1 is required'),
    address_line_2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postal_code: z.string().min(2, 'Postal code is required'),
    is_default: z.boolean().optional(),
  })
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: {
    full_name: props.modelValue.full_name,
    phone: props.modelValue.phone,
    address_line_1: props.modelValue.address_line_1,
    address_line_2: props.modelValue.address_line_2 ?? '',
    city: props.modelValue.city,
    state: props.modelValue.state,
    postal_code: props.modelValue.postal_code,
    is_default: !!props.modelValue.is_default,
  },
})

const { value: fullName, errorMessage: fullNameError, meta: fullNameMeta } = useField<string>('full_name')
const { value: phone, errorMessage: phoneError, meta: phoneMeta } = useField<string>('phone')
const { value: address1, errorMessage: address1Error, meta: address1Meta } = useField<string>('address_line_1')
const { value: address2 } = useField<string | undefined>('address_line_2')
const { value: city, errorMessage: cityError, meta: cityMeta } = useField<string>('city')
const { value: state, errorMessage: stateError, meta: stateMeta } = useField<string>('state')
const { value: postalCode, errorMessage: postalCodeError, meta: postalCodeMeta } = useField<string>('postal_code')
const { value: isDefault } = useField<boolean | undefined>('is_default')
const COUNTRY_CODE = '+968'
const localNumber = ref('')
const sanitize = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 8)

const onDefaultChecked = (v: boolean | 'indeterminate') => {
  if (v === 'indeterminate') return
  isDefault.value = !!v
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
  if (!fullName.value && d.name) fullName.value = d.name
  if (!phone.value && d.phone) {
    const raw = d.phone.replace(/[^0-9]/g, '')
    const local = raw.startsWith('968') ? raw.slice(3) : raw
    localNumber.value = sanitize(local)
    if (localNumber.value.length === 8) phone.value = COUNTRY_CODE + localNumber.value
  } else {
    const raw = (phone.value || '').replace(/[^0-9]/g, '')
    const local = raw.startsWith('968') ? raw.slice(3) : raw
    localNumber.value = sanitize(local)
  }
})

watch(fullName, (v) => emit('update:modelValue', { ...props.modelValue, full_name: v }))
watch(phone, (v) => emit('update:modelValue', { ...props.modelValue, phone: v }))
watch(address1, (v) => emit('update:modelValue', { ...props.modelValue, address_line_1: v }))
watch(address2, (v) => emit('update:modelValue', { ...props.modelValue, address_line_2: v ?? '' }))
watch(city, (v) => emit('update:modelValue', { ...props.modelValue, city: v }))
watch(state, (v) => emit('update:modelValue', { ...props.modelValue, state: v }))
watch(postalCode, (v) => emit('update:modelValue', { ...props.modelValue, postal_code: v }))
watch(isDefault, (v) => emit('update:modelValue', { ...props.modelValue, is_default: !!v }))

const onSubmit = handleSubmit(async (values) => {
  if (!user.value) {
    toast.error('Please sign in')
    return
  }
  try {
    const payload: AddressInput = {
      full_name: values.full_name,
      phone: values.phone,
      address_line_1: values.address_line_1,
      address_line_2: values.address_line_2 || '',
      city: values.city,
      state: values.state,
      postal_code: values.postal_code,
      country: 'Oman',
      is_default: !!values.is_default,
    }
    if (props.addressId) {
      await updateAddress(props.addressId, payload)
      toast.success('Address updated')
    } else {
      await createAddress(payload)
      toast.success('Address added')
    }
    emit('save')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    toast.error(msg)
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-sm">Full name</Label>
      <Input v-model="fullName" placeholder="Full name" />
      <p v-if="fullNameError && fullNameMeta.touched" class="text-xs text-red-600">{{ fullNameError }}</p>
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
          @input="(e: Event) => { const v = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '').slice(0, 8); localNumber = v; phone = COUNTRY_CODE + v }"
          :aria-invalid="!!phoneError"
        />
      </div>
      <p v-if="phoneError && phoneMeta.touched" class="text-xs text-red-600">{{ phoneError }}</p>
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Address line 1</Label>
      <Textarea v-model="address1" placeholder="Address line 1" />
      <p v-if="address1Error && address1Meta.touched" class="text-xs text-red-600">{{ address1Error }}</p>
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Address line 2 (optional)</Label>
      <Textarea v-model="address2" placeholder="Address line 2 (optional)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-sm">City</Label>
        <Input v-model="city" placeholder="City" />
        <p v-if="cityError && cityMeta.touched" class="text-xs text-red-600">{{ cityError }}</p>
      </div>
      <div class="space-y-2">
        <Label class="text-sm">State</Label>
        <Input v-model="state" placeholder="State" />
        <p v-if="stateError && stateMeta.touched" class="text-xs text-red-600">{{ stateError }}</p>
      </div>
    </div>
      <div class="space-y-2">
        <Label class="text-sm">Postal code</Label>
        <Input v-model="postalCode" placeholder="Postal code" />
        <p v-if="postalCodeError && postalCodeMeta.touched" class="text-xs text-red-600">{{ postalCodeError }}</p>
      </div>
      <!-- <div class="space-y-2">
        <Label class="text-sm">Country</Label>
        <Input :value="props.modelValue.country" placeholder="Country" @input="onField('country', ($event.target as HTMLInputElement).value)" />
        <p v-if="errors.country" class="text-xs text-red-600">{{ errors.country }}</p>
      </div> -->
  <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-2 justify-end w-full">
        <Checkbox id="is_default" :checked="!!isDefault" @update:checked="onDefaultChecked" />
        <Label for="is_default" class="text-sm mt-1.5">Set as default</Label>
      </div>
    </div>
      <Button
        class="bg-secondary text-white hover:bg-secondary/90 w-full"
        size="lg"
        :disabled="isSubmitting || props.submitting"
        @click="onSubmit()"
      >
        Save
      </Button>
  </div>
</template>

<style scoped></style>
