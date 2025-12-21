interface PaymentResult { response_status?: string }
interface QueryResponse {
  tran_ref?: string
  cart_id?: string
  payment_result?: PaymentResult
}

// Read-only verification endpoint
// - Accepts { tranRef }
// - Queries PayTabs for transaction status
// - Returns status to caller
// - DOES NOT update database (webhook is the single source of truth)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tranRef } = body as { tranRef?: string }

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
  console.info('[paytabs:verify] query result', { status, tran_ref: res?.tran_ref, cart_id: res?.cart_id })

  if (!status) {
    throw createError({ statusCode: 502, message: 'Invalid PayTabs query response' })
  }

  return { ok: true, status, tran_ref: res?.tran_ref, cart_id: res?.cart_id }
})
