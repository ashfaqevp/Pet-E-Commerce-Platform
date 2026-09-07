/**
 * Safety net. Admin mutations fire this and forget, so it never throws at the
 * caller and never blocks a save — it returns counts and logs its own failures.
 *
 * Two guards keep it honest:
 *  - the 60 minute age guard in admin_storage_orphans(), so a file uploaded
 *    seconds ago and not yet saved to its row is never taken;
 *  - a location allowlist, so it only ever removes files from the prefixes the
 *    four admin flows actually write to. Anything else stays for the manual
 *    button on /admin/storage, where a human sees the count first.
 */

const SWEEPABLE_PREFIXES = [
  'product-images/products/',
  'product-images/banners/',
  'brand-logos/',
  'pet-type-images/',
]

const MIN_AGE_MINUTES = 60
const COOLDOWN_MS = 5 * 60 * 1000

// Per-instance, not global. Worst case a second container sweeps too, which is
// harmless — the RPC is re-read each time and deletes are idempotent.
let running = false
let lastFinishedAt = 0

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (running) return { skipped: true, reason: 'already-running', deleted: 0, bytes: 0 }
  if (Date.now() - lastFinishedAt < COOLDOWN_MS) {
    return { skipped: true, reason: 'cooldown', deleted: 0, bytes: 0 }
  }

  running = true
  try {
    const supabase = adminSupabase()
    const { data, error } = await supabase.rpc('admin_storage_orphans', { p_min_age_minutes: MIN_AGE_MINUTES })
    if (error) {
      console.error('[storage sweep] rpc failed:', error.message)
      return { skipped: false, deleted: 0, bytes: 0, remaining: 0, failures: [error.message] }
    }

    const orphans = ((data ?? []) as { bucket: string; path: string; bytes: number }[])
      .filter(o => SWEEPABLE_PREFIXES.some(p => `${o.bucket}/${o.path}`.startsWith(p)))

    // Stay well inside the function timeout; the next sweep picks up the rest.
    const CAP = 300
    const slice = orphans.slice(0, CAP)
    const keys = slice.map(o => `${o.bucket}/${o.path}`)

    const { deleted, failures } = await removeKeys(supabase, keys)
    if (failures.length) console.error('[storage sweep] partial failure:', failures.join(' · '))

    return {
      skipped: false,
      deleted,
      bytes: slice.reduce((a, o) => a + Number(o.bytes || 0), 0),
      remaining: orphans.length - slice.length,
      failures,
    }
  }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'sweep failed'
    console.error('[storage sweep]', msg)
    return { skipped: false, deleted: 0, bytes: 0, remaining: 0, failures: [msg] }
  }
  finally {
    running = false
    lastFinishedAt = Date.now()
  }
})
