<script setup lang="ts">
import { onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart, type ChartOptions, type ChartData, registerables } from 'chart.js'

const props = defineProps<{ labels: string[]; values: number[] }>()

onMounted(() => { Chart.register(...registerables) })

const data = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: [
    { label: 'Revenue', data: props.values, borderColor: '#0f766e', backgroundColor: 'rgba(15, 118, 110, 0.2)', tension: 0.3, fill: true },
  ],
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => `OMR ${Number(ctx.parsed.y || 0).toFixed(3)}` } },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: (v) => `OMR ${Number(v).toFixed(3)}` } },
  },
}))
</script>

<template>
  <ClientOnly>
    <div class="h-64">
      <Line :data="data" :options="options" />
    </div>
  </ClientOnly>
</template>

