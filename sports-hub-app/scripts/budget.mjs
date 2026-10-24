// Fails the build if the app ships more than the agreed JS+CSS (gzip): keeps it fast on slow phones. Run after `vite build`.
// Two limits: what the FIRST screen downloads (the entry script and the stylesheet that index.html names), and everything the app can ever
// download (the staff screens are separate chunks loaded on demand).
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const INITIAL_KB = 150
const TOTAL_KB = 260
const dist = new URL('../dist/', import.meta.url)
const gz = (f) => gzipSync(readFileSync(new URL(f, dist)), { level: 9 }).length
const html = readFileSync(new URL('index.html', dist), 'utf8')
const initialFiles = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1])
const initial = initialFiles.reduce((n, f) => n + gz(f), 0) / 1024
const total = readdirSync(new URL('assets/', dist)).filter((f) => /\.(js|css)$/.test(f)).reduce((n, f) => n + gz('assets/' + f), 0) / 1024
console.log(`first screen: ${initial.toFixed(1)} KB gzip (limit ${INITIAL_KB}) · all chunks: ${total.toFixed(1)} KB (limit ${TOTAL_KB})`)
if (initial > INITIAL_KB || total > TOTAL_KB) { console.error('Over budget: check what was added (a new dependency?)'); process.exit(1) }
