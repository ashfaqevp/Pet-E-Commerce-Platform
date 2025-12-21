<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Label } from '@/components/ui/label'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const authStore = useAuthStore()

const COUNTRY_CODE = '+968'
const localNumber = ref('')
const localError = ref<string | null>(null)
const isSaving = ref(false)

const sanitize = (v: string) => v.replace(/\D/g, '').slice(0, 8)
const isValidOmanNumber = (v: string) => /^[927]\d{7}$/.test(v)

const onInput = (e: Event) => {
  const value = sanitize((e.target as HTMLInputElement).value)
  localNumber.value = value
  if (localError.value) localError.value = null
}

const savePhone = async () => {
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
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.value.id, phone: fullPhone } as unknown as never)
    if (error) throw error
    toast.success('Phone number saved')
    authStore.showPhoneDialog = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save phone'
    toast.error(msg)
    localError.value = msg
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="authStore.showPhoneDialog">
    <DialogContent class="rounded-xl">
      <DialogHeader>
        <DialogTitle>Phone number required</DialogTitle>
        <DialogDescription>
          Please enter your phone number to continue
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <Label>Phone Number</Label>
        <div class="flex items-center gap-2">
          <div class="px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground select-none">+968</div>
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
        <p v-if="localError" class="text-sm text-destructive">{{ localError }}</p>
      </div>

      <Button class="w-full" :disabled="isSaving || localNumber.length !== 8" @click="savePhone">
        <span v-if="isSaving">Saving...</span>
        <span v-else>Continue</span>
      </Button>
    </DialogContent>
  </Dialog>
</template>
