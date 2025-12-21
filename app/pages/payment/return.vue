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

const { data, error } = await useLazyAsyncData(
  'payment-return-check',
  async (): Promise<{ paid: boolean }> => {
    if (!cartId && !tranRef) return { paid: false }

    let order: OrderLite | null = null

    if (cartId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id,payment_status,tran_ref')
        .eq('id', cartId)
        .single()
      if (error) throw error
      order = data as unknown as OrderLite
    } else if (tranRef) {
      const { data, error } = await supabase
        .from('orders')
        .select('id,payment_status,tran_ref')
        .eq('tran_ref', tranRef)
        .maybeSingle()
      if (error) throw error
      order = (data as unknown as OrderLite) || null
    }

    if (order?.payment_status === 'paid') return { paid: true }

    if (tranRef) {
      try {
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
        return { paid: o.payment_status === 'paid' }
      } catch {
        return { paid: false }
      }
    }

    return { paid: false }
  },
  { server: false }
)

if (error.value) {
  navigateTo('/orders/failed')
} else if (data.value?.paid) {
  navigateTo('/orders/success')
} else {
  navigateTo('/orders/failed')
}
</script>
