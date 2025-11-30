<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const name = ref('')
function submit() {
  // TODO: hook up real submit action
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-xl font-semibold">shadcn/ui Demo</h1>
    <div class="space-y-2">
      <label for="demo-input" class="text-sm font-medium">Your Name</label>
      <Input id="demo-input" v-model="name" placeholder="Type here..." />
    </div>
    <div class="flex items-center gap-3">
      <Button @click="submit">Submit</Button>
      <span class="text-sm text-muted-foreground">Value: {{ name }}</span>
    </div>
  </div>
</template>