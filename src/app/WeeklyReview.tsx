// src/app/WeeklyReview.tsx
'use client'

import { useState, useTransition } from 'react'
import type { Person, Context, Project, ProjectStatus } from '@prisma/client'
import type { TodoWithRelations } from './Workspace'
import {
  daysSince,
  ageLevel,
  AGE_BADGE_CLASS,
  STALE_DAYS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from './lib/status'
import { addProject, updateProject, deleteProject } from './actions'
import TaskCard from './TaskCard'

export default function WeeklyReview({
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
  const [openId, setOpenId] = useState<number | null>(null)
  const openTodo = todos.find((t) => t.id === openId) ?? null

  // --- Итоги недели ---
  const doneThisWeek = todos.filter(
    (t) => t.status === 'DONE' && daysSince(t.updatedAt) < 7
  ).length
  const inProgress = todos.filter((t) => t.status === 'IN_PROGRESS').length
  const waiting = todos.filter((t) => t.status === 'WAITING').length
  const inbox = todos.filter((t) => t.status === 'INBOX').length

  // --- Секции по задачам ---
  const toClarify = todos.filter((t) => t.status === 'INBOX')

  const stalled = todos.filter(
    (t) =>
      (t.status === 'IN_PROGRESS' || t.status === 'REVIEW') &&
      daysSince(t.updatedAt) >= STALE_DAYS
  )

  const longWaiting = todos
    .filter((t) => t.status === 'WAITING' && t.waitingSince)
    .map((t) => ({ todo: t, days: daysSince(t.waitingSince!) }))
    .filter((x) => x.days >= 3)
    .sort((a, b) => b.days - a.days)

  // --- Проекты без прогресса ---
  const stuckProjects = projects
    .filter((p) => p.status === 'ACTIVE')
    .map((p) => {
      const pTodos = todos.filter((t) => t.projectId === p.id)
      const open = pTodos.filter((t) => t.status !== 'DONE')
      const hasNext = open.some((t) => t.status === 'IN_PROGRESS' && t.nextAction)
      const lastActivity = pTodos.length
        ? Math.min(...pTodos.map((t) => daysSince(t.updatedAt)))
        : daysSince(p.createdAt)
      const reasons: string[] = []
      if (open.length === 0) reasons.push('нет открытых задач')
      else if (!hasNext) reasons.push('нет следующего действия')
      if (lastActivity >= STALE_DAYS) reasons.push(`застой ${lastActivity} дн`)
      return { project: p, openCount: open.length, reasons }
    })
    .filter((x) => x.reasons.length > 0)

  return (
    <section>
      <h1 className="text-2xl font-semibold text-neutral-900">Обзор недели</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Пройдись сверху вниз: разбери входящие, растолкай зависшее, проверь ожидания и проекты.
      </p>

      {/* Итоги */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        <Stat label="Сделано за неделю" value={doneThisWeek} />
        <Stat label="В работе" value={inProgress} />
        <Stat label="Ожидают" value={waiting} />
        <Stat label="Входящие" value={inbox} />
      </div>

      <ReviewSection title="Требуют разбора" count={toClarify.length} hint="Входящие без статуса">
        {toClarify.map((t) => (
          <TaskLine key={t.id} todo={t} onOpen={() => setOpenId(t.id)} />
        ))}
      </ReviewSection>

      <ReviewSection title="Зависли" count={stalled.length} hint={`Без движения ${STALE_DAYS}+ дней`}>
        {stalled.map((t) => (
          <TaskLine
            key={t.id}
            todo={t}
            onOpen={() => setOpenId(t.id)}
            badge={`${daysSince(t.updatedAt)} дн`}
          />
        ))}
      </ReviewSection>

      <ReviewSection title="Долго ждём" count={longWaiting.length} hint="Пора напомнить">
        {longWaiting.map(({ todo, days }) => (
          <TaskLine
            key={todo.id}
            todo={todo}
            onOpen={() => setOpenId(todo.id)}
            badge={`${days} дн`}
            badgeClass={AGE_BADGE_CLASS[ageLevel(days)]}
          />
        ))}
      </ReviewSection>

      <ReviewSection
        title="Проекты без прогресса"
        count={stuckProjects.length}
        hint="Активные проекты, которые буксуют"
      >
        {stuckProjects.map(({ project, openCount, reasons }) => (
          <li key={project.id} className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-neutral-900">⬡ {project.name}</span>
              <span className="text-xs text-neutral-400">{openCount} задач</span>
            </div>
            {project.outcome && (
              <p className="mt-0.5 text-xs text-neutral-400">Цель: {project.outcome}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {reasons.map((r) => (
                <span key={r} className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {r}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ReviewSection>

      {/* Управление проектами */}
      <ProjectManager projects={projects} todos={todos} />

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-400">{label}</p>
    </div>
  )
}

function ReviewSection({
  title,
  count,
  hint,
  children,
}: {
  title: string
  count: number
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-wide text-neutral-400">
          {title.toUpperCase()}
        </span>
        <span className="text-xs text-neutral-400">{count}</span>
      </div>
      {hint && <p className="mt-0.5 text-xs text-neutral-300">{hint}</p>}
      {count === 0 ? (
        <p className="mt-2 text-sm text-neutral-300">— чисто —</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100">{children}</ul>
      )}
    </div>
  )
}

function TaskLine({
  todo,
  onOpen,
  badge,
  badgeClass = 'bg-neutral-100 text-neutral-500',
}: {
  todo: TodoWithRelations
  onOpen: () => void
  badge?: string
  badgeClass?: string
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="text-[15px] text-neutral-900">{todo.text}</p>
        {todo.nextAction && <p className="mt-0.5 text-xs text-neutral-500">→ {todo.nextAction}</p>}
        {todo.project && <p className="mt-0.5 text-xs text-neutral-400">⬡ {todo.project.name}</p>}
      </button>
      {badge && (
        <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs ${badgeClass}`}>{badge}</span>
      )}
    </li>
  )
}

function ProjectManager({
  projects,
  todos,
}: {
  projects: Project[]
  todos: TodoWithRelations[]
}) {
  const [name, setName] = useState('')
  const [outcome, setOutcome] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!name.trim()) return
    startTransition(async () => {
      await addProject(name, outcome)
      setName('')
      setOutcome('')
    })
  }

  return (
    <div className="mt-10 border-t border-neutral-100 pt-6">
      <span className="text-xs font-semibold tracking-wide text-neutral-400">ПРОЕКТЫ</span>

      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название проекта"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
        <input
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="Желаемый результат (необязательно)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !name.trim()}
          className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Создать проект
        </button>
      </div>

      <ul className="mt-3 divide-y divide-neutral-100">
        {projects.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            taskCount={todos.filter((t) => t.projectId === p.id).length}
          />
        ))}
        {projects.length === 0 && (
          <li className="py-3 text-sm text-neutral-300">Проектов пока нет</li>
        )}
      </ul>
    </div>
  )
}

function ProjectRow({ project, taskCount }: { project: Project; taskCount: number }) {
  const [isPending, startTransition] = useTransition()

  return (
    <li className={`flex items-center gap-3 py-3 ${isPending ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-neutral-900">⬡ {project.name}</p>
        {project.outcome && <p className="mt-0.5 text-xs text-neutral-400">{project.outcome}</p>}
        <p className="mt-0.5 text-xs text-neutral-300">{taskCount} задач</p>
      </div>

      <select
        value={project.status}
        onChange={(e) =>
          startTransition(() =>
            updateProject(project.id, { status: e.target.value as ProjectStatus })
          )
        }
        className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700 outline-none"
      >
        {PROJECT_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {PROJECT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <button
        onClick={() => startTransition(() => deleteProject(project.id))}
        className="text-xs text-neutral-400 hover:text-red-600"
      >
        удалить
      </button>
    </li>
  )
}