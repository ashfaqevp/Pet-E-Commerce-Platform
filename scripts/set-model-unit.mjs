import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const productsPath = path.resolve(cwd, 'data/products.json')

const TARGET_NAMES = [
  'plastic tank vv20',
  'acrylic mini tank vv21',
  'nano tank ql-tk-02',
  'ACRYLIC BETTA TANK B1010',
  'BETTA CUP PLASTIC A5',
  'AQUARIUM BL-08',
  'AQUARIUM LX-260',
  'LED MODEL 40S',
  'BOYU AIR PUMP LK-80',
  'DOPHIN FILTER F2000',
  'ATLAS FILTER 1200F',
  'THERMOMETER KT-902',
]

const nameSet = new Set(TARGET_NAMES)

const buf = await readFile(productsPath, 'utf8')
const arr = JSON.parse(buf)

let matched = 0
let updated = 0
const res = arr.map(o => {
  const name = String(o?.name ?? '')
  if (nameSet.has(name)) {
    matched++
    if (o.unit == null || o.unit === '') {
      updated++
      return { ...o, unit: 'model' }
    }
  }
  return o
})

await writeFile(productsPath, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ matched, updated, path: productsPath }))

