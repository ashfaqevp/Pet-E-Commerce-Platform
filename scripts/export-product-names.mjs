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
const output = path.resolve(cwd, opts.output || 'data/product-names.txt')
const clean = (opts.clean || '').toString() === 'true'
const missing = (opts.missing || '').toString()

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const stripUnits = (s) => {
  let t = String(s || '')
  t = t.replace(/\((?:[^)]*?\d[^)]*?)\)/gi, '')
  t = t.replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|w|cm)\b/gi, '')
  t = t.replace(/\b\d+\s*(?:pcs|pieces)\b/gi, '')
  t = t.replace(/\b\d+(?:\.\d+)?\s*[x*]\s*\d+\b/gi, '')
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}
const matchMissing = (o) => {
  if (!missing) return true
  const s = o && o.size
  const u = o && o.unit
  if (missing === 'size') return s == null
  if (missing === 'unit') return u == null
  if (missing === 'both') return s == null && u == null
  return true
}

const names = arr
  .filter(r => matchMissing(r))
  .map(r => {
    const n = String(r?.name ?? '').trim()
    return clean ? stripUnits(n) : n
  })
  .filter(s => s)
const content = names.join('\n') + '\n'

await writeFile(output, content, 'utf8')

console.log(JSON.stringify({ input, output, count: names.length }))
