<script setup lang="ts">
const route = useRoute()
const status = route.query.respStatus

if (status === 'A') {
  navigateTo('/orders/success')
} else {
  navigateTo('/orders/failed')
}
</script>
