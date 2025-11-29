<template>
  <Icon :icon="name" :class="classes" />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
defineProps<{ name: string; classes?: string }>()
</script>