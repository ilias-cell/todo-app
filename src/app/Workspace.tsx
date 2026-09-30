'use client'

import { useState } from 'react'
import type {
  Todo, Person, Context, Project, Event as CalEvent, AgendaItem,
} from '@prisma/client'
import MorningReview from './MorningReview'
import AllTasks from './AllTasks'
import WeeklyReview from './WeeklyReview'
import Calendar from './Calendar'
import Habits from './Habits'
import TodayBar from './TodayBar'
import TodoForm from './TodoForm'
import { addTodo } from './actions'
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

type View = 'add' | 'morning' | 'all' | 'review' | 'calendar' | 'habits'

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'add',      label: 'Добавить задачу' },
  { view: 'morning',  label: 'Утренний обзор'  },
  { view: 'all',      label: 'Все задачи'      },
  { view: 'review',   label: 'Обзор недели'    },
  { view: 'calendar', label: 'Календарь'       },
  { view: 'habits',   label: 'Привычки'        },
]

export default function Workspace({
  todos, people, contexts, projects, events, habits,
}: {
  todos:    TodoWithRelations[]
  people:   PersonWithAgenda[]
  contexts: Context[]
  projects: Project[]
  events:   EventWithRelations[]
  habits:   HabitWithEntries[]
}) {
  const [view, setView] = useState<View>('add')
  const [menuOpen, setMenuOpen] = useState(false)

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - 7)
  const rangeEnd = new Date()
  rangeEnd.setDate(rangeEnd.getDate() + 60)

  const expandedEvents = expandEvents(events, rangeStart, rangeEnd)

  const today = new Date().toISOString().slice(0, 10)
  const todayEvents = expandedEvents.filter((e) => {
    const d = (e.date as any) instanceof Date
      ? (e.date as any as Date).toISOString().slice(0, 10)
      : String(e.date).slice(0, 10)
    return d === today
  })

  const currentLabel = NAV_ITEMS.find((i) => i.view === view)?.label ?? ''
  const inbox = todos.filter((t) => t.status === 'INBOX').slice(0, 5)

  function go(v: View) {
    setView(v)
    setMenuOpen(false)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Верхняя панель ── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 border-b px-2 py-2"
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--border)',
          paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
        }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
          className="grid h-11 w-11 place-items-center rounded-lg active:opacity-60"
          style={{ color: 'var(--text-sec)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <path d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-[15px] font-medium">{currentLabel}</span>
      </header>

      {/* ── Меню ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0"
            style={{ background: 'oklch(0% 0 0 / 0.4)' }}
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute inset-y-0 left-0 w-[78%] max-w-xs overflow-y-auto p-3"
            style={{
              background: 'var(--surface)',
              paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = view === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => go(item.view)}
                  className="block w-full rounded-lg px-3 py-3 text-left text-[15px] active:opacity-60"
                  style={{
                    color: active ? 'var(--text)' : 'var(--text-sec)',
                    fontWeight: active ? 500 : 400,
                    background: active ? 'var(--raised)' : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* ── Контент ── */}
      <div className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-24 md:px-6 md:pb-12">

        {view === 'add' && (
          <div className="pt-4">
            <TodayBar events={todayEvents} />

            <div className="mt-6">
              <TodoForm addTodo={addTodo} autoFocus />
            </div>

            {inbox.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-[13px] uppercase tracking-wide"
                   style={{ color: 'var(--text-ghost)' }}>
                  Входящие
                </p>
                <ul className="space-y-1">
                  {inbox.map((t) => (
                    <li key={t.id}
                        className="rounded-lg px-3 py-3 text-[15px]"
                        style={{ background: 'var(--surface)' }}>
                      {t.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {view !== 'add' && <TodayBar events={todayEvents} />}

        <div className={view === 'add' ? '' : 'mt-6'}>
          {view === 'morning' && (
            <MorningReview todos={todos} people={people} contexts={contexts}
                           projects={projects} todayEvents={todayEvents} />
          )}
          {view === 'all' && (
            <AllTasks todos={todos} people={people} contexts={contexts} projects={projects} />
          )}
          {view === 'review' && (
            <WeeklyReview todos={todos} people={people} contexts={contexts} projects={projects} />
          )}
          {view === 'calendar' && (
            <Calendar events={expandedEvents} people={people} projects={projects} />
          )}
          {view === 'habits' && <Habits habits={habits} />}
        </div>
      </div>
    </div>
  )
}