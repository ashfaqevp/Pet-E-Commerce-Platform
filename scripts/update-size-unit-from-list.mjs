import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const productsPath = path.resolve(cwd, 'data/products.json')

const UPDATES = [
  { "name": "Beapher Top 10 Tablets", "unit": "piece", "size": null },
  { "name": "Bioline Pet Roller", "unit": "piece", "size": null },
  { "name": "Beapher Puppy Pads", "unit": "piece", "size": null },

  { "name": "14455-3", "unit": null, "size": null },
  { "name": "14455-4", "unit": null, "size": null },
  { "name": "13481-19", "unit": null, "size": null },
  { "name": "MY-4", "unit": null, "size": null },
  { "name": "1001", "unit": null, "size": null },
  { "name": "BH - 3", "unit": null, "size": null },
  { "name": "BH - 3 Open", "unit": null, "size": null },
  { "name": "BH - 4", "unit": null, "size": null },
  { "name": "BH - 4 Open", "unit": null, "size": null },
  { "name": "Linus 80494", "unit": null, "size": null },
  { "name": "HKX - 003", "unit": null, "size": null },
  { "name": "QL-ch-003", "unit": null, "size": null },

  { "name": "plastic tank vv20", "unit": "model", "size": null },
  { "name": "BRIDNG BOX H1010", "unit": "model", "size": null },
  { "name": "BRIDNG BOX H2010", "unit": "model", "size": null },

  { "name": "ACRYLIC BETTA TANK B1810", "unit": "model", "size": null },
  { "name": "ACRYLIC BETTA TANK B2709", "unit": "model", "size": null },
  { "name": "ACRYLIC BETTA TANK B4509", "unit": "model", "size": null },
  { "name": "ACRYLIC BETTA TANK B5409", "unit": "model", "size": null },
  { "name": "Plastic BETTA tank BJ01(A)", "unit": "model", "size": null },

  { "name": "NANO NB-100 (S)", "unit": "model", "size": null },
  { "name": "Plastic BETTA tank 2#", "unit": "model", "size": null },
  { "name": "Plastic BETTA tank 5#", "unit": "model", "size": null },
  { "name": "Plastic TANK A908", "unit": "model", "size": null },
  { "name": "Plastic TANK A907", "unit": "model", "size": null },
  { "name": "Plastic TANK A905", "unit": "model", "size": null },
  { "name": "Plastic TANK 330A", "unit": "model", "size": null },
  { "name": "Plastic TANK 270", "unit": "model", "size": null },
  { "name": "Plastic TANK 210", "unit": "model", "size": null },
  { "name": "Plastic TANK 180", "unit": "model", "size": null },
  { "name": "glass tank 10,10,15", "unit": "model", "size": null },

  { "name": "TURTLE BOX 80Q5", "unit": "model", "size": null },
  { "name": "PLASTIC TURTLE TANK 80Q2(M)", "unit": "model", "size": null },
  { "name": "PLASTIC TURTLE TANK 80Q1(S)", "unit": "model", "size": null },
  { "name": "PLASTIC TURTLE TANK Q14(M)", "unit": "model", "size": null },
  { "name": "PLASTIC TURTLE TANK Q12(S)", "unit": "model", "size": null },

  { "name": "AQUARIUM KFL380", "unit": "model", "size": null },
  { "name": "KFL 280", "unit": "model", "size": null },
  { "name": "AQUARIUPF-285", "unit": "model", "size": null },
  { "name": "PUFEIT PF 235", "unit": "model", "size": null },
  { "name": "Aquarium-LX-A863", "unit": "model", "size": null },
  { "name": "AQUARIUM BL-80", "unit": "model", "size": null },
  { "name": "AQUARIUM LX-220", "unit": "model", "size": null },

  { "name": "CLAMP LAMP LEDQL-X3-WHITE", "unit": "model", "size": null },
  { "name": "LED MODEL D-9", "unit": "model", "size": null },
  { "name": "LED X2-400 WHITE-BLUE", "unit": "model", "size": null },
  { "name": "UVA + UVB Lamp QL-X8", "unit": "model", "size": null },
  { "name": "TURTOISE LIGHT GX-F01", "unit": "model", "size": null },
  { "name": "LED GX-200 COLORFUL", "unit": "model", "size": null },
  { "name": "LED-MODEL-20S", "unit": "model", "size": null },
  { "name": "LED-MODEL-60S", "unit": "model", "size": null },
  { "name": "LED-MODEL 80S", "unit": "model", "size": null },
  { "name": "UVA-UVB", "unit": "model", "size": null },
  { "name": "LED T4-100LED", "unit": "model", "size": null },
  { "name": "LED T4-60LED", "unit": "model", "size": null },
  { "name": "LED T4-40LED", "unit": "model", "size": null },
  { "name": "T4-30LED", "unit": "model", "size": null },
  { "name": "T4-20LED", "unit": "model", "size": null },
  { "name": "COLOR CHANGING WATER GRASS QL-20", "unit": "model", "size": null },

  { "name": "HAILEA AIR COMPRESSOR ACO-308", "unit": "model", "size": null },
  { "name": "BIGOBOYAIR PUMP B-10200", "unit": "model", "size": null },
  { "name": "PERFECT AIR PUMP QL-408A", "unit": "model", "size": null },
  { "name": "Sera Air 550 R Plus Four Outlet", "unit": "model", "size": null },

  { "name": "DOPHIN FILTER UV LIGHT CF 1400", "unit": "model", "size": null },
  { "name": "DOPHIN FILTER UV LIGHT CF 1200", "unit": "model", "size": null },
  { "name": "DOPHIN FILTER UV LIGHT CF 800", "unit": "model", "size": null },
  { "name": "DOPHIN FILTER UV LIGHT CF 600", "unit": "model", "size": null },
  { "name": "DOPHIN FILTER F1200", "unit": "model", "size": null },
  { "name": "DOPHIN FILTER F-800", "unit": "model", "size": null },
  { "name": "ATLAS FILTER 2000F", "unit": "model", "size": null },
  { "name": "ATLAS FILTER 800F", "unit": "model", "size": null },

  { "name": "ARI SPONGE FILTER 2813", "unit": "piece", "size": null },
  { "name": "ARI SPONGE FILTER 2811", "unit": "piece", "size": null },
  { "name": "ARI SPONGE FILTER 2836", "unit": "piece", "size": null },
  { "name": "ARI SPONGE FILTER TY-380", "unit": "piece", "size": null },
  { "name": "ARI SPONGE FILTER TY-280", "unit": "piece", "size": null },
  { "name": "ARI SPONGE FILTER TY-180", "unit": "piece", "size": null },

  { "name": "AIR well  check valve vcv-4s sea viaw", "unit": "piece", "size": null },

  { "name": "Air stone A-100 nano air basin", "unit": "mm", "size": 100 },
  { "name": "Air stone N-50 nano air basin", "unit": "mm", "size": 50 },

  { "name": "Air stone 50mm.", "unit": "mm", "size": 50 },
  { "name": "Air stone 40mm", "unit": "mm", "size": 40 },
  { "name": "Air stone 30mm", "unit": "mm", "size": 30 },

  { "name": "Air stone strip bubble 6\"", "unit": "inch", "size": 6 },
  { "name": "Air stone strip bubble 8\"", "unit": "inch", "size": 8 },
  { "name": "Air stone strip bubble 10\"", "unit": "inch", "size": 10 },
  { "name": "Air stone strip bubble 12\"", "unit": "inch", "size": 12 },
  { "name": "Air stone strip bubble 16\"", "unit": "inch", "size": 16 },
  { "name": "Air stone strip bubble 20\"", "unit": "inch", "size": 20 },
  { "name": "Air stone strip bubble 24\"", "unit": "inch", "size": 24 },

  { "name": "Air pump  connector 4mm tubing 2 way -", "unit": "mm", "size": 4 },

  { "name": "AQUARIUM Air line hose Tube 4mm 200 meters", "unit": "meter", "size": 200 },
  { "name": "TAIYO-VACATION-Holiday Food 1 Packet 01-8017.", "unit": "pack", "size": 1 }
]

const map = new Map(UPDATES.map(u => [u.name, { unit: u.unit, size: u.size }]))

const buf = await readFile(productsPath, 'utf8')
const arr = JSON.parse(buf)

let matched = 0
let updated = 0
const res = arr.map(o => {
  const name = String(o?.name ?? '')
  if (map.has(name)) {
    matched++
    const { unit, size } = map.get(name)
    const prevU = o.unit
    const prevS = o.size
    if (prevU !== unit || prevS !== size) {
      updated++
      return { ...o, unit, size }
    }
  }
  return o
})

await writeFile(productsPath, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ matched, updated, path: productsPath }))

