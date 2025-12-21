import crypto from 'crypto'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const receivedSignature = body.signature
  delete body.signature

  const sorted = Object.keys(body)
    .sort()
    .reduce((acc, k) => {
      acc[k] = body[k]
      return acc
    }, {} as Record<string, any>)

  const query = new URLSearchParams(sorted).toString()
  const expected = crypto
    .createHmac('sha256', config.paytabsServerKey)
    .update(query)
    .digest('hex')

  if (expected !== receivedSignature) {
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // Payment success
  if (body.respStatus === 'A') {
    const supabase = await serverSupabaseClient(event)

    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', body.cartId)
  }

  return { ok: true }
})
