import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const input = 'data/products.json'
const outPath = path.resolve(cwd, input)

const buf = await readFile(outPath, 'utf8')
const arr = JSON.parse(buf)

const mapPet = (v) => {
  const s = String(v ?? '').trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower === 'aquarium') return 'fish'
  if (lower === 'others') return 'other'
  if (lower === 'other') return 'other'
  if (lower === 'fish' || lower === 'cat' || lower === 'dog' || lower === 'bird') return lower
  return 'other'
}

const res = arr.map((r) => {
  const pet = mapPet(r?.pet ?? r?.category1)
  const { category1, ...rest } = r || {}
  return { ...rest, pet }
})

await writeFile(outPath, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ updated: res.length, path: outPath }))
