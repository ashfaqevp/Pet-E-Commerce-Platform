/**
 * Browser-side image compression. Deliberately not a server concern: no native
 * binary in the serverless bundle, no function timeout, and progress is
 * naturally per file.
 *
 * Pure DOM — no Nuxt composables — so it can be called from a worker pool
 * without caring about the Vue instance context.
 */

export type CompressOptions = {
  /** Longest edge of the output. The image is never enlarged to reach it. */
  maxEdge?: number
  /** Encoder quality, 0–1. */
  quality?: number
  mimeType?: string
  /**
   * Return the re-encode even when it came out no smaller than the input.
   * Only the upload path wants this: if the original is over the bucket's size
   * limit it cannot be stored at all, so a "not smaller" WebP is still the only
   * version that can be saved — and without this the ladder would stop at the
   * first step instead of trying harder settings.
   */
  keepLarger?: boolean
}

export type CompressResult = {
  /** The encoded bytes, or null when the original was kept. */
  blob: Blob | null
  width: number
  height: number
  skipped: boolean
  reason?: string
}

/**
 * Canvas rasterises SVG — which destroys it — and flattens an animated GIF to
 * its first frame. Neither is recoverable, so they are never touched.
 */
const NEVER_COMPRESS = ['image/svg+xml', 'image/gif']

export function isCompressibleType(mimeType: string | null | undefined) {
  return !NEVER_COMPRESS.includes(String(mimeType || '').toLowerCase())
}

/**
 * Why a compression failed, tagged at the throw site so callers can branch
 * without matching on message text.
 *
 * `UNDECODABLE` — the bytes are not a readable image (corrupt, empty, wrong
 * format). Uploading the original would just store a broken file, so callers
 * reject it. `ENCODE_FAILED` — the image decoded fine but this browser could
 * not re-encode it; the original is still good, so callers fall back to it.
 */
export type CompressErrorCode = 'UNDECODABLE' | 'ENCODE_FAILED'

function fail(code: CompressErrorCode, message: string) {
  return Object.assign(new Error(message), { code })
}

export function compressErrorCode(e: unknown): CompressErrorCode | null {
  const code = (e as { code?: unknown } | null)?.code
  return code === 'UNDECODABLE' || code === 'ENCODE_FAILED' ? code : null
}

type Decoded = {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    // from-image applies the EXIF rotation, so a portrait phone photo does not
    // come back on its side.
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    }
    catch {
      throw fail('UNDECODABLE', 'Could not decode image')
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  }

  // Fallback path. Browsers apply EXIF orientation when decoding into an <img>,
  // so drawing that to canvas keeps the orientation too.
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(fail('UNDECODABLE', 'Could not decode image'))
      el.src = objectUrl
    })
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    }
  }
  catch (e) {
    URL.revokeObjectURL(objectUrl)
    throw e
  }
}

/**
 * Resize and re-encode. Throws on a real failure (undecodable, no context,
 * encoder returned nothing); returns `skipped` when the original should be kept.
 */
export async function compressBlob(blob: Blob, opts: CompressOptions = {}): Promise<CompressResult> {
  const maxEdge = opts.maxEdge ?? 1400
  const quality = opts.quality ?? 0.8
  const mimeType = opts.mimeType ?? 'image/webp'

  if (!isCompressibleType(blob.type)) {
    return { blob: null, width: 0, height: 0, skipped: true, reason: 'vector/animated' }
  }

  const decoded = await decode(blob)
  const canvas = document.createElement('canvas')

  try {
    const sourceWidth = decoded.width
    const sourceHeight = decoded.height
    if (!sourceWidth || !sourceHeight) throw fail('UNDECODABLE', 'Image has no dimensions')

    // Never enlarge — scale only when the longest edge is over the target.
    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw fail('ENCODE_FAILED', 'Canvas 2D context unavailable')
    ctx.drawImage(decoded.source, 0, 0, width, height)

    const encoded = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, mimeType, quality),
    )
    // null means the encoder refused. That is a failure, not a silent skip —
    // otherwise an unsupported format would look like "already optimal".
    if (!encoded) throw fail('ENCODE_FAILED', `Encoder produced nothing for ${mimeType}`)

    // Never write a bigger file. Some photos genuinely beat WebP at this size.
    const notSmaller = encoded.size >= blob.size
    if (notSmaller && !opts.keepLarger) {
      return { blob: null, width: sourceWidth, height: sourceHeight, skipped: true, reason: 'not smaller' }
    }

    return { blob: encoded, width, height, skipped: false, reason: notSmaller ? 'not smaller' : undefined }
  }
  finally {
    decoded.release()
    // Zero the canvas so its backing bitmap is freed; this loop runs hundreds
    // of times and an 8 MP buffer per file adds up fast.
    canvas.width = 0
    canvas.height = 0
  }
}
