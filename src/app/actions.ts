// src/app/actions.ts
'use server'

import { Status, ProjectStatus, EventKind, Recurrence } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from './lib/prisma'

// ─── Задачи ──────────────────────────────────────────────────────────────────

export async function addTodo(fields: {
  text: string
  personId?: number | null
  projectId?: number | null
}) {
  await prisma.todo.create({
    data: {
      text:       fields.text.trim(),
      status:     'INBOX',
      assigneeId: fields.personId  ?? null,
      projectId:  fields.projectId ?? null,
    },
  })
  revalidatePath('/')
}

export async function updateTodo(
  id: number,
  fields: {
    text?:          string
    status?:        Status
    nextAction?:    string | null
    customerId?:    number | null
    assigneeId?:    number | null
    projectId?:     number | null
    followUpDate?:  string | null
    contextIds?:    number[]
  }
) {
  const current = await prisma.todo.findUnique({ where: { id } })
  if (!current) return

  const data: Parameters<typeof prisma.todo.update>[0]['data'] = {
    text:       fields.text,
    status:     fields.status,
    nextAction: fields.nextAction,
    customerId: fields.customerId,
    assigneeId: fields.assigneeId,
    projectId:  fields.projectId,
  }

  if (fields.followUpDate !== undefined) {
    data.followUpDate = fields.followUpDate ? new Date(fields.followUpDate) : null
  }

  if (fields.contextIds !== undefined) {
    data.contexts = { set: fields.contextIds.map((cid) => ({ id: cid })) }
  }

  // Автоматически ставим/сбрасываем waitingSince при смене статуса
  if (fields.status !== undefined) {
    if (fields.status === 'WAITING' && current.status !== 'WAITING') {
      data.waitingSince = new Date()
    } else if (fields.status !== 'WAITING') {
      data.waitingSince = null
    }
  }

  await prisma.todo.update({ where: { id }, data })
  revalidatePath('/')
}

export async function setStatus(id: number, status: Status) {
  await prisma.todo.update({ where: { id }, data: { status } })
  revalidatePath('/')
}

export async function assignTodo(id: number, assigneeId: number) {
  await prisma.todo.update({
    where: { id },
    data: {
      assigneeId,
      status: 'IN_PROGRESS',
    },
  })
  revalidatePath('/')
}

// ─── Проекты ─────────────────────────────────────────────────────────────────

export async function addProject(name: string, outcome: string) {
  const project = await prisma.project.create({
    data: {
      name:    name.trim(),
      outcome: outcome.trim() || null,
    },
  })
  revalidatePath('/')
  return project
}

export async function updateProject(
  id: number,
  fields: {
    name?:    string
    outcome?: string | null
    status?:  ProjectStatus
  }
) {
  await prisma.project.update({
    where: { id },
    data: {
      name:    fields.name?.trim(),
      outcome: fields.outcome !== undefined
        ? fields.outcome?.trim() || null
        : undefined,
      status:  fields.status,
    },
  })
  revalidatePath('/')
}

export async function deleteProject(id: number) {
  // onDelete: SetNull в схеме отвязывает задачи, не удаляя их
  await prisma.project.delete({ where: { id } })
  revalidatePath('/')
}

// ─── Люди ────────────────────────────────────────────────────────────────────

export async function addPerson(name: string) {
  const person = await prisma.person.create({ data: { name: name.trim() } })
  revalidatePath('/')
  return person
}

export async function renamePerson(id: number, name: string) {
  await prisma.person.update({ where: { id }, data: { name: name.trim() } })
  revalidatePath('/')
}

export async function deletePerson(id: number) {
  const person = await prisma.person.findUnique({ where: { id } })
  if (person?.isMe) return // защищаем запись «Я»
  await prisma.person.delete({ where: { id } })
  revalidatePath('/')
}

// ─── Контексты ───────────────────────────────────────────────────────────────

export async function addContext(name: string, color: string) {
  const context = await prisma.context.create({
    data: { name: name.trim(), color },
  })
  revalidatePath('/')
  return context
}

// ─── События ─────────────────────────────────────────────────────────────────

export async function addEvent(fields: {
  title:          string
  kind:           EventKind
  date:           string
  startTime?:     string | null
  endTime?:       string | null
  personId?:      number | null
  projectId?:     number | null
  note?:          string | null
  recurrence?:    Recurrence | null
  recurrenceEnd?: string | null
}) {
  await prisma.event.create({
    data: {
      title:         fields.title.trim(),
      kind:          fields.kind,
      date:          fields.date,
      startTime:     fields.startTime     || null,
      endTime:       fields.endTime       || null,
      personId:      fields.personId      ?? null,
      projectId:     fields.projectId     ?? null,
      note:          fields.note?.trim()  || null,
      recurrence:    fields.recurrence    ?? null,
      recurrenceEnd: fields.recurrenceEnd
        ? new Date(fields.recurrenceEnd)
        : null,
    },
  })
  revalidatePath('/')
}

export async function updateEvent(
  id: number,
  fields: {
    title?:         string
    kind?:          EventKind
    date?:          string
    startTime?:     string | null
    endTime?:       string | null
    personId?:      number | null
    projectId?:     number | null
    note?:          string | null
    recurrence?:    string | null   // приходит как строка из select
    recurrenceEnd?: string | null
  }
) {
  await prisma.event.update({
    where: { id },
    data: {
      title:     fields.title?.trim(),
      kind:      fields.kind,
      date:      fields.date ? fields.date : undefined,
      startTime: fields.startTime,
      endTime:   fields.endTime,
      personId:  fields.personId,
      projectId: fields.projectId,
      note:      fields.note !== undefined
        ? fields.note?.trim() || null
        : undefined,
      // null сбрасывает повторение, строка приводится к enum
      recurrence: fields.recurrence !== undefined
        ? (fields.recurrence as Recurrence | null)
        : undefined,
      recurrenceEnd: fields.recurrenceEnd !== undefined
        ? fields.recurrenceEnd
          ? new Date(fields.recurrenceEnd)
          : null
        : undefined,
    },
  })
  revalidatePath('/')
}

export async function deleteEvent(id: number) {
  await prisma.event.delete({ where: { id } })
  revalidatePath('/')
}

// ─── Повестка (@agenda) ──────────────────────────────────────────────────────

export async function addAgendaItem(personId: number, text: string) {
  const t = text.trim()
  if (!t) return
  await prisma.agendaItem.create({ data: { personId, text: t } })
  revalidatePath('/')
}

export async function toggleAgendaItem(id: number, done: boolean) {
  await prisma.agendaItem.update({
    where: { id },
    data: {
      done,
      discussedAt: done ? new Date() : null,
    },
  })
  revalidatePath('/')
}

export async function deleteAgendaItem(id: number) {
  await prisma.agendaItem.delete({ where: { id } })
  revalidatePath('/')
}

export async function deleteTodo(id: number) {
  await prisma.todo.delete({ where: { id } })
  revalidatePath('/')
}

// ─── Привычки ────────────────────────────────────────────────────────────────

import { HabitFrequency } from '@prisma/client'

export async function addHabit(fields: {
  name:        string
  color:       string
  frequency:   HabitFrequency
  weekdays?:   number[] | null
  targetCount: number
  startDate:   string
}) {
  await prisma.habit.create({
    data: {
      name:        fields.name.trim(),
      color:       fields.color,
      frequency:   fields.frequency,
      weekdays:    fields.weekdays ? JSON.stringify(fields.weekdays) : null,
      targetCount: fields.targetCount,
      startDate:   fields.startDate,
    },
  })
  revalidatePath('/')
}

export async function updateHabit(
  id: number,
  fields: {
    name?:        string
    color?:       string
    frequency?:   HabitFrequency
    weekdays?:    number[] | null
    targetCount?: number
    startDate?:   string
  }
) {
  await prisma.habit.update({
    where: { id },
    data: {
      name:        fields.name?.trim(),
      color:       fields.color,
      frequency:   fields.frequency,
      weekdays:    fields.weekdays !== undefined
        ? fields.weekdays ? JSON.stringify(fields.weekdays) : null
        : undefined,
      targetCount: fields.targetCount,
      startDate:   fields.startDate,
    },
  })
  revalidatePath('/')
}

export async function pauseHabit(id: number, paused: boolean) {
  await prisma.habit.update({
    where: { id },
    data: { pausedAt: paused ? new Date() : null },
  })
  revalidatePath('/')
}

export async function deleteHabit(id: number) {
  await prisma.habit.delete({ where: { id } })
  revalidatePath('/')
}

export async function toggleHabitEntry(habitId: number, date: string) {
  const existing = await prisma.habitEntry.findUnique({
    where: { habitId_date: { habitId, date } },
  })
  if (existing) {
    await prisma.habitEntry.delete({ where: { id: existing.id } })
  } else {
    await prisma.habitEntry.create({ data: { habitId, date } })
  }
  revalidatePath('/')
}