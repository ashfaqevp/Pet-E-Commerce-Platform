import axios from 'axios'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const functionUrl = config.public.supabaseFunctionUrl || (config.public.supabaseUrl ? `${config.public.supabaseUrl}/functions/v1/create-razorpay-order` : '')

  if (functionUrl) {
    const { data } = await axios.post(functionUrl, { amount: body.amount, currency: body.currency || 'USD' })
    return data
  }

  // Fallback mock (for local testing without Supabase function)
  return {
    id: 'order_mock_123',
    amount: body.amount,
    currency: body.currency || 'USD',
  }
})