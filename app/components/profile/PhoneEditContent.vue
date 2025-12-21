<script setup lang="ts">
import { ref, watch } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { toast } from 'vue-sonner'

type ProfileRow = {
  id: string
  phone: string | null
}

const props = defineProps<{
  modelValue: string
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'save'): void
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const localNumber = ref('')

const localError = ref<string | null>(null)
const isSaving = ref(false)

const COUNTRY_CODE = '+968'

const sanitize = (v: string) => v.replace(/\D/g, '').slice(0, 8)

const isValidOmanNumber = (v: string) =>
  /^[927]\d{7}$/.test(v)
 
localNumber.value = sanitize((props.modelValue || '').replace(COUNTRY_CODE, ''))
 
watch(() => props.modelValue, (v) => {
  localNumber.value = sanitize((v || '').replace(COUNTRY_CODE, ''))
})

const onInput = (e: Event) => {
  const value = sanitize((e.target as HTMLInputElement).value)
  localNumber.value = value
  if (localError.value) localError.value = null
}

const onSave = async () => {
  if (!user.value) {
    toast.error('Please sign in')
    return
  }

  if (!isValidOmanNumber(localNumber.value)) {
    localError.value = 'Enter a valid Oman phone number'
    return
  }

  try {
    isSaving.value = true
    const fullPhone = COUNTRY_CODE + localNumber.value

    const payload: ProfileRow = {
      id: user.value.id,
      phone: fullPhone
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.value.id, phone: fullPhone } as unknown as never, { onConflict: 'id' })

    if (error) throw error

    emit('update:modelValue', fullPhone)
    toast.success('Phone number updated')
    emit('save')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save phone'
    toast.error(msg)
    localError.value = msg
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label>Phone Number</Label>

      <div class="flex items-center gap-2">
        <div
          class="px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground select-none"
        >
          +968
        </div>

        <Input
          v-model="localNumber"
          type="tel"
          inputmode="numeric"
          autocomplete="tel-national"
          placeholder="91234567"
          @input="onInput"
          :aria-invalid="!!localError"
        />
      </div>
    </div>

    <p v-if="localError" class="text-sm text-destructive">
      {{ localError }}
    </p>

    <Button
      class="w-full"
      size="lg"
      :disabled="isSaving || props.saving || localNumber.length !== 8"
      @click="onSave"
    >
      <span v-if="isSaving || props.saving">Saving...</span>
      <span v-else>Save Phone Number</span>
    </Button>
  </div>
</template>
