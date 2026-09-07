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
const selected = ref(new Map<string, StorageObject>())
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

// Any file can be selected: unused ones get deleted, in-use ones get compressed.
// The whole row is stored, not just its key, so a selection made on page 1 still
// carries its bucket, size and status once the grid has moved on to page 2.
const toggle = (o: StorageObject) => {
  const key = keyOf(o)
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.set(key, o)
  selected.value = new Map(selected.value)
}

const selectOnPage = (match: (o: StorageObject) => boolean) => {
  items.value.filter(match).forEach(o => selected.value.set(keyOf(o), o))
  selected.value = new Map(selected.value)
}
const selectUnusedOnPage = () => selectOnPage(o => o.status !== 'in_use')
const selectInUseOnPage = () => selectOnPage(o => o.status === 'in_use')
const clearSelection = () => { selected.value = new Map() }

const selectedRows = computed(() => [...selected.value.values()])
const selectedInUse = computed(() => selectedRows.value.filter(o => o.status === 'in_use'))

// What the admin is about to change on the live site. The classifier already
// tells us which product each file belongs to, so naming them costs no request.
// Files outside the product tables (brand logos, banners) have no product name —
// fall back to the file's own name so every entry is identifiable.
const affectedNames = computed(() => {
  const names = new Set<string>()
  for (const o of selectedInUse.value) {
    names.add(o.product_name || o.path.split('/').pop() || o.path)
  }
  return [...names]
})

const compressOpen = ref(false)
const openCompress = () => { if (selectedInUse.value.length) compressOpen.value = true }
const onCompressed = () => Promise.all([refreshSummary(), refreshList()])

const applySearch = () => {
  page.value = 1
  refreshList()
}

const setStatus = (value: string) => {
  status.value = value
  page.value = 1
}

// Never take a file younger than this, even on an explicit click — someone may
// have uploaded it a minute ago in another tab and not saved the row yet.
const MIN_AGE_MINUTES = 60

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
        body: { ...payload, minAgeMinutes: MIN_AGE_MINUTES },
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
    clearSelection()
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

// Both delete paths are confirmed by an AlertDialog in the template, matching the
// rest of the admin. Nothing here runs until the dialog's action is clicked.

/**
 * Deletes whatever is selected, in use or not. An in-use file is first removed
 * from the product, brand, pet type or banner that shows it — the same thing
 * deleting the image from the product page would do — so nothing is ever left
 * pointing at a file that no longer exists.
 */
async function deleteSelected() {
  const targets = selectedRows.value.map(o => ({ bucket: o.bucket, path: o.path }))
  if (!targets.length) return

  busy.value = true
  message.value = ''
  try {
    let deleted = 0
    let detached = 0
    const problems: string[] = []

    // The server takes 300 at a time; a selection can span several pages.
    for (let i = 0; i < targets.length; i += 300) {
      const res = await $fetch<{ deleted: number; detached: number; failures: string[] }>(
        '/api/admin/storage/force-delete',
        { method: 'POST', headers: headers(), body: { items: targets.slice(i, i + 300) } },
      )
      deleted += res.deleted
      detached += res.detached
      problems.push(...res.failures)
    }

    message.value = `Deleted ${deleted} file(s)`
      + (detached ? `, and removed them from ${detached} record(s).` : '.')
    if (problems.length) message.value += ` Some steps failed: ${problems.join(' · ')}`

    clearSelection()
    await Promise.all([refreshSummary(), refreshList()])
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    message.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Delete failed'
  }
  finally {
    busy.value = false
  }
}

const cleanUpAll = () => {
  if (!summary.value?.reclaimable.files) return
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
        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button class="w-full" :disabled="busy || !summary.reclaimable.files">
              {{ busy ? 'Working…' : 'Clean up unused files' }}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all {{ summary.reclaimable.files }} unused files?</AlertDialogTitle>
              <AlertDialogDescription>
                This frees {{ formatBytes(summary.reclaimable.bytes) }}. Nothing on the storefront
                references these files, and anything uploaded in the last hour is left alone.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction class="bg-destructive text-white" @click="cleanUpAll">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
      <Button variant="outline" size="sm" @click="selectUnusedOnPage">Select unused on this page</Button>
      <Button variant="outline" size="sm" @click="selectInUseOnPage">Select all in use on this page</Button>
      <span class="text-muted-foreground">{{ selected.size }} selected</span>

      <!-- Both actions stay on screen so it is always obvious which one applies to
           the selection. Each is disabled until its own subset has something in it,
           rather than appearing and disappearing as the selection changes. -->
      <Button size="sm" class="bg-secondary text-white" :disabled="!selectedInUse.length" @click="openCompress">
        Compress {{ selectedInUse.length }}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button variant="destructive" size="sm" :disabled="busy || !selected.size">
            Delete {{ selected.size }}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <!-- In-use deletes change the live site, so they get their own warning
               and name what is affected. Unused deletes keep the plain wording. -->
          <AlertDialogHeader v-if="selectedInUse.length">
            <AlertDialogTitle>
              Remove {{ selectedInUse.length }} image{{ selectedInUse.length === 1 ? '' : 's' }}
              from the live site?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {{ selectedInUse.length === 1 ? 'This image is' : 'These images are' }} showing on
              the storefront right now.
              {{ selectedInUse.length === 1 ? 'It' : 'They' }} will be taken off the record that
              displays {{ selectedInUse.length === 1 ? 'it' : 'them' }} and then deleted, so
              {{ selectedInUse.length === 1 ? 'it' : 'they' }} will disappear from the site
              immediately. This cannot be undone.
            </AlertDialogDescription>
            <div class="rounded-md border bg-muted/40 px-3 py-2 max-h-40 overflow-y-auto">
              <p class="text-xs font-medium mb-1">Affected:</p>
              <ul class="text-xs text-muted-foreground space-y-0.5">
                <li v-for="name in affectedNames" :key="name" class="truncate">{{ name }}</li>
              </ul>
            </div>
            <p v-if="selected.size > selectedInUse.length" class="text-xs text-muted-foreground">
              The other {{ selected.size - selectedInUse.length }} selected
              file{{ selected.size - selectedInUse.length === 1 ? ' is' : 's are' }} unused and
              will be deleted too.
            </p>
          </AlertDialogHeader>

          <AlertDialogHeader v-else>
            <AlertDialogTitle>
              Delete {{ selected.size }} file{{ selected.size === 1 ? '' : 's' }}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              None of these are in use. Nothing on the storefront references them.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction class="bg-destructive text-white" @click="deleteSelected">
              {{ selectedInUse.length ? 'Remove and delete' : 'Delete' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="ghost" size="sm" :disabled="!selected.size" @click="clearSelection">Clear</Button>
    </div>

    <!-- Grid -->
    <div v-if="pending" class="py-16 text-center text-sm text-muted-foreground">Loading…</div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div
        v-for="o in items"
        :key="keyOf(o)"
        class="rounded-lg border overflow-hidden bg-card transition"
        :class="[
          'cursor-pointer',
          selected.has(keyOf(o))
            ? (o.status === 'in_use' ? 'ring-2 ring-secondary' : 'ring-2 ring-destructive')
            : '',
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

    <AdminStorageCompressSheet
      v-model:open="compressOpen"
      :files="selectedInUse"
      @finished="onCompressed"
    />
  </div>
</template>
