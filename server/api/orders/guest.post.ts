import { z } from 'zod'

/**
 * Places a cash-on-delivery order for a visitor without an account.
 *
 * Anonymous callers cannot insert into `orders` under RLS, so this route does it
 * with the service role — which means nothing from the body is trusted except
 * which products, how many, and where to deliver. Unit prices come from
 * `products.retail_price` (a guest is always retail), shipping and tax from
 * `site_config`. The response carries the order summary because the guest has
 * no way to read the order back afterwards.
 */

const MAX_LINES = 30
const MAX_QTY = 50

const bodySchema = z.object({
  items: z
    .array(z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().min(1).max(MAX_QTY),
    }))
    .min(1)
    .max(MAX_LINES),
  address: z.object({
    full_name: z.string().trim().min(1).max(120),
    phone: z.string().regex(/^\+968[927]\d{7}$/),
    address_line_1: z.string().trim().min(3).max(300),
    address_line_2: z.string().trim().max(300).optional().nullable(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postal_code: z.string().trim().max(20).optional().nullable(),
    country: z.string().trim().max(60).optional(),
  }),
})

// Best-effort throttle against scripted fake orders. It is per server instance,
// so it slows abuse rather than stopping it.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()
const throttle = (key: string) => {
  const now = Date.now()
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    throw createError({ statusCode: 429, statusMessage: 'Too many orders. Please try again later.' })
  }
  recent.push(now)
  hits.set(key, recent)
}

// Database errors are logged here, never echoed to an anonymous caller.
const fail = (where: string, detail: unknown): never => {
  console.error(`[orders:guest] ${where}`, detail)
  throw createError({ statusCode: 500, statusMessage: 'We could not place your order. Please try again.' })
}

const round3 = (v: number) => Math.round(v * 1000) / 1000

interface ProductPriceRow { id: string; name: string; retail_price: number | null; is_active: boolean | null }
interface SiteConfigRow { shipping_fee: number | null; tax_rate: number | null; free_shipping_min_amount: number | null }

export default defineEventHandler(async (event) => {
  throttle(getRequestIP(event, { xForwardedFor: true }) || 'unknown')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Please check your delivery details and try again.' })
  }
  const { items, address } = parsed.data

  // Collapse repeated lines so a product appears once with its summed quantity.
  const qtyById = new Map<string, number>()
  for (const i of items) qtyById.set(i.product_id, Math.min(MAX_QTY, (qtyById.get(i.product_id) || 0) + i.quantity))

  const supabase = adminSupabase()

  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id,name,retail_price,is_active')
    .in('id', [...qtyById.keys()])
  if (productsErr) fail('products', productsErr)

  const available = ((products || []) as ProductPriceRow[]).filter(p => p.is_active !== false)
  if (available.length !== qtyById.size) {
    throw createError({ statusCode: 409, statusMessage: 'Some items are no longer available. Please review your order.' })
  }

  const { data: configRows } = await supabase
    .from('site_config')
    .select('shipping_fee,tax_rate,free_shipping_min_amount')
    .order('updated_at', { ascending: false })
    .limit(1)
  const cfg = (configRows as SiteConfigRow[] | null)?.[0]
  const shippingFee = Number(cfg?.shipping_fee ?? 10)
  const taxRate = Number(cfg?.tax_rate ?? 0.05)
  const freeShippingMin = Number(cfg?.free_shipping_min_amount ?? 50)

  const lines = available.map((p) => {
    const quantity = qtyById.get(p.id)!
    const unit_price = Number(p.retail_price || 0)
    return { product_id: p.id, product_name: p.name, unit_price, quantity, total_price: round3(unit_price * quantity) }
  })
  const subtotal = round3(lines.reduce((sum, l) => sum + l.total_price, 0))
  const shipping = subtotal >= freeShippingMin ? 0 : shippingFee
  const tax = round3(subtotal * taxRate)
  const total = round3(subtotal + shipping + tax)

  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: null,
      customer_type: 'guest',
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'cod',
      payment_provider: 'cod',
      subtotal,
      shipping_fee: round3(shipping),
      tax,
      total,
      shipping_address: {
        full_name: address.full_name,
        phone: address.phone,
        address_line_1: address.address_line_1,
        address_line_2: address.address_line_2 || null,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code || '',
        country: address.country || 'Oman',
      },
    })
    .select('id')
    .single()
  if (orderErr || !orderRow) return fail('order insert', orderErr)

  const orderId = String(orderRow.id)
  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(lines.map(l => ({ ...l, order_id: orderId })))
  if (itemsErr) {
    // Don't leave a priced order with no lines behind.
    await supabase.from('orders').delete().eq('id', orderId)
    fail('order_items insert', itemsErr)
  }

  return {
    orderId,
    total,
    items: lines.map(l => ({ product_id: l.product_id, product_name: l.product_name, unit_price: l.unit_price, quantity: l.quantity })),
  }
})
