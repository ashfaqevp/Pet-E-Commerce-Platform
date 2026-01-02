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
const type = String(opts.type || 'food').toLowerCase()
const output = path.resolve(cwd, opts.output || `data/product-names-${type}.txt`)

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const names = arr
  .filter(r => String(r?.product_type || '').toLowerCase() === type)
  .map(r => String(r?.name || '').trim())
  .filter(Boolean)

await writeFile(output, names.join('\n') + '\n', 'utf8')

console.log(JSON.stringify({ input, output, type, count: names.length }))

