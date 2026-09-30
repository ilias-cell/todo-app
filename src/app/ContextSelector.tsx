// src/app/ContextSelector.tsx
'use client'

import { useState } from 'react'
import type { Context } from '@prisma/client'
import { addContext } from './actions'

// палитра для новых контекстов — мягкие тона под общий минимализм
const PALETTE = [
  '#DBEAFE', // синий
  '#DCFCE7', // зелёный
  '#FEF9C3', // жёлтый
  '#FEE2E2', // красный
  '#F3E8FF', // фиолетовый
  '#FFEDD5', // оранжевый
  '#E5E7EB', // серый
]

export default function ContextSelector({
  contexts,
  selectedIds,
  onToggle,
}: {
  contexts: Context[]
  selectedIds: number[]
  onToggle: (id: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    const created = await addContext(name, newColor)
    onToggle(created.id) // сразу отмечаем на задаче
    setNewName('')
    setNewColor(PALETTE[0])
    setAdding(false)
    setSaving(false)
  }

  return (
    <div className="relative">
      <label className="text-xs font-semibold tracking-wide text-neutral-400">
        КОНТЕКСТЫ
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mt-1 flex w-full items-center justify-between rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      >
        <span className="flex flex-wrap gap-1">
          {selectedIds.length === 0 && <span className="text-neutral-400">— не выбрано —</span>}
          {contexts
            .filter((c) => selectedIds.includes(c.id))
            .map((c) => (
              <span
                key={c.id}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: c.color, color: '#1f2937' }}
              >
                {c.name}
              </span>
            ))}
        </span>
        <span className="text-neutral-400">▾</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
          {contexts.length === 0 && !adding && (
            <p className="px-2 py-1 text-xs text-neutral-400">Контекстов пока нет</p>
          )}

          {contexts.map((ctx) => (
            <label
              key={ctx.id}
              className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(ctx.id)}
                onChange={() => onToggle(ctx.id)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: ctx.color }} />
              <span className="flex-1 text-sm">{ctx.name}</span>
            </label>
          ))}

          {/* разделитель + создание */}
          <div className="mt-1 border-t border-neutral-100 pt-1">
            {!adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full rounded p-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              >
                + новый контекст
              </button>
            ) : (
              <div className="space-y-2 p-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreate()
                    }
                  }}
                  placeholder="@компьютер"
                  className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />

                <div className="flex flex-wrap gap-1.5">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      aria-label={`Цвет ${color}`}
                      className={`h-5 w-5 rounded-full ${
                        newColor === color ? 'ring-2 ring-neutral-900 ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || saving}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
                  >
                    {saving ? '...' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false)
                      setNewName('')
                    }}
                    className="text-sm text-neutral-400 hover:text-neutral-900"
                  >
                    отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}