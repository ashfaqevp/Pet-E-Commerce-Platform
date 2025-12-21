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
  const row = order as unknown as { id: string; total: number }

  const payload = {
    profile_id: Number(config.paytabsProfileId),
    tran_type: 'sale',
    tran_class: 'ecom',
    cart_id: row.id,
    cart_description: `Order ${row.id}`,
    cart_currency: 'INR', //TODO LAter changes OMR
    cart_amount: Number(row.total),
    callback: config.paytabsCallbackUrl,
    return: config.paytabsReturnUrl,
  }

  const res = await $fetch(`${config.paytabsBaseUrl}/payment/request`, {
    method: 'POST',
    headers: {
      Authorization: config.paytabsServerKey,
      'Content-Type': 'application/json',
    },
    body: payload,
  })

  // 3. Save transaction reference
  if ((res as any).tran_ref) {
    await supabase
      .from('orders')
      .update({ tran_ref: (res as any).tran_ref } as unknown as never)
      .eq('id', row.id)
  }

  // 4. Immediate success handling
  if ((res as any).payment_result?.response_status === 'A') {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', row.id)
  }

  return res
})
