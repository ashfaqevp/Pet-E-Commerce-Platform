<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  modelValue: string
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'save'): void
}>()

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-sm">Phone Number</Label>
      <Input :value="props.modelValue" placeholder="Phone" @input="onInput" />
    </div>
    <Button
      class="w-full py-3 rounded-full font-bold bg-secondary text-white hover:bg-secondary/90"
      size="lg"
      :disabled="props.saving"
      @click="emit('save')"
    >
      Save
    </Button>
  </div>
</template>

<style scoped></style>
