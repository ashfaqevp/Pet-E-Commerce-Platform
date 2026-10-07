<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import type { GuestAddress } from '@/composables/useCheckoutOrder'

/**
 * Delivery details for a guest checkout. Same rules as `AddressFormContent`, but
 * nothing is saved to `addresses` — a guest has no row to save under. The parent
 * calls `submit()` from its own Place Order button.
 *
 * The last details a guest used are remembered in this browser, restored in
 * `onMounted` so the server render and hydration both start from an empty form.
 */

const STORAGE_KEY = 'bh-guest-address'
const COUNTRY_CODE = '+968'

const schema = toTypedSchema(
  z.object({
    full_name: z.string().trim().min(1, 'Full name is required'),
    phone: z.string().refine(v => /^\+968[927]\d{7}$/.test(v), 'Enter a valid Oman mobile number'),
    address_line_1: z.string().trim().min(3, 'Address is required'),
    address_line_2: z.string().optional(),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().min(2, 'State is required'),
    postal_code: z.string().optional(),
  })
)

const { validate, values, setValues } = useForm({
  validationSchema: schema,
  initialValues: { full_name: '', phone: '', address_line_1: '', address_line_2: '', city: '', state: '', postal_code: '' },
})

const { value: fullName, errorMessage: fullNameError, meta: fullNameMeta } = useField<string>('full_name')
const { value: phone, errorMessage: phoneError, meta: phoneMeta, handleBlur: onPhoneBlur } = useField<string>('phone')
const { value: address1, errorMessage: address1Error, meta: address1Meta } = useField<string>('address_line_1')
const { value: address2 } = useField<string | undefined>('address_line_2')
const { value: city, errorMessage: cityError, meta: cityMeta } = useField<string>('city')
const { value: state, errorMessage: stateError, meta: stateMeta } = useField<string>('state')
const { value: postalCode } = useField<string | undefined>('postal_code')

// Errors show once a field is touched, or for every field once Place Order is pressed.
const attempted = ref(false)

const localNumber = ref('')
const onPhoneInput = (e: Event) => {
  const v = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '').slice(0, 8)
  localNumber.value = v
  phone.value = COUNTRY_CODE + v
}

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<GuestAddress> | null
    if (!saved) return
    setValues({ ...values, ...saved, address_line_2: saved.address_line_2 || '', postal_code: saved.postal_code || '' })
    localNumber.value = (saved.phone || '').replace(COUNTRY_CODE, '')
  } catch {
    // Unreadable storage only means the guest types their details again.
  }
})

const { loading: locating, fetchAddress } = useCurrentLocation()
const useMyLocation = async () => {
  try {
    const a = await fetchAddress()
    if (a.address_line_1) address1.value = a.address_line_1
    if (a.address_line_2) address2.value = a.address_line_2
    if (a.city) city.value = a.city
    if (a.state) state.value = a.state
    if (a.postal_code) postalCode.value = a.postal_code
    toast.success('Location filled in. Please double-check it.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not get your location.')
  }
}

/** Validates and returns the address, or `null` with the errors shown. */
const submit = async (): Promise<GuestAddress | null> => {
  attempted.value = true
  const result = await validate()
  if (!result.valid) return null
  const address: GuestAddress = {
    full_name: values.full_name!.trim(),
    phone: values.phone!,
    address_line_1: values.address_line_1!.trim(),
    address_line_2: values.address_line_2?.trim() || null,
    city: values.city!.trim(),
    state: values.state!.trim(),
    postal_code: values.postal_code?.trim() || null,
    country: 'Oman',
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(address))
  } catch {
    // Not remembering the address is harmless.
  }
  return address
}

defineExpose({ submit })
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label for="guest-name" class="text-sm">Full name</Label>
        <Input id="guest-name" v-model="fullName" autocomplete="name" placeholder="Full name" />
        <p v-if="fullNameError && (fullNameMeta.touched || attempted)" class="text-xs text-red-600">{{ fullNameError }}</p>
      </div>
      <div class="space-y-2">
        <Label for="guest-phone" class="text-sm">Mobile number</Label>
        <div class="flex items-center gap-2">
          <div class="px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground select-none">+968</div>
          <Input
            id="guest-phone"
            :model-value="localNumber"
            type="tel"
            inputmode="numeric"
            autocomplete="tel-national"
            placeholder="91234567"
            :aria-invalid="!!phoneError"
            @input="onPhoneInput"
            @blur="onPhoneBlur"
          />
        </div>
        <p v-if="phoneError && (phoneMeta.touched || attempted)" class="text-xs text-red-600">{{ phoneError }}</p>
      </div>
    </div>

    <Button
      type="button"
      variant="outline"
      class="w-full gap-2 border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
      :disabled="locating"
      @click="useMyLocation"
    >
      <Icon :name="locating ? 'lucide:loader-circle' : 'lucide:map-pin'" :class="locating ? 'animate-spin' : ''" />
      {{ locating ? 'Getting location…' : 'Use current location' }}
    </Button>

    <div class="space-y-2">
      <Label for="guest-address1" class="text-sm">Address</Label>
      <Textarea id="guest-address1" v-model="address1" autocomplete="street-address" placeholder="House / building, street, area" />
      <p v-if="address1Error && (address1Meta.touched || attempted)" class="text-xs text-red-600">{{ address1Error }}</p>
    </div>
    <div class="space-y-2">
      <Label for="guest-address2" class="text-sm">Landmark <span class="text-muted-foreground">(optional)</span></Label>
      <Input id="guest-address2" v-model="address2" placeholder="Near…" />
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div class="space-y-2">
        <Label for="guest-city" class="text-sm">City</Label>
        <Input id="guest-city" v-model="city" autocomplete="address-level2" placeholder="City" />
        <p v-if="cityError && (cityMeta.touched || attempted)" class="text-xs text-red-600">{{ cityError }}</p>
      </div>
      <div class="space-y-2">
        <Label for="guest-state" class="text-sm">State</Label>
        <Input id="guest-state" v-model="state" autocomplete="address-level1" placeholder="State" />
        <p v-if="stateError && (stateMeta.touched || attempted)" class="text-xs text-red-600">{{ stateError }}</p>
      </div>
      <div class="space-y-2 col-span-2 md:col-span-1">
        <Label for="guest-postal" class="text-sm">Postal code <span class="text-muted-foreground">(optional)</span></Label>
        <Input id="guest-postal" v-model="postalCode" autocomplete="postal-code" placeholder="Postal code" />
      </div>
    </div>
  </div>
</template>
