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
const inputs = (opts.inputs || 'data/list_1.json,data/list_2.json,data/list_3.json')
  .split(',')
  .map(s => s.trim())
const output = opts.output || 'data/products.json'

const readJson = async (p) => JSON.parse(await readFile(path.resolve(cwd, p), 'utf8'))

let offset = 0
const merged = []
for (const inp of inputs) {
  const arr = await readJson(inp)
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i]
    merged.push({
      category1: r.category1 ?? null,
      category2: r.category2 ?? null,
      photo: r.photo ?? null,
      item: r.item,
      price: typeof r.price === 'number' ? r.price : (r.price == null ? null : Number(r.price)),
      rowIndex: offset + i + 1,
    })
  }
  offset += arr.length
}

const outPath = path.resolve(cwd, output)
await writeFile(outPath, JSON.stringify(merged, null, 2), 'utf8')

console.log(JSON.stringify({ inputs, output: outPath, count: merged.length }))

