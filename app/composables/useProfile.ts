import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface ProfileRow {
  id: string
  phone?: string | null
  role?: string | null
  created_at?: string
  updated_at?: string
}

export const useProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const requireAuth = () => {
    if (!user.value) throw new Error('LOGIN_REQUIRED')
  }

  const getProfile = async (): Promise<ProfileRow | null> => {
    requireAuth()
    const { data, error } = await supabase
      .from('profiles')
      .select('id,phone,role,created_at,updated_at')
      .eq('id', user.value!.id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as unknown as ProfileRow | null
  }

  const updatePhone = async (phone: string): Promise<void> => {
    requireAuth()
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.value!.id, phone } as unknown as never)
    if (error) throw error
  }

  return { getProfile, updatePhone }
}
