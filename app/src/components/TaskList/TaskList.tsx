import type { Task } from '../../domain/types.ts'
import { TaskItem } from './TaskItem.tsx'
import './TaskList.css'

interface TaskListProps {
  tasks: Task[]
  now: Date
  label: string
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskList({ tasks, now, label, onEdit, onDelete }: TaskListProps) {
  return (
    <ul className="task-list" aria-label={label}>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} now={now} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  )
}
