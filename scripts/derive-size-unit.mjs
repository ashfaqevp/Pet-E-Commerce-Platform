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

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/kg\./g, 'kg')
    .replace(/g\./g, 'g')
    .replace(/ml\./g, 'ml')
    .replace(/l\./g, 'l')

const extractUnitSize = (name) => {
  const text = normalize(name)
  const m1 = text.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\s*[x*]\s*(\d+)/i)
  if (m1) {
    return { unit: m1[2].toLowerCase() === 'l' ? 'liter' : m1[2].toLowerCase(), size: Number(m1[1]) }
  }
  const m2 = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i)
  if (m2) {
    const um = { g: 'gram', kg: 'kg', ml: 'ml', l: 'liter' }
    return { unit: um[m2[2].toLowerCase()], size: Number(m2[1]) }
  }
  const m3 = text.match(/(\d+)\s*w\b/i)
  if (m3) {
    return { unit: 'watt', size: Number(m3[1]) }
  }
  const m4 = text.match(/(\d+)\s*cm\b/i)
  if (m4) {
    return { unit: 'cm', size: Number(m4[1]) }
  }
  const m5 = text.match(/(\d+)\s*(pcs|pieces)\b/i)
  if (m5) {
    return { unit: 'pcs', size: Number(m5[1]) }
  }
  return { unit: null, size: null }
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const res = arr.map((r) => {
  const o = r || {}
  const ex = extractUnitSize(o.name ?? o.item ?? '')
  const { size: oldSize, unit: oldUnit, ...rest } = o
  const size = ex.size ?? oldSize ?? null
  const unit = ex.unit ?? oldUnit ?? null
  return { ...rest, size, unit }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ input, output, updated: res.length }))

