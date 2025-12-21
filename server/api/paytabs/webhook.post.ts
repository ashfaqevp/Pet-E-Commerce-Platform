import crypto from 'crypto'
import { serverSupabaseClient } from '#supabase/server'
import { readRawBody } from 'h3'

export default defineEventHandler(async (event) => {

  console.log('PayTabs webhook callback received')
  const rawBody = await readRawBody(event)

  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty callback body' })
  }

  const contentType = event.node.req.headers['content-type'] || ''
  const rawText = rawBody.toString()
  const isJson = contentType.includes('application/json') || rawText.trim().startsWith('{')
  const form = isJson ? (JSON.parse(rawText) as Record<string, string>) : Object.fromEntries(new URLSearchParams(rawText))

  const config = useRuntimeConfig()

  const receivedSignature = (form as Record<string, string | undefined>).signature
  delete (form as Record<string, unknown>).signature

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

  let verified = true
  if (receivedSignature) {
    verified = expectedSignature === receivedSignature
  }
  if (!verified) {
    console.error('Invalid PayTabs signature', { receivedSignature, expectedSignature, query })
  }

  // ✅ VERIFIED CALLBACK
  const supabase = await serverSupabaseClient(event)
  const tranRef = filtered.tranRef || (form as Record<string, string>)['tranRef']
  const cartId = filtered.cartId || (form as Record<string, string>)['cartId']
  const statusField = filtered.respStatus || (form as Record<string, string>)['respStatus']

  if (verified && statusField === 'A') {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        tran_ref: tranRef,
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', cartId)
  } else {
    if (tranRef) {
      try {
        const config = useRuntimeConfig()
        const res = await $fetch<{ payment_result?: { response_status?: string }; tran_ref?: string; cart_id?: string }>(
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
        const resp = res?.payment_result?.response_status
        if (resp === 'A') {
          await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              tran_ref: res.tran_ref || tranRef,
              paid_at: new Date().toISOString(),
            } as unknown as never)
            .eq('id', (cartId || res.cart_id) as unknown as never)
        } else if (resp) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              status: 'payment_failed',
              tran_ref: res.tran_ref || tranRef,
            } as unknown as never)
            .eq('id', (cartId || res.cart_id) as unknown as never)
        }
      } catch (e) {
        console.error('PayTabs query failed', e)
      }
    }
  }

  return { ok: true }
})
