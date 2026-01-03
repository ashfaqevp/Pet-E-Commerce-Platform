<script setup lang="ts">
import { formatOMR } from '@/utils'

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed' | 'awaiting_payment' | 'confirmed'
type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'pending'

interface OrderRow { id: string; total: number; status: OrderStatus; payment_status: PaymentStatus; created_at: string }

const props = defineProps<{ rows: OrderRow[]; pending?: boolean; error?: string }>()

const shortId = (id: string) => `#${id.slice(0, 8)}`
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
const formatCurrency = (v: number) => formatOMR(v)
const goTo = (id: string) => navigateTo(`/admin/orders/${id}`)
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Order</TableHead>
        <TableHead>Date</TableHead>
        <TableHead class="text-right">Total</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Payment</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-if="props.pending"><TableCell colspan="5"><Skeleton class="h-8 w-full" /></TableCell></TableRow>
      <TableRow v-else-if="props.error"><TableCell colspan="5"><Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{{ props.error }}</AlertDescription></Alert></TableCell></TableRow>
      <TableRow v-else-if="(props.rows?.length || 0) === 0"><TableEmpty :colspan="5">No orders found</TableEmpty></TableRow>
      <TableRow v-else v-for="row in props.rows" :key="row.id" class="cursor-pointer hover:bg-muted/40" @click="goTo(row.id)">
        <TableCell><NuxtLink :to="`/admin/orders/${row.id}`" class="text-foreground underline">{{ shortId(row.id) }}</NuxtLink></TableCell>
        <TableCell>{{ formatDate(row.created_at) }}</TableCell>
        <TableCell class="text-right">{{ formatCurrency(row.total) }}</TableCell>
        <TableCell class="capitalize text-muted-foreground">{{ row.status }}</TableCell>
        <TableCell class="capitalize text-muted-foreground">{{ row.payment_status }}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
