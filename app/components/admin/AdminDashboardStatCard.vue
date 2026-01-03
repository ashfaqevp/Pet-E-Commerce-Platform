<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  label: string
  value: string | number
  icon: Component
  accent?: 'teal' | 'orange' | 'slate' | 'green' | 'blue'
  loading?: boolean
  currency?: boolean
}>()

const accentClasses = computed(() => {
  const c = (props.accent ?? 'slate') as 'teal' | 'orange' | 'slate' | 'green' | 'blue'
  const map: Record<'teal' | 'orange' | 'slate' | 'green' | 'blue', { card: string; icon: string; value: string }> = {
    teal: { card: 'bg-gradient-to-br from-teal-50 to-white', icon: 'text-teal-600', value: 'text-foreground' },
    orange: { card: 'bg-gradient-to-br from-orange-50 to-white', icon: 'text-orange-600', value: 'text-foreground' },
    slate: { card: 'bg-gradient-to-br from-slate-50 to-white', icon: 'text-slate-700', value: 'text-foreground' },
    green: { card: 'bg-gradient-to-br from-green-50 to-white', icon: 'text-green-600', value: 'text-foreground' },
    blue: { card: 'bg-gradient-to-br from-blue-50 to-white', icon: 'text-blue-600', value: 'text-foreground' },
  }
  return map[c]
})
const displayParts = computed((): { prefix: string; main: string } => {
  const s = String(props.value)
  if (props.currency) {
    const m = s.match(/^([A-Za-z]{3})\s+(.*)$/)
    if (m) return { prefix: m[1], main: m[2] }
  }
  return { prefix: '', main: s }
})
</script>

<template>
  <Card :class="['rounded-md shadow-sm', accentClasses.card]">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <component :is="props.icon" class="h-5 w-5" :class="accentClasses.icon" />
          <CardTitle class="text-sm">{{ props.label }}</CardTitle>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton v-if="props.loading" class="h-6 w-24" />
      <p v-else :class="accentClasses.value" class="font-semibold">
        <span v-if="props.currency && displayParts.prefix" class="text-xs mr-1">{{ displayParts.prefix }}</span>
        <span :class="props.currency ? 'text-3xl' : 'text-2xl'">{{ displayParts.main }}</span>
      </p>
    </CardContent>
  </Card>
</template>
