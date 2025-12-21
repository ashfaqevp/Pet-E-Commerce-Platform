import { serverSupabaseClient } from '#supabase/server'

// Create PayTabs transaction for an existing order
// - Loads order from Supabase
// - Sends payload to PayTabs /payment/request
// - Saves only tran_ref to the order
// - Returns the PayTabs response to the frontend
// - NEVER updates payment status here (webhook is source of truth)

interface OrderRow { id: string; total: number }
interface CreateResponse { tran_ref?: string; redirect_url?: string }

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { orderId } = body as { orderId?: string }

  const supabase = await serverSupabaseClient(event)
  const config = useRuntimeConfig()

  if (!config.paytabsServerKey || !config.paytabsProfileId || !config.paytabsBaseUrl || !config.paytabsCallbackUrl || !config.paytabsReturnUrl) {
    throw createError({ statusCode: 500, message: 'PayTabs configuration incomplete' })
  }

  // 1) Load order details
  const { data: orderRow, error } = await supabase
    .from('orders')
    .select('id,total')
    .eq('id', orderId as unknown as never)
    .single()

  if (error || !orderRow) {
    throw createError({ statusCode: 404, message: 'Order not found' })
  }
  const order = orderRow as unknown as OrderRow

  // 2) Build PayTabs payload
  const clean = (s: string | undefined) => (s || '').replace(/`/g, '').trim()

  const payload = {
    profile_id: Number(config.paytabsProfileId),
    tran_type: 'sale',
    tran_class: 'ecom',
    cart_id: order.id,
    cart_description: `Order ${order.id}`,
    cart_currency: 'OMR',
    cart_amount: Number(order.total),
    callback: clean(config.paytabsCallbackUrl),
    return: clean(config.paytabsReturnUrl),
    hide_shipping: true,
  }

  console.info('[paytabs:create] creating transaction', payload)
  const res = await $fetch<CreateResponse>(
    `${config.paytabsBaseUrl}/payment/request`,
    {
      method: 'POST',
      headers: {
        Authorization: config.paytabsServerKey,
        'Content-Type': 'application/json',
      },
      body: payload,
    }
  )
  console.info('[paytabs:create] response', res)

  // 3) Save transaction reference ONLY
  if (res.tran_ref) {
    await supabase
      .from('orders')
      .update({ tran_ref: res.tran_ref } as unknown as never)
      .eq('id', order.id)
    console.info('[paytabs:create] saved tran_ref', { orderId: order.id, tran_ref: res.tran_ref })
  }

  // Return the PayTabs response to the frontend
  return res
})
