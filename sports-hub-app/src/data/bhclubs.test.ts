import { describe, expect, it } from 'vitest'
import { BH_CLUBS, bundledLogo, findClub } from './bhclubs'

describe('bahraini clubs', () => {
  it('slugs are unique', () => expect(new Set(BH_CLUBS.map((c) => c.slug)).size).toBe(BH_CLUBS.length))
  it('finds a club typed with or without «نادي» and extra spaces', () => {
    expect(findClub('نادي  المحرق')?.slug).toBe('al-muharraq')
    expect(findClub('الرفاع')?.slug).toBe('al-riffa')
    expect(findClub('الرفاع الشرقي')?.slug).toBe('east-riffa')
    expect(findClub('فريق خيالي')).toBeUndefined()
    expect(findClub('')).toBeUndefined()
  })
  it('has no logo until a file is added to src/assets/clubs', () => expect(bundledLogo('الأهلي')).toBeNull())
})
