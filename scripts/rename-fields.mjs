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

const res = arr.map((r) => {
  const o = r || {}
  const { pet, item, price, photo, ...rest } = o
  const pet_type = o.pet_type ?? pet ?? null
  const name = o.name ?? item ?? null
  const rpSource = o.retail_price ?? price ?? null
  let retail_price = null
  if (rpSource != null) {
    if (typeof rpSource === 'number' && isFinite(rpSource)) {
      retail_price = rpSource.toFixed(3)
    } else {
      const n = Number(rpSource)
      retail_price = Number.isFinite(n) ? n.toFixed(3) : String(rpSource)
    }
  }
  const thumbnail_url = o.thumbnail_url ?? photo ?? null
  return { ...rest, pet_type, name, retail_price, thumbnail_url }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ input, output, updated: res.length }))
