/* Placeholder badge: a tinted monogram, stable per club name. Not a real crest: swap for official crests once the clubs agree. */
/* Avalanche the bits so names that differ only in their last character (club 01, 02, 03) still get distant hues. */
const hash = (s: string) => {
  let h = [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

function monogram(name: string) {
  const words = name.trim().split(/\s+/).map((w) => w.replace(/^ال/, '')).filter(Boolean)
  if (words.length === 0) return '؟'
  const last = words[words.length - 1]
  if (/^\d{1,3}$/.test(last)) return last // numbered clubs (the fictional demo ones) show their number
  const [a, b] = words.length > 1 ? [words[0][0], words[1][0]] : [words[0][0], words[0][1] ?? '']
  return `${a}\u200c${b}` // ZWNJ keeps the two Arabic letters from joining into one ligature
}

const SIZE = { sm: 'size-7 text-[10px]', md: 'size-10 text-sm', lg: 'size-16 text-xl md:size-20 md:text-2xl' }

export function ClubBadge({ name, size = 'md', mine = false }: { name: string; size?: keyof typeof SIZE; mine?: boolean }) {
  const h = hash(name) % 360
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-extrabold ${SIZE[size]} ${mine ? 'ring-2 ring-gold/70' : ''}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, hsl(${h} 45% 30%), hsl(${h} 50% 14%))`,
        border: `1px solid hsl(${h} 55% 45% / .55)`,
        color: `hsl(${h} 85% 85%)`,
      }}
    >
      {monogram(name)}
    </span>
  )
}
