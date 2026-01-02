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

const deriveAge = (productName, pet) => {
  const name = String(productName || '').toLowerCase()
  if (pet === 'cat') {
    if (/(kitten|junior|mother\s*&\s*baby)/i.test(name)) return 'kitten'
    if (/(senior|7\+)/i.test(name)) return 'senior'
    if (/(adult|steril|indoor|hairball|urinary|regular|persian|maine coon|ragdoll|british shorthair)/i.test(name)) return 'adult'
    return null
  }
  if (pet === 'dog') {
    if (/(puppy|starter)/i.test(name)) return 'puppy'
    if (/(senior)/i.test(name)) return 'senior'
    if (/(adult|maxi adult|mini adult|medium adult)/i.test(name)) return 'adult'
    return null
  }
  return null
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const allowedPets = new Set(['cat', 'dog', 'fish', 'bird', 'other'])
const res = arr.map((r) => {
  const o = r || {}
  const pet = String(o.pet_type || '').toLowerCase()
  const p = allowedPets.has(pet) ? pet : 'other'
  const age = deriveAge(o.name || '', p)
  return { ...o, age: age ?? null }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ input, output, updated: res.length }))

