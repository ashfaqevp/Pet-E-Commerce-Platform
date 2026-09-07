/**
 * Deliberate delete of specific files, in use or not.
 *
 * Unlike /delete (which only ever touches orphans) this is the admin picking
 * exact files on /admin/storage and confirming. So it does the safe thing a
 * delete from the product page would do: first take the file out of every row
 * that points at it, then remove the file.
 *
 * Order is the whole point. Detach first — if the file delete then fails, all
 * that is left is an orphan and the hourly sweep takes it. Delete first and a
 * failed update would leave a broken image on the storefront.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

type Target = { bucket: string; path: string }

/**
 * PostgREST caps a plain select at 1000 rows. Paging is not optional here: an
 * unread row is a row that keeps pointing at a file we are about to delete, so
 * the tail of a table would come back as a broken image. Ordered by id so the
 * pages cannot overlap or skip.
 *
 * A read failure throws rather than being collected — if a table cannot be
 * checked, nothing gets deleted.
 */
async function selectAll(supabase: SupabaseClient, table: string, columns: string) {
  const PAGE = 1000
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: `${table}: ${error.message}` })
    const batch = (data ?? []) as unknown as Record<string, unknown>[]
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}

/**
 * Every live catalogue column that can point at a storage file.
 *
 * order_items.product_thumbnail is deliberately not here: it is a snapshot of
 * what a customer actually bought, and rewriting it would rewrite order history.
 * A file an order references is refused outright instead — see below.
 */
const SINGLE_COLUMN_TABLES: { table: string; columns: string[] }[] = [
  { table: 'brands', columns: ['logo_url'] },
  { table: 'pet_types', columns: ['image_url'] },
  { table: 'banners', columns: ['desktop', 'mobile'] },
  { table: 'profiles', columns: ['avatar_url'] },
]

const MAX_ITEMS = 300

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ items?: Target[] }>(event)
  const items = (body?.items ?? []).filter(i => i?.bucket && i?.path)
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Nothing selected' })
  if (items.length > MAX_ITEMS) {
    throw createError({ statusCode: 400, statusMessage: `Up to ${MAX_ITEMS} files per request` })
  }

  const unknown = items.find(i => !KNOWN_BUCKETS.includes(i.bucket))
  if (unknown) throw createError({ statusCode: 400, statusMessage: `Unknown bucket "${unknown.bucket}"` })

  const supabase = adminSupabase()

  // Both forms the classifier joins on: 'bucket/path' and the bare object name.
  const wanted = new Set<string>()
  for (const i of items) {
    wanted.add(`${i.bucket}/${i.path}`)
    wanted.add(i.path)
  }

  // urlToKey is the same normalisation the SQL uses, so a stored URL is compared
  // exactly rather than by a substring guess.
  const isTarget = (url: string | null | undefined) => {
    const key = urlToKey(url)
    return !!key && wanted.has(key)
  }

  // order_items.product_thumbnail is a snapshot of what a customer actually
  // bought. release-prefix already refuses to touch files an order references so
  // old orders keep rendering; this route must not become the back door around
  // that rule. Checked before anything is written, so the whole request is
  // refused rather than half-applied.
  const orderItems = await selectAll(supabase, 'order_items', 'id, order_id, product_name, product_thumbnail')
  const onOrders = (orderItems as unknown as {
    order_id: string
    product_name: string | null
    product_thumbnail: string | null
  }[]).filter(r => isTarget(r.product_thumbnail))

  if (onOrders.length) {
    const named = onOrders
      .slice(0, 3)
      .map(r => `"${r.product_name || 'item'}" on order ${r.order_id}`)
      .join('; ')
    throw createError({
      statusCode: 409,
      statusMessage: `Refused — ${onOrders.length} of these file(s) appear on a past order (${named}${onOrders.length > 3 ? '; …' : ''}). Deleting them would break that order's history. Nothing was deleted.`,
    })
  }

  let detached = 0
  const failures: string[] = []

  // --- products: one nullable column and one array column ---
  const products = await selectAll(supabase, 'products', 'id, thumbnail_url, image_urls')

  for (const row of products as unknown as { id: string; thumbnail_url: string | null; image_urls: string[] | null }[]) {
    const patch: Record<string, unknown> = {}

    const gallery = row.image_urls ?? []
    const kept = gallery.filter(u => !isTarget(u))
    if (kept.length !== gallery.length) patch.image_urls = kept

    // Losing the thumbnail must not blank the product card while the product
    // still has photos. Promote the first surviving gallery image; null it only
    // when there is nothing left to promote.
    if (isTarget(row.thumbnail_url)) patch.thumbnail_url = kept[0] ?? null

    if (!Object.keys(patch).length) continue

    const { error } = await supabase.from('products').update(patch as never).eq('id', row.id)
    if (error) failures.push(`products/${row.id}: ${error.message}`)
    else detached++
  }

  // --- everything else: plain nullable url columns ---
  for (const { table, columns } of SINGLE_COLUMN_TABLES) {
    const rows = await selectAll(supabase, table, ['id', ...columns].join(', '))

    for (const row of rows as unknown as Record<string, string | null>[]) {
      const patch: Record<string, unknown> = {}
      for (const col of columns) if (isTarget(row[col])) patch[col] = null
      if (!Object.keys(patch).length) continue

      const { error: upErr } = await supabase.from(table).update(patch as never).eq('id', row.id as string)
      if (upErr) failures.push(`${table}/${row.id}: ${upErr.message}`)
      else detached++
    }
  }

  // Only now, with nothing pointing at them any more.
  const { deleted, failures: removeFailures } = await removeKeys(
    supabase,
    items.map(i => `${i.bucket}/${i.path}`),
  )

  return { deleted, detached, failures: [...failures, ...removeFailures] }
})
