<template>
  <div class="flex flex-col items-center gap-2">
    <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center">
      <Icon :name="item.icon" class="text-3xl text-secondary" />
    </div>
    <span class="text-sm font-medium">{{ item.name }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ item: { name: string; icon: string } }>()
</script>