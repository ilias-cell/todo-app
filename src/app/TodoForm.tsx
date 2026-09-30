'use client'

import { useState, useTransition, useRef } from 'react'

export default function TodoForm({
  addTodo,
  autoFocus = false,
  placeholder = 'Новая задача...',
}: {
  addTodo: (fields: { text: string }) => Promise<void>
  autoFocus?: boolean
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    startTransition(async () => {
      await addTodo({ text: value })
      setText('')
      inputRef.current?.focus()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        enterKeyHint="done"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-[48px] flex-1 rounded-xl border px-4 text-[16px] outline-none"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        aria-label="Добавить"
        className="min-h-[48px] min-w-[48px] rounded-xl px-4 text-lg font-medium disabled:opacity-40"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
      >
        {isPending ? '…' : '＋'}
      </button>
    </form>
  )
}