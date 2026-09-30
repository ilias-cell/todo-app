// src/app/TaskCard.tsx
'use client'

import { useState, useTransition } from 'react'
import type { Person, Status, Context, Project } from '@prisma/client'
import type { TodoWithRelations } from './Workspace'
import { STATUS_LABELS, STATUS_ORDER } from './lib/status'
import { updateTodo, deleteTodo } from './actions'
import PersonSelect from './PersonSelect'
import ContextSelector from './ContextSelector'

function toDateInput(d: Date | string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export default function TaskCard({
  todo,
  people,
  contexts,
  projects = [],
  onClose,
}: {
  todo: TodoWithRelations
  people: Person[]
  contexts: Context[]
  projects?: Project[]
  onClose: () => void
}) {
  const [text, setText] = useState(todo.text)
  const [status, setStatus] = useState<Status>(todo.status)
  const [nextAction, setNextAction] = useState(todo.nextAction ?? '')
  const [customerId, setCustomerId] = useState<number | null>(todo.customerId)
  const [assigneeId, setAssigneeId] = useState<number | null>(todo.assigneeId)
  const [followUp, setFollowUp] = useState(toDateInput(todo.followUpDate))
  const [contextIds, setContextIds] = useState<number[]>(todo.contexts.map((c) => c.id))
  const [isPending, startTransition] = useTransition()
  const [projectId, setProjectId] = useState<number | null>(todo.projectId)


  const toggleContext = (id: number) =>
    setContextIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const showFollowUp = status === 'WAITING'
  // Следующее действие обязательно только для "В работе"
  const nextActionMissing = status === 'IN_PROGRESS' && !nextAction.trim()

  function handleSave() {
    if (nextActionMissing) return
    startTransition(async () => {
      await updateTodo(todo.id, {
        text: text.trim(),
        status,
        nextAction: nextAction.trim() || null,
        customerId,
        assigneeId,
        followUpDate: followUp || null,
        projectId,
        contextIds,
      })
      onClose()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTodo(todo.id)
      onClose()
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-neutral-900/20" onClick={onClose} />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400">ЗАДАЧА</h2>
          <button onClick={onClose} aria-label="Закрыть" className="text-neutral-300 hover:text-neutral-900">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div>
            <label className="text-xs font-semibold tracking-wide text-neutral-400">НАЗВАНИЕ</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-[15px] text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wide text-neutral-400">
              СЛЕДУЮЩЕЕ ДЕЙСТВИЕ
            </label>
            <input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Что конкретно сделать?"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
            {nextActionMissing && (
              <p className="mt-1 text-xs text-amber-600">
                Для статуса «В работе» нужно указать следующее действие
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wide text-neutral-400">СТАТУС</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <PersonSelect label="ЗАКАЗЧИК" people={people} value={customerId} onChange={setCustomerId} />
          <PersonSelect label="ИСПОЛНИТЕЛЬ" people={people} value={assigneeId} onChange={setAssigneeId} />

          <div>
            <label className="text-xs font-semibold tracking-wide text-neutral-400">ПРОЕКТ</label>
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900">
              <option value="">— без проекта —</option>
              {projects
                .filter((p) => p.status !== 'DONE' || p.id === projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <ContextSelector contexts={contexts} selectedIds={contextIds} onToggle={toggleContext} />

          {showFollowUp && (
            <div>
              <label className="text-xs font-semibold tracking-wide text-neutral-400">
                НАПОМНИТЬ (FOLLOW-UP)
              </label>
              <input
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-400">В этот день задача всплывёт в утреннем обзоре</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-40"
          >
            Удалить
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900">
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !text.trim() || nextActionMissing}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
            >
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}