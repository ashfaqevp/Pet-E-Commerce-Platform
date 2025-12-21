<!-- <script setup lang="ts">
const route = useRoute()
const status = route.query.respStatus

console.log(status)

console.log(route)

if (status === 'A') {
  navigateTo('/orders/success')
} else {
  navigateTo('/orders/failed')
}
</script> -->

<script setup lang="ts">
const route = useRoute()
const supabase = useSupabaseClient()

type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'
interface OrderLite {
  id: string
  payment_status: PaymentStatus | null
  tran_ref: string | null
}

const cartId = route.query.cartId as string | undefined
const tranRef = route.query.tranRef as string | undefined
const respStatus = route.query.respStatus as string | undefined

const { data, error } = await useLazyAsyncData(
  'payment-return-check',
  async (): Promise<{ paid: boolean; reason?: string }> => {
    console.info('Payment return: start', { cartId, tranRef, respStatus })
    if (!cartId && !tranRef) return { paid: false, reason: 'missing-params' }

    let order: OrderLite | null = null

    if (cartId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id,payment_status,tran_ref')
        .eq('id', cartId)
        .single()
      if (error) throw error
      order = data as unknown as OrderLite
      console.info('Payment return: order by id', { id: order?.id, status: order?.payment_status })
    } else if (tranRef) {
      const { data, error } = await supabase
        .from('orders')
        .select('id,payment_status,tran_ref')
        .eq('tran_ref', tranRef)
        .maybeSingle()
      if (error) throw error
      order = (data as unknown as OrderLite) || null
      console.info('Payment return: order by ref', { id: order?.id, status: order?.payment_status })
    }

    if (order?.payment_status === 'paid') return { paid: true, reason: 'db-paid' }

    if (tranRef) {
      try {
        console.info('Payment return: verify start')
        await $fetch('/api/paytabs/verify', {
          method: 'POST',
          body: { tranRef, cartId },
        })
        const key = cartId ? { k: 'id', v: cartId } : { k: 'tran_ref', v: tranRef }
        const { data: refreshed, error: refErr } = await supabase
          .from('orders')
          .select('id,payment_status,tran_ref')
          .eq(key.k, key.v)
          .single()
        if (refErr) throw refErr
        const o = refreshed as unknown as OrderLite
        console.info('Payment return: verify done', { id: o?.id, status: o?.payment_status })
        return { paid: o.payment_status === 'paid', reason: 'verified' }
      } catch (e) {
        console.error('Payment return: verify error', e instanceof Error ? e.message : String(e))
        return { paid: false, reason: 'verify-error' }
      }
    }

    return { paid: false, reason: 'not-paid' }
  },
  { server: false }
)

if (error.value) {
  console.error('Payment return: error', error.value?.message || String(error.value))
  navigateTo('/orders/failed')
} else if (data.value?.paid) {
  console.info('Payment return: success', { reason: data.value?.reason })
  navigateTo('/orders/success')
} else {
  console.info('Payment return: failed', { reason: data.value?.reason })
  navigateTo('/orders/failed')
}
</script>
