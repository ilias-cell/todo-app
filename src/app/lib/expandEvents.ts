// src/app/lib/expandEvents.ts

import type { EventWithRelations } from '../Workspace'

// Добавляем поле для отслеживания оригинального id шаблона у виртуальных копий
export type ExpandedEvent = EventWithRelations & { _templateId?: number }

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

const STEP: Record<string, (d: Date) => Date> = {
  DAILY:    (d) => addDays(d, 1),
  WEEKLY:   (d) => addDays(d, 7),
  BIWEEKLY: (d) => addDays(d, 14),
  MONTHLY:  (d) => addMonths(d, 1),
}

/**
 * Разворачивает повторяющиеся события в виртуальные копии для заданного диапазона дат.
 * Не пишет в БД — только генерирует экземпляры на лету.
 *
 * Виртуальные копии получают:
 *   - составной id: ev.id * 10_000 + index (уникален для React key)
 *   - поле _templateId: оригинальный id из БД (используется в updateEvent / deleteEvent)
 */
export function expandEvents(
  events: EventWithRelations[],
  rangeStart: Date,
  rangeEnd: Date,
): ExpandedEvent[] {
  const result: ExpandedEvent[] = []

  for (const ev of events) {
    if (!ev.recurrence) {
      // Не повторяющееся — добавляем как есть, если попадает в диапазон
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date as unknown as string)
      if (d >= rangeStart && d <= rangeEnd) {
        result.push(ev)
      }
      continue
    }

    const step = STEP[ev.recurrence]
    if (!step) continue

    // Конец повторения — берём меньшее из recurrenceEnd и rangeEnd
    const recEnd = ev.recurrenceEnd
      ? new Date(ev.recurrenceEnd as unknown as string)
      : null
    const end = recEnd && recEnd < rangeEnd ? recEnd : rangeEnd

    const origin = ev.date instanceof Date ? ev.date : new Date(ev.date as unknown as string)
    let cursor = new Date(origin)

    // Пропускаем даты до начала диапазона
    while (cursor < rangeStart) {
      cursor = step(cursor)
      // Защита от бесконечного цикла если шаблонная дата после rangeEnd
      if (cursor > end) break
    }

    let instanceIndex = 0
    while (cursor <= end) {
      result.push({
        ...ev,
        _templateId: ev.id,                       // оригинальный id для записи в БД
        id: ev.id * 10_000 + instanceIndex,       // виртуальный id для React key
        date: new Date(cursor) as unknown as EventWithRelations['date'],
      })
      cursor = step(cursor)
      instanceIndex++

      // Защита: не более 1000 экземпляров на одно событие
      if (instanceIndex > 1000) break
    }
  }

  return result.sort((a, b) => {
    const da = (a.date instanceof Date ? a.date : new Date(a.date as unknown as string))
      .toISOString()
      .slice(0, 10)
    const db = (b.date instanceof Date ? b.date : new Date(b.date as unknown as string))
      .toISOString()
      .slice(0, 10)
    if (da !== db) return da.localeCompare(db)
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
    if (a.startTime) return -1
    if (b.startTime) return 1
    return 0
  })
}