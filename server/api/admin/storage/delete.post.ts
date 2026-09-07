type Target = { bucket: string; path: string }

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ mode?: 'selected' | 'all_orphans'; items?: Target[] }>(event)
  const supabase = adminSupabase()

  const { data, error } = await supabase.rpc('admin_storage_orphans')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const orphans = (data ?? []) as { bucket: string; path: string; bytes: number }[]
  const byKey = new Map(orphans.map(o => [`${o.bucket}/${o.path}`, o]))

  let targets: typeof orphans
  if (body?.mode === 'all_orphans') {
    targets = orphans
  }
  else {
    const asked = body?.items ?? []
    if (!asked.length) throw createError({ statusCode: 400, statusMessage: 'Nothing selected' })

    const refused = asked.filter(i => !byKey.has(`${i.bucket}/${i.path}`))
    if (refused.length) {
      throw createError({
        statusCode: 409,
        statusMessage: `${refused.length} selected file(s) are still in use — nothing was deleted.`,
      })
    }
    targets = asked.map(i => byKey.get(`${i.bucket}/${i.path}`)!)
  }

  // Stay inside the serverless timeout; the page loops until remaining is 0.
  const CAP = 300
  const slice = targets.slice(0, CAP)
  const remaining = targets.length - slice.length

  const grouped = slice.reduce<Record<string, string[]>>((m, t) => {
    ;(m[t.bucket] ||= []).push(t.path)
    return m
  }, {})

  let deleted = 0
  const failures: string[] = []

  for (const [bucket, paths] of Object.entries(grouped)) {
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100)
      const { error: delError } = await supabase.storage.from(bucket).remove(batch)
      if (delError) failures.push(`${bucket}: ${delError.message}`)
      else deleted += batch.length
    }
  }

  return {
    deleted,
    bytes: slice.reduce((a, t) => a + Number(t.bytes), 0),
    remaining,
    failures,
  }
})
