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

const order = [
  'id',
  'base_product_id',
  'name',
  'description',
  'retail_price',
  'pet_type',
  'product_type',
  'age',
  'unit',
  'size',
  'flavour',
  'image_urls',
  'is_active',
  'created_at',
  'updated_at',
  'stock_quantity',
  'thumbnail_url',
  'default_rating',
  'is_featured',
  'label',
  'row_index',
]

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

let renamed = 0
let removedStock = 0
const res = arr.map((o) => {
  const base = o || {}
  const row_index = base.row_index ?? base.rowIndex ?? null
  if (base.rowIndex != null && base.row_index == null) renamed++
  const normalizePrice = (v) => {
    const n = typeof v === 'number' ? v : (v == null ? NaN : Number(v))
    const p = Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0
    return p
  }
  const out = {}
  out.id = String(base.id || '')
  out.base_product_id = String(base.base_product_id || '')
  out.name = base.name ?? null
  out.description = base.description ?? null
  out.retail_price = normalizePrice(base.retail_price)
  out.pet_type = base.pet_type ?? base.pet ?? null
  out.product_type = base.product_type ?? null
  out.age = base.age ?? null
  out.unit = base.unit ?? null
  out.size = base.size ?? null
  out.flavour = base.flavour ?? null
  out.image_urls = null
  out.is_active = base.is_active ?? true
  out.created_at = base.created_at ?? null
  out.updated_at = base.updated_at ?? null
  out.stock_quantity = base.stock_quantity ?? null
  out.thumbnail_url = base.thumbnail_url ?? null
  out.default_rating = base.default_rating ?? 0
  out.is_featured = base.is_featured ?? false
  out.label = base.label ?? null
  out.row_index = row_index
  for (const k of Object.keys(base)) {
    if (k === 'rowIndex') continue
    if (order.includes(k)) continue
    if (k === 'stock') { removedStock++; continue }
    out[k] = base[k]
  }
  return out
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

console.log(
  JSON.stringify({ input, output, total: res.length, renamed_row_index: renamed, removed_stock: removedStock }),
)
