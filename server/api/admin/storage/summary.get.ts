export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { data, error } = await adminSupabase().rpc('admin_storage_summary')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as { status: string; files: number; bytes: number }[]
  const pick = (s: string) => rows.find(r => r.status === s) ?? { files: 0, bytes: 0 }

  const orphanStatuses = ['orphan_replaced', 'orphan_deleted_product', 'unaccounted']
  const orphans = rows.filter(r => orphanStatuses.includes(r.status))

  return {
    byStatus: rows,
    total: {
      files: rows.reduce((a, r) => a + Number(r.files), 0),
      bytes: rows.reduce((a, r) => a + Number(r.bytes), 0),
    },
    inUse: pick('in_use'),
    reclaimable: {
      files: orphans.reduce((a, r) => a + Number(r.files), 0),
      bytes: orphans.reduce((a, r) => a + Number(r.bytes), 0),
    },
  }
})
