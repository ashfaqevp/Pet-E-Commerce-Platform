/**
 * Deletes files that an admin mutation just stopped referencing — a replaced
 * photo, or the images of a deleted row. Callers send the URLs they *think*
 * are dead; this route re-checks every one against the live tables and skips
 * anything still pointed at, so a file shared by two products survives when
 * one of them changes.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ urls?: string[] }>(event)
  const urls = Array.isArray(body?.urls) ? body.urls : []
  if (!urls.length) return { deleted: 0, skipped: 0, failures: [] as string[] }

  // A mutation on one row cannot legitimately release more than a handful.
  const CAP = 500
  const keys = [...new Set(urls.slice(0, CAP).map(urlToKey).filter((k): k is string => !!k))]

  // Unparseable URLs and unknown buckets are counted as skipped, never deleted.
  let skipped = urls.length - keys.length
  const known = keys.filter(k => splitKey(k))
  skipped += keys.length - known.length
  if (!known.length) return { deleted: 0, skipped, failures: [] as string[] }

  const supabase = adminSupabase()
  const stillUsed = await keysInUse(supabase, known)
  const doomed = known.filter(k => !stillUsed.has(k))
  skipped += stillUsed.size

  const { deleted, failures } = await removeKeys(supabase, doomed)
  return { deleted, skipped, failures }
})
