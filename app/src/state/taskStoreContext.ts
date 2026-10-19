import { createContext, useContext } from 'react'
import type { Task, TaskDraft } from '../domain/types.ts'
import type { LoadResult } from '../storage/index.ts'
import type { TaskAction } from './tasksReducer.ts'

/**
 * Every action saves first and commits React state only after the save
 * succeeds. Each returns whether it committed.
 */
export interface TaskStore {
  tasks: Task[]
  loadResult: LoadResult
  dispatch: (action: TaskAction) => boolean
  createTask: (draft: TaskDraft) => boolean
  updateTask: (id: string, draft: TaskDraft) => boolean
  toggleComplete: (id: string) => boolean
  deleteTask: (id: string) => boolean
  toggleSubtask: (id: string, subtaskId: string) => boolean
}

export const TaskStoreContext = createContext<TaskStore | null>(null)

export function useTaskStore(): TaskStore {
  const store = useContext(TaskStoreContext)
  if (!store) throw new Error('useTaskStore must be used inside TaskStoreProvider')
  return store
}
