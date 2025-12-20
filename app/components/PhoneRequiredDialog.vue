<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const authStore = useAuthStore()

const phone = ref('')

const savePhone = async () => {
  if (!user.value) return

  await supabase.from('profiles').upsert({
    id: user.value.id,
    phone: phone.value,
  } as unknown as never)

  authStore.showPhoneDialog = false
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

      <Input v-model="phone" placeholder="Phone number" />

      <Button class="w-full" @click="savePhone">
        Continue
      </Button>
    </DialogContent>
  </Dialog>
</template>
