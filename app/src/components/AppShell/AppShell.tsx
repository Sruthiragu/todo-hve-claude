import { useMemo, useRef, useState } from 'react'
import { categoryOptions, isDefaultFilters, queryTasks, selectView, viewCounts } from '../../domain/selectors.ts'
import { DEFAULT_QUERY, VIEWS } from '../../domain/types.ts'
import type { Task, TaskQuery, ViewId } from '../../domain/types.ts'
import { useTaskStore } from '../../state/taskStoreContext.ts'
import { useNow } from '../../state/useNow.ts'
import { useToast } from '../../state/toastContext.ts'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog.tsx'
import { DailyProgress } from '../Dashboard/DailyProgress.tsx'
import { EmptyState } from '../Dashboard/EmptyState.tsx'
import { QuickAdd } from '../Dashboard/QuickAdd.tsx'
import { Toolbar } from '../Dashboard/Toolbar.tsx'
import { StorageNotice } from '../Notices/StorageNotice.tsx'
import { TaskFormDialog } from '../TaskForm/TaskFormDialog.tsx'
import { TaskList } from '../TaskList/TaskList.tsx'
import { taskCheckboxId } from '../TaskList/taskIds.ts'
import { ViewNav } from './ViewNav.tsx'
import './AppShell.css'

type FormState = { mode: 'create'; key: number } | { mode: 'edit'; key: number; task: Task }

function activeElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

/** Focuses after React has committed and any closing dialog has restored focus. */
function focusLater(target: () => HTMLElement | null) {
  requestAnimationFrame(() => target()?.focus())
}

export function AppShell() {
  const { tasks, loadResult, deleteTask } = useTaskStore()
  const { notify } = useToast()
  const now = useNow()

  const [view, setView] = useState<ViewId>('my-day')
  const [query, setQuery] = useState<TaskQuery>(DEFAULT_QUERY)
  const [form, setForm] = useState<FormState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)
  const formKey = useRef(0)
  const openerRef = useRef<HTMLElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const quickAddRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const counts = useMemo(() => viewCounts(tasks, now), [tasks, now])
  const viewTasks = useMemo(() => selectView(tasks, view, now), [tasks, view, now])
  const visibleTasks = useMemo(() => queryTasks(tasks, view, query, now), [tasks, view, query, now])
  const categories = useMemo(() => categoryOptions(tasks), [tasks])
  const viewLabel = VIEWS.find((item) => item.id === view)?.label ?? ''

  const openCreate = () => {
    openerRef.current = activeElement()
    formKey.current += 1
    setForm({ mode: 'create', key: formKey.current })
  }

  const openEdit = (task: Task) => {
    openerRef.current = activeElement()
    formKey.current += 1
    setForm({ mode: 'edit', key: formKey.current, task })
  }

  const closeForm = () => {
    setForm(null)
    focusLater(() => openerRef.current)
  }

  const requestDelete = (task: Task) => {
    openerRef.current = activeElement()
    setPendingDelete(task)
  }

  const cancelDelete = () => {
    setPendingDelete(null)
    focusLater(() => openerRef.current)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const index = visibleTasks.findIndex((task) => task.id === pendingDelete.id)
    const neighbour = visibleTasks[index + 1] ?? visibleTasks[index - 1]
    const ok = deleteTask(pendingDelete.id)
    setPendingDelete(null)
    if (ok) {
      notify('Task deleted')
      focusLater(() => (neighbour ? document.getElementById(taskCheckboxId(neighbour.id)) : headingRef.current))
    } else {
      focusLater(() => openerRef.current)
    }
  }

  const clearFilters = () => {
    setQuery((current) => ({ ...DEFAULT_QUERY, sort: current.sort }))
    focusLater(() => searchRef.current)
  }

  const focusQuickAdd = () => quickAddRef.current?.focus()

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="app">
        <header className="app__header">
          <p className="app__name">To-do</p>
          <button type="button" className="btn btn--primary app__add" onClick={openCreate}>
            Add task
          </button>
        </header>
        <ViewNav active={view} counts={counts} onSelect={setView} />
        <main id="main" className="app__main" tabIndex={-1}>
          <div className="app__content">
            <StorageNotice result={loadResult} />
            <h1 ref={headingRef} className="app__title" tabIndex={-1}>
              {viewLabel}
            </h1>
            <DailyProgress tasks={tasks} now={now} />
            <QuickAdd ref={quickAddRef} view={view} now={now} />
            <Toolbar
              query={query}
              onChange={setQuery}
              onClear={clearFilters}
              canClear={!isDefaultFilters(query)}
              categories={categories}
              searchRef={searchRef}
            />
            {viewTasks.length === 0 ? (
              <EmptyState kind="empty" view={view} onAction={focusQuickAdd} />
            ) : visibleTasks.length === 0 ? (
              <EmptyState kind="no-results" view={view} onAction={clearFilters} />
            ) : (
              <TaskList tasks={visibleTasks} now={now} label={`${viewLabel} tasks`} onEdit={openEdit} onDelete={requestDelete} />
            )}
          </div>
        </main>
      </div>
      {form && (
        <TaskFormDialog
          key={form.key}
          task={form.mode === 'edit' ? form.task : null}
          categories={categories.names}
          onClose={closeForm}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete task?"
          message={`Delete “${pendingDelete.title}”? This can't be undone.`}
          confirmLabel="Delete task"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </>
  )
}
