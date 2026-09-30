// src/app/MorningReview.tsx
'use client'

import type { Person, Context, Project, Status } from '@prisma/client'
import type { TodoWithRelations, EventWithRelations } from './Workspace'
import { daysSince, ageLevel, AGE_BADGE_CLASS, isOverdue } from './lib/status'
import { setStatus, assignTodo } from './actions'
import { useTransition } from 'react'

const RAIL: Record<string, string> = {
  MEETING:  '#60a5fa',
  DEADLINE: '#f59e0b',
  INFO:     '#c4b5fd',
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// ─── Блок «сегодня в календаре» ──────────────────────────────────────────────
function CalendarBlock({ events }: { events: EventWithRelations[] }) {
  const MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
  const today  = new Date()
  const dateLabel = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`

  const sorted = [...events].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
    if (a.startTime) return -1
    if (b.startTime) return 1
    return 0
  })

  const meetings  = sorted.filter((e) => e.kind === 'MEETING')
  const deadlines = sorted.filter((e) => e.kind !== 'MEETING')

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Сегодня в календаре
        </span>
        <span className="text-[11px] text-neutral-400">{dateLabel}</span>
      </div>

      {/* Body */}
      {sorted.length === 0 ? (
        <p className="px-4 py-3 text-sm italic text-neutral-300">Событий нет — день свободен</p>
      ) : (
        <div className="py-1">
          {meetings.map((ev) => {
            const time = ev.startTime
              ? ev.endTime ? `${ev.startTime}–${ev.endTime}` : ev.startTime
              : 'весь день'
            const sub = [
              ev.person    && `с ${ev.person.name}`,
              ev.project   && `⬡ ${ev.project.name}`,
            ].filter(Boolean).join(' · ')
            return (
              <div key={ev.id} className="flex items-center gap-3.5 px-4 py-2">
                <span className="w-[4.5rem] shrink-0 text-xs tabular-nums text-neutral-500">
                  {time}
                </span>
                <span
                  className="w-[3px] shrink-0 self-stretch rounded"
                  style={{ background: RAIL[ev.kind], minHeight: '1.125rem' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900">{ev.title}</div>
                  {sub && <div className="mt-0.5 text-[11px] text-neutral-400">{sub}</div>}
                </div>
              </div>
            )
          })}

          {meetings.length > 0 && deadlines.length > 0 && (
            <>
              <hr className="mx-4 my-1 border-dashed border-neutral-200" />
              <p className="px-4 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Дедлайны и важное
              </p>
            </>
          )}

          {deadlines.map((ev) => {
            const sub = ev.project ? `⬡ ${ev.project.name}` : null
            return (
              <div key={ev.id} className="flex items-center gap-3.5 px-4 py-2">
                <span className="w-[4.5rem] shrink-0 text-xs text-neutral-400">весь день</span>
                <span
                  className="w-[3px] shrink-0 self-stretch rounded"
                  style={{ background: RAIL[ev.kind], minHeight: '1.125rem' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900">{ev.title}</div>
                  {sub && <div className="mt-0.5 text-[11px] text-neutral-400">{sub}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MorningReview({
  todos,
  people,
  contexts,
  projects,
  todayEvents = [],
}: {
  todos: TodoWithRelations[]
  people: Person[]
  contexts: Context[]
  projects: Project[]
  todayEvents?: EventWithRelations[]
}) {
  const [, startTransition] = useTransition()

  const needAttention = todos.filter((t) => {
    if (t.status !== 'WAITING') return false
    const overdue = isOverdue(t.followUpDate)
    const stale   = t.waitingSince
      ? ageLevel(daysSince(t.waitingSince)) !== 'grey'
      : false
    return overdue || stale
  })

  const review = todos.filter((t) => t.status === 'REVIEW')
  const inbox  = todos.filter((t) => t.status === 'INBOX')
  const total  = needAttention.length + review.length + inbox.length

  function takeToMyself(id: number) {
    const me = people.find((p) => p.name === 'Я')
    if (!me) return
    startTransition(() => assignTodo(id, me.id))
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold text-neutral-900">Утренний обзор</h1>
      <p className="mt-1 text-sm text-neutral-400">
        {total > 0 ? `${total} задач требуют решения` : 'Всё разобрано'}
      </p>

      {/* НОВЫЙ БЛОК: события сегодня */}
      <CalendarBlock events={todayEvents} />

      {needAttention.length > 0 && (
        <Group title="ТРЕБУЮТ ВНИМАНИЯ" count={needAttention.length}>
          {needAttention.map((t) => {
            const days  = t.waitingSince ? daysSince(t.waitingSince) : 0
            const level = ageLevel(days)
            return (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-neutral-900">{t.text}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                    {t.assignee && <Avatar name={t.assignee.name} />}
                    {t.assignee ? `ждёт ${t.assignee.name}` : 'ждёт исполнителя'}
                    {t.customer && ` · от ${t.customer.name}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${AGE_BADGE_CLASS[level]}`}>
                  {days} дн{level === 'red' ? ' ⚠' : ''}
                </span>
              </li>
            )
          })}
        </Group>
      )}

      {review.length > 0 && (
        <Group title="НА ПРОВЕРКЕ" count={review.length}>
          {review.map((t) => (
            <ReviewRow key={t.id} todo={t} />
          ))}
        </Group>
      )}

      {inbox.length > 0 && (
        <Group title="РАЗОБРАТЬ ВХОДЯЩИЕ" count={inbox.length}>
          {inbox.map((t) => (
            <InboxRow
              key={t.id}
              todo={t}
              onTakeToMyself={takeToMyself}
              onSetStatus={setStatus}
            />
          ))}
        </Group>
      )}

      {total === 0 && (
        <p className="mt-10 text-center text-sm italic text-neutral-300">
          Разобрал повестку — экран пуст, день начат.
        </p>
      )}
    </section>
  )
}

function Group({
  title, count, children,
}: {
  title: string; count: number; children: React.ReactNode
}) {
  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-neutral-400">{title}</span>
        <span className="text-xs text-neutral-400">{count}</span>
      </div>
      <ul className="mt-2 divide-y divide-neutral-100">{children}</ul>
    </>
  )
}

function ReviewRow({ todo }: { todo: TodoWithRelations }) {
  const [isPending, startTransition] = useTransition()
  return (
    <li className={`flex items-center gap-3 py-3 ${isPending ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-neutral-900">{todo.text}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
          {todo.assignee && <Avatar name={todo.assignee.name} />}
          {todo.assignee ? `вернул ${todo.assignee.name}` : 'на проверке'}
          {todo.customer && ` · для ${todo.customer.name}`}
        </p>
      </div>
      <button
        onClick={() => startTransition(() => setStatus(todo.id, 'DONE'))}
        className="shrink-0 rounded-md bg-green-100 px-2 py-0.5 text-xs text-green-700 hover:bg-green-200"
      >
        принять
      </button>
    </li>
  )
}

function InboxRow({
  todo, onTakeToMyself, onSetStatus,
}: {
  todo: TodoWithRelations
  onTakeToMyself: (id: number) => void
  onSetStatus: (id: number, status: Status) => void
}) {
  const [isPending, startTransition] = useTransition()
  return (
    <li className={`flex items-center gap-3 py-3 ${isPending ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-neutral-900">{todo.text}</p>
        {todo.customer && (
          <p className="mt-0.5 text-xs text-neutral-400">от {todo.customer.name}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() => startTransition(() => onTakeToMyself(todo.id))}
          className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-200"
        >
          взять себе
        </button>
        <button
          onClick={() => startTransition(() => onSetStatus(todo.id, 'WAITING'))}
          className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-200"
        >
          передать
        </button>
      </div>
    </li>
  )
}