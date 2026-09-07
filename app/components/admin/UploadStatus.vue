<script setup lang="ts">
/**
 * The "Optimising… 8.4 MB → 480 KB" line that sits under an admin file input.
 *
 * It reads the shared status ref for its key, so the composable actually doing
 * the upload never has to thread a callback back up through a submit payload.
 */
const props = defineProps<{ for: UploadStatusKey }>()

const status = computed(() => useUploadStatus(props.for).value)
const busy = computed(() => status.value?.startsWith('Optimising') ?? false)
</script>

<template>
  <p v-if="status" class="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
    <Icon
      :name="busy ? 'lucide:loader-circle' : 'lucide:check'"
      class="h-3 w-3 shrink-0"
      :class="busy ? 'animate-spin' : 'text-secondary'"
    />
    <span>{{ status }}</span>
  </p>
</template>
