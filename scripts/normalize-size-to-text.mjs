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

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

let numericCount = 0
let updated = 0
const res = arr.map((o) => {
  const size = o?.size
  let ns
  if (size == null) {
    ns = null
  } else if (typeof size === 'number') {
    numericCount++
    ns = String(size)
  } else if (typeof size === 'string') {
    ns = size.trim() || null
  } else {
    ns = null
  }
  if (ns !== size) updated++
  const { id, base_product_id, ...rest } = o || {}
  return {
    id: String(id || ''),
    base_product_id: String(base_product_id || ''),
    ...rest,
    size: ns,
  }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

const nullCount = res.filter((o) => o.size == null).length
const stringCount = res.filter((o) => typeof o.size === 'string').length

console.log(
  JSON.stringify({ input, output, total: res.length, updated, numeric_converted: numericCount, strings: stringCount, nulls: nullCount }),
)

