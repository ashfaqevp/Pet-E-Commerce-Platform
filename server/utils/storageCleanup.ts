import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Buckets this app uploads to. A key outside these is ignored rather than
 * deleted — a typo in a caller must never reach an unrelated bucket.
 */
export const KNOWN_BUCKETS = ['product-images', 'brand-logos', 'pet-type-images']

/** Mirrors the regex in admin_storage_classified(): strip the query string,
 *  take everything after /storage/v1/object/[public|sign|authenticated]/,
 *  and decode %20 the way storage.objects.name stores it. */
const KEY_RE = /\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?(.*)$/

export function urlToKey(url: string | null | undefined): string | null {
  if (!url) return null
  const withoutQuery = String(url).split('?')[0] ?? ''
  const match = withoutQuery.match(KEY_RE)
  const key = match?.[1]
  if (!key) return null
  return key.replaceAll('%20', ' ')
}

export function splitKey(key: string): { bucket: string; path: string } | null {
  const i = key.indexOf('/')
  if (i <= 0) return null
  const bucket = key.slice(0, i)
  const path = key.slice(i + 1)
  if (!path || !KNOWN_BUCKETS.includes(bucket)) return null
  return { bucket, path }
}

/**
 * Which of these keys is still referenced by a live row. One round trip, and
 * it reuses the classifier's reference list so the two can never disagree.
 */
export async function keysInUse(supabase: SupabaseClient, keys: string[]): Promise<Set<string>> {
  if (!keys.length) return new Set()
  const { data, error } = await supabase.rpc('admin_storage_keys_in_use', { p_keys: keys })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return new Set(((data ?? []) as { key: string }[]).map(r => r.key))
}

/**
 * Delete through the Storage API — it removes the file *and* its
 * storage.objects row. Never delete from storage.objects directly.
 */
export async function removeKeys(supabase: SupabaseClient, keys: string[]) {
  const byBucket = new Map<string, string[]>()
  for (const key of keys) {
    const parts = splitKey(key)
    if (!parts) continue
    const list = byBucket.get(parts.bucket) ?? []
    list.push(parts.path)
    byBucket.set(parts.bucket, list)
  }

  let deleted = 0
  const failures: string[] = []

  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100)
      const { error } = await supabase.storage.from(bucket).remove(batch)
      if (error) failures.push(`${bucket}: ${error.message}`)
      else deleted += batch.length
    }
  }

  return { deleted, failures }
}
