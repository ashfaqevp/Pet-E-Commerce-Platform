import { useSupabaseClient, useSupabaseUser } from '#imports'

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed'

export interface OrderRow {
  id: string
  user_id: string
  total: number
  status: OrderStatus
  created_at: string
}

export const useOrders = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const requireAuth = () => {
    if (!user.value) throw new Error('LOGIN_REQUIRED')
  }

  const listRecent = async (limit = 5): Promise<OrderRow[]> => {
    requireAuth()
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,total,status,created_at')
      .eq('user_id', user.value!.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as unknown as OrderRow[]
  }

  return { listRecent }
}
