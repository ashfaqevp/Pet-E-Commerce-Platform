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
const productsPath = path.resolve(cwd, opts.input || 'data/products.json')
const imagesPath = path.resolve(cwd, opts.images || 'data/images-index.txt')
const outputPath = path.resolve(cwd, opts.output || 'data/products.json')
const baseUrl = String(opts.base || 'https://www.buypets.om/images/products')

const productsBuf = await readFile(productsPath, 'utf8')
const products = JSON.parse(productsBuf)
const imagesBuf = await readFile(imagesPath, 'utf8')
const imageNames = imagesBuf.split(/\r?\n/).map(s => s.trim()).filter(Boolean)

const assigned = Math.min(products.length, imageNames.length)
const res = products.map((o, i) => {
  const name = imageNames[i] || null
  const url = name ? `${baseUrl}/${name}` : null
  const { id, base_product_id, ...rest } = o || {}
  return { id: String(id || ''), base_product_id: String(base_product_id || ''), ...rest, thumbnail_url: url }
})

await writeFile(outputPath, JSON.stringify(res, null, 2), 'utf8')

const nonNull = res.filter(o => typeof o.thumbnail_url === 'string' && o.thumbnail_url.startsWith(baseUrl)).length
const nulls = res.length - nonNull
console.log(JSON.stringify({ input: productsPath, images: imagesPath, output: outputPath, products: res.length, images_count: imageNames.length, assigned, nonNull, nulls }))

