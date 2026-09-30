// src/app/Habits.tsx
'use client'

import { useState, useTransition } from 'react'
import type { HabitFrequency } from '@prisma/client'
import type { HabitWithEntries } from './lib/habits'
import {
  weekMonday,
  weekDays,
  weekProgress,
  isExpected,
  isDone,
  frequencyLabel,
  toISO,
  shiftDate,
} from './lib/habits'
import {
  addHabit,
  updateHabit,
  deleteHabit,
  pauseHabit,
  toggleHabitEntry,
} from './actions'

type Filter = 'all' | 'active' | 'done_today' | 'paused'
type ViewMode = 'week' | 'month'

const FILTER_LABELS: Record<Filter, string> = {
  all:        'Все',
  active:     'Активные',
  done_today: 'Выполненные сегодня',
  paused:     'Приостановленные',
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const PRESET_COLORS = [
  'oklch(60% 0.14 240)',  // синий
  'oklch(58% 0.14 148)',  // зелёный
  'oklch(66% 0.13 68)',   // жёлтый
  'oklch(58% 0.13 300)',  // фиолетовый
  'oklch(62% 0.15 25)',   // красный
  'oklch(62% 0.13 185)',  // голубой
]

export default function Habits({ habits }: { habits: HabitWithEntries[] }) {
  const today      = toISO(new Date())
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [viewMode,    setViewMode]    = useState<ViewMode>('week')
  const [filter,      setFilter]      = useState<Filter>('active')
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [panelHabit,  setPanelHabit]  = useState<HabitWithEntries | 'new' | null>(null)

  // Понедельник текущей отображаемой недели
  const baseMonday = weekMonday(today)
  const monday = (() => {
    const d = new Date(baseMonday)
    d.setDate(d.getDate() + weekOffset * 7)
    return toISO(d)
  })()
  const days = weekDays(monday)

  const periodLabel = (() => {
    const MO = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
    const s = new Date(monday)
    const e = new Date(days[6])
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()}–${e.getDate()} ${MO[s.getMonth()]}`
    return `${s.getDate()} ${MO[s.getMonth()]} – ${e.getDate()} ${MO[e.getMonth()]}`
  })()

  // Фильтрация привычек
  const visible = habits.filter((h) => {
    if (filter === 'paused')     return !!h.pausedAt
    if (filter === 'done_today') return isDone(h, today)
    if (filter === 'active')     return !h.pausedAt
    return true
  })

  const activeFilterLabel = filter !== 'all' ? FILTER_LABELS[filter] : null

  return (
    <section>
      {/* Строка 1: период */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Предыдущая неделя"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border transition-colors"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-sec)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <span
          className="min-w-[160px] text-center text-[15px] font-medium tabular-nums"
          style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
        >
          {periodLabel}
        </span>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Следующая неделя"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border transition-colors"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-sec)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-[12px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Сегодня
          </button>
        )}
      </div>

      {/* Строка 2: режим + фильтр + добавить */}
      <div className="flex items-center justify-between mb-7">
        {/* Переключатель неделя/месяц */}
        <div
          className="flex overflow-hidden rounded-[10px] border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          role="group"
          aria-label="Режим просмотра"
        >
          {(['week', 'month'] as ViewMode[]).map((v, i) => {
            const active = viewMode === v
            return (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                aria-pressed={active}
                className="px-[14px] py-[7px] text-[13.5px] transition-colors"
                style={{
                  borderLeft:  i > 0 ? '1px solid var(--border)' : 'none',
                  background:  active ? 'var(--raised)'   : 'transparent',
                  color:       active ? 'var(--text)'     : 'var(--text-muted)',
                  fontWeight:  active ? '500'             : '400',
                }}
              >
                {v === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-[6px]">
          {/* Фильтр */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              aria-label="Фильтр привычек"
              aria-expanded={filterOpen}
              aria-haspopup="true"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border transition-colors"
              style={{
                borderColor: filter !== 'all' ? 'var(--text-muted)' : 'var(--border)',
                background:  filter !== 'all' ? 'var(--raised)'     : 'var(--surface)',
                color:       filter !== 'all' ? 'var(--text)'       : 'var(--text-sec)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {filterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                <div
                  className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[190px] rounded-[10px] border p-2"
                  style={{
                    background:  'var(--surface)',
                    borderColor: 'var(--border)',
                    boxShadow:   '0 4px 16px oklch(15% 0.01 264 / .10)',
                  }}
                  role="menu"
                >
                  <span
                    className="block px-2 pb-[6px] pt-1 text-[10.5px] font-bold uppercase tracking-[.09em]"
                    style={{ color: 'var(--text-ghost)' }}
                  >
                    Показать
                  </span>
                  {(Object.entries(FILTER_LABELS) as [Filter, string][]).map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); setFilterOpen(false) }}
                      role="menuitemradio"
                      aria-checked={filter === f}
                      className="flex w-full items-center gap-2 rounded-[6px] px-[10px] py-[7px] text-left text-[13.5px] transition-colors"
                      style={{
                        color:      filter === f ? 'var(--text)' : 'var(--text-sec)',
                        fontWeight: filter === f ? '500'         : '400',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--raised)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <span className="flex w-[14px] items-center justify-center" style={{ color: 'var(--accent)' }}>
                        {filter === f && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Добавить привычку */}
          <button
            onClick={() => setPanelHabit('new')}
            className="inline-flex h-[34px] items-center gap-[5px] rounded-[10px] border px-[14px] text-[13.5px] transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-sec)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background   = 'var(--raised)'
              ;(e.currentTarget as HTMLElement).style.borderColor  = 'var(--text-muted)'
              ;(e.currentTarget as HTMLElement).style.color        = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background   = 'var(--surface)'
              ;(e.currentTarget as HTMLElement).style.borderColor  = 'var(--border)'
              ;(e.currentTarget as HTMLElement).style.color        = 'var(--text-sec)'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1V12M1 6.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Привычка
          </button>
        </div>
      </div>

      {/* Активный фильтр */}
      {activeFilterLabel && (
        <div className="mb-5 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-[6px] rounded-full px-[10px] py-[2px] text-[12px]"
            style={{ background: 'var(--raised)', color: 'var(--text-sec)' }}
          >
            {activeFilterLabel}
            <button
              onClick={() => setFilter('all')}
              aria-label="Сбросить фильтр"
              style={{ color: 'var(--text-ghost)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {viewMode === 'week' ? (
        <>
          {/* Заголовки дней */}
          <div
            className="mb-[7px] grid text-center text-[10px] font-semibold"
            style={{
              gridTemplateColumns: '1fr repeat(7, 28px)',
              gap: '0 6px',
              color: 'var(--text-ghost)',
            }}
            aria-hidden="true"
          >
            <span />
            {WEEKDAY_LABELS.map((d) => <span key={d}>{d}</span>)}
          </div>

          {/* Список привычек */}
          <div style={{ borderTop: '1px solid var(--border-soft)' }}>
            {visible.length === 0 ? (
              <div className="py-14 text-center text-sm" style={{ color: 'var(--text-ghost)' }}>
                Нет привычек
                <br />
                <button
                  onClick={() => setPanelHabit('new')}
                  className="mt-3 text-[13px] underline underline-offset-[3px]"
                  style={{ color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Добавить первую привычку
                </button>
              </div>
            ) : (
              visible.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  days={days}
                  today={today}
                  monday={monday}
                  onEdit={() => setPanelHabit(habit)}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <MonthGrid habits={visible} today={today} onEdit={setPanelHabit} />
      )}

      {/* Панель создания / редактирования */}
      {panelHabit !== null && (
        <HabitPanel
          habit={panelHabit === 'new' ? null : panelHabit}
          today={today}
          presetColors={PRESET_COLORS}
          onClose={() => setPanelHabit(null)}
        />
      )}
    </section>
  )
}

// ─── HabitRow ─────────────────────────────────────────────────────────────────

function HabitRow({
  habit,
  days,
  today,
  monday,
  onEdit,
}: {
  habit: HabitWithEntries
  days: string[]
  today: string
  monday: string
  onEdit: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { done, expected } = weekProgress(habit, monday)

  return (
    <article
      className="group"
      style={{
        borderBottom: '1px solid var(--border-soft)',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <div
        className="grid items-center py-[14px]"
        style={{ gridTemplateColumns: '1fr repeat(7, 28px)', gap: '0 6px' }}
      >
        {/* Название + прогресс */}
        <div className="min-w-0 pr-3">
          <button
            onClick={onEdit}
            className="flex min-w-0 items-center gap-2 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: habit.color }}
              aria-hidden="true"
            />
            <span
              className="overflow-hidden text-[15px] font-medium"
              style={{ color: habit.pausedAt ? 'var(--text-muted)' : 'var(--text)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {habit.name}
            </span>
          </button>
          <div className="mt-[2px] flex items-center gap-3 pl-[15px]">
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {frequencyLabel(habit)}
            </span>
            {habit.pausedAt && (
              <span
                className="text-[11px] rounded-full px-[7px] py-[1px]"
                style={{ background: 'var(--raised)', color: 'var(--text-ghost)' }}
              >
                пауза
              </span>
            )}
            <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-ghost)' }}>
              {done} / {expected}
            </span>
          </div>
        </div>

        {/* Кружки дней */}
        {days.map((day) => {
          const expected = isExpected(habit, day)
          const done     = isDone(habit, day)
          const isToday  = day === today
          const isFuture = day > today

          if (!expected) {
            // День не ожидается — тихая точка
            return (
              <span
                key={day}
                className="flex h-[28px] w-[28px] items-center justify-center"
                aria-hidden="true"
              >
                <span
                  className="h-[4px] w-[4px] rounded-full"
                  style={{ background: 'var(--border-soft)' }}
                />
              </span>
            )
          }

          return (
            <button
              key={day}
              onClick={() => !isFuture && startTransition(() => toggleHabitEntry(habit.id, day))}
              disabled={isFuture}
              aria-label={`${habit.name}, ${day}${done ? ', выполнено' : ''}`}
              className="relative flex h-[28px] w-[28px] items-center justify-center rounded-full transition-transform duration-[130ms]"
              style={{
                background: 'none',
                border:     'none',
                cursor:     isFuture ? 'default' : 'pointer',
                transform:  'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (!isFuture) (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              }}
            >
              {/* Круг */}
              <span
                className="flex h-[20px] w-[20px] items-center justify-center rounded-full transition-all duration-[130ms]"
                style={{
                  background: done
                    ? habit.color
                    : 'transparent',
                  border: done
                    ? 'none'
                    : isToday
                    ? `1.5px solid ${habit.color}`
                    : isFuture
                    ? 'none'
                    : '1.5px solid var(--border)',
                }}
              >
                {/* Точка для сегодня без выполнения */}
                {isToday && !done && (
                  <span
                    className="h-[4px] w-[4px] rounded-full"
                    style={{ background: habit.color }}
                  />
                )}
                {/* Галочка для будущих (пустых) */}
                {isFuture && (
                  <span
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ background: 'var(--border-soft)' }}
                  />
                )}
                {/* Галочка для выполненных */}
                {done && (
                  <svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true">
                    <path d="M1 3.5L3.8 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </article>
  )
}

// ─── MonthGrid ────────────────────────────────────────────────────────────────

function MonthGrid({
  habits,
  today,
  onEdit,
}: {
  habits: HabitWithEntries[]
  today: string
  onEdit: (h: HabitWithEntries) => void
}) {
  const [isPending, startTransition] = useTransition()

  // Последние 4 недели: 28 дней назад → сегодня
  const days: string[] = []
  for (let i = 27; i >= 0; i--) {
    days.push(shiftDate(today, -i))
  }

  // Метки недель
  const weekStarts = [0, 7, 14, 21].map((i) => days[i])

  if (habits.length === 0) {
    return (
      <div className="py-14 text-center text-sm" style={{ color: 'var(--text-ghost)' }}>
        Нет привычек
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 480 }}>
        {/* Шапка с датами */}
        <div
          className="mb-[6px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `140px repeat(28, 16px)`,
            gap: '0 3px',
            alignItems: 'center',
          }}
        >
          <span />
          {days.map((d) => {
            const isStart = weekStarts.includes(d)
            const isToday = d === today
            return (
              <span
                key={d}
                className="text-center text-[9px] tabular-nums"
                style={{
                  color: isToday ? 'var(--text-sec)' : isStart ? 'var(--text-muted)' : 'transparent',
                  fontWeight: isToday ? '600' : '400',
                }}
              >
                {d.slice(8)}
              </span>
            )
          })}
        </div>

        {/* Строки привычек */}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="group"
            style={{
              display: 'grid',
              gridTemplateColumns: `140px repeat(28, 16px)`,
              gap: '0 3px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-soft)',
              padding: '8px 0',
            }}
          >
            <button
              onClick={() => onEdit(habit)}
              className="flex min-w-0 items-center gap-2 pr-3 text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 12px 0 0' }}
            >
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{ background: habit.color }}
                aria-hidden="true"
              />
              <span
                className="overflow-hidden text-[13px] font-medium"
                style={{ color: 'var(--text-sec)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {habit.name}
              </span>
            </button>

            {days.map((day) => {
              const expected = isExpected(habit, day)
              const done     = isDone(habit, day)
              const isToday  = day === today

              if (!expected) {
                return <span key={day} className="flex h-[16px] w-[16px] items-center justify-center">
                  <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--border-soft)' }}/>
                </span>
              }

              return (
                <button
                  key={day}
                  onClick={() => startTransition(() => toggleHabitEntry(habit.id, day))}
                  aria-label={`${habit.name}, ${day}${done ? ', выполнено' : ''}`}
                  className="flex h-[16px] w-[16px] items-center justify-center rounded-[3px] transition-opacity"
                  style={{
                    background:  done ? habit.color : 'transparent',
                    border:      done ? 'none'
                                 : isToday ? `1.5px solid ${habit.color}`
                                 : '1.5px solid var(--border)',
                    cursor:      'pointer',
                    opacity:     isPending ? 0.5 : 1,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HabitPanel ───────────────────────────────────────────────────────────────

function HabitPanel({
  habit,
  today,
  presetColors,
  onClose,
}: {
  habit: HabitWithEntries | null
  today: string
  presetColors: string[]
  onClose: () => void
}) {
  const [name,        setName]        = useState(habit?.name ?? '')
  const [color,       setColor]       = useState(habit?.color ?? presetColors[0])
  const [frequency,   setFrequency]   = useState<HabitFrequency>(habit?.frequency ?? 'DAILY')
  const [targetCount, setTargetCount] = useState(habit?.targetCount ?? 3)
  const [weekdays,    setWeekdays]    = useState<number[]>(
    habit?.weekdays ? JSON.parse(habit.weekdays) : [1, 2, 3, 4, 5]
  )
  const [startDate,   setStartDate]   = useState(habit?.startDate ?? today)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [isPending,   startTransition] = useTransition()

  function toggleWeekday(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )
  }

  function save() {
    if (!name.trim()) return
    const fields = {
      name,
      color,
      frequency,
      weekdays:    frequency === 'WEEKDAYS' ? weekdays : null,
      targetCount: frequency === 'WEEKLY_COUNT' ? targetCount : 1,
      startDate,
    }
    startTransition(async () => {
      if (habit) {
        await updateHabit(habit.id, fields)
      } else {
        await addHabit(fields)
      }
      onClose()
    })
  }

  function remove() {
    if (!confirmDel) { setConfirmDel(true); return }
    if (!habit) return
    startTransition(async () => {
      await deleteHabit(habit.id)
      onClose()
    })
  }

  function togglePause() {
    if (!habit) return
    startTransition(async () => {
      await pauseHabit(habit.id, !habit.pausedAt)
      onClose()
    })
  }

  const inputCls = "w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors"
  const inputStyle = {
    borderColor: 'var(--border)',
    background:  'var(--surface)',
    color:       'var(--text)',
  }

  const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const WEEKDAY_NUMS  = [1, 2, 3, 4, 5, 6, 7]

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/20" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 z-30 flex h-full w-[22rem] max-w-[90vw] flex-col gap-4 overflow-y-auto p-6 shadow-xl"
        style={{ background: 'var(--bg)' }}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text)' }}>
            {habit ? 'Редактировать' : 'Новая привычка'}
          </h2>
          <button
            onClick={onClose}
            className="text-lg transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Название */}
        <PanelField label="Название">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Например: Чтение 20 минут"
            className={inputCls}
            style={inputStyle}
          />
        </PanelField>

        {/* Цвет */}
        <PanelField label="Цвет маркера">
          <div className="flex gap-2">
            {presetColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Цвет ${c}`}
                className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full transition-transform duration-[120ms]"
                style={{
                  background: c,
                  border:     'none',
                  cursor:     'pointer',
                  transform:  color === c ? 'scale(1.18)' : 'scale(1)',
                }}
              >
                {color === c && (
                  <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden="true">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </PanelField>

        {/* Частота */}
        <PanelField label="Частота">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
            className={inputCls}
            style={inputStyle}
          >
            <option value="DAILY">Каждый день</option>
            <option value="WEEKLY_COUNT">N раз в неделю</option>
            <option value="WEEKDAYS">Выбранные дни</option>
          </select>
        </PanelField>

        {/* N раз в неделю */}
        {frequency === 'WEEKLY_COUNT' && (
          <PanelField label="Количество раз">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTargetCount((n) => Math.max(1, n - 1))}
                className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] border text-lg transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-sec)', cursor: 'pointer' }}
              >
                −
              </button>
              <span className="text-[15px] font-medium tabular-nums" style={{ color: 'var(--text)', minWidth: 24, textAlign: 'center' }}>
                {targetCount}
              </span>
              <button
                onClick={() => setTargetCount((n) => Math.min(7, n + 1))}
                className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] border text-lg transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-sec)', cursor: 'pointer' }}
              >
                +
              </button>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>раз в неделю</span>
            </div>
          </PanelField>
        )}

        {/* Выбранные дни */}
        {frequency === 'WEEKDAYS' && (
          <PanelField label="Дни недели">
            <div className="flex gap-[6px]">
              {WEEKDAY_NUMS.map((d, i) => {
                const active = weekdays.includes(d)
                return (
                  <button
                    key={d}
                    onClick={() => toggleWeekday(d)}
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[12px] font-medium transition-colors"
                    style={{
                      background:  active ? 'var(--accent)'     : 'var(--raised)',
                      color:       active ? 'var(--accent-fg)'  : 'var(--text-muted)',
                      border:      'none',
                      cursor:      'pointer',
                    }}
                  >
                    {WEEKDAY_NAMES[i]}
                  </button>
                )
              })}
            </div>
          </PanelField>
        )}

        {/* Дата старта */}
        <PanelField label="Начать с">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </PanelField>

        {/* Сохранить / Отмена */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={isPending || !name.trim()}
            className="flex-1 rounded-[8px] py-2 text-sm transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}
          >
            {isPending ? '...' : habit ? 'Сохранить' : 'Добавить'}
          </button>
          <button
            onClick={onClose}
            className="rounded-[8px] border px-4 py-2 text-sm transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'none', cursor: 'pointer' }}
          >
            Отмена
          </button>
        </div>

        {/* Действия для существующей привычки */}
        {habit && (
          <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={togglePause}
              disabled={isPending}
              className="rounded-[8px] border py-2 text-sm transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'none', cursor: 'pointer' }}
            >
              {habit.pausedAt ? 'Возобновить привычку' : 'Приостановить привычку'}
            </button>
            <button
              onClick={remove}
              disabled={isPending}
              className="rounded-[8px] border py-2 text-sm transition-colors"
              style={{
                borderColor: confirmDel ? 'var(--danger)'    : 'var(--border)',
                background:  confirmDel ? 'var(--danger-bg)' : 'none',
                color:       confirmDel ? 'var(--danger)'    : 'var(--text-muted)',
                cursor:      'pointer',
              }}
            >
              {confirmDel ? 'Подтвердить удаление' : 'Удалить привычку'}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
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