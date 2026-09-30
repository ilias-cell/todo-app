// src/app/TodayBar.tsx
import type { EventWithRelations } from './Workspace'

export default function TodayBar({ events }: { events: EventWithRelations[] }) {
  const sorted = [...events].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
    if (a.startTime) return -1
    if (b.startTime) return 1
    return 0
  })

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto border-b px-0 py-2 flex-wrap"
      style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
      role="region"
      aria-label="События сегодня"
    >
      <span
        className="shrink-0 text-[11px] font-semibold uppercase tracking-[.07em] mr-1"
        style={{ color: 'var(--text-muted)' }}
      >
        Сегодня
      </span>

      {sorted.length === 0 ? (
        <span className="text-sm italic" style={{ color: 'var(--text-ghost)' }}>
          событий нет
        </span>
      ) : (
        sorted.map((ev) => (
          <span
            key={ev.id}
            className="inline-flex shrink-0 items-center gap-[5px] rounded-full border px-[10px] py-[2px] text-[12.5px] whitespace-nowrap"
            style={{
              background:   'var(--surface)',
              borderColor:  'var(--border-soft)',
              color:        'var(--text)',
              boxShadow:    '0 1px 2px oklch(15% 0.01 264 / .06)',
            }}
          >
            {/* Точка — цвет по типу события */}
            <i
              className="h-[6px] w-[6px] shrink-0 rounded-full"
              aria-hidden="true"
              style={{ background: 'var(--info)' }}
            />
            {ev.startTime && (
              <span
                className="tabular-nums text-[12px]"
                style={{ color: 'var(--text-muted)' }}
              >
                {ev.startTime.slice(0, 5)}
              </span>
            )}
            {ev.title}
          </span>
        ))
      )}
    </div>
  )
}