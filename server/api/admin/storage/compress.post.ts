/**
 * Writes a browser-compressed image back over its own path.
 *
 * The browser does the resize and encode; this route only does the privileged
 * write. It is the last gate before an irreversible overwrite, so it re-checks
 * everything rather than trusting the caller.
 */

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Smallest output we will accept, on either edge. The specific bug this catches
 * is a transformed URL being used as the compression source: a 240px thumbnail
 * uploaded over a real product photo is unrecoverable. Both edges have to be
 * under the floor to fail, so a legitimately narrow banner strip still passes.
 */
const MIN_EDGE = 600

type ClassifiedRow = { bucket: string; path: string; bytes: number; status: string }

/** RIFF....WEBP — the container header. The route's contract is WebP; anything
 *  else means the caller is not the compressor we think it is. */
function isWebp(buf: Buffer) {
  return buf.length >= 12
    && buf.toString('ascii', 0, 4) === 'RIFF'
    && buf.toString('ascii', 8, 12) === 'WEBP'
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'Expected multipart/form-data' })

  const field = (name: string) =>
    parts.find(p => p.name === name && !p.filename)?.data.toString('utf8').trim() ?? ''

  const bucket = field('bucket')
  const path = field('path')
  const file = parts.find(p => p.name === 'file' && p.data?.length)

  if (!bucket || !path) throw createError({ statusCode: 400, statusMessage: 'bucket and path are required' })
  if (!KNOWN_BUCKETS.includes(bucket)) throw createError({ statusCode: 400, statusMessage: `Unknown bucket "${bucket}"` })
  if (!file) throw createError({ statusCode: 400, statusMessage: 'No file part' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'File exceeds 10 MB' })

  if (!isWebp(file.data)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Body is not a WebP image — this route only writes compressor output. Nothing was written.',
    })
  }

  // Declared by the browser alongside the file. Trusting them is fine: the threat
  // being guarded against is a bug upstream, not a hostile admin — they already
  // hold the session that got them this far.
  const width = Number(field('width')) || 0
  const height = Number(field('height')) || 0
  if (width < MIN_EDGE && height < MIN_EDGE) {
    throw createError({
      statusCode: 422,
      statusMessage: `Output is ${width || '?'}×${height || '?'} — both edges are under ${MIN_EDGE}px, which looks like a thumbnail rather than a compressed original. Nothing was written.`,
    })
  }

  const supabase = adminSupabase()

  // Only a file the catalogue still points at may be overwritten — an orphan is
  // deleted, not compressed. The match must be on the exact bucket AND path:
  // admin_storage_keys_in_use() also matches the bucket-less form, which is the
  // right (over-broad) answer when refusing a delete and the wrong one when
  // authorising a destructive write.
  const { data, error } = await supabase.rpc('admin_storage_objects', {
    p_status: 'in_use',
    p_search: path,
    p_limit: 200,
    p_offset: 0,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const match = ((data ?? []) as ClassifiedRow[]).find(r => r.bucket === bucket && r.path === path)
  if (!match) {
    throw createError({
      statusCode: 409,
      statusMessage: 'That file is not in use — nothing was written. Unused files get deleted, not compressed.',
    })
  }

  const before = Number(match.bytes || 0)
  const after = file.data.length

  // Belt to the browser's own check: never replace a file with a bigger one.
  if (before > 0 && after >= before) {
    throw createError({ statusCode: 409, statusMessage: 'Result is not smaller than the original — nothing was written.' })
  }

  // Same path, so image_urls and thumbnail_url stay valid. The name keeps its
  // old extension; browsers go by the content-type header, not the suffix.
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file.data, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (upErr) throw createError({ statusCode: 500, statusMessage: upErr.message })

  return { ok: true, before, after }
})
