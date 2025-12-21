import { useSupabaseClient, useSupabaseUser } from '#imports'
import { ref } from 'vue'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { useAddresses, type AddressRow } from '@/composables/useAddresses'

type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'

interface Totals {
  subtotal: number
  shipping_fee: number
  tax: number
  total: number
}

interface ShippingAddressSnapshot {
  full_name: string
  phone: string
  address_line_1: string
  address_line_2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
}

interface OrderInsertRow extends Totals {
  user_id: string
  status: 'pending'
  payment_status: PaymentStatus
  shipping_address: ShippingAddressSnapshot
}

interface OrderItemInsertRow {
  order_id: string
  product_id: string
  product_name: string
  thumbnail?: string | null
  unit_price: number
  quantity: number
  total_price: number
}

export const useCheckoutOrder = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const creating = ref(false)
  const { loadCartWithProducts, refreshCart } = useCart()
  const { listAddresses } = useAddresses()

  const round2 = (v: number) => Math.round(v * 100) / 100

  const create = async (addressId: string): Promise<string> => {
    if (creating.value) throw new Error('ALREADY_CREATING')
    if (!user.value) throw new Error('LOGIN_REQUIRED')
    creating.value = true
    try {
      const items = await loadCartWithProducts()
      if (!items.length) throw new Error('CART_EMPTY')
      const addresses = await listAddresses()
      const addr = addresses.find(a => a.id === addressId) || addresses.find(a => a.is_default) || addresses[0]
      if (!addr) throw new Error('NO_ADDRESS')
      const subtotal = items.reduce((sum, i) => sum + Number(i.product.retail_price || 0) * Number(i.quantity || 1), 0)
      const shipping = items.length ? 10 : 0
      const tax = round2(subtotal * 0.05)
      const total = round2(subtotal + shipping + tax)
      const payload: OrderInsertRow = {
        user_id: user.value.id,
        status: 'pending',
        payment_status: 'unpaid',
        subtotal: round2(subtotal),
        shipping_fee: round2(shipping),
        tax: round2(tax),
        total: round2(total),
        shipping_address: {
          full_name: addr.full_name,
          phone: addr.phone,
          address_line_1: addr.address_line_1,
          address_line_2: addr.address_line_2 || null,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
        },
      }
      const { data: orderRow, error: orderErr } = await supabase.from('orders').insert([payload as unknown as never]).select('id').single()
      if (orderErr) throw orderErr
      const orderId = String((orderRow as { id: string }).id)
      const orderItems: OrderItemInsertRow[] = items.map(i => ({
        order_id: orderId,
        product_id: i.product_id,
        product_name: i.product.name,
        thumbnail: i.product.thumbnail_url || null,
        unit_price: Number(i.product.retail_price || 0),
        quantity: Number(i.quantity || 1),
        total_price: round2(Number(i.product.retail_price || 0) * Number(i.quantity || 1)),
      }))
      if (orderItems.length) {
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems as unknown as never)
        if (itemsErr) throw itemsErr
      }
      const { error: clearErr } = await supabase.from('cart_items').delete().eq('user_id', user.value.id)
      if (clearErr) throw clearErr
      await refreshCart()
      return orderId
    } finally {
      creating.value = false
    }
  }

  return { create, creating }
}
