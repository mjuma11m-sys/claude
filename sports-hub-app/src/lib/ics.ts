/* Minimal iCalendar (RFC 5545) for one match: opens in Apple/Google/Outlook calendars. */
const enc = new TextEncoder()
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/* Lines over 75 octets must fold; count bytes, not characters, because Arabic is 2 bytes per letter. */
function fold(line: string) {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch
    bytes += n
  }
  out.push(cur)
  return out.join('\r\n ')
}

export type CalMatch = { id: string; home: string; away: string; venue: string; kickoff: string }

export function matchToIcs(m: CalMatch, lengthMin = 120): string {
  const start = new Date(m.kickoff)
  const end = new Date(start.getTime() + lengthMin * 60_000)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sports Hub//AR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${m.id}@sportshub`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${m.home} ضد ${m.away}`)}`,
    `LOCATION:${esc(m.venue)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`${m.home} ضد ${m.away}`)}`, 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(m: CalMatch) {
  const url = URL.createObjectURL(new Blob([matchToIcs(m)], { type: 'text/calendar;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'match.ics' })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
