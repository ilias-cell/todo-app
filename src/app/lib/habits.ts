// src/app/lib/habits.ts
import type { Habit, HabitEntry } from '@prisma/client'

export type HabitWithEntries = Habit & { entries: HabitEntry[] }

/** Возвращает ISO-строку даты для Date */
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Сдвигает дату на n дней */
export function shiftDate(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Понедельник недели, содержащей дату */
export function weekMonday(iso: string): string {
  const d = new Date(iso)
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

/** 7 дней начиная с monday */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i))
}

/**
 * Ожидается ли привычка в конкретный день?
 * Для WEEKLY_COUNT возвращаем true для всех дней (пользователь сам выбирает).
 */
export function isExpected(habit: Habit, iso: string): boolean {
  if (new Date(iso) < new Date(habit.startDate)) return false
  if (habit.pausedAt && new Date(iso) >= new Date(habit.pausedAt)) return false

  if (habit.frequency === 'DAILY') return true

  if (habit.frequency === 'WEEKDAYS') {
    const days: number[] = habit.weekdays ? JSON.parse(habit.weekdays) : [1, 2, 3, 4, 5]
    const dow = new Date(iso).getDay() === 0 ? 7 : new Date(iso).getDay()
    return days.includes(dow)
  }

  // WEEKLY_COUNT — ожидается любой день
  return true
}

/** Выполнена ли привычка в конкретный день? */
export function isDone(habit: HabitWithEntries, iso: string): boolean {
  return habit.entries.some((e) => e.date === iso)
}

/** Прогресс за неделю: { done, expected } */
export function weekProgress(
  habit: HabitWithEntries,
  monday: string,
): { done: number; expected: number } {
  const days = weekDays(monday)
  let done = 0
  let expected = 0

  if (habit.frequency === 'WEEKLY_COUNT') {
    expected = habit.targetCount
    done = days.filter((d) => isDone(habit, d)).length
  } else {
    for (const d of days) {
      if (isExpected(habit, d)) {
        expected++
        if (isDone(habit, d)) done++
      }
    }
  }

  return { done, expected }
}

/** Текущая серия (streak) — дней подряд до сегодня включительно */
export function currentStreak(habit: HabitWithEntries, today: string): number {
  let streak = 0
  let cursor = today
  while (true) {
    if (!isExpected(habit, cursor)) {
      cursor = shiftDate(cursor, -1)
      continue
    }
    if (!isDone(habit, cursor)) break
    streak++
    cursor = shiftDate(cursor, -1)
    if (cursor < habit.startDate) break
  }
  return streak
}

/** Метка частоты для UI */
export function frequencyLabel(habit: Habit): string {
  if (habit.frequency === 'DAILY') return 'Каждый день'
  if (habit.frequency === 'WEEKLY_COUNT') return `${habit.targetCount} раз в неделю`
  if (habit.frequency === 'WEEKDAYS') {
    const days: number[] = habit.weekdays ? JSON.parse(habit.weekdays) : [1, 2, 3, 4, 5]
    const NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    if (days.length === 5 && days.every((d) => d <= 5)) return 'По будням'
    if (days.length === 7) return 'Каждый день'
    return days.map((d) => NAMES[d]).join(', ')
  }
  return ''
}