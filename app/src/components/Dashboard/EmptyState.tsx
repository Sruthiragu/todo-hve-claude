import type { ViewId } from '../../domain/types.ts'
import './Dashboard.css'

interface EmptyStateProps {
  kind: 'empty' | 'no-results'
  view: ViewId
  onAction: () => void
}

const EMPTY_COPY: Record<ViewId, { title: string; text?: string; action?: string }> = {
  'my-day': { title: 'Your day is clear.', text: 'Tasks due today appear here.', action: 'Add a task for today' },
  upcoming: { title: 'No upcoming deadlines.', text: 'Tasks with a future due date appear here.' },
  overdue: { title: "You're all caught up.", text: 'No overdue tasks.' },
  completed: { title: 'No completed tasks yet.', text: 'Tasks you check off appear here.' },
  all: { title: 'No tasks yet.', text: 'Add your first one above.', action: 'Add a task' },
}

export function EmptyState({ kind, view, onAction }: EmptyStateProps) {
  const copy =
    kind === 'no-results'
      ? { title: 'No tasks match your search or filters.', text: undefined, action: 'Clear filters' }
      : EMPTY_COPY[view]

  return (
    <section className="empty-state" aria-live="polite">
      <p className="empty-state__title">{copy.title}</p>
      {copy.text && <p className="empty-state__text">{copy.text}</p>}
      {copy.action && (
        <button type="button" className="btn" onClick={onAction}>
          {copy.action}
        </button>
      )}
    </section>
  )
}
