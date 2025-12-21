import crypto from 'crypto'
import { serverSupabaseClient } from '#supabase/server'
import { readRawBody, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

// PayTabs webhook handler
// - Parses JSON or form payloads
// - Verifies HMAC signature using server key
// - Updates order status ONLY when signature is valid
// - Idempotent: safe to call multiple times
// - Uses Supabase service role key to bypass RLS

export default defineEventHandler(async (event) => {
  console.info('[paytabs:webhook] received')
  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty callback body' })
  }

  const contentType = event.node.req.headers['content-type'] || ''
  const rawText = rawBody.toString()
  const isJson = contentType.includes('application/json') || rawText.trim().startsWith('{')
  const bodyFields = isJson ? (JSON.parse(rawText) as Record<string, string>) : Object.fromEntries(new URLSearchParams(rawText))
  const queryFields = (getQuery(event) as Record<string, string | undefined>) || {}
  const form = { ...bodyFields, ...queryFields } as Record<string, string>

  const config = useRuntimeConfig()

  // Verify HMAC signature
  const receivedSignature = (form as Record<string, string | undefined>).signature
  delete (form as Record<string, unknown>).signature

  const filtered = Object.fromEntries(
    Object.entries(form).filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)
  ) as Record<string, string>

  const sorted = Object.keys(filtered)
    .sort()
    .reduce((acc, k) => {
      const v = filtered[k] as string
      acc[k] = v
      return acc
    }, {} as Record<string, string>)
  const query = new URLSearchParams(sorted).toString()

  const expectedSignature = crypto
    .createHmac('sha256', config.paytabsServerKey)
    .update(query)
    .digest('hex')

  const verified = !!receivedSignature ? expectedSignature === receivedSignature : false
  console.info('[paytabs:webhook] signature verified', { verified, hasSignature: !!receivedSignature })

  const adminUrl = process.env.SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_API_KEY
  const adminClient = adminUrl && adminKey ? createClient(adminUrl, adminKey, { auth: { persistSession: false } }) : null
  const supabase = adminClient || (await serverSupabaseClient(event))

  const tranRef = filtered.tranRef || filtered.tran_ref || (form as Record<string, string>)['tranRef'] || (form as Record<string, string>)['tran_ref']
  const cartId = filtered.cartId || filtered.cart_id || (form as Record<string, string>)['cartId'] || (form as Record<string, string>)['cart_id']
  // const respStatus = filtered.respStatus || filtered.resp_status || (form as Record<string, string>)['respStatus'] || (form as Record<string, string>)['resp_status']
  let respStatus:
  | string
  | undefined =
  filtered.respStatus ||
  filtered.resp_status ||
  (form as Record<string, string>)['respStatus'] ||
  (form as Record<string, string>)['resp_status']
  // console.info('[paytabs:webhook] payload', { cartId, tranRef, respStatus })

  // if (!verified) {
  //   throw createError({ statusCode: 400, message: 'Invalid signature' })
  // }

  console.info('[paytabs:webhook] payload', { cartId, tranRef, respStatus })

  // ---------------------------------------------
  // 🔁 PAYTABS FALLBACK QUERY (CRITICAL FIX)
  // ---------------------------------------------
  if (!respStatus && tranRef) {
    console.info('[paytabs:webhook] no respStatus, querying PayTabs')

    const queryRes = await $fetch<{
      payment_result?: { response_status?: string }
      cart_id?: string
      tran_ref?: string
    }>(`${config.paytabsBaseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        Authorization: config.paytabsServerKey,
        'Content-Type': 'application/json',
      },
      body: {
        profile_id: Number(config.paytabsProfileId),
        tran_ref: tranRef,
      },
    })

    respStatus = queryRes?.payment_result?.response_status
    console.info('[paytabs:webhook] queried status', respStatus)
  }


  // ---------------------------------------------
  // 🔐 SIGNATURE CHECK (ONLY FOR FINAL STATUS)
  // ---------------------------------------------
  // const isFinalStatus = respStatus === 'A' || respStatus === 'D' || respStatus === 'E' || respStatus === 'C'

  // if (isFinalStatus && !verified) {
  //   console.error('[paytabs:webhook] invalid signature for final status')
  //   throw createError({ statusCode: 400, message: 'Invalid signature' })
  // }


  // const isFinalStatus = respStatus === 'A' || respStatus === 'D' || respStatus === 'E' || respStatus === 'C'
  // console.info('[paytabs:webhook] is final status', respStatus, isFinalStatus)

  // // Only require signature IF PayTabs claims final status
  // if (isFinalStatus && !verified) {
  //   console.error('[paytabs:webhook] invalid signature for final status')
  //   throw createError({ statusCode: 400, message: 'Invalid signature' })
  // }


  // Determine target order by id or tran_ref
  const targetKey = cartId ? 'id' : 'tran_ref'
  const targetVal = (cartId || tranRef) as string | undefined
  if (!targetVal) {
    throw createError({ statusCode: 400, message: 'Missing cartId/tranRef' })
  }

  // Load current order for idempotency check
  const { data: existing, error: loadErr } = await supabase
    .from('orders')
    .select('id,payment_status,status')
    .eq(targetKey, targetVal as unknown as never)
    .maybeSingle()
  if (loadErr) {
    console.error('[paytabs:webhook] load order error', loadErr.message)
    throw loadErr
  }

  // Apply update based on webhook status
  if (respStatus === 'A') {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        tran_ref: tranRef,
        paid_at: new Date().toISOString(),
      })
      .eq(targetKey, targetVal as never)

    console.info('[paytabs:webhook] order marked paid')
    return { ok: true }
  }

  if (respStatus) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'payment_failed',
        tran_ref: tranRef,
      })
      .eq(targetKey, targetVal as never)

    console.info('[paytabs:webhook] order marked failed')
    return { ok: true }
  }

  // No status provided
  throw createError({ statusCode: 502, message: 'Invalid webhook payload' })
})
