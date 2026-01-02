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

const format = opts.format || 'json'
const input = opts.input || 'data/list_1.md'
const output = opts.output || (format === 'json' ? 'data/list_1.json' : 'data/list_1.table.md')
const indexOutput = opts.indexOutput || ''
const includeStats = ('includeStats' in opts)
  ? !['false', '0', 'no'].includes(String(opts.includeStats).toLowerCase())
  : true

const cwd = process.cwd()
const inputPath = path.resolve(cwd, input)

const raw = await readFile(inputPath, 'utf8')
const lines = raw.split(/\r?\n/)

let currentCat1 = ''
let currentCat2 = ''

const rows = []
const indexMap = new Map()

for (const line of lines) {
  if (!line.trim()) continue
  const tokens = line.split('\t')
  const cat1 = (tokens[0] || '').trim()
  const cat2 = (tokens[1] || '').trim()
  const photo = (tokens[2] || '').trim()
  const item = (tokens[3] || '').trim()
  const priceStr = (tokens[4] || '').trim()
  if (item === 'Item' || priceStr === 'Price') continue
  if (cat1) {
    currentCat1 = cat1
    currentCat2 = cat2 || ''
  } else if (cat2) {
    currentCat2 = cat2
  }
  const finalCat1 = currentCat1
  const finalCat2 = currentCat2
  if (!item) continue
  const priceNum = priceStr ? Number(priceStr.replace(/[^\d.]/g, '')) : NaN
  const rowIndex = rows.length + 1
  rows.push({
    category1: finalCat1 || null,
    category2: finalCat2 || null,
    photo: photo || null,
    item,
    price: Number.isFinite(priceNum) ? priceNum : null,
    rowIndex,
  })
  const arr = indexMap.get(item) || []
  arr.push(rowIndex)
  indexMap.set(item, arr)
}

let out
if (includeStats) {
  const seen = new Map()
  for (const r of rows) {
    const c = (seen.get(r.item) || 0) + 1
    seen.set(r.item, c)
    r.itemIndex = c
    r.itemCount = (indexMap.get(r.item) || []).length
  }
}

if (format === 'json') {
  out = JSON.stringify(rows, null, 2)
} else {
  const header = '| Category 1 | Category 2 | Item | Price |\n|---|---|---|---|'
  const body = rows
    .map((r) => `| ${r.category1 ?? ''} | ${r.category2 ?? ''} | ${r.item.replace(/\|/g, '\\|')} | ${r.price ?? ''} |`)
    .join('\n')
  out = `${header}\n${body}\n`
}

const outputPath = path.resolve(cwd, output)
await writeFile(outputPath, out, 'utf8')
let indexPath = indexOutput
if (!indexPath) {
  const dir = path.dirname(inputPath)
  const base = path.basename(inputPath, path.extname(inputPath))
  indexPath = path.resolve(dir, `${base}.item_index.json`)
}
const indexObj = {
  totalRows: rows.length,
  uniqueItems: indexMap.size,
  items: Object.fromEntries([...indexMap.entries()].map(([k, v]) => [k, { count: v.length, rows: v }]))
}
await writeFile(indexPath, JSON.stringify(indexObj, null, 2), 'utf8')

console.log(JSON.stringify({ input: inputPath, output: outputPath, indexOutput: indexPath, format, count: rows.length }))
