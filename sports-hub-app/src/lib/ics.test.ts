import { describe, expect, it } from 'vitest'
import { matchToIcs } from './ics'

const m = { id: 'abc', home: 'المالكية', away: 'المحرق', venue: 'استاد خليفة الرياضي, المنامة', kickoff: '2026-10-18T19:30:00+03:00' }

describe('matchToIcs', () => {
  const ics = matchToIcs(m)
  it('converts Bahrain time to UTC', () => {
    expect(ics).toContain('DTSTART:20261018T163000Z')
    expect(ics).toContain('DTEND:20261018T183000Z')
  })
  it('has the required calendar structure and CRLF endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('UID:abc@sportshub')
  })
  it('escapes commas in the location', () => expect(ics.replace(/\r\n /g, '')).toContain('LOCATION:استاد خليفة الرياضي\\, المنامة'))
  it('folds every line to 75 octets or fewer', () => {
    const enc = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75)
  })
  it('keeps Arabic intact after unfolding', () => expect(ics.replace(/\r\n /g, '')).toContain('SUMMARY:المالكية ضد المحرق'))
})
