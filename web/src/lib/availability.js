export const FIXED_HOLIDAYS = [
  '01-01','01-02','01-03','01-04','01-05','01-06','01-07','01-08',
  '02-23','03-08','05-01','05-02','05-03','05-09','06-12','11-04',
]

export const PRICES = {
  summer: { weekday: 18000, weekend: 24000, holiday: 28000 },
  winter: { weekday: 8400, weekend: 12400, holiday: 24000 },
  spring: { weekday: 8400, weekend: 12400, holiday: 24000 },
  autumn: { weekday: 8400, weekend: 12400, holiday: 24000 },
}

export const fmt = (d) => d.getFullYear() + '-' +
  String(d.getMonth()+1).padStart(2,'0') + '-' +
  String(d.getDate()).padStart(2,'0')

export const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽'

export const fmtShort = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')

export const getSeason = (m) => {
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 11 || m <= 1) return 'winter'
  return (m >= 2 && m <= 4) ? 'spring' : 'autumn'
}

/* ---------- Живая конфигурация цен с сервера ---------- */
let cfg = null

export function fetchPrices() {
  return fetch('/api/prices')
    .then(r => r.json())
    .then(j => { cfg = j; return j })
    .catch(() => { cfg = null; return null })
}

const holidays = () => (cfg && Array.isArray(cfg.holidays) ? cfg.holidays : FIXED_HOLIDAYS)
const base = () => (cfg && cfg.base ? cfg.base : PRICES)

/* ---------- Календарь Avito ---------- */
export const parseICS = (text) => {
  const busy = new Set()
  if (!text) return busy
  text.split('BEGIN:VEVENT').forEach(ev => {
    const s = ev.match(/DTSTART[^:]*:(\d{8})/)
    const e = ev.match(/DTEND[^:]*:(\d{8})/)
    if (!s) return
    let cur = new Date(+s[1].slice(0,4), +s[1].slice(4,6)-1, +s[1].slice(6,8))
    const end = e ? new Date(+e[1].slice(0,4), +e[1].slice(4,6)-1, +e[1].slice(6,8))
                  : new Date(cur.getTime() + 86400000)
    while (cur < end) { busy.add(fmt(cur)); cur.setDate(cur.getDate()+1) }
  })
  return busy
}

let busyCache = null
export function fetchBooked() {
  if (busyCache) return Promise.resolve(busyCache)
  return Promise.all([
    fetch('/api/calendar.ics').then(r => r.text()).catch(() => ''),
    fetchPrices(),
  ]).then(([t]) => {
    busyCache = parseICS(t)
    if (cfg && Array.isArray(cfg.blocked)) cfg.blocked.forEach(d => busyCache.add(d))
    return busyCache
  })
}

/* ---------- Тип дня и цена ---------- */
export const dayType = (busy, d) => {
  if (busy.has(fmt(d))) return 'busy'
  const md = fmt(d).slice(5)
  if (holidays().includes(md)) return 'holiday'
  const w = d.getDay()
  return (w === 5 || w === 6) ? 'weekend' : 'weekday'
}

export const priceOf = (busy, d) => {
  const t = dayType(busy, d)
  if (t === 'busy') return 0
  const o = cfg && cfg.overrides ? cfg.overrides[fmt(d)] : null
  if (o) return Number(o)
  return base()[getSeason(d.getMonth())][t]
}

export const rangeTotal = (busy, from, to) => {
  let sum = 0
  const c = new Date(from)
  while (c < to) { sum += priceOf(busy, c); c.setDate(c.getDate()+1) }
  return sum
}

export const isFreeRange = (busy, start, nights) => {
  const c = new Date(start)
  for (let i = 0; i < nights; i++) {
    if (busy.has(fmt(c))) return false
    c.setDate(c.getDate()+1)
  }
  return true
}

export const endOf = (slot) => {
  const e = new Date(slot.start)
  e.setDate(e.getDate() + slot.nights)
  return e
}

export function findQuickSlots(busy, n1, n2) {
  const today = new Date(); today.setHours(0,0,0,0)
  const one = [], two = []
  const d = new Date(today)
  for (let i = 0; i < 180 && (one.length < n1 || two.length < n2); i++) {
    if (one.length < n1 && isFreeRange(busy, d, 1)) {
      one.push({ start: new Date(d), nights: 1, price: rangeTotal(busy, d, new Date(d.getTime()+86400000)) })
    }
    if (two.length < n2 && isFreeRange(busy, d, 2)) {
      two.push({ start: new Date(d), nights: 2, price: rangeTotal(busy, d, new Date(d.getTime()+2*86400000)) })
    }
    d.setDate(d.getDate()+1)
  }
  return { one, two }
}
