// src/app/TodoList.tsx
'use client'

import { useState } from 'react'
import type { Todo } from '@prisma/client'
import TodoItem from './TodoItem'
import { toggleTodo, deleteTodo } from './actions'

type Filter = 'all' | 'active' | 'completed'

export default function TodoList({ todos }: { todos: Todo[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = todos.filter((todo) => {
    if (filter === 'active') return !todo.done
    if (filter === 'completed') return todo.done
    return true
  })

  const total = todos.length
  const completed = todos.filter((t) => t.done).length

  const tabClass = (f: Filter) =>
    `text-xs ${filter === f ? 'font-medium text-neutral-900' : 'text-neutral-400'}`

  return (
    <>
      {total > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            {completed} из {total} выполнено
          </p>
          <div className="flex gap-3">
            <button onClick={() => setFilter('all')} className={tabClass('all')}>
              Все
            </button>
            <button onClick={() => setFilter('active')} className={tabClass('active')}>
              Активные
            </button>
            <button onClick={() => setFilter('completed')} className={tabClass('completed')}>
              Выполненные
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 list-none space-y-1">
        {filtered.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
          />
        ))}

        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-neutral-300">
            {filter === 'all'
              ? 'Пусто'
              : filter === 'active'
                ? 'Нет активных задач'
                : 'Нет выполненных задач'}
          </li>
        )}
      </ul>
    </>
  )
}