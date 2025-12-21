import crypto from 'crypto'
import { serverSupabaseClient } from '#supabase/server'
import { readRawBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  console.info('PayTabs webhook: received')
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

  const sortedKeys = Object.keys(filtered).sort()
  const query = sortedKeys.map(k => `${k}=${filtered[k]}`).join('&')

  const expectedSignature = crypto
    .createHmac('sha256', config.paytabsServerKey)
    .update(query)
    .digest('hex')

  let verified = !!receivedSignature ? expectedSignature === receivedSignature : false
  console.info('PayTabs webhook: signature', { hasSignature: !!receivedSignature, verified })

  const adminUrl = process.env.SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_API_KEY
  const adminClient = adminUrl && adminKey ? createClient(adminUrl, adminKey, { auth: { persistSession: false } }) : null
  const supabase = adminClient || (await serverSupabaseClient(event))
  const tranRef = filtered.tranRef || (form as Record<string, string>)['tranRef']
  const cartId = filtered.cartId || (form as Record<string, string>)['cartId']
  const statusField = filtered.respStatus || (form as Record<string, string>)['respStatus']
  console.info('PayTabs webhook: payload', { tranRef, cartId, statusField })

  if (verified && statusField === 'A' && cartId) {
    const { data: updated, error: upErr } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        tran_ref: tranRef,
        paid_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', cartId)
      .select('id')
    if (upErr) {
      console.error('PayTabs webhook: update paid failed', { tranRef, cartId, error: upErr.message })
      throw upErr
    }
    console.info('PayTabs webhook: update paid', { count: Array.isArray(updated) ? updated.length : 0 })
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
        console.info('PayTabs webhook: query', { status: resp, tranRef: res?.tran_ref, cartId: res?.cart_id || cartId })
        if (resp === 'A') {
          const { data: updated, error: upErr } = await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              tran_ref: res.tran_ref || tranRef,
              paid_at: new Date().toISOString(),
            } as unknown as never)
            .eq('id', (cartId || res.cart_id) as unknown as never)
            .select('id')
          if (upErr) {
            console.error('PayTabs webhook: update from query failed', { error: upErr.message })
            throw upErr
          }
          console.info('PayTabs webhook: update from query paid', { count: Array.isArray(updated) ? updated.length : 0 })
        } else if (resp) {
          const { data: updated, error: upErr } = await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              status: 'payment_failed',
              tran_ref: res.tran_ref || tranRef,
            } as unknown as never)
            .eq('id', (cartId || res.cart_id) as unknown as never)
            .select('id')
          if (upErr) {
            console.error('PayTabs webhook: mark failed from query error', { error: upErr.message })
            throw upErr
          }
          console.info('PayTabs webhook: update failed', { count: Array.isArray(updated) ? updated.length : 0 })
        }
      } catch (e) {
        console.error('PayTabs webhook: query request failed', e instanceof Error ? e.message : String(e))
      }
    }
  }

  console.info('PayTabs webhook: done')
  return { ok: true }
})
