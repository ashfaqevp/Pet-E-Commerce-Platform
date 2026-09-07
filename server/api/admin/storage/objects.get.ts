type StorageRow = {
  bucket: string
  path: string
  bytes: number
  mimetype: string
  status: string
  product_name: string
  created_at: string
  total_count: number
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const limit = Math.min(Number(q.limit ?? 60), 200)
  const page = Math.max(Number(q.page ?? 1), 1)

  const { data, error } = await adminSupabase().rpc('admin_storage_objects', {
    p_status: (q.status as string) || null,
    p_search: (q.search as string) || null,
    p_limit: limit,
    p_offset: (page - 1) * limit,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as StorageRow[]
  return {
    items: rows,
    page,
    limit,
    total: Number(rows[0]?.total_count ?? 0),
  }
})
