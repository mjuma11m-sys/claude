const LOCALE = 'ar-BH-u-nu-latn'
const TZ = 'Asia/Bahrain'

const number = new Intl.NumberFormat(LOCALE)
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BHD', minimumFractionDigits: 3 })
const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })

export const fmtNumber = (n: number) => number.format(n)
export const fmtMoney = (n: number | string) => money.format(Number(n))
export const fmtDateTime = (d: string | Date) => dateTime.format(new Date(d))
export const fmtPercent = (ratio: number) => percent.format(ratio)

/* Goal difference with a real minus sign (U+2212): the hyphen is too short beside tabular numerals. */
export const fmtGd = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `\u2212${Math.abs(n)}` : '0')
