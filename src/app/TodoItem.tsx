// src/app/TodoItem.tsx
'use client'

import type { Todo } from '@prisma/client'
import { useTransition } from 'react'

export default function TodoItem({
  todo,
  toggleTodo,
  deleteTodo,
}: {
  todo: Todo
  toggleTodo: (id: number) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const isDone = todo.status === 'DONE'

  return (
    <li
      className="group flex items-center gap-3 border-b py-[10px]"
      style={{
        borderColor: 'var(--border-soft)',
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {/* Круглый ghost-checkbox */}
      <button
        onClick={() => startTransition(() => toggleTodo(todo.id))}
        aria-label={isDone ? 'Снять отметку' : 'Отметить выполненным'}
        className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-140 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
        style={{
          border:     isDone ? 'none'               : '1.5px solid var(--border)',
          background: isDone ? 'var(--text-ghost)'  : 'transparent',
        }}
      >
        {isDone && (
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

      <span
        className="flex-1 text-[15px]"
        style={{
          color:          isDone ? 'var(--text-ghost)' : 'var(--text)',
          textDecoration: isDone ? 'line-through'      : 'none',
        }}
      >
        {todo.text}
      </span>

      <button
        onClick={() => startTransition(() => deleteTodo(todo.id))}
        aria-label="Удалить задачу"
        className="opacity-0 transition-opacity duration-120 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] rounded"
        style={{ color: 'var(--text-ghost)' }}
      >
        ✕
      </button>
    </li>
  )
}
