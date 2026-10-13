// Fails the build if the app ships more than the agreed JS+CSS (gzip): keeps it fast on slow phones. Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 150
const dir = new URL('../dist/assets/', import.meta.url)
const total = readdirSync(dir)
  .filter((f) => /\.(js|css)$/.test(f))
  .reduce((n, f) => n + gzipSync(readFileSync(new URL(f, dir)), { level: 9 }).length, 0)
const kb = total / 1024
console.log(`JS+CSS: ${kb.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`)
if (kb > BUDGET_KB) { console.error('Over budget: check what was added (a new dependency?)'); process.exit(1) }
