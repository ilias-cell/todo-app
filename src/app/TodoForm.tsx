// src/app/TodoForm.tsx
'use client'

import { useState, useTransition } from 'react'

export default function TodoForm({
  addTodo,
}: {
  addTodo: (fields: { text: string }) => Promise<void>  // ← тип исправлен
}) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    startTransition(async () => {
      await addTodo({ text: value })  // ← передаём объект
      setText('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Новая задача..."
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
      >
        {isPending ? '...' : 'Добавить'}
      </button>
    </form>
  )
}