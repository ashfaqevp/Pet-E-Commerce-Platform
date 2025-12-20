<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { AddressInput } from '@/composables/useAddresses'

const props = defineProps<{
  modelValue: AddressInput
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: AddressInput): void
  (e: 'save'): void
}>()

const onField = <K extends keyof AddressInput>(key: K, v: AddressInput[K]) => {
  const next = { ...props.modelValue, [key]: v }
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-sm">Full name</Label>
      <Input :value="props.modelValue.full_name" placeholder="Full name" @input="onField('full_name', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Phone</Label>
      <Input :value="props.modelValue.phone" placeholder="Phone" @input="onField('phone', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Address line 1</Label>
      <Textarea :value="props.modelValue.address_line_1" placeholder="Address line 1" @input="onField('address_line_1', ($event.target as HTMLTextAreaElement).value)" />
    </div>
    <div class="space-y-2">
      <Label class="text-sm">Address line 2 (optional)</Label>
      <Textarea :value="props.modelValue.address_line_2 || ''" placeholder="Address line 2 (optional)" @input="onField('address_line_2', ($event.target as HTMLTextAreaElement).value)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-sm">City</Label>
        <Input :value="props.modelValue.city" placeholder="City" @input="onField('city', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="space-y-2">
        <Label class="text-sm">State</Label>
        <Input :value="props.modelValue.state" placeholder="State" @input="onField('state', ($event.target as HTMLInputElement).value)" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-sm">Postal code</Label>
        <Input :value="props.modelValue.postal_code" placeholder="Postal code" @input="onField('postal_code', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="space-y-2">
        <Label class="text-sm">Country</Label>
        <Input :value="props.modelValue.country" placeholder="Country" @input="onField('country', ($event.target as HTMLInputElement).value)" />
      </div>
    </div>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <input id="is_default" type="checkbox" :checked="!!props.modelValue.is_default" class="rounded" @change="onField('is_default', ($event.target as HTMLInputElement).checked)" />
        <Label for="is_default" class="text-sm">Set as default</Label>
      </div>
      <Button
        class="py-3 rounded-full font-bold bg-secondary text-white hover:bg-secondary/90"
        size="lg"
        :disabled="props.submitting"
        @click="emit('save')"
      >
        Save
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
