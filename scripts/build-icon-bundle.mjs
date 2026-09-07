/**
 * Regenerates app/assets/icons/offline.json — the icons `<Icon />` renders
 * without touching api.iconify.design at runtime.
 *
 * It scans app/ for `name="prefix:icon"`, fetches exactly those icons from the
 * Iconify API, and writes one trimmed collection per prefix. Run it after adding
 * or removing an icon:  pnpm icons
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const SOURCE_DIR = new URL('../app', import.meta.url).pathname
const OUT_FILE = new URL('../app/assets/icons/offline.json', import.meta.url).pathname
const SCANNED_EXTENSIONS = new Set(['.vue', '.ts'])

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (SCANNED_EXTENSIONS.has(extname(entry.name))) yield path
  }
}

const used = new Map()
for await (const file of walk(SOURCE_DIR)) {
  const source = await readFile(file, 'utf8')
  for (const [, prefix, icon] of source.matchAll(/name="([a-z0-9]+):([a-z0-9-]+)"/g)) {
    if (!used.has(prefix)) used.set(prefix, new Set())
    used.get(prefix).add(icon)
  }
}

const collections = []
for (const [prefix, icons] of [...used].sort()) {
  const names = [...icons].sort()
  const url = `https://api.iconify.design/${prefix}.json?icons=${names.join(',')}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${prefix}: ${response.status} ${response.statusText}`)
  const collection = await response.json()

  const resolved = new Set([
    ...Object.keys(collection.icons ?? {}),
    ...Object.keys(collection.aliases ?? {}),
  ])
  const missing = names.filter(n => !resolved.has(n))
  if (missing.length) throw new Error(`${prefix}: no such icon — ${missing.join(', ')}`)

  // Changes on every API build; keeping it out avoids a meaningless diff.
  delete collection.lastModified
  collections.push(collection)
  console.log(`${prefix}: ${names.length} icons`)
}

await writeFile(OUT_FILE, JSON.stringify(collections))
console.log(`wrote ${OUT_FILE}`)
