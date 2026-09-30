// src/app/page.tsx

import { prisma } from './lib/prisma'
import Workspace from './Workspace'
import { todayISO } from './lib/date'

export default async function Home() {
  const today = todayISO()

  // Диапазон для entries привычек — 90 дней назад
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const since = ninetyDaysAgo.toISOString().slice(0, 10)

  const [todos, people, contexts, projects, events, habits] = await Promise.all([
    prisma.todo.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: { customer: true, assignee: true, contexts: true, project: true },
    }),
    prisma.person.findMany({
      orderBy: { name: 'asc' },
      include: {
        agendaItems: { orderBy: [{ done: 'asc' }, { createdAt: 'asc' }] },
      },
    }),
    prisma.context.findMany({ orderBy: { name: 'asc' } }),
    prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.event.findMany({
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { person: true, project: true },
    }),
    prisma.habit.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        entries: {
          where: { date: { gte: since } },
          orderBy: { date: 'asc' },
        },
      },
    }),
  ])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Workspace
        todos={todos}
        people={people}
        contexts={contexts}
        projects={projects}
        events={events}
        habits={habits}
      />
    </main>
  )
}