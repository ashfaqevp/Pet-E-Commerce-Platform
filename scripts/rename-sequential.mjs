import { readdir, rename } from 'node:fs/promises'
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
const dir = path.resolve(cwd, opts.dir || 'data/extracted/cat')
const pad = Number(opts.pad || 3)
const start = Number(opts.start || 1)

const padNum = (n) => String(n).padStart(pad, '0')

const entries = await readdir(dir, { withFileTypes: true })
const files = entries.filter(e => e.isFile()).map(e => e.name)

const parseLeadingNumber = (name) => {
  const m = /^\s*(\d{1,})/.exec(name)
  return m ? Number(m[1]) : null
}

files.sort((a, b) => {
  const na = parseLeadingNumber(a)
  const nb = parseLeadingNumber(b)
  if (na != null && nb != null) return na - nb
  if (na != null) return -1
  if (nb != null) return 1
  return a.localeCompare(b)
})

const staged = []
let idx = start
for (const name of files) {
  const ext = path.extname(name) || ''
  const tmp = `__tmp__${padNum(idx)}${ext}`
  const from = path.join(dir, name)
  const toTmp = path.join(dir, tmp)
  await rename(from, toTmp)
  staged.push({ tmp, final: `${padNum(idx)}${ext}` })
  idx++
}

for (const s of staged) {
  const from = path.join(dir, s.tmp)
  const to = path.join(dir, s.final)
  await rename(from, to)
}

console.log(JSON.stringify({ dir, renamed: staged.length }))

