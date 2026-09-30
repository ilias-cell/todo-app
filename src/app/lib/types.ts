// src/lib/types.ts
import { Todo, Person, Context, Project } from '@prisma/client'

export type TodoWithRelations = Todo & {
  customer: Person | null
  assignee: Person | null
  contexts: Context[]
}

export type ProjectWithTodos = Project & {
  todos: Todo[]
}

export type WeeklyReviewData = {
  staleTasks: TodoWithRelations[]
  frozenProjects: ProjectWithTodos[]
}