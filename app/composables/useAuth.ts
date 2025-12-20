import { useSupabaseClient, useSupabaseUser } from '#imports'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    loginWithGoogle,
    logout,
  }
}
