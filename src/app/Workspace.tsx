// src/app/Workspace.tsx
'use client'

import { useState } from 'react'
import type {
  Todo,
  Person,
  Context,
  Project,
  Event as CalEvent,
  AgendaItem,
} from '@prisma/client'
import MorningReview from './MorningReview'
import AllTasks from './AllTasks'
import WeeklyReview from './WeeklyReview'
import Calendar from './Calendar'
import Habits from './Habits'
import TodayBar from './TodayBar'
import { expandEvents } from './lib/expandEvents'
import type { HabitWithEntries } from './lib/habits'

export type TodoWithRelations = Todo & {
  customer: Person | null
  assignee: Person | null
  contexts: Context[]
  project: Project | null
}

export type PersonWithAgenda = Person & { agendaItems: AgendaItem[] }

export type EventWithRelations = CalEvent & {
  person: Person | null
  project: Project | null
  _templateId?: number
}

type View = 'morning' | 'all' | 'review' | 'calendar' | 'habits'

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'morning',  label: 'Утренний обзор' },
  { view: 'all',      label: 'Все задачи'      },
  { view: 'review',   label: 'Обзор недели'    },
  { view: 'calendar', label: 'Календарь'       },
  { view: 'habits',   label: 'Привычки'        },
]

export default function Workspace({
  todos,
  people,
  contexts,
  projects,
  events,
  habits,
}: {
  todos:    TodoWithRelations[]
  people:   PersonWithAgenda[]
  contexts: Context[]
  projects: Project[]
  events:   EventWithRelations[]
  habits:   HabitWithEntries[]
}) {
  const [view, setView] = useState<View>('morning')

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - 7)
  const rangeEnd = new Date()
  rangeEnd.setDate(rangeEnd.getDate() + 60)

  const expandedEvents = expandEvents(events, rangeStart, rangeEnd)

  const today = new Date().toISOString().slice(0, 10)
  const todayEvents = expandedEvents.filter((e) => {
    const d =
      e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : String(e.date).slice(0, 10)
    return d === today
  })

  return (
    <div className="mx-auto max-w-[680px] px-6">
      {/* Навигация */}
      <nav
        className="flex gap-7 border-b pt-5 overflow-x-auto"
        style={{ borderColor: 'var(--border-soft)', scrollbarWidth: 'none' }}
        aria-label="Разделы приложения"
      >
        {NAV_ITEMS.map(({ view: v, label }) => {
          const active = view === v
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-current={active ? 'page' : undefined}
              className="relative flex-shrink-0 pb-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:rounded"
              style={{
                color:      active ? 'var(--text)'     : 'var(--text-muted)',
                fontWeight: active ? '500'             : '400',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
              }}
            >
              {label}
              {active && (
                <span
                  className="pointer-events-none absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-t"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* TodayBar */}
      <TodayBar events={todayEvents} />

      {/* Контент */}
      <div className="mt-8">
        {view === 'morning' && (
          <MorningReview
            todos={todos}
            people={people}
            contexts={contexts}
            projects={projects}
            todayEvents={todayEvents}
          />
        )}
        {view === 'all' && (
          <AllTasks
            todos={todos}
            people={people}
            contexts={contexts}
            projects={projects}
          />
        )}
        {view === 'review' && (
          <WeeklyReview
            todos={todos}
            people={people}
            contexts={contexts}
            projects={projects}
          />
        )}
        {view === 'calendar' && (
          <Calendar
            events={expandedEvents}
            people={people}
            projects={projects}
          />
        )}
        {view === 'habits' && (
          <Habits habits={habits} />
        )}
      </div>
    </div>
  )
}