<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <AlertDialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete product</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. The product will be permanently removed from the catalog.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('cancel')">Cancel</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground" @click="emit('confirm')">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
