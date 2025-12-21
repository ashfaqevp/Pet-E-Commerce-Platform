import crypto from 'crypto'
import { serverSupabaseClient } from '#supabase/server'
import { readRawBody } from 'h3'

export default defineEventHandler(async (event) => {

  console.log('PayTabs webhook callback received')
  const rawBody = await readRawBody(event)

  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty callback body' })
  }

  const form = Object.fromEntries(new URLSearchParams(rawBody.toString()))

  const config = useRuntimeConfig()

  const receivedSignature = form.signature
  delete form.signature

  const filtered = Object.fromEntries(
    Object.entries(form).filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
  ) as Record<string, string>

  // Sort fields alphabetically
  const sorted = Object.keys(filtered)
    .sort()
    .reduce((acc, k) => {
      acc[k] = filtered[k] as string
      return acc
    }, {} as Record<string, string>)

  const query = new URLSearchParams(sorted).toString()

  const expectedSignature = crypto
    .createHmac('sha256', config.paytabsServerKey)
    .update(query)
    .digest('hex')

  if (!receivedSignature || expectedSignature !== receivedSignature) {
    console.error('Invalid PayTabs signature', { receivedSignature, expectedSignature, query })
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // ✅ VERIFIED CALLBACK
  const supabase = await serverSupabaseClient(event)

  if (filtered.respStatus === 'A') {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        tran_ref: filtered.tranRef,
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', filtered.cartId)
  } else {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'payment_failed',
        tran_ref: filtered.tranRef,
      } as unknown as never)
      .eq('id', filtered.cartId)
  }

  return { ok: true }
})
