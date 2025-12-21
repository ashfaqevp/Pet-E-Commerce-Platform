import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const showAuthDialog = ref<boolean>(false)
  const showPhoneDialog = ref<boolean>(false)

  const requireAuth = () => {
    showAuthDialog.value = true
  }

  return {
    showAuthDialog,
    showPhoneDialog,
    requireAuth,
  }
})
