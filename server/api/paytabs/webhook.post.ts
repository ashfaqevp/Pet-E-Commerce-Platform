import crypto from 'crypto'
import { serverSupabaseClient } from '#supabase/server'
import { readRawBody } from 'h3'

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)

  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty callback body' })
  }

  // PayTabs sends form-urlencoded
  const body = Object.fromEntries(new URLSearchParams(rawBody.toString()))

  const config = useRuntimeConfig()

  const receivedSignature = body.signature
  delete body.signature

  // Sort fields alphabetically
  const sorted = Object.keys(body)
    .sort()
    .reduce((acc, k) => {
      acc[k] = body[k]
      return acc
    }, {} as Record<string, string>)

  const query = new URLSearchParams(sorted).toString()

  const expectedSignature = crypto
    .createHmac('sha256', config.paytabsServerKey)
    .update(query)
    .digest('hex')

  if (expectedSignature !== receivedSignature) {
    console.error('❌ Invalid PayTabs signature', { body })
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // ✅ VERIFIED CALLBACK
  const supabase = await serverSupabaseClient(event)

  if (body.respStatus === 'A') {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        tran_ref: body.tranRef,
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', body.cartId)
  } else {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'payment_failed',
        tran_ref: body.tranRef,
      } as unknown as never)
      .eq('id', body.cartId)
  }

  return { ok: true }
})
