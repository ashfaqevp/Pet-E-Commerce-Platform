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

const orderId = route.query.cartId as string

const { data: order } = await supabase
  .from('orders')
  .select('payment_status')
  .eq('id', orderId)P
  .single()

if (order?.payment_status === 'paid') {
  navigateTo('/orders/success')
} else {
  navigateTo('/orders/failed')
}
</script>

