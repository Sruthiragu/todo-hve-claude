import { VIEWS } from '../../domain/types.ts'
import type { ViewId } from '../../domain/types.ts'

interface ViewNavProps {
  active: ViewId
  counts: Record<ViewId, number>
  onSelect: (view: ViewId) => void
}

/** One nav for every width: CSS shows it as a sidebar or a bottom bar. */
export function ViewNav({ active, counts, onSelect }: ViewNavProps) {
  return (
    <nav className="view-nav" aria-label="Views">
      <ul className="view-nav__list">
        {VIEWS.map((view) => {
          const count = counts[view.id]
          return (
            <li key={view.id}>
              <button
                type="button"
                className="view-nav__item"
                aria-current={view.id === active ? 'page' : undefined}
                onClick={() => onSelect(view.id)}
              >
                <span className="view-nav__label view-nav__label--full">{view.label}</span>
                <span className="view-nav__label view-nav__label--short" aria-hidden="true">
                  {view.shortLabel}
                </span>
                <span className="view-nav__count" aria-hidden="true">
                  {count}
                </span>
                <span className="visually-hidden">
                  , {count} {count === 1 ? 'task' : 'tasks'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
