/**
 * Regenerates the self-hosted Poppins files in public/fonts/ and prints the
 * matching @font-face block for app/assets/css/main.css.
 *
 * Google Fonts serves a different stylesheet per user agent; this asks as a
 * recent desktop Chrome, which is what gets us woff2. Only the latin and
 * latin-ext subsets are kept — the site has no Devanagari copy, and shipping the
 * subset we do not render is 40 KB of nothing.
 *
 *   node scripts/build-fonts.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises'

const FAMILY = 'Poppins'
const WEIGHTS = [400, 500, 600, 700]
const SUBSETS = new Set(['latin', 'latin-ext'])
const OUT_DIR = new URL('../public/fonts/', import.meta.url)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const cssUrl =
  `https://fonts.googleapis.com/css2?family=${FAMILY}:wght@${WEIGHTS.join(';')}&display=swap`
const css = await fetch(cssUrl, { headers: { 'User-Agent': UA } }).then(r => r.text())

await mkdir(OUT_DIR, { recursive: true })

const faces = []
for (const [, subset, body] of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{(.*?)\}/gs)) {
  if (!SUBSETS.has(subset)) continue
  const weight = body.match(/font-weight:\s*(\d+)/)[1]
  const source = body.match(/url\((https:\/\/[^)]+)\)/)[1]
  const range = body.match(/unicode-range:\s*([^;]+);/)[1].trim()

  const file = `poppins-${weight}-${subset}.woff2`
  const bytes = await fetch(source).then(r => r.arrayBuffer())
  await writeFile(new URL(file, OUT_DIR), Buffer.from(bytes))
  console.log(`${file}  ${bytes.byteLength} bytes`)

  faces.push(`@font-face {
  font-family: '${FAMILY}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${file}') format('woff2');
  unicode-range: ${range};
}`)
}

console.log('\n--- paste into app/assets/css/main.css ---\n')
console.log(faces.join('\n'))
