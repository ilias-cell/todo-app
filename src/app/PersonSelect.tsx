// src/app/PersonSelect.tsx
'use client'

import { useState } from 'react'
import type { Person } from '@prisma/client'
import { addPerson } from './actions'

export default function PersonSelect({
  label,
  people,
  value,
  onChange,
}: {
  label: string
  people: Person[]
  value: number | null
  onChange: (id: number | null) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const person = await addPerson(name)
    onChange(person.id) // сразу выбираем созданного
    setNewName('')
    setAdding(false)
  }

  return (
    <div>
      <label className="text-xs font-semibold tracking-wide text-neutral-400">
        {label}
      </label>

      {!adding ? (
        <div className="mt-1 flex items-center gap-2">
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="">— не выбрано —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
          >
            + новый
          </button>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Имя или организация"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setNewName('')
            }}
            className="shrink-0 text-sm text-neutral-400 hover:text-neutral-900"
          >
            отмена
          </button>
        </div>
      )}
    </div>
  )
}