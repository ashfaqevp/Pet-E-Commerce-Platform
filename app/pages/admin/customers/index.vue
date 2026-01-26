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
  name?: string | null
  avatar_url?: string | null
  joined_at: string
  total_orders: number
  total_spent: number
  last_order_date?: string | null
}

const search = ref('')
const debouncedSearch = useDebounce(search, 400)
const sortBy = ref<'joined_at' | 'total_spent' | 'total_orders'>('joined_at')
const roleFilter = ref<'all' | 'customer' | 'wholesaler'>('all')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  search: debouncedSearch.value || undefined,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
  role: roleFilter.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-customers',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('profiles').select('id,phone,role,created_at,full_name,avatar_url', { count: 'exact' })
    if (params.value.role === 'customer') {
      q = q.eq('role', 'customer')
    } else if (params.value.role === 'wholesaler') {
      q = q.eq('role', 'wholesaler')
    } else {
      q = q.in('role', ['customer', 'wholesaler'])
    }
    if (params.value.search) {
      const term = params.value.search
      const digits = term.replace(/[^0-9]/g, '')
      const ors: string[] = []
      if (digits) ors.push(`phone.ilike.%${digits}%`)
      const text = term.trim()
      if (text) ors.push(`full_name.ilike.%${text}%`)
      ors.push(`id.eq.${term}`)
      q = q.or(ors.join(','))
    }
    if (params.value.sortBy === 'joined_at') q = q.order('created_at', { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const profiles = ((data || []) as unknown as Array<{ id: string; phone?: string | null; role?: string | null; created_at: string | Date; full_name?: string | null; avatar_url?: string | null }>)
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
      name: p.full_name || null,
      avatar_url: p.avatar_url || null,
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
const getInitials = (name?: string | null, fallback?: string | null) => {
  const n = (name || '').trim()
  if (n) {
    const parts = n.split(' ').filter(Boolean)
    const a = parts[0]?.[0] || ''
    const b = parts[1]?.[0] || ''
    const letters = (a + b) || n.slice(0, 2)
    return letters.toUpperCase()
  }
  const f = (fallback || '').replace(/[^A-Za-z0-9]/g, '')
  const letters = f.slice(0, 2) || 'CU'
  return letters.toUpperCase()
}
const getDisplayName = (name?: string | null, id?: string | null) => {
  if (name && name.trim().length) return name
  const short = (id || '').slice(0, 5)
  return short ? `Customer ${short}` : 'Customer'
}

// Create Wholesale Partner (Admin)
const createOpen = ref(false)
const createEmail = ref('')
const createName = ref('')
const createPassword = ref('')
const createConfirm = ref('')
const creating = ref(false)
const createError = ref<string | null>(null)
const onCreateWholesaler = async () => {
  if (creating.value) return
  createError.value = null
  const email = createEmail.value.trim()
  if (!email) { createError.value = 'Email is required'; return }
  const name = createName.value.trim()
  if (!name) { createError.value = 'Full name is required'; return }
  const password = createPassword.value
  if (password.length < 8) { createError.value = 'Password must be at least 8 characters'; return }
  const confirm = createConfirm.value
  if (password !== confirm) { createError.value = 'Passwords do not match'; return }
  creating.value = true
  try {
    await $fetch('/api/admin/create-wholesaler', {
      method: 'POST',
      body: { email, full_name: name, password },
    })
    toast.success('Wholesale partner created')
    createOpen.value = false
    createEmail.value = ''
    createName.value = ''
    createPassword.value = ''
    createConfirm.value = ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create wholesaler'
    createError.value = msg
    toast.error(msg)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Input v-model="search" placeholder="Search phone or user ID" class="w-64 bg-white" />
        <Select v-model="roleFilter">
          <SelectTrigger class="w-40 min-w-[140px] shrink-0 bg-white">
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground">Type:</span>
              <SelectValue placeholder="All" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="customer">Retail</SelectItem>
            <SelectItem value="wholesaler">Wholesale</SelectItem>
          </SelectContent>
        </Select>
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
        <Dialog v-model:open="createOpen">
          <DialogTrigger as-child>
            <Button variant="default" class="gap-2">
              <Icon name="lucide:user-plus" class="h-4 w-4" />
              Add Wholesale Partner
            </Button>
          </DialogTrigger>
          <DialogContent class="rounded-xl sm:max-w-[420px] p-6">
            <DialogHeader class="items-start">
              <DialogTitle class="text-foreground">Add Wholesale Partner</DialogTitle>
              <DialogDescription>Creates a new wholesaler with an initial admin-set password.</DialogDescription>
            </DialogHeader>
            <div class="space-y-3">
              <div class="grid gap-2">
                <Label for="wh-email">Email</Label>
                <Input id="wh-email" v-model="createEmail" type="email" placeholder="partner@example.com" class="bg-white" />
              </div>
              <div class="grid gap-2">
                <Label for="wh-name">Full Name</Label>
                <Input id="wh-name" v-model="createName" type="text" placeholder="Name" class="bg-white" />
              </div>
              <div class="grid gap-2">
                <Label for="wh-pass">Password</Label>
                <Input id="wh-pass" v-model="createPassword" type="password" placeholder="At least 8 characters" class="bg-white" />
              </div>
              <div class="grid gap-2">
                <Label for="wh-confirm">Confirm Password</Label>
                <Input id="wh-confirm" v-model="createConfirm" type="password" placeholder="Re-enter password" class="bg-white" />
              </div>
              <Alert v-if="createError" variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ createError }}</AlertDescription>
              </Alert>
              <div class="flex justify-end gap-2">
                <Button variant="outline" @click="createOpen = false">Cancel</Button>
                <Button :disabled="creating" @click="onCreateWholesaler">
                  <span v-if="!creating">Create</span>
                  <span v-else>Creating…</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead class="">Total Spent</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead class="text-right">Actions</TableHead>
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
              <TableCell>
                <div class="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name || c.id" />
                    <AvatarFallback>{{ getInitials(c.name, c.phone) }}</AvatarFallback>
                  </Avatar>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ getDisplayName(c.name, c.id) }}</span>
                    <span class="text-xs text-muted-foreground">#{{ c.id }}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{{ formatPhone(c.phone) }}</TableCell>
              <TableCell>{{ c.total_orders }}</TableCell>
              <TableCell class="">{{ formatCurrency(c.total_spent) }}</TableCell>
              <TableCell>{{ formatDate(c.joined_at) }}</TableCell>
              <TableCell class="">
                <div class="flex items-center justify-end gap-2">
                  <Button size="sm" variant="default" @click="$router.push(`/admin/customers/${c.id}`)">View</Button>
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
