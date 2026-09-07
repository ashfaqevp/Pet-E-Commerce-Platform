/**
 * Deletes a whole folder — used when a product row is removed, because gallery
 * files are not always all listed in image_urls. Every file is still re-checked
 * individually: an image snapshotted onto an order_item has to survive so old
 * orders keep rendering.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ prefix?: string; bucket?: string }>(event)
  const bucket = String(body?.bucket || 'product-images')
  const prefix = String(body?.prefix || '').replace(/^\/+|\/+$/g, '')

  if (!KNOWN_BUCKETS.includes(bucket)) throw createError({ statusCode: 400, statusMessage: 'Unknown bucket' })
  if (!prefix || prefix.includes('..')) throw createError({ statusCode: 400, statusMessage: 'Invalid prefix' })
  // Two segments minimum ('products/<id>'), so a bad caller cannot hand us a
  // whole top-level folder.
  if (prefix.split('/').length < 2) throw createError({ statusCode: 400, statusMessage: 'Prefix must name a folder inside a top-level folder' })

  const supabase = adminSupabase()

  // list() returns one level; folder entries come back with a null id.
  const paths: string[] = []
  const walk = async (dir: string, depth: number) => {
    if (depth > 3) return
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage.from(bucket).list(dir, { limit: 100, offset })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      const entries = data ?? []
      for (const entry of entries) {
        const full = `${dir}/${entry.name}`
        if (entry.id === null) await walk(full, depth + 1)
        else paths.push(full)
      }
      if (entries.length < 100) break
    }
  }
  await walk(prefix, 0)

  if (!paths.length) return { deleted: 0, skipped: 0, failures: [] as string[] }

  const keys = paths.map(p => `${bucket}/${p}`)
  const stillUsed = await keysInUse(supabase, keys)
  const doomed = keys.filter(k => !stillUsed.has(k))

  const { deleted, failures } = await removeKeys(supabase, doomed)
  return { deleted, skipped: stillUsed.size, failures }
})
