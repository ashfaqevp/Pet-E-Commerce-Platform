import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type UserType = 'retail' | 'wholesale'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; email: string } | null>(null)
  const userType = ref<UserType | null>(null)

  const register = async (email: string, _password: string, type: UserType) => {
    // Placeholder: integrate Supabase later
    user.value = { id: 'demo', email }
    userType.value = type
  }

  const login = (payload: { id: string; email: string }) => {
    user.value = payload
  }

  const logout = () => {
    user.value = null
    userType.value = null
  }

  const isAuthenticated = computed(() => !!user.value)

  return { user, userType, register, login, logout, isAuthenticated }
})