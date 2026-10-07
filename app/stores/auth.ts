import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const showAuthDialog = ref<boolean>(false)
  /**
   * Where to be after signing in. Set when the dialog is opened from a page the
   * user is in the middle of (checkout) — closing it then stays put instead of
   * going home, and a successful sign-in comes back here.
   */
  const returnTo = ref<string | null>(null)

  const requireAuth = (opts?: { returnTo?: string }) => {
    returnTo.value = opts?.returnTo ?? null
    showAuthDialog.value = true
  }

  return {
    showAuthDialog,
    returnTo,
    requireAuth,
  }
})
