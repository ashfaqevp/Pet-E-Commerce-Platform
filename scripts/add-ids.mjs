import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const input = path.resolve(cwd, 'data/products.json')
const output = input

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const res = arr.map((o, i) => {
  const id = String(i + 1)
  return { id, ...(o || {}) }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ input, output, count: res.length }))

