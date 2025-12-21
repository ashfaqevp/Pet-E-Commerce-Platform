import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { orderId } = body

  const supabase = await serverSupabaseClient(event)
  const config = useRuntimeConfig()

  // 1. Load order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw createError({ statusCode: 404, message: 'Order not found' })
  }

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

  const res = await $fetch<any>(
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
