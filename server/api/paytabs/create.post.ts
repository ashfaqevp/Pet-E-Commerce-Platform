import { serverSupabaseClient } from '#supabase/server'

interface OrderRow { id: string; total: number }
interface CreateResponse { tran_ref?: string; redirect_url?: string }

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { orderId } = body

  const supabase = await serverSupabaseClient(event)
  const config = useRuntimeConfig()

  if (!config.paytabsServerKey || !config.paytabsProfileId || !config.paytabsBaseUrl || !config.paytabsCallbackUrl || !config.paytabsReturnUrl) {
    throw createError({ statusCode: 500, message: 'PayTabs configuration incomplete' })
  }

  // 1. Load order
  const { data: orderRow, error } = await supabase
    .from('orders')
    .select('id,total')
    .eq('id', orderId)
    .single()

  if (error || !orderRow) {
    throw createError({ statusCode: 404, message: 'Order not found' })
  }
  const order = orderRow as unknown as OrderRow

  // 2. Create PayTabs request
  const payload = {
    profile_id: Number(config.paytabsProfileId),
    tran_type: 'sale',
    tran_class: 'ecom',

    cart_id: order.id,
    cart_description: `Order ${order.id}`,
    cart_currency: 'INR', // TODO: change OMR
    cart_amount: Number(order.total),

    callback: config.paytabsCallbackUrl,
    return: config.paytabsReturnUrl,
  }

  console.log('Creating PayTabs payment', payload)
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

  console.log('PayTabs request response', res)

  // 3. Save transaction reference ONLY
  if (res.tran_ref) {
    await supabase
      .from('orders')
      .update({ tran_ref: res.tran_ref } as unknown as never)
      .eq('id', order.id)
  }

  // ❌ DO NOT update order status here
  // ✔ Webhook is the source of truth

  return res
})
