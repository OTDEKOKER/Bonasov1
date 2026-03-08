import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const root = process.cwd()
const targets = new Set(['.ts', '.tsx', '.js', '.jsx'])
const ignoreDirs = new Set(['node_modules', '.next', 'out', 'dist'])

const offenders = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignoreDirs.has(name)) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full)
      continue
    }
    if (!targets.has(extname(name))) continue

    const content = readFileSync(full, 'utf8')
    const lines = content.split(/\r?\n/)

    for (const [index, rawLine] of lines.entries()) {
      const line = index === 0 ? rawLine.replace(/^\uFEFF/, '') : rawLine
      if (
        line.startsWith('diff --git ') ||
        line.startsWith('<<<<<<< ') ||
        line === '=======' ||
        line.startsWith('>>>>>>> ')
      ) {
        offenders.push(`${full.replace(`${root}/`, '')}:${index + 1}`)
      }
    }
  }
}

walk(root)

if (offenders.length > 0) {
  console.error('Found accidental patch/conflict markers in source files:')
  for (const entry of offenders) {
    console.error(`- ${entry}`)
  }
  process.exit(1)
}

console.log('No accidental git patch or merge-conflict markers found in source files.')
