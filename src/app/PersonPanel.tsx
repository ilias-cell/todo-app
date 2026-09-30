// src/app/PersonPanel.tsx
'use client'

import { useState, useTransition } from 'react'
import type { EventWithRelations, PersonWithAgenda } from './Workspace'
import { formatDayHeader, formatTimeRange } from './lib/date'
import { addAgendaItem, toggleAgendaItem, deleteAgendaItem } from './actions'

export default function PersonPanel({
  person,
  events,
  onClose,
}: {
  person: PersonWithAgenda
  events: EventWithRelations[]
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  const open = person.agendaItems.filter((a) => !a.done)
  const done = person.agendaItems.filter((a) => a.done)

  function add() {
    if (!text.trim()) return
    const t = text.trim()
    setText('')
    startTransition(() => addAgendaItem(person.id, t))
  }

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/20" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-30 flex h-full w-[22rem] max-w-[90vw] flex-col bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <i className="h-2.5 w-2.5 rounded-full bg-purple-300" />
            {person.name}
          </h2>
          <button onClick={onClose} className="text-xl text-neutral-400 hover:text-neutral-900">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-400">@agenda</p>

        <div className="mt-6 flex-1 overflow-y-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Что обсудить
          </span>
          <ul className="mt-2">
            {open.length === 0 && (
              <li className="py-2 text-sm text-neutral-300">Вопросов пока нет</li>
            )}
            {open.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 border-b border-neutral-100 py-2 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => startTransition(() => toggleAgendaItem(item.id, !item.done))}
                  className="mt-1 h-3.5 w-3.5"
                />
                <span className="flex-1">{item.text}</span>
                <button
                  onClick={() => startTransition(() => deleteAgendaItem(item.id))}
                  className="text-neutral-300 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={`+ новый вопрос к ${person.name}`}
              className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-neutral-900"
            />
            <button
              onClick={add}
              disabled={isPending || !text.trim()}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[13px] text-white hover:bg-neutral-700 disabled:opacity-40"
            >
              Добавить
            </button>
          </div>

          {done.length > 0 && (
            <div className="mt-6">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Обсудили
              </span>
              <ul className="mt-2">
                {done.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 py-1.5 text-sm text-neutral-300 line-through"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => startTransition(() => toggleAgendaItem(item.id, false))}
                      className="mt-1 h-3.5 w-3.5"
                    />
                    <span className="flex-1">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-4 text-[13px] text-neutral-500">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Ближайшие встречи
          </span>
          {events.length === 0 ? (
            <p className="mt-2 text-neutral-300">Встреч не запланировано</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="mt-1 flex justify-between">
                <span className="truncate">{e.title}</span>
                <span className="ml-2 shrink-0 text-neutral-400">
                  {formatDayHeader(e.date).label.replace('Сегодня · ', '').replace('Завтра · ', '')}
                  {e.startTime ? ` ${formatTimeRange(e.startTime, e.endTime)}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}