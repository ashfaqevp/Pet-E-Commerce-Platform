<script setup lang="ts">
import { onMounted } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart, type ChartOptions, type ChartData, registerables } from 'chart.js'

type PaymentStatus = 'paid' | 'pending' | 'unpaid' | 'failed'
const props = defineProps<{ counts: Record<PaymentStatus, number> }>()

onMounted(() => { Chart.register(...registerables) })

const labels: PaymentStatus[] = ['paid', 'pending', 'unpaid', 'failed']
const colors = {
  paid:    '#22c55e', // green-500 (success)
  pending: '#f59e0b', // amber-500 (in progress)
  unpaid:  '#fb923c', // orange-400 (action needed)
  failed:  '#ef4444', // red-500 (error)
}

const data = computed<ChartData<'doughnut'>>(() => ({
  labels,
  datasets: [{ data: labels.map((l) => props.counts[l] || 0), backgroundColor: labels.map((l) => colors[l]), borderWidth: 0 }],
}))

const options = computed<ChartOptions<'doughnut'>>(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }))
</script>

<template>
  <ClientOnly>
    <div class="h-64">
      <Doughnut :data="data" :options="options" />
    </div>
  </ClientOnly>
</template>
