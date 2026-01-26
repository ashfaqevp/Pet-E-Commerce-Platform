import { useSupabaseClient, useSupabaseUser } from '#imports'
import { ref } from 'vue'
import { useCart, type CartItemWithProduct } from '@/composables/useCart'
import { useAddresses, type AddressRow } from '@/composables/useAddresses'

// Payment status lifecycle
type PaymentStatus = 'pending' | 'unpaid' | 'paid' | 'refunded' | 'failed'
type PaymentMethod = 'online' | 'cod'

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
  status: 'awaiting_payment' | 'pending'
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  payment_provider: 'paytabs' | 'cod'
  tran_ref?: string | null
  paid_at?: string | null
  shipping_address: ShippingAddressSnapshot
}

interface OrderItemInsertRow {
  order_id: string
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  total_price: number
}

export const useCheckoutOrder = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const creating = ref(false)
  const { loadCartWithProducts } = useCart()
  const { listAddresses } = useAddresses()

  const round3 = (v: number) => Math.round(v * 1000) / 1000

  interface CreateOptions { shippingFee?: number; taxRate?: number }

  const create = async (addressId: string, opts?: CreateOptions, paymentMethod: PaymentMethod = 'online'): Promise<string> => {
    if (creating.value) throw new Error('ALREADY_CREATING')
    if (!user.value) throw new Error('LOGIN_REQUIRED')
    creating.value = true
    try {
      const items = await loadCartWithProducts()
      if (!items.length) throw new Error('CART_EMPTY')
      const { data: roleRow, error: roleErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.value!.id)
        .single<{ role: string | null }>()
      if (roleErr) throw roleErr
      const userRole = (roleRow?.role || 'customer') as 'customer' | 'wholesaler' | 'admin'
      const unitPriceOf = (p: { retail_price?: number | null; wholesale_price?: number | null }) => {
        const r = p.retail_price
        const w = p.wholesale_price
        if (userRole === 'wholesaler' && w != null) return Number(w || 0)
        return Number(r || 0)
      }
      const addresses = await listAddresses()
      const addr = addresses.find(a => a.id === addressId) || addresses.find(a => a.is_default) || addresses[0]
      if (!addr) throw new Error('NO_ADDRESS')
      const subtotal = items.reduce((sum, i) => sum + unitPriceOf(i.product) * Number(i.quantity || 1), 0)
      const cfgShipping = typeof opts?.shippingFee === 'number' ? Number(opts!.shippingFee) : 10
      const cfgTaxRate = typeof opts?.taxRate === 'number' ? Number(opts!.taxRate) : 0.05
      const shipping = items.length ? Number(cfgShipping || 0) : 0
      const tax = round3(subtotal * Number(cfgTaxRate || 0))
      const total = round3(subtotal + shipping + tax)
      const isCOD = paymentMethod === 'cod'
      const payload: OrderInsertRow = {
        user_id: user.value.id,
        status: isCOD ? 'pending' : 'awaiting_payment',
        payment_status: isCOD ? 'pending' : 'unpaid',
        payment_method: paymentMethod,
        payment_provider: isCOD ? 'cod' : 'paytabs',
        tran_ref: null,
        paid_at: null,
        subtotal: round3(subtotal),
        shipping_fee: round3(shipping),
        tax: round3(tax),
        total: round3(total),
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
        unit_price: unitPriceOf(i.product),
        quantity: Number(i.quantity || 1),
        total_price: round3(unitPriceOf(i.product) * Number(i.quantity || 1)),
      }))
      if (orderItems.length) {
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems as unknown as never)
        if (itemsErr) throw itemsErr
      }
      return orderId
    } finally {
      creating.value = false
    }
  }

  return { create, creating }
}
