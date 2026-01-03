import { useSupabaseClient, useSupabaseUser } from '#imports'

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed' | 'awaiting_payment' | 'confirmed'
export type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'

export interface OrderRow {
  id: string
  user_id: string
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: 'online' | 'cod' | null
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
      .select('id,user_id,total,status,payment_status,payment_method,created_at')
      .eq('user_id', user.value!.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    const rows = ((data ?? []) as unknown as Array<{ id: string; user_id: string; total: number | string | null; status: string | null; payment_status?: string | null; payment_method?: string | null; created_at: string | Date }>)
      .map((o) => ({
        id: String(o.id),
        user_id: String(o.user_id),
        total: Number(o.total || 0),
        status: ((o.status || 'pending') as OrderStatus),
        payment_status: ((o.payment_status || 'pending') as PaymentStatus),
        payment_method: ((o.payment_method || 'online') as 'online' | 'cod'),
        created_at: typeof o.created_at === 'string' ? o.created_at : new Date(o.created_at).toISOString(),
      })) as OrderRow[]
    return rows
  }

  return { listRecent }
}
