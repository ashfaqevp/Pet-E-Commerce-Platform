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
const output = path.resolve(cwd, opts.output || 'data/sizes-units.md')

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const map = new Map()
for (const r of arr) {
  const unit = r?.unit ?? null
  const size = r?.size ?? null
  if (!unit || size == null) continue
  const u = String(unit).trim().toLowerCase()
  if (!u) continue
  if (!map.has(u)) map.set(u, new Set())
  map.get(u).add(Number(size))
}

const units = Array.from(map.keys()).sort((a, b) => a.localeCompare(b))
let md = '# Sizes & Units\n\n'
md += '## Units\n\n'
for (const u of units) md += `- ${u}\n`
md += '\n'
for (const u of units) {
  md += `## ${u}\n\n`
  const sizes = Array.from(map.get(u)).filter(n => Number.isFinite(n)).sort((a, b) => a - b)
  for (const s of sizes) md += `- ${s}\n`
  md += '\n'
}

await writeFile(output, md, 'utf8')

console.log(JSON.stringify({ input, output, units: units.length }))

