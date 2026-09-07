/**
 * Client side of the storage cleanup. Every call goes through an admin server
 * route — the service role key never reaches the browser, and the server
 * re-checks each file against the live tables before deleting it.
 *
 * Nothing here throws. A failed cleanup must never break a save; the hourly
 * sweep picks up whatever was missed.
 */
export function useStorageCleanup() {
  /** Delete files that a row has stopped referencing. Awaited by callers so the
   *  old file is gone by the time the admin looks. */
  const release = async (urls: (string | null | undefined)[]) => {
    const list = urls.filter((u): u is string => !!u)
    if (!list.length) return
    try {
      await $fetch('/api/admin/storage/release', { method: 'POST', body: { urls: list } })
    }
    catch (e) {
      console.warn('[storage] release failed, sweep will retry', e)
    }
  }

  /** Delete a whole folder — used when a product row is deleted, because not
   *  every gallery file is guaranteed to be listed in image_urls. */
  const releasePrefix = async (prefix: string, bucket = 'product-images') => {
    if (!prefix) return
    try {
      await $fetch('/api/admin/storage/release-prefix', { method: 'POST', body: { prefix, bucket } })
    }
    catch (e) {
      console.warn('[storage] releasePrefix failed, sweep will retry', e)
    }
  }

  /** Fire and forget: catches anything the diffs above missed. */
  const sweep = () => {
    $fetch('/api/admin/storage/sweep', { method: 'POST' }).catch(() => {})
  }

  return { release, releasePrefix, sweep }
}
