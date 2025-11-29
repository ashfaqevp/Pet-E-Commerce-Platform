// @ts-nocheck
// Supabase Edge Function (Deno) - create Razorpay order
// Deploy with: supabase functions deploy create-razorpay-order

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const { amount, currency = 'USD' } = await req.json()

  const keyId = Deno.env.get('RAZORPAY_KEY_ID')!
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
  const auth = btoa(`${keyId}:${keySecret}`)

  const body = new URLSearchParams({ amount: String(amount), currency })
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
})