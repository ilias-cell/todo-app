// src/app/lib/date.ts
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISO(new Date())
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Список из N ISO-дат начиная с сегодня. */
export function nextDays(count: number): string[] {
  const base = new Date()
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    out.push(toISO(d))
  }
  return out
}

export function formatDayHeader(iso: string): { label: string; isToday: boolean } {
  const today = todayISO()
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toISO(d)
  })()
  const d = parseISO(iso)
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (iso === today) return { label: `Сегодня · ${base}`, isToday: true }
  if (iso === tomorrow) return { label: `Завтра · ${base}`, isToday: false }
  return { label: base, isToday: false }
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return 'весь день'
  return end ? `${start}–${end}` : start
}

/** Сдвинуть дату d на n дней, вернуть ISO-строку. */
export function shiftDays(d: Date, n: number): string {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return toISO(r)
}