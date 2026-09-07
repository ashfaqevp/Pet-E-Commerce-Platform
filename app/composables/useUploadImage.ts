/**
 * The upload side of image compression: every admin file input goes through
 * `prepareUpload` before its bytes reach Storage, so nothing is uploaded at
 * camera resolution again.
 *
 * This lives one layer above `useImageCompression`, which stays pure DOM. Here
 * we add the policy — which surface gets which size, what happens when the
 * encoder gives up, and the status line the admin reads while it works.
 */

/**
 * Per-surface targets. A brand logo never needs to be 1400 px and a desktop
 * banner is the only thing that earns 1920.
 */
export const UPLOAD_PRESETS = {
  /** Product thumbnail and gallery — the largest a product image is ever shown. */
  product: { maxEdge: 1400, quality: 0.8 },
  brandLogo: { maxEdge: 800, quality: 0.85 },
  petType: { maxEdge: 800, quality: 0.85 },
  bannerDesktop: { maxEdge: 1920, quality: 0.8 },
  bannerMobile: { maxEdge: 1080, quality: 0.8 },
} as const satisfies Record<string, CompressOptions>

/** Options every prepared upload is written with. A compressed file is content
 *  addressed by its path, and the path always changes, so it can cache forever. */
export const UPLOAD_CACHE_CONTROL = '31536000'

const KB = 1024
const MB = KB * 1024

/**
 * The largest file a bucket will accept. Keep this in step with the buckets'
 * `file_size_limit` — it is the threshold the fallback ladder below aims under,
 * not a limit we enforce ourselves.
 */
export const UPLOAD_SIZE_LIMIT = 1 * MB

/**
 * Tried in order, and only while the candidate is still too big to be stored.
 * Without this an admin hits a dead end: a photo whose WebP re-encode is no
 * smaller than the original gets uploaded as the original, the bucket refuses
 * it for being over the limit, and there is no way to save the product at all.
 */
const SIZE_LADDER: CompressOptions[] = [
  { quality: 0.65 },
  { maxEdge: 1000, quality: 0.65 },
]

/** Binary units, labelled KB/MB — matches how the storage page reports sizes. */
export const formatBytes = (b: number) =>
  b >= MB ? `${(b / MB).toFixed(1)} MB` : b >= KB ? `${Math.round(b / KB)} KB` : `${b} B`

/**
 * The "Optimising… 8.4 MB → 480 KB" line under a file input.
 *
 * Keyed rather than global: a product form has a thumbnail input and a gallery
 * input running at the same time, and the banner form has four. Each gets its
 * own ref, shared by key so the composable doing the upload and the component
 * showing the line find the same one without threading a callback through
 * every submit payload.
 *
 * Plain `ref`, not `useState` — these are read from async event handlers where
 * the Nuxt instance is no longer available. The app is SPA-only, so there is no
 * server request to leak between.
 */
const statuses = new Map<string, Ref<string | null>>()

export type UploadStatusKey =
  | 'product-thumbnail'
  | 'product-gallery'
  | 'brand-logo'
  | 'pet-type-image'
  | 'banner-mobile'
  | 'banner-desktop'
  | 'banner-mobile-edit'
  | 'banner-desktop-edit'

export function useUploadStatus(key: UploadStatusKey) {
  let existing = statuses.get(key)
  if (!existing) {
    existing = ref<string | null>(null)
    statuses.set(key, existing)
  }
  return existing
}

/** Extensions we can name a type for, so a file the OS handed us with an empty
 *  `type` still satisfies the bucket's MIME allowlist. */
const TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
}

/**
 * The original, guaranteed to carry a content type. Some operating systems
 * hand over a `File` with `type: ''`, and an empty content type is rejected by
 * the bucket allowlist just as surely as a wrong one.
 */
function withKnownType(file: File): File {
  if (file.type) return file
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const type = TYPE_BY_EXT[ext]
  if (!type) return file
  return new File([file], file.name, { type })
}

/**
 * Compress one file for upload.
 *
 * The filename is carried over untouched — every caller derives its storage
 * path from `file.name`, and the storage classifier reads the `products/<id>/`
 * shape. A compressed file therefore keeps its old `.png` suffix while its
 * content type says WebP; browsers go by the header, not the suffix. This
 * matches what the server-side compress route already does.
 *
 * Throws only when the file is not a usable image in the first place. Anything
 * else — SVG, an animated GIF, a photo WebP cannot beat, a browser whose
 * encoder gave up — returns the original, because a slow save is a nuisance
 * but a save the admin cannot complete is a broken product page.
 */
async function optimise(file: File, preset: CompressOptions): Promise<File> {
  if (!file.size) {
    throw new Error(`${file.name} is empty — please choose a different image.`)
  }

  const asWebp = (blob: Blob) => new File([blob], file.name, { type: 'image/webp' })

  // The preset first, then harder settings, stopping as soon as a candidate is
  // small enough to be stored. keepLarger is on so a "no smaller" result does
  // not end the ladder before the harder steps have been tried.
  let best: Blob | null = null
  for (const step of [{}, ...SIZE_LADDER]) {
    let result
    try {
      result = await compressBlob(file, { ...preset, ...step, keepLarger: true })
    }
    catch (e) {
      if (compressErrorCode(e) === 'UNDECODABLE') {
        // Not a readable image. Uploading it anyway would store a file that
        // renders as a broken icon on the storefront.
        throw new Error(`${file.name} is not a readable image — please choose a different file.`)
      }
      console.warn('[upload] compression failed, uploading the original', file.name, e)
      break
    }

    // SVG or GIF, which canvas would destroy. No ladder step changes that.
    if (!result.blob) break

    best = result.blob
    if (best.size <= UPLOAD_SIZE_LIMIT) break
  }

  // Nothing usable came back. The original is the right file — and if it is over
  // the limit, Storage says so in language storageUploadError() turns into advice.
  if (!best) return withKnownType(file)

  // The original cannot be stored, but the re-encode can: take it even though it
  // is not smaller. Never leave the admin unable to save the product.
  if (file.size > UPLOAD_SIZE_LIMIT && best.size <= UPLOAD_SIZE_LIMIT) return asWebp(best)

  // Otherwise the original stands unless the re-encode genuinely beats it.
  return best.size < file.size ? asWebp(best) : withKnownType(file)
}

function doneLine(before: number, after: number) {
  return after < before
    ? `${formatBytes(before)} → ${formatBytes(after)}`
    : `${formatBytes(before)} — uploaded as-is`
}

/**
 * Compress one file, reporting into the status line for its input.
 */
export async function prepareUpload(
  file: File,
  preset: CompressOptions,
  statusKey?: UploadStatusKey,
): Promise<File> {
  const status = statusKey ? useUploadStatus(statusKey) : null
  if (status) status.value = 'Optimising…'
  try {
    const out = await optimise(file, preset)
    if (status) status.value = doneLine(file.size, out.size)
    return out
  }
  catch (e) {
    if (status) status.value = null
    throw e
  }
}

/**
 * Compress a set of files — the product gallery — into one status line.
 *
 * Sequential on purpose: each decode holds a full-resolution bitmap, and a
 * dozen 12 MP photos decoded at once is how a browser tab runs out of memory.
 */
export async function prepareUploads(
  files: File[],
  preset: CompressOptions,
  statusKey?: UploadStatusKey,
): Promise<File[]> {
  if (!files.length) return []

  const status = statusKey ? useUploadStatus(statusKey) : null
  const label = files.length === 1 ? 'image' : 'images'
  if (status) status.value = `Optimising ${files.length} ${label}…`

  const out: File[] = []
  try {
    for (const file of files) out.push(await optimise(file, preset))
  }
  catch (e) {
    if (status) status.value = null
    throw e
  }

  const before = files.reduce((n, f) => n + f.size, 0)
  const after = out.reduce((n, f) => n + f.size, 0)
  if (status) status.value = doneLine(before, after)
  return out
}

/** Clear a status line — call it when the input is reset or the sheet closes. */
export function clearUploadStatus(...keys: UploadStatusKey[]) {
  for (const key of keys) useUploadStatus(key).value = null
}

/**
 * Turn a Storage rejection into something an admin can act on.
 *
 * The buckets carry a 1 MB limit and an image-only MIME allowlist, so a file
 * that survives compression and still gets refused is almost always one of
 * those two. Anything we do not recognise is passed through unchanged rather
 * than swallowed behind a friendly guess.
 */
export function storageUploadError(e: unknown): Error {
  const err = e as { message?: string; statusCode?: string | number; status?: number } | null
  const code = Number(err?.statusCode ?? err?.status ?? 0)
  const message = String(err?.message ?? '')

  if (code === 413 || /exceeded the maximum allowed size|payload too large/i.test(message)) {
    return new Error('That image is too large even after optimising — please use a smaller original.')
  }
  if (code === 415 || /mime type/i.test(message)) {
    return new Error('That file type is not allowed — please upload a JPEG, PNG, WebP or SVG.')
  }
  return e instanceof Error ? e : new Error(message || 'Upload failed')
}
