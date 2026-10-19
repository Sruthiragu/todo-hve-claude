<!-- markdownlint-disable-file -->
# Step Details: To-do web app (todo-app)

Companion to .copilot-tracking/plans/2026-10-19/todo-app-plan.md. The plan is authoritative for goals, requirements (FR/NFR IDs), dependencies and readiness. This file gives step-level implementation context per task, keyed by the same Pxx-Txx IDs. Steps are guidance. The implementer may deviate where the plan's Requirements still hold, and records the deviation in the changes record.

Evidence: .copilot-tracking/research/2026-10-19/todo-app-research.md, .claude/commands/docs/requirements.md, claude.md.

## Target file layout (illustrative)

```text
index.html
package.json, tsconfig*.json, vite.config.ts, .oxlintrc.json (as emitted)
src/
  main.tsx                  # StrictMode + <App/>
  App.tsx                   # providers + AppShell
  styles/tokens.css         # all design tokens
  styles/base.css           # reset, focus, utilities
  domain/types.ts
  domain/dates.ts
  domain/validation.ts
  domain/id.ts
  domain/selectors.ts
  storage/index.ts          # loadTasks, saveTasks
  storage/guards.ts         # runtime type guards
  state/tasksReducer.ts     # pure transitions
  state/TaskStore.tsx       # context + persist-then-commit
  state/useNow.ts
  state/useToast.tsx        # toast context + live region
  components/AppShell/…     # layout, Sidebar, BottomNav
  components/TaskList/…     # TaskList, TaskItem, SubtaskChecklist
  components/TaskForm/…     # TaskFormDialog, SubtaskEditor
  components/ConfirmDialog/…
  components/Dashboard/…    # QuickAdd, DailyProgress, Toolbar, EmptyState
  components/Notices/…      # StorageNotice, ToastRegion
```

Names are illustrative. The boundaries are binding: domain modules have no React imports, and storage is the only module that touches localStorage.

## P01-T01: Scaffold Vite react-ts with explicit strict TypeScript

1. Confirm Node meets Vite's engines (`node --version`; ^20.19 or ≥ 22.12).
2. The root already contains .gitignore, claude.md, .claude/ and .hve-core/. To avoid prompts and overwrites, scaffold into a temporary sibling folder (for example `npm create vite@latest todo-scaffold -- --template react-ts`). Move its contents into the root, skipping any file that already exists. Merge the template's .gitignore lines into the existing .gitignore by hand. Delete the temporary folder.
3. `npm install`. Keep the exact versions create-vite emitted. Do not upgrade or add runtime packages (D-07).
4. In tsconfig.app.json add `"strict": true` and `"noUncheckedIndexedAccess": true` next to the template options. Keep `types: ["vite/client"]`.
5. Remove the demo content: src/assets/*, public/vite.svg (or replace it with a simple favicon), the counter in App.tsx, App.css and index.css template rules.
6. index.html: `<html lang="en">`, `<title>To-do</title>`, viewport meta (template has it).
7. Run `npm run build` and `npm run lint`. Both must pass with a placeholder `<App/>`.
8. Confirm .gitignore still contains its original entries and now also ignores node_modules and dist.

## P01-T02: Establish CSS tokens and base styles

tokens.css (`:root` custom properties). Suggested groups and names:

- Color: `--color-bg`, `--color-surface`, `--color-surface-muted`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-contrast`, `--color-danger`, `--color-danger-contrast`, `--color-success`, `--color-focus`.
- Priority: `--priority-low-bg/fg`, `--priority-medium-bg/fg`, `--priority-high-bg/fg`, `--priority-urgent-bg/fg`. Each fg/bg pair must reach ≥ 4.5:1. Check with DevTools' contrast picker.
- Overdue: `--color-overdue-fg`, `--color-overdue-bg`.
- Spacing scale: `--space-1` (4px) … `--space-8` (48px).
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`.
- Type: `--font-sans` (system stack), `--text-sm`, `--text-md`, `--text-lg`, `--text-xl`, `--leading`.
- Elevation: `--shadow-sm`, `--shadow-md`.
- Focus: `--focus-ring: 0 0 0 3px var(--color-focus)`.
- Layout: `--sidebar-width`, `--bottom-nav-height`, `--content-max`.

base.css:

- Minimal reset (box-sizing, margin 0, inherit font on form controls).
- `body` uses `--color-bg`, `--color-text`, `--font-sans`.
- `:focus-visible { outline: none; box-shadow: var(--focus-ring); }` on all interactive elements. Never remove focus without a replacement.
- `.visually-hidden` utility (clip pattern).
- `.skip-link`, visually hidden until focused.
- `dialog::backdrop` tint from a token.
- Respect `prefers-reduced-motion` by disabling transitions.

Import both in main.tsx. Light theme only (D-03): no `prefers-color-scheme` block this round.

## P02-T01: Define the domain types

- Implement exactly the contract in the plan (src/domain/types.ts).
- Export `PRIORITIES: readonly Priority[] = ['low','medium','high','urgent']`, `PRIORITY_LABEL: Record<Priority,string>` and `PRIORITY_RANK: Record<Priority,number>` (urgent 3 … low 0) for selects, labels and sorting.
- Export `VIEWS: readonly { id: ViewId; label: string }[]` in nav order: My Day, Upcoming, Overdue, Completed, All Tasks.
- Export `DEFAULT_QUERY: TaskQuery` with `category: null` (all categories). `''` means "Uncategorized" and any other string is a named category, so no user value can collide with "All".
- Invariant: `dueAt === null ⇒ hasDueTime === false`. Constructors in the reducer enforce it, and storage guards repair it (set `hasDueTime` false) rather than dropping the record.

## P02-T02: Implement timezone-safe date utilities

src/domain/dates.ts, with no React imports. Suggested API:

- `toDueAt(date: string, time: string | ''): { dueAt: string; hasDueTime: boolean }`. Parse `YYYY-MM-DD` and `HH:mm` with a regex into numbers. Build `new Date(y, m - 1, d, hh, mm, 0, 0)`, using 23:59 when the time is empty. Return `toISOString()`. Throw nothing. Callers validate the format first, and the validation module rejects invalid dates such as 2026-02-31 by checking that the built date's local parts match the input.
- `fromDueAt(dueAt: string, hasDueTime: boolean): { date: string; time: string }`. Use local getters (`getFullYear`, `getMonth`, `getDate`, `getHours`, `getMinutes`) and zero-pad. `time` is '' when `!hasDueTime`.
- `startOfLocalDay(now: Date): Date` returns `new Date(y, m, d)`. `startOfTomorrow(now)` returns `new Date(y, m, d + 1)`.
- `isDueToday(task, now)`: `dueAt` within [startOfLocalDay(now), startOfTomorrow(now)).
- `isUpcoming(task, now)`: `dueAt` ≥ startOfTomorrow(now).
- `isOverdue(task, now)`: exactly as in the plan's Requirements.
- `formatDeadline(task, now): { label: string; tone: 'overdue' | 'today' | 'soon' | 'later' | 'done' }`. Use `Intl.DateTimeFormat(undefined, …)` for absolute dates and `Intl.RelativeTimeFormat` for relative ones. Examples (illustrative): "Today", "Today · 14:30", "Tomorrow", "Fri 24 Oct", "Overdue · 2 h", "Overdue · 3 d". Date-only tasks show no time.
- `todayInputValue(now): string` returns the local `YYYY-MM-DD` used as the date input's default and for D-08 quick-add.

Never call `new Date(string)` on a `YYYY-MM-DD` value. A grep check before closing the task: search src for `new Date(` and inspect each hit.

TSDoc at the top of the file paraphrases the claude.md timezone strategy: local entry and display, ISO storage, local "today", and date-only means 23:59 local.

## P02-T03: Implement validation and ID generation

src/domain/validation.ts:

- `LIMITS = { titleMax: 200, descriptionMax: 2000, subtaskTitleMax: 200, categoryMax: 50 } as const`. Import the same object in storage/guards.ts.
- `validateTaskInput(input: { title: string; description: string; date: string; time: string; category: string }): Partial<Record<'title'|'description'|'date'|'time'|'category', string>>`.
  - title: trimmed length 0 → "Enter a title."; > 200 → "Title must be 200 characters or fewer."
  - description: length > 2000 → "Description must be 2,000 characters or fewer."
  - date: '' is allowed; otherwise must match `^\d{4}-\d{2}-\d{2}$` and be a real calendar date.
  - time: '' is allowed. If present it requires a date ("Add a date to set a time.") and must match `^\d{2}:\d{2}$`.
  - category: trimmed length ≤ `LIMITS.categoryMax` (50, bound by the plan) → "Category must be 50 characters or fewer."
- `validateSubtaskTitle(title: string): string | null` uses the same rules as the title, with the 200 limit.

src/domain/id.ts:

- `createId()`: `if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' && window.isSecureContext) return crypto.randomUUID();`. Otherwise build 16 random bytes with `crypto.getRandomValues` and format them as a v4-style hex string. `randomUUID` exists but throws in insecure contexts, so check `isSecureContext` instead of relying on the function check alone.

## P02-T04: Implement the defensive storage module

src/storage/index.ts and src/storage/guards.ts.

- Key: `todo-app.tasks`. Backup key format: `todo-app.tasks.backup.<ISO timestamp>`.
- Getting the storage object itself can throw (`window.localStorage` access raises `SecurityError`), so wrap the access inside try/catch in a helper `getStorage(): Storage | null`.

loadTasks():

1. `getStorage()` is null, or `getItem` throws → `{ status: 'unavailable', tasks: [], error }`.
2. Raw is null → `{ status: 'empty', tasks: [] }`.
3. `JSON.parse` throws, or the envelope is not `{ version: 1, tasks: unknown[] }` → write a backup of raw, return `recovered` with `tasks: []`, `droppedCount: null` (payload unreadable), `repairedCount: 0` and the `backupKey`.
4. For each element: `isTask(x)` (guards.ts) checks every field's type, the enum membership of priority, string lengths within LIMITS (after trim for titles), parseable ISO strings for `dueAt`, `createdAt`, `updatedAt` and `completedAt`, and an array of valid subtasks. Repairable inconsistencies are repaired, not dropped: `hasDueTime` true with `dueAt` null becomes false; `completedAt` set while incomplete becomes null; a category longer than `LIMITS.categoryMax` is truncated. Each repaired task increments `repairedCount`. Drop invalid subtasks inside an otherwise valid task and count it as recovered.
5. Deduplicate by `id`, keeping the first occurrence.
6. Anything dropped or repaired → write the backup of the original raw, then return `recovered` with counts. Otherwise return `ok`.
7. Backup writes are best-effort. If `setItem` for the backup throws (for example on quota), return `backupKey: null`, and the notice says the backup could not be kept. Loading never fails because a backup failed.

saveTasks(tasks):

- `JSON.stringify({ version: 1, tasks })` → `setItem`. Catch everything. Map `QuotaExceededError` (check `name`) to "Storage is full; your last change was not saved." Map other errors to "Your change could not be saved."
- Never throw to callers.

## P02-T05: Implement view and query selectors

src/domain/selectors.ts. Pure functions with no React imports. Every time-dependent function takes `now`.

- `selectView(tasks, view, now): Task[]`, using the date predicates from dates.ts: my-day → `isDueToday`; upcoming → `isUpcoming`; overdue → `isOverdue`; completed → `t.completed`; all → every task.
- `viewCounts(tasks, now): Record<ViewId, number>` is built from `selectView(...).length` for each view, or the same predicates in one pass. Never use a separate formula.
- `matchesSearch(task, search)`: `q = search.trim().toLowerCase()`; an empty q matches everything; otherwise check `title.toLowerCase().includes(q) || description.toLowerCase().includes(q)`.
- `matchesFilters(task, query, now)`:
  - status: active = `!completed`, completed = `completed`
  - priority: an exact match when not 'all'
  - category: `null` = any; otherwise `task.category === query.category`, where '' matches uncategorized
  - due: overdue → `isOverdue`; today → `isDueToday`; upcoming → `isUpcoming`; none → `dueAt === null`; any → true
- `compareTasks(sort)`: returns a comparator. Apply with `[...list].sort(cmp)` and never sort in place.
  - created: `createdAt` descending
  - priority: `PRIORITY_RANK` descending, then `dueAt` ascending with nulls last
  - deadline: `dueAt` ascending with nulls last
  - tie-breakers for all: `createdAt` descending, then `id` ascending
- `queryTasks(tasks, view, query, now)` = `selectView` → filter(`matchesSearch`) → filter(`matchesFilters`) → sort.
- `dailyProgress(tasks, now)`: over `selectView(tasks, 'my-day', now)`, `done` = completed count, `total` = length.
- `subtaskProgress(task)`: `{ done: subtasks.filter(s => s.completed).length, total: subtasks.length }`.

Edge cases to reason through (checked manually in P06-T03 rows 10–13):

| Task | My Day | Upcoming | Overdue | Completed | All |
|------|--------|----------|---------|-----------|-----|
| No deadline, incomplete | – | – | – | – | ✓ |
| No deadline, completed | – | – | – | ✓ | ✓ |
| Due today 23:59 (date only), incomplete, before 23:59 | ✓ | – | – | – | ✓ |
| Due today 09:00, incomplete, now 10:00 | ✓ | – | ✓ | – | ✓ |
| Due today 09:00, completed | ✓ | – | – | ✓ | ✓ |
| Due yesterday, incomplete | – | – | ✓ | – | ✓ |
| Due yesterday, completed | – | – | – | ✓ | ✓ |
| Due tomorrow 00:00, incomplete | – | ✓ | – | – | ✓ |
| Due next week, completed | – | ✓ | – | ✓ | ✓ |

Upcoming includes completed tasks, consistent with D-01's "due tomorrow or later". The status filter can hide them.

## P03-T01: Build the task store with persist-then-commit

- state/tasksReducer.ts: `type TaskAction = { type: 'create'; task: Task } | { type: 'update'; id; changes } | { type: 'toggleComplete'; id; now } | { type: 'delete'; id } | { type: 'addSubtask'; id; subtask } | { type: 'renameSubtask'; id; subtaskId; title } | { type: 'toggleSubtask'; id; subtaskId } | { type: 'deleteSubtask'; id; subtaskId }`. Pure function `(tasks, action) => Task[]`. IDs and timestamps are created by the caller before dispatch, so the reducer stays deterministic.
- `update` and the subtask actions set `updatedAt`. `toggleComplete` sets `completedAt` to `now.toISOString()` or clears it to null.
- TaskStore.tsx: `const [loadResult] = useState(loadTasks)` (lazy). `const [tasks, setTasks] = useState(loadResult.tasks)`. Keep `tasksRef` synced to the latest committed list.
- `dispatch(action): boolean`:
  1. `const next = tasksReducer(tasksRef.current, action)`.
  2. If `next === tasksRef.current`, return true (no-op).
  3. `const res = saveTasks(next)`.
  4. If `res.ok`, set `tasksRef.current = next`, call `setTasks(next)` and return true. Otherwise show an error toast with `res.error` and return false.

  Saving happens outside any `setState` updater, so StrictMode's double-invoked updaters cannot save twice.
- No `useEffect` writes to storage. Nothing saves at startup.
- Expose `{ tasks, dispatch, loadResult }` via context. Helper action creators (`createTask(input)`, etc.) can live in the store and build the full `Task` with `createId()` and timestamps.

## P03-T02: Add the clock hook, feedback toasts and storage notices

- useNow: `useState(() => new Date())`. A `setInterval` every 60 000 ms sets a new Date. A `visibilitychange` handler sets a new Date when `document.visibilityState === 'visible'`. Clean up both. Optional: align the first tick to the next minute boundary.
- Toasts: a context with `notify(message, tone?: 'info' | 'error')`. ToastRegion renders one `<div aria-live="polite" aria-atomic="true">` (always mounted) for info messages and a separate `role="alert"` region for errors. Messages auto-dismiss after about 4 s, with a dismiss button; errors stay until dismissed.
- StorageNotice reads `loadResult`:
  - recovered, `droppedCount === null`: "Your saved tasks couldn't be read, so the app started empty."
  - recovered, `droppedCount > 0`: "Some saved data was damaged. We kept N task(s) and set aside M."
  - recovered, `droppedCount === 0` (repairs only): "Some saved tasks had small problems and were fixed."
  - Then append " A backup copy of the original data was saved." when `backupKey` is set, or " A backup copy couldn't be saved." when it's null.
  - unavailable: "Your browser is blocking storage, so changes can't be saved." (every change is refused, because saves fail and nothing commits without a successful save)
  - Dismissible. Rendered above the main content and not modal.
- First run (status `empty`) shows the view empty state from P05-T03. There is no spinner (plan assumption for C6).

## P03-T03: Build the responsive shell and view navigation

- Landmarks: skip link → `<header>` (app name) → `<nav aria-label="Views">` → `<main id="main" tabIndex={-1}>` containing `<h1>` with the current view label.
- ≥ 768px: CSS grid `var(--sidebar-width) 1fr`, with the nav as a vertical list in the sidebar.
- < 768px: the nav renders as a fixed bottom bar with five items (icon optional, text label required, short labels allowed, for example "All"). `main` gets bottom padding equal to `--bottom-nav-height` plus the safe-area inset.
- The same component renders both, switched by CSS media queries, so there's one DOM nav and no JS width detection.
- Item: `<button type="button" aria-current={active ? 'page' : undefined}>`, with the label and `<span class="count" aria-hidden="true">3</span>` plus a visually hidden ", 3 tasks". Counts come from `viewCounts(tasks, now)`.
- Changing view moves focus to the `<h1>`, or leaves it on the nav button. Pick one, and keep it consistent.

## P04-T01: Render task items with status, priority, deadline and progress

- TaskList receives the visible tasks (initially `selectView(tasks, view, now)`; P05-T02 switches this to `queryTasks`). It renders `<ul aria-label="Tasks">`.
- TaskItem layout: checkbox (`aria-label="Mark ‘<title>’ complete"` or "Mark ‘<title>’ incomplete"); title, plus a one-line description preview when present; meta row with priority badge (text + token colors), deadline label from `formatDeadline` (overdue tone uses overdue tokens and the word "Overdue"), category chip, and subtask progress "2 of 5 subtasks"; actions "Edit" and "Delete" with `aria-label`s including the title.
- Completed: the row gets a `data-completed` attribute and CSS applies strikethrough on the title, muted text and reduced badge emphasis. The checkbox state itself also signals completion.
- Subtask checklist: a disclosure button (`aria-expanded`) shows the subtasks with checkboxes that dispatch `toggleSubtask` immediately.
- Toggle feedback: `notify('Task completed')` or `notify('Task reopened')`, only when `dispatch` returns true.

## P04-T02: Build the create and edit task form

- TaskFormDialog uses `<dialog>` with `showModal()` when opened and `close()` on cancel or success. Store the opener element and focus it on close.
- Draft state: `{ title, description, priority, date, time, category, subtasks }`. In edit mode, initialize from the task, using `fromDueAt` for date and time.
- Fields:
  - Title: `<input required maxLength={200}>`. Validation still runs on submit, because `maxLength` doesn't catch whitespace-only titles.
  - Description: `<textarea maxLength={2000}>` with a live counter "123 / 2000". The counter is `aria-live="off"`; announce only on reaching the limit.
  - Priority: `<select>` with the four labels, default `medium`.
  - Due date: `<input type="date">` with a "Clear" button. Due time: `<input type="time" disabled={!date}>`. Clearing the date clears the time.
  - Category: `<input list="category-options">` plus a `<datalist>` of distinct trimmed non-empty categories, sorted.
- Submit: run `validateTaskInput` and the subtask validation. On errors, render messages under the fields (`id` + `aria-describedby`, `aria-invalid`) and focus the first invalid field. Otherwise convert the deadline with `toDueAt` (or null) and dispatch `create` with a new `id`, or `update` with the existing `id`.
- Double-submit guard: a `submitting` flag disables the Save button, and the handler returns early when the flag is set. Save is synchronous, but the guard still blocks Enter repeat and double-click before re-render.
- Feedback: "Task added" or "Changes saved" only after `dispatch` returns true. On failure, keep the dialog open with the draft intact; the error toast comes from the store.
- Entry points: an "Add task" button in the header or toolbar opens create mode. "Edit" on a row opens edit mode.

## P04-T03: Build the subtask editor inside the form

- SubtaskEditor works on `draft.subtasks`: a list of rows, each with a checkbox (labeled by the subtask title), a text input for the title (labeled "Subtask title"), and a delete button ("Delete subtask ‘<title>’").
- New-subtask row: input + "Add" button. On Enter, call `preventDefault()` (so the form doesn't submit), validate, append `{ id: createId(), title: trimmed, completed: false }`, clear the input and keep focus there.
- Renaming validates on blur and on form submit. An empty rename shows an error rather than silently deleting.
- Everything persists only when the form is saved (as part of `create` or `update`). In edit mode, the `update` action replaces the `subtasks` array wholesale.

## P04-T04: Add delete confirmation

- ConfirmDialog props: `{ open, title, message, confirmLabel, onConfirm, onCancel }`. Use `showModal()`. Cancel button first in the DOM with `autoFocus`. Confirm button uses danger tokens.
- Message: "Delete ‘<title>’? This can't be undone." Confirm label "Delete task".
- Handle the native `cancel` event (Esc) as `onCancel`.
- On confirm, `dispatch({ type: 'delete', id })`. If it returns true, close, notify "Task deleted" and focus the next row's checkbox (or the previous row's, or the `<h1>` when the list is empty). If it returns false, close and return focus to the delete button; the store's error toast explains.

## P05-T01: Add quick-add and the daily progress indicator

- QuickAdd: a `<form>` with a visually labeled input ("Add a task") and a submit button. On submit, validate the title. Build the task: priority `medium`, description '', category ''. When the active view is `my-day`, use `toDueAt(todayInputValue(now), '')`; otherwise `dueAt: null`. Dispatch `create`. On success, clear the input, keep focus, and notify "Task added to My Day" or "Task added to All Tasks" (adapt to the view).
- Guard against double submit with a flag, as in P04-T02.
- DailyProgress: `const { done, total } = dailyProgress(tasks, now)`. When total > 0, render `<progress max={total} value={done} aria-label="Today's progress">` and the text "3 of 5 done today". When total is 0, show "Nothing due today."
- Placement: top of the main column, under the `<h1>`, for every view. Progress always describes today, regardless of the active view.

## P05-T02: Add the search, filter and sort toolbar

- Query state lives in the shell (`useState<TaskQuery>(DEFAULT_QUERY)`) and is passed to the toolbar and the list.
- Controls:
  - search `<input type="search">` labeled "Search tasks"
  - status `<select>` (All / Active / Completed)
  - priority `<select>` (All / Urgent / High / Medium / Low)
  - category `<select>` (All / each category / Uncategorized when applicable). Option values must map back to `null` / name / `''` without string sentinels, for example by indexing into an options array.
  - due `<select>` (Any / Overdue / Today / Upcoming / No date)
  - sort `<select>` (Newest / Priority / Deadline)
- `queryTasks(tasks, view, query, now)` composes in this order: `selectView` → search → status → priority → category → due → sort.
- "Clear filters" button: visible when any non-sort field differs from the default. It resets those fields and returns focus to the search input.
- Narrow screens: a "Filters" button with `aria-expanded` and `aria-controls` shows or hides the selects. The search input stays visible.

## P05-T03: Add view-specific and no-results empty states

Shown when `selectView(tasks, view, now)` is empty (illustrative copy):

- My Day: "Nothing due today." CTA "Add a task for today" focuses quick-add.
- Upcoming: "No upcoming deadlines." Secondary text: "Tasks with a future due date appear here."
- Overdue: "You're all caught up. No overdue tasks."
- Completed: "No completed tasks yet."
- All Tasks: "No tasks yet. Add your first one above." CTA focuses quick-add.

No-results (the view has tasks but `queryTasks` is empty): "No tasks match your search or filters." CTA "Clear filters".

Render as `<section aria-live="polite">` within main, styled with tokens.

## P06-T01: Tune responsive layout across breakpoints

- Check widths 360, 390, 768, 1024, 1280 and 1440 in DevTools device mode.
- Below 768px: 44px minimum targets (checkbox hit area via padding or a label wrapper); the bottom nav respects `env(safe-area-inset-bottom)`; dialogs use `width: min(100% - 2*var(--space-4), 36rem)` and `max-height: 100dvh - margin`, with internal scroll.
- 768–1023px (tablet): sidebar may collapse to a narrower width; toolbar selects wrap.
- ≥ 1024px: content max-width from `--content-max`, centered.
- Look for long unbroken titles: apply `overflow-wrap: anywhere` on titles and descriptions.

## P06-T02: Run the accessibility and consistency pass

Checklist:

- Keyboard only: reach every control in visual order; open, use and close every dialog with Esc; focus returns to the opener; the skip link jumps to main.
- Focus ring visible on buttons, inputs, selects, checkboxes, nav items and dialog controls.
- Accessibility tree (DevTools): every control has a name; nav has `aria-current`; dialogs are modal; errors are linked via `aria-describedby`.
- Live regions: toasts are announced (check with a screen reader, for example NVDA or Narrator, if available; otherwise inspect that the region updates).
- Contrast: check priority badges, muted text, overdue label and completed text with the DevTools contrast checker (≥ 4.5:1).
- Consistency: search src for hex, `rgb(` and `hsl(` outside src/styles/tokens.css, and replace hits with tokens.

## P06-T03: Verify every requirement manually and record evidence

Run `npm run build` and `npm run lint` first. Then run each check in a Chromium browser, and record pass or fail with a short note in .copilot-tracking/changes/2026-10-19/todo-app-changes.md.

| # | Covers | Check |
|---|--------|-------|
| 1 | FR-001, FR-022 | Submit an empty title, a whitespace-only title and a 201-character title: each shows an inline error. A 2001-character description is blocked. A valid task is created with a "Task added" toast. |
| 2 | FR-002, FR-021 | Edit a task's every field and save: exactly one task with the new values (count unchanged). |
| 3 | FR-003 | Complete, then reopen: styling changes both ways, the toast is announced, and Completed view membership follows. |
| 4 | FR-004 | Delete: the dialog names the task, Cancel/Esc keep it, and confirm removes only it (the other tasks' fields are unchanged). |
| 5 | FR-005, FR-016 | Each priority shows its text label and color. |
| 6 | FR-006, NFR-006 | Date-only task for today: it shows in My Day as not overdue before 23:59 local. Set the DevTools Sensors timezone to Pacific/Honolulu, UTC and Pacific/Kiritimati (UTC+14) or Pacific/Tongatapu (UTC+13), reload, and confirm that a newly entered date-only task shows the entered date and the correct bucket in each. Edit round-trips date-only and date+time exactly. |
| 7 | FR-007 | Typing shows category suggestions from existing tasks. The value is trimmed. |
| 8 | FR-008 | Add, rename, toggle and delete subtasks in the form, and toggle in the row: progress "x of y" is accurate after each change and after reload. Empty or 201-character subtask titles are rejected. |
| 9 | FR-009 | Search matches title and description case-insensitively. |
| 10 | FR-010, FR-011 | Combine view + search + each filter + each sort: results match a hand check. Deadline sort puts no-date tasks last. |
| 11 | FR-012, FR-013 | Create tasks due yesterday, today (past time and future time), tomorrow and none, plus a completed task due today. Verify each view's membership against D-01, and that the badges equal the list lengths. No-deadline tasks appear only in All (and Completed when done). |
| 12 | FR-014, D-08 | Quick-add in My Day: the task is due today with no time and appears. Quick-add in All: no deadline. Enter twice fast creates one task. |
| 13 | FR-015 | Progress shows "N of M done today" and updates on toggle. "Nothing due today" when M = 0. |
| 14 | FR-017 | Each view's empty state appears, and no-results appears with "Clear filters" working. |
| 15 | FR-018 | Reload: everything persists. Fresh profile: the empty state shows and nothing is written until the first action (localStorage key absent in DevTools). |
| 16 | FR-019, NFR-005 | In DevTools Application > Local Storage, set the key to `not json`, then reload: no crash, a notice appears, and a backup key exists with the raw value. Set it to an envelope with one valid task, one invalid task and one duplicate-ID task, then reload: one task is shown, the notice says data was set aside, and a backup exists. |
| 17 | FR-020, FR-023 | Simulate a failed save: in the console, temporarily override `Storage.prototype.setItem` to throw. Create, edit, toggle and delete then show an error toast, and the UI keeps its previous state (also after restoring setItem and reloading). Simulate unavailable storage (block site data in browser settings): the app renders with the "changes can't be saved" notice, and a create or toggle shows an error toast and leaves the list unchanged. |
| 18 | FR-024, NFR-004 | Sidebar at ≥ 768px, bottom nav below. No horizontal scroll from 360 to 1440. |
| 19 | FR-025 | Create a task due 2 minutes from now and wait with the tab open: it moves to Overdue within about a minute of the deadline, and the counts update. Switch tabs and back: refreshed immediately. |
| 20 | NFR-001, NFR-002 | tsconfig.app.json has strict true; build and lint pass; package.json dependencies are only react and react-dom. |
| 21 | NFR-003, NFR-007 | P06-T02 checklist completed with no open failures. |
| 22 | IDs over LAN | `npm run dev -- --host`, open the LAN URL (on a phone or another device): creating a task works (non-secure context fallback). |

Failures stay recorded. Fix them within the plan's scope and re-run the affected checks, or record them as blockers or follow-ups.
