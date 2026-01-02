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

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const names = arr.map(r => String(r?.name ?? '').trim()).filter(s => s)
const content = names.join('\n') + '\n'

await writeFile(output, content, 'utf8')

console.log(JSON.stringify({ input, output, count: names.length }))

