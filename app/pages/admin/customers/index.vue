<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Customers',
})

interface AdminCustomer {
  id: string
  phone?: string | null
  role?: string | null
  joined_at: string
  total_orders: number
  total_spent: number
  last_order_date?: string | null
}

const search = ref('')
const sortBy = ref<'joined_at' | 'total_spent' | 'total_orders'>('joined_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  search: search.value || undefined,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-customers',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('profiles').select('id,phone,role,created_at', { count: 'exact' })
    q = q.eq('role', 'customer')
    if (params.value.search) {
      const term = params.value.search
      const digits = term.replace(/[^0-9]/g, '')
      const ors: string[] = []
      if (digits) ors.push(`phone.ilike.%${digits}%`)
      ors.push(`id.eq.${term}`)
      q = q.or(ors.join(','))
    }
    if (params.value.sortBy === 'joined_at') q = q.order('created_at', { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const profiles = ((data || []) as unknown as Array<{ id: string; phone?: string | null; role?: string | null; created_at: string | Date }>)
    const ids = profiles.map(p => String(p.id))
    let orders: Array<{ id: string; user_id: string; total: number | string | null; payment_status?: string | null; created_at: string | Date }> = []
    if (ids.length) {
      const { data: od, error: oe } = await supabase
        .from('orders')
        .select('id,user_id,total,payment_status,created_at')
        .in('user_id', ids)
      if (oe) throw oe
      orders = (od || []) as unknown as Array<{ id: string; user_id: string; total: number | string | null; payment_status?: string | null; created_at: string | Date }>
    }
    const agg = new Map<string, { total_orders: number; total_spent: number; last_order_date?: string | null }>()
    for (const o of orders) {
      const uid = String(o.user_id)
      const prev = agg.get(uid) || { total_orders: 0, total_spent: 0, last_order_date: null }
      const t = Number(o.total || 0)
      const paid = (o.payment_status || '').toLowerCase() === 'paid'
      const created = typeof o.created_at === 'string' ? o.created_at : new Date(o.created_at).toISOString()
      const last = prev.last_order_date
      const nextLast = !last ? created : new Date(created).getTime() > new Date(last).getTime() ? created : last
      agg.set(uid, { total_orders: prev.total_orders + 1, total_spent: prev.total_spent + (paid ? t : 0), last_order_date: nextLast })
    }
    let rows = profiles.map(p => ({
      id: String(p.id),
      phone: p.phone || null,
      role: p.role || null,
      joined_at: typeof p.created_at === 'string' ? p.created_at : new Date(p.created_at).toISOString(),
      total_orders: agg.get(String(p.id))?.total_orders || 0,
      total_spent: agg.get(String(p.id))?.total_spent || 0,
      last_order_date: agg.get(String(p.id))?.last_order_date || null,
    })) as AdminCustomer[]
    if (params.value.sortBy === 'total_spent') {
      rows = rows.sort((a, b) => (params.value.ascending ? a.total_spent - b.total_spent : b.total_spent - a.total_spent))
    } else if (params.value.sortBy === 'total_orders') {
      rows = rows.sort((a, b) => (params.value.ascending ? a.total_orders - b.total_orders : b.total_orders - a.total_orders))
    }
    return { rows, count: count ?? rows.length }
  },
  { server: true }
)

watch(params, () => {
  refresh()
})

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      refresh()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))
const rows = computed(() => data.value?.rows || [])

const deletingId = ref<string | null>(null)
const confirmDelete = async () => {
  if (!deletingId.value) return
  const supabase = useSupabaseClient()
  const { error: e } = await supabase.from('profiles').delete().eq('id', deletingId.value)
  if (e) {
    toast.error(e.message)
  } else {
    toast.success('Customer deleted')
    refresh()
  }
  deletingId.value = null
}

const formatCurrency = (v: number | null | undefined) => formatOMR(Number(v || 0))
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
}
const formatPhone = (v: string | null | undefined) => formatOmanPhone(v || '')
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Input v-model="search" placeholder="Search phone or user ID" class="w-64" />
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" @click="sortBy = 'joined_at'; ascending = false">Joined</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'total_spent'; ascending = false">Total Spent</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'total_orders'; ascending = false">Total Orders</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" :disabled="page === 1" @click="page = Math.max(1, page - 1)">Prev</Button>
        <Button variant="outline" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">Next</Button>
        <div class="text-sm">Page {{ page }} of {{ totalPages }}</div>
      </div>
    </div>

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Customers</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead class="text-right">Total Spent</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="6"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="6">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="6">
                <TableEmpty>No customers found</TableEmpty>
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="c in rows" :key="c.id">
              <TableCell>{{ c.id }}</TableCell>
              <TableCell>{{ formatPhone(c.phone) }}</TableCell>
              <TableCell>{{ c.total_orders }}</TableCell>
              <TableCell class="text-right">{{ formatCurrency(c.total_spent) }}</TableCell>
              <TableCell>{{ formatDate(c.joined_at) }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <NuxtLink :to="`/admin/customers/${c.id}`" class="underline text-foreground">View</NuxtLink>
                  <AlertDialog>
                    <AlertDialogTrigger as-child>
                      <Button variant="destructive" size="sm" @click="deletingId = c.id">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      <div class="flex items-center gap-2 justify-end">
                        <AlertDialogCancel as-child>
                          <Button variant="outline" size="sm" @click="deletingId = null">Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction as-child>
                          <Button variant="destructive" size="sm" @click="confirmDelete">Delete</Button>
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Button variant="outline" :disabled="page === 1" @click="page = Math.max(1, page - 1)">Prev</Button>
          <Button variant="outline" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">Next</Button>
        </div>
        <div class="text-sm">Page {{ page }} of {{ totalPages }}</div>
      </CardFooter>
    </Card>
  </div>
</template>

