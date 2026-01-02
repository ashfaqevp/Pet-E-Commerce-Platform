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
const source = path.resolve(cwd, opts.source || 'data/__products.json')
const output = path.resolve(cwd, opts.output || 'data/products.json')

const srcBuf = await readFile(source, 'utf8')
const srcArr = JSON.parse(srcBuf)
const tgtBuf = await readFile(input, 'utf8')
const tgtArr = JSON.parse(tgtBuf)

const key = (s) => String(s || '').trim()
const srcMap = new Map()
for (const o of srcArr) srcMap.set(key(o?.name || ''), o)

let matched = 0
const updated = tgtArr.map(o => {
  const k = key(o?.name || '')
  const best = srcMap.get(k)
  if (best) {
    matched++
    const { id, base_product_id, ...rest } = o || {}
    return { id: String(id || ''), base_product_id: String(base_product_id || ''), ...rest, thumbnail_url: best.thumbnail_url || null, is_featured: !!best.is_featured }
  }
  return o
})

await writeFile(output, JSON.stringify(updated, null, 2), 'utf8')

const withThumb = updated.filter(o => typeof o.thumbnail_url === 'string' && o.thumbnail_url).length
const withFeat = updated.filter(o => typeof o.is_featured === 'boolean').length
console.log(JSON.stringify({ input, source, output, total: updated.length, matched, with_thumbnail: withThumb, with_is_featured: withFeat }))
