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
const output = path.resolve(cwd, opts.output || 'data/products.csv')

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const cols = [
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

const escapeCsv = (v) => {
  if (v == null) return ''
  const s = String(v)
  const e = s.replace(/"/g, '""')
  return '"' + e + '"'
}

const formatPrice = (v) => {
  const n = typeof v === 'number' ? v : (v == null ? NaN : Number(v))
  if (!Number.isFinite(n)) return ''
  return (Math.round(n * 1000) / 1000).toFixed(3)
}

const formatRating = (v) => {
  const n = typeof v === 'number' ? v : (v == null ? NaN : Number(v))
  if (!Number.isFinite(n)) return ''
  return (Math.round(n * 10) / 10).toFixed(1)
}

const header = cols.join(',') + '\n'
const lines = arr.map((o) => {
  const r = o || {}
  const values = cols.map((k) => {
    let v = r[k]
    if (k === 'retail_price') v = formatPrice(v)
    else if (k === 'default_rating') v = formatRating(v)
    else if (k === 'image_urls') v = null
    else if (typeof v === 'boolean') v = v ? 'true' : 'false'
    return escapeCsv(v)
  })
  return values.join(',')
})

const content = header + lines.join('\n') + '\n'
await writeFile(output, content, 'utf8')

console.log(JSON.stringify({ input, output, rows: arr.length, columns: cols.length }))
