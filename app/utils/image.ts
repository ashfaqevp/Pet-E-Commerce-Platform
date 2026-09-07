/**
 * No `<img>` binds a raw Supabase Storage URL. Two measured reasons, both about
 * `/storage/v1/object/public/`:
 *
 * - **It hands back the upload untouched.** Back-catalogue product photos are
 *   0.5–3.6 MB PNGs behind a card that draws at 290 px.
 * - **It always answers `cache-control: no-cache`.** Not a stale value we could
 *   fix by re-uploading: an object written with `cacheControl: 31536000` still
 *   comes back `no-cache` on this endpoint, so a phone re-downloads the
 *   full-resolution original on every visit.
 *
 * `/storage/v1/render/image/public/` is the same object resized and re-encoded
 * by Supabase — WebP whenever the browser asks for it — and it *does* honour the
 * object's stored `cacheControl`. So the transform is the cache fix as much as
 * the size fix: a 1.5 MB banner becomes 47 KB, and it becomes cacheable at all.
 *
 * What the object was stored with therefore still matters. Everything uploaded
 * before `UPLOAD_CACHE_CONTROL` existed carries Supabase's 3600 default, so
 * transforms of it are cacheable for an hour; re-writing those through the
 * compression sweep in `/admin/storage` (which uploads with `31536000`) is what
 * lifts them to a year. New uploads already go out with the long value.
 *
 * Everything that is not a storage object — local `/images/*`, `blob:` previews
 * from a file picker, an already-transformed URL — passes through untouched.
 */

const OBJECT_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT = '/storage/v1/render/image/public/'

export interface ImagePreset {
  /** Box width in device pixels — roughly 2× the CSS width the image draws at. */
  width: number
  height: number
  /** Matches the CSS: `object-contain` → `contain`, `object-cover` → `cover`. */
  resize: 'cover' | 'contain' | 'fill'
  quality: number
}

/**
 * One entry per surface, sized at ~2× the largest CSS box that surface renders,
 * so a 2× phone gets a sharp image and nobody downloads more than that.
 *
 * Two rules every entry follows, both learned the hard way (see the note on
 * `thumb()` in app/pages/admin/storage.vue):
 *
 * - **Width and height are both required.** A width on its own keeps the source's
 *   original height — a 1672×941 banner asked for `width=800` comes back
 *   800×941, squashed. Give it a box and let `resize` fit the image into it.
 * - **`resize` has to agree with the element's `object-fit`.** `contain` fits
 *   inside the box and keeps the aspect ratio; `cover` fills the box and crops,
 *   the same crop `object-cover` was already applying in CSS.
 */
export const IMAGE_PRESETS = {
  /** ProductCard: `w-full h-30 sm:h-48 object-contain`, ~290×192 CSS at its largest. */
  productCard: { width: 600, height: 480, resize: 'contain', quality: 72 },
  /** Product detail carousel: half a max-w-7xl column, up to 70vh tall. */
  productGallery: { width: 1200, height: 1200, resize: 'contain', quality: 78 },
  /** Cart line item: `w-20 h-20 object-cover`. */
  cartThumb: { width: 160, height: 160, resize: 'cover', quality: 70 },
  /** Order line item: `h-10 w-10 object-cover`. */
  orderThumb: { width: 96, height: 96, resize: 'cover', quality: 70 },
  /** Home banner, mobile slot: `aspect-[16/9] object-cover`, full viewport wide. */
  bannerMobile: { width: 1080, height: 608, resize: 'cover', quality: 72 },
  /** Home banner, desktop slot: `aspect-[8/3] object-cover` in the max-w-7xl container. */
  bannerDesktop: { width: 1600, height: 600, resize: 'cover', quality: 75 },
  /** "Shop by Brand" tile: `object-contain` in an aspect-square cell with p-6. */
  brandTile: { width: 320, height: 320, resize: 'contain', quality: 80 },
  /** Brand page header: `max-h-24 object-contain`, width unconstrained. */
  brandHero: { width: 400, height: 192, resize: 'contain', quality: 80 },
  /** "Shop by Pet" tile: `h-14 w-14 object-contain`. */
  petTile: { width: 112, height: 112, resize: 'contain', quality: 80 },
  /** Admin table and grid thumbnails — small, and never the LCP. */
  adminThumb: { width: 128, height: 128, resize: 'contain', quality: 65 },
  /** Admin banner list, mobile column: `w-32 md:w-40 aspect-[16/9] object-cover`. */
  adminBannerMobile: { width: 320, height: 180, resize: 'cover', quality: 65 },
  /** Admin banner list, desktop column: `w-32 md:w-48 aspect-[8/3] object-cover`. */
  adminBannerDesktop: { width: 384, height: 144, resize: 'cover', quality: 65 },
} as const satisfies Record<string, ImagePreset>

export type ImagePresetName = keyof typeof IMAGE_PRESETS

/**
 * The transformed URL for a Supabase Storage object, or the input unchanged.
 *
 * Left alone: anything empty, anything not on the `/object/public/` path (local
 * files, `blob:` previews, a URL already pointing at the renderer), and SVG.
 *
 * SVG is the deliberate one. The renderer currently hands an SVG back untouched,
 * which would win it a cache lifetime — but that is undocumented behaviour, and
 * the day it changes it rasterises a logo. The files are ~1 KB; not worth it.
 */
export function transformedImage(
  url: string | null | undefined,
  preset: ImagePresetName | ImagePreset,
): string {
  if (!url) return ''
  if (!url.includes(OBJECT_SEGMENT)) return url
  if (/\.svg(\?|$)/i.test(url)) return url

  const opts: ImagePreset = typeof preset === 'string' ? IMAGE_PRESETS[preset] : preset

  const params = new URLSearchParams({
    width: String(opts.width),
    height: String(opts.height),
    resize: opts.resize,
    quality: String(opts.quality),
  })

  // The original may already carry a query string (a cache-buster on re-upload);
  // keep the path, drop the query — the transform params are what matters here.
  const [path] = url.split('?')
  return `${path!.replace(OBJECT_SEGMENT, RENDER_SEGMENT)}?${params.toString()}`
}

/** `transformedImage`, falling back to the local placeholder for a missing image. */
export function productImage(
  url: string | null | undefined,
  preset: ImagePresetName | ImagePreset = 'productCard',
): string {
  return transformedImage(url, preset) || '/images/placeholder.svg'
}
