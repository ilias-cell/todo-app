// src/app/Calendar.tsx
'use client'

import { useState, useTransition } from 'react'
import { EventKind } from '@prisma/client'
import type { Project } from '@prisma/client'
import type { EventWithRelations, PersonWithAgenda } from './Workspace'
import {
  formatDayHeader,
  formatTimeRange,
  todayISO,
  shiftDays,
} from './lib/date'
import {
  addEvent,
  updateEvent,
  deleteEvent,
  addAgendaItem,
  toggleAgendaItem,
  addTodo,
} from './actions'
import PersonPanel from './PersonPanel'

const KIND: Record<EventKind, { rail: string; label: string }> = {
  MEETING:  { rail: 'var(--info)',    label: 'Встреча'        },
  DEADLINE: { rail: 'var(--warn)',    label: 'Дедлайн дня'    },
  INFO:     { rail: 'var(--purple)',  label: 'Информация дня' },
}

const RECURRENCE_LABELS: Record<string, string> = {
  DAILY:    'Каждый день',
  WEEKLY:   'Каждую неделю',
  BIWEEKLY: 'Каждые две недели',
  MONTHLY:  'Каждый месяц',
}

type PanelState =
  | { mode: 'add'; date: string }
  | { mode: 'edit'; event: EventWithRelations }
  | null

type CalendarView = 'week' | 'month' | 'day'

export default function Calendar({
  events,
  people,
  projects,
}: {
  events: EventWithRelations[]
  people: PersonWithAgenda[]
  projects: Project[]
}) {
  const [calView,        setCalView]        = useState<CalendarView>('week')
  const [weekOffset,     setWeekOffset]     = useState(0)
  const [monthOffset,    setMonthOffset]    = useState(0)
  const [dayISO,         setDayISO]         = useState(todayISO)
  const [panel,          setPanel]          = useState<PanelState>(null)
  const [openPersonId,   setOpenPersonId]   = useState<number | null>(null)
  const [expandedId,     setExpandedId]     = useState<number | null>(null)
  const [projectFilter,  setProjectFilter]  = useState<number | null>(null)
  const [filterOpen,     setFilterOpen]     = useState(false)

  const openPerson = people.find((p) => p.id === openPersonId) ?? null

  // ── Месяц ──
  const now = new Date()
  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const monthLabel = `${MONTHS_RU[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  // ── Неделя ──
  const monday = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    d.setDate(d.getDate() - dow + weekOffset * 7)
    return d
  })()
  const days = Array.from({ length: 7 }, (_, i) => shiftDays(monday, i))

  const weekLabel = (() => {
    const MO = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
    const end = shiftDays(monday, 6)
    const s = new Date(monday)
    const e = new Date(end)
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()}–${e.getDate()} ${MO[s.getMonth()]} ${s.getFullYear()}`
    return `${s.getDate()} ${MO[s.getMonth()]} – ${e.getDate()} ${MO[e.getMonth()]} ${e.getFullYear()}`
  })()

  const dayLabel = (() => {
    const d = new Date(dayISO)
    const MO = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
    return `${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()}`
  })()

  function shiftDay(n: number) {
    const d = new Date(dayISO)
    d.setDate(d.getDate() + n)
    setDayISO(d.toISOString().slice(0, 10))
  }

  const navLabel =
    calView === 'week'  ? weekLabel  :
    calView === 'month' ? monthLabel :
    dayLabel

  function navPrev() {
    if (calView === 'week')  setWeekOffset((o) => o - 1)
    if (calView === 'month') setMonthOffset((o) => o - 1)
    if (calView === 'day')   shiftDay(-1)
  }
  function navNext() {
    if (calView === 'week')  setWeekOffset((o) => o + 1)
    if (calView === 'month') setMonthOffset((o) => o + 1)
    if (calView === 'day')   shiftDay(1)
  }
  function navToday() {
    setWeekOffset(0)
    setMonthOffset(0)
    setDayISO(todayISO())
  }

  const isOnToday =
    calView === 'week'  ? weekOffset  === 0 :
    calView === 'month' ? monthOffset === 0 :
    dayISO === todayISO()

  function sortedEvents(iso: string) {
    return [...events]
      .filter((e) => {
        const d = (e.date as any) instanceof Date ? ((e.date as any) as Date).toISOString().slice(0, 10) : String(e.date).slice(0, 10);
        return d === iso
      })
      .filter((e) => projectFilter === null || e.projectId === projectFilter)
      .sort((a, b) => {
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        if (a.startTime) return -1
        if (b.startTime) return 1
        return 0
      })
  }

  function agendaOpenCount(personId: number) {
    return people.find((p) => p.id === personId)?.agendaItems.filter((a) => !a.done).length ?? 0
  }

  const activeProject = projects.find((p) => p.id === projectFilter)

  return (
    <section>
      {/* ── Строка 1: навигация по периоду ── */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <button
          onClick={navPrev}
          aria-label="Предыдущий период"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border transition-colors"
          style={{
            borderColor: 'var(--border)',
            background:  'var(--surface)',
            color:       'var(--text-sec)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--raised)'
            ;(e.currentTarget as HTMLButtonElement).style.color      = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
            ;(e.currentTarget as HTMLButtonElement).style.color      = 'var(--text-sec)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <span
          className="min-w-[180px] text-center text-[15px] font-medium tabular-nums"
          style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
        >
          {navLabel}
        </span>

        <button
          onClick={navNext}
          aria-label="Следующий период"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border transition-colors"
          style={{
            borderColor: 'var(--border)',
            background:  'var(--surface)',
            color:       'var(--text-sec)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--raised)'
            ;(e.currentTarget as HTMLButtonElement).style.color      = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
            ;(e.currentTarget as HTMLButtonElement).style.color      = 'var(--text-sec)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {!isOnToday && (
          <button
            onClick={navToday}
            className="text-[12px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Сегодня
          </button>
        )}
      </div>

      {/* ── Строка 2: режим слева, фильтр + добавить справа ── */}
      <div className="mb-7 flex items-center justify-between">
        {/* Переключатель вид */}
        <div
          className="flex overflow-hidden rounded-[10px] border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          role="group"
          aria-label="Режим просмотра"
        >
          {(['day', 'week', 'month'] as CalendarView[]).map((v, i) => {
            const label = v === 'day' ? 'День' : v === 'week' ? 'Неделя' : 'Месяц'
            const active = calView === v
            return (
              <button
                key={v}
                onClick={() => setCalView(v)}
                aria-pressed={active}
                className="px-[14px] py-[7px] text-[13.5px] transition-colors"
                style={{
                  borderLeft:  i > 0 ? `1px solid var(--border)` : 'none',
                  background:  active ? 'var(--raised)'    : 'transparent',
                  color:       active ? 'var(--text)'      : 'var(--text-muted)',
                  fontWeight:  active ? '500'              : '400',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-[6px]">
          {/* Фильтр проектов — иконка + дропдаун */}
          {calView !== 'month' && (
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                aria-label="Фильтр по проекту"
                aria-expanded={filterOpen}
                aria-haspopup="true"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border transition-colors"
                style={{
                  borderColor: filterOpen || projectFilter !== null
                    ? 'var(--text-muted)'
                    : 'var(--border)',
                  background: projectFilter !== null ? 'var(--raised)' : 'var(--surface)',
                  color:      projectFilter !== null ? 'var(--text)'   : 'var(--text-sec)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round"/>
                </svg>
              </button>

              {filterOpen && (
                <>
                  {/* Закрытие по клику вне */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFilterOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[150px] rounded-[10px] border p-2"
                    style={{
                      background:  'var(--surface)',
                      borderColor: 'var(--border)',
                      boxShadow:   '0 4px 16px oklch(15% 0.01 264 / .10), 0 0 0 1px oklch(15% 0.01 264 / .06)',
                    }}
                    role="menu"
                    aria-label="Проекты"
                  >
                    <span
                      className="block px-2 pb-[6px] pt-1 text-[10.5px] font-bold uppercase tracking-[.09em]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      Проект
                    </span>

                    {[{ id: null, name: 'Все' }, ...projects.filter((p) => p.status !== 'DONE')].map((p) => {
                      const active = projectFilter === p.id
                      return (
                        <button
                          key={p.id ?? 'all'}
                          onClick={() => { setProjectFilter(p.id); setFilterOpen(false) }}
                          role="menuitemradio"
                          aria-checked={active}
                          className="flex w-full items-center gap-2 rounded-md px-[10px] py-[7px] text-left text-[13.5px] transition-colors"
                          style={{
                            background: 'transparent',
                            color:      active ? 'var(--text)' : 'var(--text-sec)',
                            fontWeight: active ? '500'         : '400',
                          }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--raised)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                          }}
                        >
                          <span className="flex w-[14px] items-center justify-center" style={{ color: 'var(--accent)' }}>
                            {active && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.5"
                                      strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Кнопка добавления события — ghost */}
          <button
            onClick={() => setPanel({ mode: 'add', date: calView === 'day' ? dayISO : todayISO() })}
            className="inline-flex h-[34px] items-center gap-[5px] rounded-[10px] border px-[14px] text-[13.5px] transition-colors"
            style={{
              borderColor: 'var(--border)',
              background:  'var(--surface)',
              color:       'var(--text-sec)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background   = 'var(--raised)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor  = 'var(--text-muted)'
              ;(e.currentTarget as HTMLButtonElement).style.color        = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background   = 'var(--surface)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor  = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.color        = 'var(--text-sec)'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1V12M1 6.5H12" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round"/>
            </svg>
            Событие
          </button>
        </div>
      </div>

      {/* Индикатор активного фильтра */}
      {projectFilter !== null && activeProject && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Фильтр:
          </span>
          <span
            className="inline-flex items-center gap-[6px] rounded-full px-[10px] py-[2px] text-[12.5px]"
            style={{ background: 'var(--raised)', color: 'var(--text-sec)' }}
          >
            {activeProject.name}
            <button
              onClick={() => setProjectFilter(null)}
              aria-label="Сбросить фильтр"
              className="text-[11px] transition-colors"
              style={{ color: 'var(--text-ghost)' }}
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* ── Рендер вида ── */}

      {calView === 'month' && (
        <MonthView
          year={monthDate.getFullYear()}
          month={monthDate.getMonth()}
          events={events.filter((e) => projectFilter === null || e.projectId === projectFilter)}
          onDayClick={(iso) => { setDayISO(iso); setCalView('day') }}
          onEventClick={(ev) => setPanel({ mode: 'edit', event: ev })}
        />
      )}

      {calView === 'day' && (
        <DayView
          iso={dayISO}
          events={events.filter((e) => projectFilter === null || e.projectId === projectFilter)}
          people={people}
          onEventClick={(ev) => setPanel({ mode: 'edit', event: ev })}
          onAddClick={() => setPanel({ mode: 'add', date: dayISO })}
        />
      )}

      {calView === 'week' && (
        <>
          {days.map((iso) => {
            const dayEvents = sortedEvents(iso)
            const head = formatDayHeader(iso)
            return (
              <div key={iso} className="mb-7">
                {/* Заголовок дня */}
                <div className="mb-[10px] flex items-center gap-2">
                  {head.isToday && (
                    <span
                      className="rounded-full px-[8px] py-[1px] text-[10.5px] font-semibold uppercase tracking-[.06em]"
                      style={{ color: 'var(--info)', background: 'var(--info-bg)' }}
                    >
                      Сегодня
                    </span>
                  )}
                  <button
                    onClick={() => { setDayISO(iso); setCalView('day') }}
                    className="text-[12px] font-[500] transition-colors hover:underline"
                    style={{ color: head.isToday ? 'var(--text-sec)' : 'var(--text-muted)' }}
                  >
                    {head.label}
                  </button>
                </div>

                {dayEvents.length === 0 ? (
                  <p
                    className="border-t pt-3 text-sm italic"
                    style={{ borderColor: 'var(--border-soft)', color: 'var(--text-ghost)' }}
                  >
                    — свободный день —
                  </p>
                ) : (
                  <div style={{ borderTop: '1px solid var(--border-soft)' }}>
                    {dayEvents.map((ev) => (
                      <EventRow
                        key={ev.id}
                        event={ev}
                        agendaCount={ev.personId ? agendaOpenCount(ev.personId) : 0}
                        agendaItems={
                          ev.personId
                            ? (people.find((p) => p.id === ev.personId)?.agendaItems ?? [])
                            : []
                        }
                        expanded={expandedId === ev.id}
                        onToggleAgenda={() =>
                          setExpandedId((cur) => (cur === ev.id ? null : ev.id))
                        }
                        onEdit={() => setPanel({ mode: 'edit', event: ev })}
                        onOpenPerson={() => ev.personId && setOpenPersonId(ev.personId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Боковая панель */}
      {panel && (
        <EventPanel
          state={panel}
          people={people}
          projects={projects}
          onClose={() => setPanel(null)}
        />
      )}

      {/* Слайд-овер человека */}
      {openPerson && (
        <PersonPanel
          person={openPerson}
          events={events.filter((e) => e.personId === openPerson.id && e.date >= todayISO())}
          onClose={() => setOpenPersonId(null)}
        />
      )}
    </section>
  )
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({
  event,
  agendaCount,
  agendaItems,
  expanded,
  onToggleAgenda,
  onEdit,
  onOpenPerson,
}: {
  event: EventWithRelations
  agendaCount: number
  agendaItems: PersonWithAgenda['agendaItems']
  expanded: boolean
  onToggleAgenda: () => void
  onEdit: () => void
  onOpenPerson: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [newQ, setNewQ] = useState('')

  return (
    <div className="group" style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <div className="flex items-start gap-[14px] py-[9px]">
        {/* Время — muted */}
        <span
          className="w-[96px] shrink-0 pt-[2px] text-right text-[13px] tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {formatTimeRange(event.startTime, event.endTime)}
        </span>

        {/* Цветной рейл */}
        <span
          className="mt-[2px] w-[3px] shrink-0 self-stretch rounded"
          style={{ background: KIND[event.kind].rail, minHeight: '18px' }}
        />

        <div className="min-w-0 flex-1">
          {/* Название события */}
          <div className="text-[15px]" style={{ color: 'var(--text)', lineHeight: '1.35' }}>
            {event.title}
            {event.person && (
              <>
                {' · '}
                <button
                  onClick={onOpenPerson}
                  className="underline underline-offset-2"
                  style={{
                    color:           'var(--text-muted)',
                    textDecorationColor: 'var(--border)',
                  }}
                >
                  {event.person.name}
                </button>
              </>
            )}
          </div>

          {/* Мета: проект как пилюля */}
          {(event.project || event.kind === 'INFO') && (
            <div className="mt-[3px] flex flex-wrap items-center gap-[5px]">
              {event.project && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-[8px] py-[1px] text-[11.5px]"
                  style={{ background: 'var(--pill-bg)', color: 'var(--pill-text)' }}
                >
                  <span
                    className="h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{ background: 'var(--text-ghost)' }}
                    aria-hidden="true"
                  />
                  {event.project.name}
                </span>
              )}
              {event.kind === 'INFO' && (
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  действий не требует
                </span>
              )}
            </div>
          )}

          {/* Кнопка повестки */}
          {event.personId && (
            <button
              onClick={onToggleAgenda}
              className="mt-2 inline-flex items-center gap-[6px] rounded-full px-[10px] py-[3px] text-[11px] transition-colors"
              style={{ background: 'var(--info-bg)', color: 'var(--info)' }}
            >
              <span
                className="inline-block transition-transform duration-150"
                style={{ transform: expanded ? 'none' : 'rotate(-90deg)' }}
                aria-hidden="true"
              >
                ▾
              </span>
              @agenda: {event.person?.name} · {agendaCount}{' '}
              {agendaCount === 1 ? 'вопрос' : agendaCount < 5 ? 'вопроса' : 'вопросов'}
            </button>
          )}
        </div>

        {/* Редактировать — появляется при наведении */}
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-md border px-2 py-[2px] text-[11px] transition-colors"
            style={{
              borderColor: 'var(--border)',
              color:       'var(--text-muted)',
            }}
          >
            Изменить
          </button>
        </div>
      </div>

      {/* Встроенная повестка */}
      {expanded && event.personId && (
        <div
          className="mb-2 ml-[6.375rem] border-l-2 py-1 pl-3"
          style={{ borderColor: 'var(--info-bg)' }}
        >
          <ul className="space-y-1">
            {agendaItems.filter((a) => !a.done).length === 0 && (
              <li className="text-[13px]" style={{ color: 'var(--text-ghost)' }}>
                пока нет вопросов
              </li>
            )}
            {agendaItems
              .filter((a) => !a.done)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-[13px]"
                    style={{ color: 'var(--text-sec)' }}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => startTransition(() => toggleAgendaItem(item.id, true))}
                    className="h-3.5 w-3.5"
                    style={{ accentColor: 'var(--accent)' }}
                    disabled={isPending}
                  />
                  {item.text}
                </li>
              ))}
          </ul>
          <input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newQ.trim() && event.personId) {
                const text = newQ.trim()
                setNewQ('')
                startTransition(() => addAgendaItem(event.personId!, text))
              }
            }}
            placeholder={`+ добавить вопрос к ${event.person?.name}`}
            className="mt-2 w-full rounded-md border px-2 py-1 text-xs outline-none"
            style={{
              borderColor: 'var(--border)',
              background:  'var(--surface)',
              color:       'var(--text)',
            }}
          />
          <button
            onClick={onOpenPerson}
            className="mt-[6px] text-[11px] underline"
            style={{ color: 'var(--text-muted)' }}
          >
            открыть карточку {event.person?.name} →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── EventPanel ───────────────────────────────────────────────────────────────

function EventPanel({
  state,
  people,
  projects,
  onClose,
}: {
  state: Exclude<PanelState, null>
  people: PersonWithAgenda[]
  projects: Project[]
  onClose: () => void
}) {
  const ev = state.mode === 'edit' ? state.event : null

  const evDate = ev?.date
    ? (ev.date as any) instanceof Date
      ? (ev.date as any as Date).toISOString().slice(0, 10)
      : String(ev.date).slice(0, 10)
    : null

  const [title,         setTitle]         = useState(ev?.title ?? '')
  const [kind,          setKind]          = useState<EventKind>(ev?.kind ?? 'MEETING')
  const [date,          setDate]          = useState(evDate ?? (state.mode === 'add' ? state.date : todayISO()))
  const [start,         setStart]         = useState(ev?.startTime ?? '')
  const [end,           setEnd]           = useState(ev?.endTime ?? '')
  const [personId,      setPersonId]      = useState<number | null>(ev?.personId ?? null)
  const [projectId,     setProjectId]     = useState<number | null>(ev?.projectId ?? null)
  const [taskText,      setTaskText]      = useState('')
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [isPending,     startTransition]  = useTransition()
  const [recurring,     setRecurring]     = useState(!!ev?.recurrence)
  const [recurrence,    setRecurrence]    = useState(ev?.recurrence ?? 'WEEKLY')
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    ev?.recurrenceEnd instanceof Date
      ? ev.recurrenceEnd.toISOString().slice(0, 10)
      : ev?.recurrenceEnd
        ? String(ev.recurrenceEnd).slice(0, 10)
        : '',
  )

  function save() {
    if (!title.trim()) return
    const fields = {
      title:         title.trim(),
      kind,
      date,
      startTime:     start || null,
      endTime:       end   || null,
      personId,
      projectId,
      recurrence:    recurring ? recurrence : null,
      recurrenceEnd: recurring && recurrenceEnd ? recurrenceEnd : null,
    }
    startTransition(async () => {
      if (state.mode === 'add') {
        await addEvent(fields)
      } else {
        const realId = state.event._templateId ?? state.event.id
        await updateEvent(realId, fields)
      }
      onClose()
    })
  }

  function remove() {
    if (!confirmDel) { setConfirmDel(true); return }
    startTransition(async () => {
      const realId = (state as { mode: 'edit'; event: EventWithRelations }).event._templateId
        ?? (state as { mode: 'edit'; event: EventWithRelations }).event.id
      await deleteEvent(realId)
      onClose()
    })
  }

  function spawnTask() {
    if (!taskText.trim()) return
    startTransition(async () => {
      await addTodo({ text: taskText.trim(), personId, projectId })
      setTaskText('')
    })
  }

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
  const inputStyle = {
    borderColor: 'var(--border)',
    background:  'var(--surface)',
    color:       'var(--text)',
  }

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/20" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 z-30 flex h-full w-[22rem] max-w-[90vw] flex-col gap-4 overflow-y-auto p-6 shadow-xl"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text)' }}>
            {state.mode === 'add' ? 'Новое событие' : 'Редактировать'}
          </h2>
          <button
            onClick={onClose}
            className="text-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <Field label="Название">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Название события"
            className={inputCls}
            style={inputStyle}
          />
        </Field>

        <Field label="Тип">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind)}
            className={inputCls}
            style={inputStyle}
          >
            {(Object.keys(KIND) as EventKind[]).map((k) => (
              <option key={k} value={k}>{KIND[k].label}</option>
            ))}
          </select>
        </Field>

        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>

        <div className="flex gap-2">
          <Field label="Начало" className="flex-1">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
                   className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Конец" className="flex-1">
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
                   className={inputCls} style={inputStyle} />
          </Field>
        </div>

        <Field label="С кем">
          <select value={personId ?? ''} onChange={(e) => setPersonId(e.target.value ? Number(e.target.value) : null)}
                  className={inputCls} style={inputStyle}>
            <option value="">— не указан —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <Field label="Проект">
          <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
                  className={inputCls} style={inputStyle}>
            <option value="">— не указан —</option>
            {projects.filter((p) => p.status !== 'DONE').map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>

        {/* Повторение */}
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <label className="flex cursor-pointer items-center gap-[10px]">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Повторять
            </span>
          </label>

          {recurring && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <span
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Частота
                </span>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                        className={inputCls} style={inputStyle}>
                  {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <span
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  До
                </span>
                <input type="date" value={recurrenceEnd} min={date}
                       onChange={(e) => setRecurrenceEnd(e.target.value)}
                       className={inputCls} style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        {/* Кнопки сохранения */}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={isPending || !title.trim()}
            className="flex-1 rounded-lg py-2 text-sm transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {isPending ? '...' : state.mode === 'add' ? 'Добавить' : 'Сохранить'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Отмена
          </button>
        </div>

        {/* Удаление */}
        {state.mode === 'edit' && (
          <button
            onClick={remove}
            disabled={isPending}
            className="rounded-lg border py-2 text-sm transition-colors"
            style={{
              borderColor: confirmDel ? 'var(--danger)'    : 'var(--border)',
              background:  confirmDel ? 'var(--danger-bg)' : 'transparent',
              color:       confirmDel ? 'var(--danger)'    : 'var(--text-muted)',
            }}
          >
            {confirmDel ? 'Подтвердить удаление' : 'Удалить событие'}
          </button>
        )}

        {/* Создать задачу из встречи */}
        {kind === 'MEETING' && (
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <span
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--success)' }}
            >
              ↳ Создать задачу из встречи
            </span>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Задача наследует участника и проект из этого события.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && spawnTask()}
                placeholder="Следующее действие…"
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ ...inputStyle, borderColor: 'var(--border)' }}
              />
              <button
                onClick={spawnTask}
                disabled={isPending || !taskText.trim()}
                className="rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
              >
                +
              </button>
            </div>
          </div>
        )}

        <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
          Оставь время пустым — событие встанет как «весь день».
        </p>
      </aside>
    </>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-ghost)' }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
  onDayClick,
  onEventClick,
}: {
  year: number
  month: number
  events: EventWithRelations[]
  onDayClick: (iso: string) => void
  onEventClick: (ev: EventWithRelations) => void
}) {
  const today = todayISO()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return d.toISOString().slice(0, 10)
    }),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function eventsForDay(iso: string) {
    return events.filter((e) => {
      const d = (e.date as any) instanceof Date
        ? (e.date as any as Date).toISOString().slice(0, 10)
        : String(e.date).slice(0, 10)
      return d === iso
    })
  }

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-ghost)' }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((iso, i) => {
          if (!iso) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-[96px] border-b border-r last:border-r-0"
                style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
              />
            )
          }

          const dayEvents = eventsForDay(iso)
          const isToday = iso === today
          const dayNum = parseInt(iso.slice(8), 10)
          const isSat = new Date(iso).getDay() === 6
          const isSun = new Date(iso).getDay() === 0

          return (
            <div
              key={iso}
              onClick={() => onDayClick(iso)}
              className="group relative min-h-[96px] cursor-pointer border-b border-r p-[6px] transition-colors last:border-r-0"
              style={{
                borderColor: 'var(--border-soft)',
                background: isSat || isSun ? 'var(--surface)' : 'transparent',
              }}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium"
                  style={{
                    background: isToday ? 'var(--accent)'     : 'transparent',
                    color:      isToday ? 'var(--accent-fg)'  :
                                isSat || isSun ? 'var(--text-muted)' : 'var(--text-sec)',
                  }}
                >
                  {dayNum}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                    className="w-full truncate rounded px-[6px] py-[2px] text-left text-[11px] font-medium text-white transition-opacity hover:opacity-80"
                    style={{ background: KIND[ev.kind].rail }}
                  >
                    {ev.startTime ? `${ev.startTime.slice(0, 5)} ${ev.title}` : ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    +{dayEvents.length - 3} ещё
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  iso,
  events,
  people,
  onEventClick,
  onAddClick,
}: {
  iso: string
  events: EventWithRelations[]
  people: PersonWithAgenda[]
  onEventClick: (ev: EventWithRelations) => void
  onAddClick: () => void
}) {
  const today = todayISO()
  const isToday = iso === today

  const dateLabel = (() => {
    const d = new Date(iso)
    const WEEKDAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
    const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  })()

  const dayEvents = events
    .filter((e) => {
      const d = (e.date as any) instanceof Date
        ? (e.date as any as Date).toISOString().slice(0, 10)
        : String(e.date).slice(0, 10)
      return d === iso
    })
    .sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
      if (a.startTime) return -1
      if (b.startTime) return 1
      return 0
    })

  const allDayEvents = dayEvents.filter((e) => !e.startTime)
  const timedEvents  = dayEvents.filter((e) => !!e.startTime)

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentTopPct  = (currentMinutes / (24 * 60)) * 100

  function eventStyle(ev: EventWithRelations): React.CSSProperties {
    if (!ev.startTime) return {}
    const [sh, sm] = ev.startTime.split(':').map(Number)
    const startMin = sh * 60 + sm
    let durationMin = 60
    if (ev.endTime) {
      const [eh, em] = ev.endTime.split(':').map(Number)
      durationMin = Math.max(30, eh * 60 + em - startMin)
    }
    return {
      top:       `${(startMin / (24 * 60)) * 100}%`,
      height:    `${(durationMin / (24 * 60)) * 100}%`,
      minHeight: '1.75rem',
    }
  }

  const HOUR_HEIGHT_REM = 4

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: isToday ? 'var(--text)' : 'var(--text-sec)' }}>
          {dateLabel}
          {isToday && (
            <span
              className="ml-2 rounded-full px-2 py-[2px] text-[11px] font-medium"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Сегодня
            </span>
          )}
        </h2>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-[5px] rounded-[10px] border px-[14px] py-[7px] text-[13.5px] transition-colors"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-sec)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M6.5 1V12M1 6.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Событие
        </button>
      </div>

      {allDayEvents.length > 0 && (
        <div
          className="mb-3 rounded-lg border p-2"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div
            className="mb-[6px] text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-ghost)' }}
          >
            Весь день
          </div>
          <div className="space-y-1">
            {allDayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors"
                style={{ color: 'var(--text)' }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: KIND[ev.kind].rail }}
                  aria-hidden="true"
                />
                {ev.title}
                {ev.person && (
                  <span style={{ color: 'var(--text-muted)' }}>· {ev.person.name}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <div className="relative" style={{ height: `${24 * HOUR_HEIGHT_REM}rem` }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex"
              style={{ top: `${(h / 24) * 100}%`, height: `${(1 / 24) * 100}%` }}
            >
              <div
                className="w-12 shrink-0 border-r pr-2 text-right"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <span
                  className="relative -top-2 text-[11px] tabular-nums"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </span>
              </div>
              <div className="flex-1 border-b" style={{ borderColor: 'var(--border-soft)' }} />
            </div>
          ))}

          {isToday && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
              style={{ top: `${currentTopPct}%` }}
            >
              <div className="w-12 shrink-0 pr-[6px] text-right">
                <span className="relative -top-2 text-[10px] font-semibold tabular-nums text-red-500">
                  {String(now.getHours()).padStart(2, '0')}:
                  {String(now.getMinutes()).padStart(2, '0')}
                </span>
              </div>
              <div className="h-0.5 flex-1 bg-red-400" />
            </div>
          )}

          <div className="absolute inset-0 left-12 pr-2">
            {timedEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="absolute left-1 right-0 overflow-hidden rounded-md px-2 py-1 text-left text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
                style={{ ...eventStyle(ev), background: KIND[ev.kind].rail }}
              >
                <div className="truncate text-[12px] font-semibold leading-tight">{ev.title}</div>
                {ev.endTime && (
                  <div className="truncate text-[11px] opacity-80">
                    {ev.startTime?.slice(0, 5)}–{ev.endTime.slice(0, 5)}
                    {ev.person ? ` · ${ev.person.name}` : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dayEvents.length === 0 && (
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-ghost)' }}>
          — событий нет —
        </div>
      )}
    </div>
  )
}