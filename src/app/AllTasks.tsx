// src/app/AllTasks.tsx
'use client'

import { useState, useTransition } from 'react'
import type { Person, Status, Context, Project } from '@prisma/client'
import type { TodoWithRelations } from './Workspace'
import { STATUS_LABELS, STATUS_ORDER, daysSince, ageLevel, AGE_BADGE_CLASS } from './lib/status'
import { addTodo, setStatus } from './actions'
import TodoForm from './TodoForm'
import TaskCard from './TaskCard'

type Filter = 'all' | Status

export default function AllTasks({
  todos,
  people,
  contexts,
  projects,
}: {
  todos: TodoWithRelations[]
  people: Person[]
  contexts: Context[]
  projects: Project[]
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<number | null>(null)

  const visible = filter === 'all' ? todos : todos.filter((t) => t.status === filter)
  const openTodo = todos.find((t) => t.id === openId) ?? null

  return (
    <section>
      <h1
        className="text-[24px] font-[650] tracking-[-0.022em] leading-tight"
        style={{ color: 'var(--text)' }}
      >
        Все задачи
      </h1>

      {/* Фильтры статуса */}
      <nav
        className="mt-5 flex flex-wrap gap-5"
        aria-label="Фильтр по статусу"
      >
        {(['all', ...STATUS_ORDER] as Filter[]).map((f) => {
          const active = filter === f
          const label  = f === 'all' ? 'Все' : STATUS_LABELS[f as Status]
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className="text-sm transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:rounded"
              style={{
                color:      active ? 'var(--text)'      : 'var(--text-muted)',
                fontWeight: active ? '500'              : '400',
              }}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* Поле добавления */}
      <div className="mt-5 mb-8">
        <TodoForm addTodo={addTodo} />
      </div>

      {/* Секции по статусу */}
      {STATUS_ORDER.map((status) => {
        const group = visible.filter((t) => t.status === status)
        if (group.length === 0) return null
        return (
          <div key={status} className="mb-6">
            <span
              className="block text-[10.5px] font-bold tracking-[.09em] uppercase mb-2"
              style={{ color: 'var(--text-ghost)' }}
            >
              {STATUS_LABELS[status]}
            </span>
            <ul className="list-none" role="list">
              {group.map((t) => (
                <TaskRow key={t.id} todo={t} onOpen={() => setOpenId(t.id)} />
              ))}
            </ul>
          </div>
        )
      })}

      {visible.length === 0 && (
        <p className="mt-10 text-center text-sm" style={{ color: 'var(--text-ghost)' }}>
          Пусто
        </p>
      )}

      {openTodo && (
        <TaskCard
          todo={openTodo}
          people={people}
          contexts={contexts}
          projects={projects}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  )
}

function TaskRow({ todo, onOpen }: { todo: TodoWithRelations; onOpen: () => void }) {
  const [isPending, startTransition] = useTransition()
  const done      = todo.status === 'DONE'
  const isWaiting = todo.status === 'WAITING'
  const days      = isWaiting && todo.waitingSince ? daysSince(todo.waitingSince) : 0
  const level     = ageLevel(days)

  // Мета-данные с иерархией
  const primaryMeta: string[] = []
  if (todo.assignee) {
    const mine = todo.assignee.isMe
    if (isWaiting)            primaryMeta.push(mine ? 'жду сам'       : `ждёт ${todo.assignee.name}`)
    else if (todo.status === 'REVIEW') primaryMeta.push(mine ? 'на проверке' : `вернул ${todo.assignee.name}`)
    else if (done)            primaryMeta.push(mine ? 'сделал сам'    : `делал ${todo.assignee.name}`)
    else                      primaryMeta.push(mine ? 'сам'           : todo.assignee.name)
  } else if (todo.status === 'IN_PROGRESS') {
    primaryMeta.push('сам')
  }
  if (todo.customer) primaryMeta.push(`${done ? 'для' : 'от'} ${todo.customer.name}`)

  const followUp = isWaiting && todo.followUpDate
    ? new Date(todo.followUpDate).toLocaleDateString('ru-RU')
    : null

  return (
    <li
      className="flex items-start gap-3 py-[10px] border-b"
      style={{
        borderColor: 'var(--border-soft)',
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {/* Круглый ghost-checkbox */}
      <button
        onClick={() => startTransition(() => setStatus(todo.id, done ? 'INBOX' : 'DONE'))}
        aria-label={done ? 'Вернуть в работу' : 'Отметить выполненным'}
        className="relative mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-140 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
        style={{
          border:     done ? 'none'                    : '1.5px solid var(--border)',
          background: done ? 'var(--text-ghost)'       : 'transparent',
        }}
      >
        {done && (
          // Галочка
          <svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true">
            <path
              d="M1 3.5L3.8 6L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Тело задачи */}
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p
          className="text-[15px] leading-snug"
          style={{
            color:          done ? 'var(--text-ghost)' : 'var(--text)',
            textDecoration: done ? 'line-through'      : 'none',
          }}
        >
          {todo.text}
        </p>

        {/* Мета-строка */}
        {(primaryMeta.length > 0 || todo.contexts.length > 0 || followUp || todo.project) && (
          <div className="mt-[3px] flex flex-wrap items-center gap-[5px]">
            {/* Исполнитель / статус — чуть темнее ghost */}
            {primaryMeta.length > 0 && (
              <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                {primaryMeta.join(' · ')}
              </span>
            )}

            {/* Проект — тихая пилюля */}
            {todo.project && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-[8px] py-[1px] text-[11.5px]"
                style={{ background: 'var(--pill-bg)', color: 'var(--pill-text)' }}
              >
                <span
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: 'var(--text-ghost)' }}
                  aria-hidden="true"
                />
                {todo.project.name}
              </span>
            )}

            {/* Контексты — пилюли с цветом */}
            {todo.contexts.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full px-[8px] py-[1px] text-[11.5px]"
                style={{ background: 'var(--pill-bg)', color: 'var(--pill-text)' }}
              >
                <span
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: c.color }}
                  aria-hidden="true"
                />
                {c.name}
              </span>
            ))}

            {/* Follow-up — акцент если скоро */}
            {followUp && (
              <span
                className="text-[12px] tabular-nums"
                style={{ color: 'var(--text-muted)' }}
              >
                follow-up {followUp}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Бейдж дней ожидания */}
      {isWaiting && (
        <span
          className={`mt-[2px] shrink-0 self-start rounded-[6px] px-[7px] py-[2px] text-[11.5px] tabular-nums ${AGE_BADGE_CLASS[level]}`}
        >
          {days} дн{level === 'red' ? ' ⚠' : ''}
        </span>
      )}

      {/* Бейдж «проверить» */}
      {todo.status === 'REVIEW' && (
        <span
          className="mt-[2px] shrink-0 self-start rounded-[6px] px-[7px] py-[2px] text-[11.5px]"
          style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
        >
          проверить
        </span>
      )}
    </li>
  )
}