const LOCALE = 'ar-BH-u-nu-latn'
const TZ = 'Asia/Bahrain'

const number = new Intl.NumberFormat(LOCALE)
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BHD', minimumFractionDigits: 3 })
const date = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: TZ })
const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })

export const fmtNumber = (n: number) => number.format(n)
export const fmtMoney = (n: number | string) => money.format(Number(n))
export const fmtDate = (d: string | Date) => date.format(new Date(d))
export const fmtDateTime = (d: string | Date) => dateTime.format(new Date(d))
export const fmtPercent = (ratio: number) => percent.format(ratio)
