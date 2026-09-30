// src/app/lib/status.ts
import type { Status } from '@prisma/client'
import type { ProjectStatus } from '@prisma/client'

export const STATUS_LABELS: Record<Status, string> = {
  INBOX: 'Inbox',
  IN_PROGRESS: 'В работе',
  WAITING: 'Ожидание',
  REVIEW: 'На проверке',
  DONE: 'Готово',
}

export const STATUS_ORDER: Status[] = [
  'INBOX',
  'IN_PROGRESS',
  'WAITING',
  'REVIEW',
  'DONE',
]

const AMBER_AFTER = 3
const RED_AFTER = 7

export type AgeLevel = 'grey' | 'amber' | 'red'

export function daysSince(date: Date | string): number {
  const then = new Date(date).getTime()
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
}

export function ageLevel(days: number): AgeLevel {
  if (days >= RED_AFTER) return 'red'
  if (days >= AMBER_AFTER) return 'amber'
  return 'grey'
}

export const AGE_BADGE_CLASS: Record<AgeLevel, string> = {
  grey: 'bg-neutral-100 text-neutral-500',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
}

export function isOverdue(date: Date | string | null): boolean {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Активен',
  ON_HOLD: 'Заморожен',
  DONE: 'Завершён',
}

export const PROJECT_STATUS_ORDER: ProjectStatus[] = ['ACTIVE', 'ON_HOLD', 'DONE']

// порог «застоя» для еженедельного обзора
export const STALE_DAYS = 7