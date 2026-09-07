<script setup lang="ts">
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export type CompressTarget = {
  bucket: string
  path: string
  bytes: number
  mimetype: string
  product_name: string
}

type RowStatus = 'queued' | 'downloading' | 'compressing' | 'uploading' | 'done' | 'skipped' | 'failed'

type Row = {
  key: string
  bucket: string
  path: string
  label: string
  mimetype: string
  before: number
  after: number | null
  status: RowStatus
  reason: string
}

const props = defineProps<{ open: boolean; files: CompressTarget[] }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'finished'): void
}>()

const supabase = useSupabaseClient()
const session = useSupabaseSession()

// Settings — editable before a run, locked while one is in flight.
const maxEdge = ref(1400)
const quality = ref(80)
const skipUnderKb = ref(150)
const EDGE_CHOICES = [1000, 1200, 1400, 1920]

const rows = ref<Row[]>([])
const running = ref(false)
const cancelled = ref(false)
const note = ref('')
let controller: AbortController | null = null

const STATUS_META: Record<RowStatus, { label: string; classes: string }> = {
  queued: { label: 'Queued', classes: 'bg-muted text-muted-foreground' },
  downloading: { label: 'Downloading', classes: 'bg-secondary/10 text-secondary' },
  compressing: { label: 'Compressing', classes: 'bg-secondary/10 text-secondary' },
  uploading: { label: 'Uploading', classes: 'bg-secondary/10 text-secondary' },
  done: { label: 'Done', classes: 'bg-secondary/15 text-secondary' },
  skipped: { label: 'Skipped', classes: 'bg-muted text-muted-foreground' },
  failed: { label: 'Failed', classes: 'bg-destructive/10 text-destructive' },
}

const KB = 1024
const MB = KB * 1024
const GB = MB * 1024
const formatBytes = (b: number) =>
  b >= GB ? `${(b / GB).toFixed(2)} GB` : b >= MB ? `${(b / MB).toFixed(1)} MB` : `${Math.round(b / KB)} KB`

const keyOf = (f: { bucket: string; path: string }) => `${f.bucket}/${f.path}`

/**
 * The ORIGINAL file, with no transform options at all.
 *
 * The grid on /admin/storage renders thumbnails through
 * getPublicUrl(path, { transform: { width: 320 } }). Feeding one of those into
 * the compressor would upload a 320px image over a real product photo and
 * destroy it permanently. This function takes no options parameter, so a call
 * site cannot confuse the two.
 */
function originalUrl(bucket: string, path: string) {
  const base = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  // Cache-buster, so the CDN cannot hand back a copy of a version we already
  // compressed and make us re-process it.
  return `${base}?t=${Date.now()}`
}

/** Small preview only. Never used as a compression source. */
function previewUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path, {
    transform: { width: 96, height: 96, resize: 'contain' as const, quality: 50 },
  }).data.publicUrl
}

function buildRows() {
  // A Map keyed by bucket/path, so the same file selected twice is processed once.
  const unique = new Map<string, CompressTarget>()
  for (const f of props.files) unique.set(keyOf(f), f)

  rows.value = [...unique.values()].map(f => ({
    key: keyOf(f),
    bucket: f.bucket,
    path: f.path,
    label: f.product_name || f.path.split('/').pop() || f.path,
    mimetype: f.mimetype,
    before: Number(f.bytes || 0),
    after: null,
    status: 'queued' as RowStatus,
    reason: '',
  }))
}

watch(() => props.open, (isOpen) => {
  if (isOpen && !running.value) {
    buildRows()
    note.value = ''
    cancelled.value = false
  }
})

const totalBefore = computed(() => rows.value.reduce((a, r) => a + r.before, 0))
const savedBytes = computed(() =>
  rows.value.reduce((a, r) => a + (r.status === 'done' && r.after !== null ? r.before - r.after : 0), 0),
)
const settledCount = computed(() =>
  rows.value.filter(r => r.status === 'done' || r.status === 'skipped' || r.status === 'failed').length,
)
const failedRows = computed(() => rows.value.filter(r => r.status === 'failed'))
const progressPct = computed(() =>
  rows.value.length ? Math.round((settledCount.value / rows.value.length) * 100) : 0,
)
const savedPct = (r: Row) =>
  r.after !== null && r.before > 0 ? Math.round(((r.before - r.after) / r.before) * 100) : 0

function isAbort(e: unknown) {
  const err = e as { name?: string; message?: string }
  return err?.name === 'AbortError' || /abort/i.test(err?.message ?? '')
}

async function processRow(row: Row) {
  // Guard on this row's own status, never on the queue — a Retry clicked while
  // the row is still uploading must not start a second write to the same path.
  if (row.status === 'downloading' || row.status === 'compressing' || row.status === 'uploading') return

  row.reason = ''
  row.after = null

  if (row.before > 0 && row.before < skipUnderKb.value * KB) {
    row.status = 'skipped'
    row.reason = `under ${skipUnderKb.value} KB`
    return
  }
  if (!isCompressibleType(row.mimetype)) {
    row.status = 'skipped'
    row.reason = 'vector/animated'
    return
  }

  try {
    row.status = 'downloading'
    const res = await fetch(originalUrl(row.bucket, row.path), { signal: controller?.signal })
    if (!res.ok) throw new Error(`Download failed (${res.status})`)
    const original = await res.blob()
    if (cancelled.value) { row.status = 'queued'; return }

    row.status = 'compressing'
    const out = await compressBlob(original, {
      maxEdge: maxEdge.value,
      quality: quality.value / 100,
      mimeType: 'image/webp',
    })
    if (out.skipped || !out.blob) {
      row.status = 'skipped'
      row.reason = out.reason ?? 'no gain'
      return
    }
    if (cancelled.value) { row.status = 'queued'; return }

    row.status = 'uploading'
    const form = new FormData()
    form.append('bucket', row.bucket)
    form.append('path', row.path)
    form.append('file', out.blob, 'compressed.webp')
    // The server refuses an output whose edges are both tiny — the guard against
    // a transformed thumbnail ever reaching it as a source.
    form.append('width', String(out.width))
    form.append('height', String(out.height))

    const result = await $fetch<{ ok: boolean; before: number; after: number }>(
      '/api/admin/storage/compress',
      {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${session.value?.access_token ?? ''}` },
        signal: controller?.signal,
      },
    )

    row.before = Number(result.before || row.before)
    row.after = Number(result.after)
    row.status = 'done'
  }
  catch (e: unknown) {
    // A cancel is not a failure. The row goes back to queued; if the write had
    // already landed, a later re-run simply comes back "not smaller".
    if (isAbort(e) || cancelled.value) { row.status = 'queued'; return }
    const err = e as { statusMessage?: string; data?: { statusMessage?: string }; message?: string }
    row.status = 'failed'
    row.reason = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed'
  }
}

/** Three at a time. The canvas work is memory-heavy; more is not faster. */
const CONCURRENCY = 3

async function runPool(queue: Row[]) {
  let next = 0
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      if (cancelled.value) return
      const row = queue[next++]
      if (!row) return
      // One file failing must never stop the run.
      await processRow(row)
    }
  })
  await Promise.all(workers)
}

function warnOnLeave(e: BeforeUnloadEvent) {
  e.preventDefault()
  e.returnValue = ''
}

async function start(only?: Row[]) {
  if (running.value) return
  const queue = only ?? rows.value.filter(r => r.status === 'queued' || r.status === 'failed')
  if (!queue.length) return

  for (const r of queue) { r.status = 'queued'; r.reason = '' }

  controller = new AbortController()
  cancelled.value = false
  running.value = true
  note.value = ''
  window.addEventListener('beforeunload', warnOnLeave)

  try {
    await runPool(queue)
  }
  finally {
    running.value = false
    window.removeEventListener('beforeunload', warnOnLeave)
    controller = null
    if (cancelled.value) {
      note.value = 'Cancelled. Files that had already finished uploading stay compressed — the rest were left untouched.'
    }
    // Sizes on the page are now stale either way.
    emit('finished')
  }
}

function cancel() {
  if (!running.value) return
  cancelled.value = true
  controller?.abort()
}

const retry = (row: Row) => start([row])

function close(v: boolean) {
  if (!v && running.value) return
  emit('update:open', v)
}

onBeforeUnmount(() => window.removeEventListener('beforeunload', warnOnLeave))
</script>

<template>
  <Sheet :open="props.open" @update:open="close">
    <SheetContent side="right" class="w-full sm:max-w-2xl p-0 gap-0">
      <SheetHeader class="px-5 pt-5 pb-3 border-b">
        <SheetTitle>Compress {{ rows.length }} image{{ rows.length === 1 ? '' : 's' }}</SheetTitle>
        <SheetDescription>
          {{ formatBytes(totalBefore) }} selected · saved so far
          <span class="font-medium text-secondary">{{ formatBytes(savedBytes) }}</span>
          <br >
          Each file is resized and re-encoded in your browser, then written back over the same
          path — product links keep working.
        </SheetDescription>
      </SheetHeader>

      <!-- Settings -->
      <div class="px-5 py-4 border-b space-y-4" :class="running ? 'opacity-60 pointer-events-none' : ''">
        <div class="space-y-1.5">
          <label class="text-xs font-medium">Max edge</label>
          <div class="flex gap-2">
            <Button
              v-for="e in EDGE_CHOICES"
              :key="e"
              size="sm"
              :variant="maxEdge === e ? 'default' : 'outline'"
              :disabled="running"
              @click="maxEdge = e"
            >
              {{ e }}
            </Button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium">Quality — {{ quality }}</label>
          <input
            v-model.number="quality"
            type="range"
            min="60"
            max="95"
            step="1"
            :disabled="running"
            class="w-full accent-secondary"
          >
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium">Skip files under (KB)</label>
          <Input v-model.number="skipUnderKb" type="number" min="0" :disabled="running" class="w-32" />
        </div>
      </div>

      <!-- File list -->
      <div class="flex-1 overflow-y-auto divide-y">
        <div v-for="row in rows" :key="row.key" class="flex items-center gap-3 px-5 py-2.5">
          <img
            :src="previewUrl(row.bucket, row.path)"
            :alt="row.path"
            loading="lazy"
            class="h-10 w-10 shrink-0 rounded object-contain bg-muted"
          >
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium truncate">{{ row.label }}</p>
            <p class="text-[10px] text-muted-foreground truncate">{{ row.path }}</p>
            <p v-if="row.reason" class="text-[10px] text-muted-foreground">{{ row.reason }}</p>
          </div>
          <div class="shrink-0 text-right">
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              :class="STATUS_META[row.status].classes"
            >{{ STATUS_META[row.status].label }}</span>
            <p class="text-[10px] text-muted-foreground tabular-nums mt-0.5">
              <template v-if="row.after !== null">
                {{ formatBytes(row.before) }} → {{ formatBytes(row.after) }} ({{ savedPct(row) }}%)
              </template>
              <template v-else>{{ formatBytes(row.before) }}</template>
            </p>
          </div>
          <Button
            v-if="row.status === 'failed' && !running"
            size="sm"
            variant="outline"
            class="shrink-0"
            @click="retry(row)"
          >
            Retry
          </Button>
        </div>
      </div>

      <SheetFooter class="border-t px-5 py-4 space-y-3">
        <div class="w-full space-y-2">
          <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div class="h-full bg-secondary transition-all" :style="{ width: `${progressPct}%` }" />
          </div>
          <p class="text-xs text-muted-foreground">
            {{ settledCount }} / {{ rows.length }} · saved {{ formatBytes(savedBytes) }}
            <span v-if="failedRows.length"> · {{ failedRows.length }} failed</span>
          </p>
          <p v-if="note" class="text-xs">{{ note }}</p>
        </div>

        <div class="flex w-full gap-2">
          <Button v-if="!running" class="flex-1" :disabled="!rows.length" @click="start()">
            {{ settledCount ? 'Run again' : 'Start' }}
          </Button>
          <Button v-else class="flex-1" variant="destructive" @click="cancel">Cancel</Button>
          <Button variant="outline" :disabled="running" @click="close(false)">Close</Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
