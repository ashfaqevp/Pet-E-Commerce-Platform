import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)
const opts = {}
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a.startsWith('--')) {
    const k = a.replace(/^--+/, '')
    const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
    opts[k] = v
  }
}

const cwd = process.cwd()
const input = path.resolve(cwd, opts.input || 'data/products.json')
const output = path.resolve(cwd, opts.output || 'data/products.json')

const pad = (n, w = 2) => String(n).padStart(w, '0')
const formatTimestamp = (d) => {
  const Y = d.getUTCFullYear()
  const M = pad(d.getUTCMonth() + 1)
  const D = pad(d.getUTCDate())
  const h = pad(d.getUTCHours())
  const m = pad(d.getUTCMinutes())
  const s = pad(d.getUTCSeconds())
  const micro = String(d.getUTCMilliseconds() * 1000 + Math.floor(Math.random() * 1000)).padStart(6, '0')
  return `${Y}-${M}-${D} ${h}:${m}:${s}.${micro}+00`
}

const now = new Date()
const ts = formatTimestamp(now)

const randRating = () => {
  const min = 3.5
  const max = 4.9
  const r = min + Math.random() * (max - min)
  return Math.round(r * 10) / 10
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const res = arr.map(o => {
  const id = String(o?.id || '')
  const base = String(o?.base_product_id || '')
  const created = typeof o?.created_at === 'string' ? o.created_at : ts
  const rating = randRating()
  const imageUrls = Array.isArray(o?.image_urls) ? o.image_urls : []
  const rest = { ...(o || {}) }
  delete rest.id
  delete rest.base_product_id
  delete rest.created_at
  delete rest.updated_at
  delete rest.image_urls
  return {
    id,
    base_product_id: base,
    ...rest,
    stock_quantity: 1000,
    image_urls: imageUrls,
    is_active: true,
    created_at: created,
    updated_at: ts,
    default_rating: rating,
    is_featured: false,
  }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ input, output, updated: res.length }))

