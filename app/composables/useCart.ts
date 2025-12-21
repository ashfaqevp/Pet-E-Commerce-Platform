import { useSupabaseClient, useSupabaseUser, useState } from '#imports'
import { useLocalStorage } from '@vueuse/core'

export interface CartItemRow {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at?: string
}

export interface ProductRow {
  id: string
  name: string
  brand?: string | null
  thumbnail_url?: string | null
  retail_price?: number | null
  default_rating?: number | null
  base_product_id?: string | null
}

export interface CartItemWithProduct {
  id: string
  product_id: string
  quantity: number
  product: ProductRow
}

export const useCart = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const cartCount = useState<number>('cart-count', () => 0)
  const cartLocks = new Set<string>()

  const requireAuth = () => {
    if (!user.value) {
      throw new Error('LOGIN_REQUIRED')
    }
  }

  const loadCart = async (): Promise<CartItemRow[]> => {
    requireAuth()
    const { data, error } = await supabase
      .from('cart_items')
      .select('id,product_id,quantity,created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    const rows = (data ?? []) as unknown as CartItemRow[]
    return rows
  }

  const guestItems = useLocalStorage<{ product_id: string; quantity: number }[]>('bh-cart', [])

  const refreshCart = async (): Promise<void> => {
    if (!user.value) {
      const items = guestItems.value || []
      cartCount.value = items.reduce((sum, i) => sum + (i.quantity ?? 1), 0)
      return
    }
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity')
    if (error) throw error
    const rows = (data ?? []) as unknown as { quantity: number }[]
    cartCount.value = rows.reduce((sum, r) => sum + (r.quantity ?? 1), 0)
  }

  const loadCartWithProducts = async (): Promise<CartItemWithProduct[]> => {
    if (!user.value) {
      const items = guestItems.value || []
      if (!items.length) return []
      const ids = items.map(i => i.product_id)
      const { data: products, error } = await supabase
        .from('products')
        .select('id,name,brand,thumbnail_url,retail_price,default_rating,base_product_id')
        .in('id', ids)
      if (error) throw error
      const map = new Map<string, ProductRow>()
      for (const p of (products ?? []) as unknown as ProductRow[]) map.set(p.id, p)
      return items
        .filter(i => map.has(i.product_id))
        .map<CartItemWithProduct>(i => ({ id: i.product_id, product_id: i.product_id, quantity: i.quantity ?? 1, product: map.get(i.product_id)! }))
    }
    const rows = await loadCart()
    if (!rows.length) return []
    const ids = rows.map(r => r.product_id)
    const { data: products, error } = await supabase
      .from('products')
      .select('id,name,brand,thumbnail_url,retail_price,default_rating,base_product_id')
      .in('id', ids)
    if (error) throw error
    const map = new Map<string, ProductRow>()
    for (const p of (products ?? []) as unknown as ProductRow[]) map.set(p.id, p)
    return rows
      .filter(r => map.has(r.product_id))
      .map<CartItemWithProduct>(r => ({ id: r.id, product_id: r.product_id, quantity: r.quantity ?? 1, product: map.get(r.product_id)! }))
  }

const addToCart = async ({
  productId,
  quantity = 1,
}: {
  productId: string
  quantity?: number
}) => {
  if (!user.value) {
    // guest logic stays same
    const idx = guestItems.value.findIndex(i => i.product_id === productId)
    if (idx >= 0) {
      guestItems.value[idx]!.quantity += Math.max(1, quantity)
    } else {
      guestItems.value.push({ product_id: productId, quantity: Math.max(1, quantity) })
    }
    await refreshCart()
    return
  }

  const qty = Math.max(1, quantity)

  const { error } = await supabase
    .from('cart_items')
    .upsert(
      {
        product_id: productId,
        quantity: qty,
      },
      {
        onConflict: 'user_id,product_id',
      }
    )

  if (error) throw error

  await refreshCart()
}

  const updateQty = async (id: string, quantity: number): Promise<void> => {
    if (!user.value) {
      const idx = guestItems.value.findIndex(i => i.product_id === id)
      if (idx >= 0) guestItems.value[idx]!.quantity = quantity
      return
    }
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity } as unknown as never)
      .eq('id', id)
    if (error) throw error
  }

  const removeFromCart = async (id: string): Promise<void> => {
    if (!user.value) {
      const idx = guestItems.value.findIndex(i => i.product_id === id)
      if (idx >= 0) guestItems.value.splice(idx, 1)
      return
    }
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

const syncGuestToServer = async () => {
  if (!user.value) return

  const items = guestItems.value || []
  if (!items.length) return

  for (const i of items) {
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        {
          product_id: i.product_id,
          quantity: i.quantity ?? 1,
        } as any,
        {
          onConflict: 'user_id,product_id',
        }
      )

    if (error) throw error
  }

  guestItems.value = []
  await refreshCart()
}


  return {
    loadCart,
    loadCartWithProducts,
    addToCart,
    updateQty,
    removeFromCart,
    requireAuth,
    syncGuestToServer,
    refreshCart,
    cartCount,
  }
}
