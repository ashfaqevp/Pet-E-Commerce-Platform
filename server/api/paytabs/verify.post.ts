import { serverSupabaseClient } from '#supabase/server'

interface PaymentResult {
  response_status?: string
}
interface QueryResponse {
  tran_ref?: string
  cart_id?: string
  payment_result?: PaymentResult
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tranRef, cartId } = body as { tranRef?: string; cartId?: string }

  if (!tranRef) {
    throw createError({ statusCode: 400, message: 'Missing tranRef' })
  }

  const config = useRuntimeConfig()

  if (!config.paytabsServerKey || !config.paytabsProfileId || !config.paytabsBaseUrl) {
    throw createError({ statusCode: 500, message: 'PayTabs config missing' })
  }

  const res = await $fetch<QueryResponse>(
    `${config.paytabsBaseUrl}/payment/query`,
    {
      method: 'POST',
      headers: {
        Authorization: config.paytabsServerKey,
        'Content-Type': 'application/json',
      },
      body: {
        profile_id: Number(config.paytabsProfileId),
        tran_ref: tranRef,
      },
    }
  )

  const status = res?.payment_result?.response_status
  const supabase = await serverSupabaseClient(event)

  if (status === 'A') {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        tran_ref: res.tran_ref || tranRef,
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', (cartId || res.cart_id) as unknown as never)
    return { ok: true, status: 'A' }
  }

  if (status) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'payment_failed',
        tran_ref: res.tran_ref || tranRef,
      } as unknown as never)
      .eq('id', (cartId || res.cart_id) as unknown as never)
    return { ok: true, status }
  }

  throw createError({ statusCode: 502, message: 'Invalid PayTabs query response' })
})
