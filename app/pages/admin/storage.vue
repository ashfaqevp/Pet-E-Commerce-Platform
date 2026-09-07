<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Storage',
})

type StorageObject = {
  bucket: string
  path: string
  bytes: number
  mimetype: string
  status: 'in_use' | 'orphan_replaced' | 'orphan_deleted_product' | 'unaccounted'
  product_name: string
  created_at: string
}

type SummaryResponse = {
  byStatus: { status: string; files: number; bytes: number }[]
  total: { files: number; bytes: number }
  inUse: { files: number; bytes: number }
  reclaimable: { files: number; bytes: number }
}

type ObjectsResponse = {
  items: StorageObject[]
  page: number
  limit: number
  total: number
}

type DeleteResult = {
  deleted: number
  bytes: number
  remaining: number
  failures: string[]
}

// Supabase image transforms are a Pro-plan feature and keep thumbnail egress tiny.
// Set to false if the project is ever downgraded to Free, or thumbnails will fail.
const USE_TRANSFORMS = true

const STATUS_META: Record<string, { label: string; classes: string }> = {
  in_use: { label: 'In use', classes: 'bg-secondary/10 text-secondary' },
  orphan_replaced: { label: 'Replaced photo', classes: 'bg-accent/15 text-accent' },
  orphan_deleted_product: { label: 'Deleted product', classes: 'bg-accent/15 text-accent' },
  unaccounted: { label: 'Unaccounted', classes: 'bg-destructive/10 text-destructive' },
}
const statusMeta = (s: string) => STATUS_META[s] ?? { label: s, classes: 'bg-muted text-muted-foreground' }

const supabase = useSupabaseClient()
const session = useSupabaseSession()
const headers = () => ({ Authorization: `Bearer ${session.value?.access_token ?? ''}` })

const status = ref('')
const search = ref('')
const page = ref(1)
const limit = 60
const selected = ref(new Set<string>())
const busy = ref(false)
const message = ref('')

const { data: summary, refresh: refreshSummary } = await useLazyAsyncData(
  'admin-storage-summary',
  () => $fetch<SummaryResponse>('/api/admin/storage/summary', { headers: headers() }),
)

const { data: listing, pending, refresh: refreshList } = await useLazyAsyncData(
  'admin-storage-objects',
  () => $fetch<ObjectsResponse>('/api/admin/storage/objects', {
    headers: headers(),
    query: { status: status.value, search: search.value, page: page.value, limit },
  }),
  { watch: [status, page] },
)

const items = computed<StorageObject[]>(() => listing.value?.items ?? [])
const total = computed(() => listing.value?.total ?? 0)
const pages = computed(() => Math.max(Math.ceil(total.value / limit), 1))

// Binary units, labelled KB/MB/GB — matches how the Supabase dashboard reports usage.
const KB = 1024
const MB = KB * 1024
const GB = MB * 1024
const formatBytes = (b: number) =>
  b >= GB
    ? `${(b / GB).toFixed(2)} GB`
    : b >= MB
      ? `${(b / MB).toFixed(1)} MB`
      : `${Math.round(b / KB)} KB`

const keyOf = (o: StorageObject) => `${o.bucket}/${o.path}`

// width, height and resize:'contain' are all required. The transform API defaults
// to resize:'cover', and a width with no height keeps the original height — a
// 1280×1920 source came back as 240×1920, which object-contain then rendered as a
// 16px-wide sliver. 320×256 covers the 128px-tall tile at 2x.
const thumb = (o: StorageObject) => {
  const options = USE_TRANSFORMS
    ? { transform: { width: 320, height: 256, resize: 'contain' as const, quality: 60 } }
    : undefined
  return supabase.storage.from(o.bucket).getPublicUrl(o.path, options).data.publicUrl
}

const toggle = (o: StorageObject) => {
  if (o.status === 'in_use') return
  const key = keyOf(o)
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.add(key)
  selected.value = new Set(selected.value)
}

const selectAllOnPage = () => {
  items.value.filter(o => o.status !== 'in_use').forEach(o => selected.value.add(keyOf(o)))
  selected.value = new Set(selected.value)
}

const applySearch = () => {
  page.value = 1
  refreshList()
}

const setStatus = (value: string) => {
  status.value = value
  page.value = 1
}

async function runDelete(payload: { mode: 'selected' | 'all_orphans'; items?: { bucket: string; path: string }[] }) {
  busy.value = true
  message.value = ''
  try {
    let deleted = 0
    let bytes = 0
    let leftover = 0
    let failed = false

    for (;;) {
      const res = await $fetch<DeleteResult>('/api/admin/storage/delete', {
        method: 'POST',
        headers: headers(),
        body: payload,
      })
      deleted += res.deleted
      bytes += res.bytes
      if (res.failures.length) {
        message.value = res.failures.join(' · ')
        failed = true
        break
      }
      // A 'selected' payload cannot be replayed: the files just removed are no
      // longer orphans, so a second pass would be refused as "still in use".
      if (payload.mode === 'selected') {
        leftover = res.remaining
        break
      }
      if (!res.remaining) break
    }

    if (!failed) {
      message.value = `Deleted ${deleted} files — ${formatBytes(bytes)} freed. Supabase usage updates within the hour.`
      if (leftover) message.value += ` ${leftover} of the selected files were left — run the delete again to finish them.`
    }
    selected.value = new Set()
    await Promise.all([refreshSummary(), refreshList()])
  }
  catch (e: unknown) {
    const err = e as { statusMessage?: string; message?: string }
    message.value = err?.statusMessage || err?.message || 'Delete failed'
  }
  finally {
    busy.value = false
  }
}

const deleteSelected = () => {
  if (!selected.value.size) return
  if (!confirm(`Delete ${selected.value.size} file(s)? This cannot be undone.`)) return
  const targets = [...selected.value].map((k) => {
    const i = k.indexOf('/')
    return { bucket: k.slice(0, i), path: k.slice(i + 1) }
  })
  runDelete({ mode: 'selected', items: targets })
}

const cleanUpAll = () => {
  const n = summary.value?.reclaimable.files ?? 0
  if (!n) return
  if (!confirm(`Delete all ${n} unused files? Nothing on the storefront references them.`)) return
  runDelete({ mode: 'all_orphans' })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Storage</h1>
      <p class="text-sm text-muted-foreground">Every file in Supabase Storage, checked against the catalogue.</p>
    </div>

    <!-- Summary -->
    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="rounded-lg border p-4">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
        <p class="text-xl font-semibold mt-1">{{ formatBytes(summary.total.bytes) }}</p>
        <p class="text-xs text-muted-foreground">{{ summary.total.files }} files</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">In use</p>
        <p class="text-xl font-semibold mt-1 text-secondary">{{ formatBytes(summary.inUse.bytes) }}</p>
        <p class="text-xs text-muted-foreground">{{ summary.inUse.files }} files</p>
      </div>
      <div class="rounded-lg border p-4">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Can be freed</p>
        <p class="text-xl font-semibold mt-1 text-accent">{{ formatBytes(summary.reclaimable.bytes) }}</p>
        <p class="text-xs text-muted-foreground">{{ summary.reclaimable.files }} unused files</p>
      </div>
      <div class="rounded-lg border p-4 flex items-center">
        <Button class="w-full" :disabled="busy || !summary.reclaimable.files" @click="cleanUpAll">
          {{ busy ? 'Working…' : 'Clean up unused files' }}
        </Button>
      </div>
    </div>

    <p v-if="message" class="rounded-md border bg-muted/40 px-4 py-3 text-sm">{{ message }}</p>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <Button
        v-for="s in [
          { value: '', label: 'All' },
          { value: 'in_use', label: 'In use' },
          { value: 'orphan_replaced', label: 'Replaced photos' },
          { value: 'orphan_deleted_product', label: 'Deleted products' },
          { value: 'unaccounted', label: 'Unaccounted' }]"
        :key="s.value"
        :variant="status === s.value ? 'default' : 'outline'"
        size="sm"
        @click="setStatus(s.value)"
      >
        {{ s.label }}
      </Button>

      <form class="ml-auto flex gap-2" @submit.prevent="applySearch">
        <Input v-model="search" placeholder="Search file or product…" class="w-56" />
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>
    </div>

    <!-- Bulk bar -->
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="text-muted-foreground">{{ total }} files</span>
      <Button variant="outline" size="sm" @click="selectAllOnPage">Select unused on this page</Button>
      <template v-if="selected.size">
        <span>{{ selected.size }} selected</span>
        <Button variant="destructive" size="sm" :disabled="busy" @click="deleteSelected">Delete selected</Button>
        <Button variant="ghost" size="sm" @click="selected = new Set()">Clear</Button>
      </template>
    </div>

    <!-- Grid -->
    <div v-if="pending" class="py-16 text-center text-sm text-muted-foreground">Loading…</div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div
        v-for="o in items"
        :key="keyOf(o)"
        class="rounded-lg border overflow-hidden bg-card transition"
        :class="[
          selected.has(keyOf(o)) ? 'ring-2 ring-destructive' : '',
          o.status !== 'in_use' ? 'cursor-pointer' : '',
        ]"
        @click="toggle(o)"
      >
        <img :src="thumb(o)" :alt="o.path" loading="lazy" class="w-full h-32 object-contain bg-muted" >
        <div class="p-2 space-y-1">
          <p class="text-xs font-medium truncate">{{ o.product_name || '—' }}</p>
          <p class="text-[10px] text-muted-foreground break-all line-clamp-2">{{ o.path }}</p>
          <div class="flex items-center justify-between gap-1">
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              :class="statusMeta(o.status).classes"
            >
              {{ statusMeta(o.status).label }}
            </span>
            <span class="text-[10px] text-muted-foreground tabular-nums">{{ formatBytes(o.bytes) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pages > 1" class="flex items-center justify-center gap-3 pt-2">
      <Button variant="outline" size="sm" :disabled="page === 1" @click="page--">Previous</Button>
      <span class="text-sm text-muted-foreground">Page {{ page }} of {{ pages }}</span>
      <Button variant="outline" size="sm" :disabled="page >= pages" @click="page++">Next</Button>
    </div>
  </div>
</template>
