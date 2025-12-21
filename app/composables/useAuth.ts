import { useSupabaseClient, useSupabaseUser } from '#imports'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const loginWithGoogle = async () => {
    const supabase = useSupabaseClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`
      }
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
