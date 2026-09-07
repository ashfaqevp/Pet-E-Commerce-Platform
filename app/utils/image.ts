/**
 * Every storefront image comes out of Supabase Storage, and `/object/public/`
 * hands back the file exactly as it was uploaded: back-catalogue product photos
 * are 0.5–3.6 MB PNGs sent with `cache-control: no-cache`, so a phone re-downloads
 * the full-resolution original on every visit.
 *
 * `/render/image/public/` is the same object resized and re-encoded by Supabase —
 * WebP whenever the browser asks for it — and served with a cache lifetime. A
 * 3.6 MB thumbnail becomes ~12 KB at the size a card actually draws.
 *
 * So no `<img>` binds a raw storage URL. It asks for the size of the box it fills,
 * via a preset, and everything else (local `/images/*`, `blob:` previews from a
 * file picker, an already-transformed URL) passes through untouched.
 *
 * This does not replace the compression sweep in `/admin/storage`: that fixes the
 * stored originals — their weight and their `no-cache` header — which is what an
 * unsized surface and the renderer's own source read still pay for.
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
} as const satisfies Record<string, ImagePreset>

export type ImagePresetName = keyof typeof IMAGE_PRESETS

/**
 * The transformed URL for a Supabase Storage object, or the input unchanged.
 *
 * Left alone: anything empty, anything not on the `/object/public/` path (local
 * files, `blob:` previews, a URL already pointing at the renderer), and SVG —
 * the renderer passes SVG through as-is, so routing it there buys nothing.
 */
export function transformedImage(
  url: string | null | undefined,
  preset: ImagePresetName | ImagePreset,
): string {
  if (!url) return ''
  if (!url.includes(OBJECT_SEGMENT)) return url
  if (/\.svgx?(\?|$)/i.test(url)) return url

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
