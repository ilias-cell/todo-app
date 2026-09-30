// src/app/EventForm.tsx
'use client'

import { useState, useTransition } from 'react'
import type { Person, Project } from '@prisma/client'
import { createEvent } from './actions'

const RECURRENCE_LABELS: Record<string, string> = {
  DAILY:    'Каждый день',
  WEEKLY:   'Каждую неделю',
  BIWEEKLY: 'Каждые две недели',
  MONTHLY:  'Каждый месяц',
}

export default function EventForm({
  people,
  projects,
  onClose,
}: {
  people: Person[]
  projects: Project[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const [title,          setTitle]          = useState('')
  const [date,           setDate]           = useState('')
  const [startTime,      setStartTime]      = useState('')
  const [endTime,        setEndTime]        = useState('')
  const [kind,           setKind]           = useState('MEETING')
  const [personId,       setPersonId]       = useState('')
  const [projectId,      setProjectId]      = useState('')
  const [recurring,      setRecurring]      = useState(false)
  const [recurrence,     setRecurrence]     = useState('WEEKLY')
  const [recurrenceEnd,  setRecurrenceEnd]  = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return

    startTransition(async () => {
      await createEvent({
        title:         title.trim(),
        date,
        startTime:     startTime  || null,
        endTime:       endTime    || null,
        kind,
        personId:      personId   ? Number(personId)  : null,
        projectId:     projectId  ? Number(projectId) : null,
        recurrence:    recurring  ? recurrence        : null,
        recurrenceEnd: recurring && recurrenceEnd ? recurrenceEnd : null,
      })
      onClose()
    })
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 ' +
    'placeholder-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Название */}
      <div>
        <label className={labelCls}>Название</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Стендап команды"
          required
          className={inputCls}
        />
      </div>

      {/* Дата + время */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className={labelCls}>Дата</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Начало</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Конец</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Тип + участник + проект */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Тип</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
            <option value="MEETING">Встреча</option>
            <option value="DEADLINE">Дедлайн</option>
            <option value="INFO">Информация</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Участник</label>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Проект</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Повторение */}
      <div className="rounded-lg border border-neutral-200 p-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
          />
          <span className="text-sm font-medium text-neutral-800">Повторять</span>
        </label>

        {recurring && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Частота</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className={inputCls}
              >
                {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Повторять до</label>
              <input
                type="date"
                value={recurrenceEnd}
                onChange={(e) => setRecurrenceEnd(e.target.value)}
                min={date}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Кнопки */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim() || !date}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {isPending ? '...' : 'Создать'}
        </button>
      </div>

    </form>
  )
}