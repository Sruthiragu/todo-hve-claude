import { useId, useState } from 'react'
import type { RefObject } from 'react'
import { PRIORITIES, PRIORITY_LABEL } from '../../domain/types.ts'
import type { DueFilter, Priority, SortKey, StatusFilter, TaskQuery } from '../../domain/types.ts'
import './Dashboard.css'

interface ToolbarProps {
  query: TaskQuery
  onChange: (query: TaskQuery) => void
  onClear: () => void
  canClear: boolean
  categories: { names: string[]; hasUncategorized: boolean }
  searchRef: RefObject<HTMLInputElement | null>
}

interface CategoryOption {
  label: string
  value: string | null
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'none', label: 'No date' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created', label: 'Newest' },
  { value: 'priority', label: 'Priority' },
  { value: 'deadline', label: 'Deadline' },
]

export function Toolbar({ query, onChange, onClear, canClear, categories, searchRef }: ToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const id = useId()
  const filtersId = `${id}-filters`

  // Category values map back through the index, so no category name can
  // collide with "All" or "Uncategorized".
  const categoryOptionList: CategoryOption[] = [
    { label: 'All', value: null },
    ...categories.names.map((name) => ({ label: name, value: name })),
  ]
  if (categories.hasUncategorized) categoryOptionList.push({ label: 'Uncategorized', value: '' })
  if (!categoryOptionList.some((option) => option.value === query.category)) {
    categoryOptionList.push({ label: query.category === '' ? 'Uncategorized' : (query.category ?? 'All'), value: query.category })
  }
  const categoryIndex = categoryOptionList.findIndex((option) => option.value === query.category)

  const set = <K extends keyof TaskQuery>(key: K, value: TaskQuery[K]) => onChange({ ...query, [key]: value })

  return (
    <section className="toolbar" aria-label="Search, filter and sort">
      <div className="toolbar__search">
        <label className="visually-hidden" htmlFor={`${id}-search`}>
          Search tasks
        </label>
        <input
          ref={searchRef}
          id={`${id}-search`}
          type="search"
          className="input"
          placeholder="Search tasks"
          value={query.search}
          onChange={(event) => set('search', event.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn toolbar__toggle"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filters
        </button>
      </div>

      <div id={filtersId} className="toolbar__filters" data-open={filtersOpen || undefined}>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-status`}>
            Status
          </label>
          <select
            id={`${id}-status`}
            className="input"
            value={query.status}
            onChange={(event) => set('status', event.target.value as StatusFilter)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-priority`}>
            Priority
          </label>
          <select
            id={`${id}-priority`}
            className="input"
            value={query.priority}
            onChange={(event) => set('priority', event.target.value as Priority | 'all')}
          >
            <option value="all">All</option>
            {[...PRIORITIES].reverse().map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-category`}>
            Category
          </label>
          <select
            id={`${id}-category`}
            className="input"
            value={String(categoryIndex)}
            onChange={(event) => set('category', categoryOptionList[Number(event.target.value)]?.value ?? null)}
          >
            {categoryOptionList.map((option, index) => (
              <option key={index} value={String(index)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-due`}>
            Due
          </label>
          <select
            id={`${id}-due`}
            className="input"
            value={query.due}
            onChange={(event) => set('due', event.target.value as DueFilter)}
          >
            {DUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-sort`}>
            Sort by
          </label>
          <select
            id={`${id}-sort`}
            className="input"
            value={query.sort}
            onChange={(event) => set('sort', event.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {canClear && (
          <button type="button" className="btn btn--ghost toolbar__clear" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </section>
  )
}
