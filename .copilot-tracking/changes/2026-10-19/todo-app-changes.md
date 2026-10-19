<!-- markdownlint-disable-file -->
# RPI Changes: To-do web app (requirements A–D)

## Metadata

* Task ID: todo-app
* Related plan: [.copilot-tracking/plans/2026-10-19/todo-app-plan.md](../../plans/2026-10-19/todo-app-plan.md)
* Step details: [.copilot-tracking/details/2026-10-19/todo-app-details.md](../../details/2026-10-19/todo-app-details.md)
* Implementation date: 2026-10-19

## Execution Status

* Status: Complete (review-finding invocation)
* Current invocation scope: Review findings RV-001 (P03-T02) and RV-002 (P04-T01) from [.copilot-tracking/reviews/logs/2026-10-19/todo-app-review.md](../../reviews/logs/2026-10-19/todo-app-review.md)
* Earlier declared invocation scope: full plan (Complete)
* Completed scope markers: P01 (P01-T01, P01-T02), P02 (P02-T01 to P02-T05), P03 (P03-T01 to P03-T03), P04 (P04-T01 to P04-T04), P05 (P05-T01 to P05-T03), P06 (P06-T01 to P06-T03)
* All remaining active-plan markers: none
* Status basis: every task's Requirements hold; `npm run build` and `npm run lint` pass; the P06-T03 checklist was executed in a real Chromium browser (headless Microsoft Edge driven over the DevTools protocol) with all checks passing. See the Validation Record for the method and its limits.

## Execution Summary

The repository went from HVE tooling only to a working, persistent, single-user to-do app on Vite 8 + React 19 + strict TypeScript, with `react` and `react-dom` as the only runtime dependencies. Business rules live in pure modules under `src/domain` (types, timezone-safe dates, validation, IDs, selectors). `src/storage` is the only code that touches localStorage, and it never throws. A store saves first and commits React state only after the save succeeds. The UI provides five views with live counts, a responsive sidebar/bottom navigation, quick-add, daily progress, a search/filter/sort toolbar, a create/edit dialog with a subtask editor, delete confirmation, toasts and storage notices.

Browser verification found and fixed two defects: a quick-add double submit within one event-loop task created a duplicate, and collapsed subtask checkboxes stayed keyboard-focusable. Both are described below.

## Completed Work

### Strict Vite + React + TypeScript project at the repository root

* Related phase or task: P01-T01
* Files:
  * [package.json](../../../package.json), [package-lock.json](../../../package-lock.json), [index.html](../../../index.html), [vite.config.ts](../../../vite.config.ts), [.oxlintrc.json](../../../.oxlintrc.json)
  * [tsconfig.json](../../../tsconfig.json), [tsconfig.app.json](../../../tsconfig.app.json), [tsconfig.node.json](../../../tsconfig.node.json)
  * [.gitignore](../../../.gitignore), [public/favicon.svg](../../../public/favicon.svg), [src/main.tsx](../../../src/main.tsx), [src/App.tsx](../../../src/App.tsx)
* Behavior or functionality changed: `npm run dev`, `npm run build` and `npm run lint` now work at the root. The template came from `create-vite` 9.3.0 (`react-ts`), scaffolded in a scratch folder and copied in without overwriting anything. `tsconfig.app.json` states `"strict": true` and `"noUncheckedIndexedAccess": true` explicitly. The existing `.gitignore` entries (`.hve-core/`, `.env`) are kept, and the template's ignore lines (including `node_modules`, `dist`) are appended. All demo content (assets, counter, template CSS, README) is gone. The document has `lang="en"` and the title "To-do", and the favicon is a simple checkmark. `<StrictMode>` and the oxlint setup are kept.
* Validation: Passed. Build and lint pass, and `dependencies` is `{"react":"^19.3.1","react-dom":"^19.3.1"}`.

### Design tokens and base styles

* Related phase or task: P01-T02
* Files:
  * [src/styles/tokens.css](../../../src/styles/tokens.css), [src/styles/base.css](../../../src/styles/base.css)
* Behavior or functionality changed: all colors, spacing, radii, type, shadows, focus ring, layout sizes and control heights are CSS custom properties on `:root` (light theme only, D-03). The base stylesheet provides a reset, a `:focus-visible` ring on every interactive element, `.visually-hidden`, a skip link, a global `[hidden]` rule, shared `.btn` and `.input` styles, the dialog backdrop and reduced-motion handling. Priority pairs were computed against WCAG: low 6.6:1, medium 5.8:1, high 5.6:1, urgent 6.6:1, overdue 5.8:1, muted text 5.4:1 or better.
* Validation: Passed. A grep finds no hex, `rgb(` or `hsl(` outside `tokens.css`.

### Domain types and constants

* Related phase or task: P02-T01
* Files:
  * [src/domain/types.ts](../../../src/domain/types.ts)
* Behavior or functionality changed: implements the plan's binding `Task`, `Subtask`, `TaskQuery` and related contracts, with `category: string | null` (null = all, '' = uncategorized). Adds `TaskDraft` for form input, `PRIORITIES`, `PRIORITY_LABEL`, `PRIORITY_RANK`, `VIEWS` (with short mobile labels) and `DEFAULT_QUERY`.
* Validation: Passed (type-checked by `tsc -b`).

### Timezone-safe date utilities

* Related phase or task: P02-T02
* Files:
  * [src/domain/dates.ts](../../../src/domain/dates.ts)
* Behavior or functionality changed: form input converts to a stored deadline and back. Date-only input becomes 23:59 local, and dates are built from numeric parts and then `toISOString()`. Local today and tomorrow windows, `isDueToday`, `isUpcoming`, `isOverdue` (exactly as specified) and `formatDeadline` (labels such as "Today · 14:30" and "Overdue · 2 h", plus a full date for the tooltip) all take `now` as a parameter. The top-of-file TSDoc documents the `claude.md` timezone strategy. Deviation from the details: `toDueAt` returns `null` for invalid input instead of assuming pre-validated input, so it is safe to call on its own.
* Validation: Passed. A grep of `new Date(` and `Date.parse(` shows only numeric-part construction or full ISO instants, never a date-only string. The browser timezone checks are in the Validation Record (row 6).

### Validation limits and ID generation

* Related phase or task: P02-T03
* Files:
  * [src/domain/validation.ts](../../../src/domain/validation.ts), [src/domain/id.ts](../../../src/domain/id.ts)
* Behavior or functionality changed: `LIMITS` (title 200, description 2000, subtask 200, category 50) is shared by the validators and the storage guards. `validateTaskInput` returns field-level messages, including real-calendar-date and time-requires-date checks. `createId` uses `crypto.randomUUID` only in a secure context and otherwise builds a v4-style ID from `crypto.getRandomValues`.
* Validation: Passed (rows 1, 8 and 22).

### Defensive localStorage module

* Related phase or task: P02-T04
* Files:
  * [src/storage/index.ts](../../../src/storage/index.ts), [src/storage/guards.ts](../../../src/storage/guards.ts)
* Behavior or functionality changed: `loadTasks` and `saveTasks` match the binding contract and never throw. Tasks are stored under `todo-app.tasks` as `{ version: 1, tasks }`. Guards accept only full ISO instants, so a date-only `dueAt` is dropped. They repair `hasDueTime` without a date, a `completedAt` on an incomplete task, untrimmed titles and categories, over-long categories (truncated to 50) and invalid or duplicate subtasks. Duplicate task IDs keep the first occurrence. An unreadable payload returns `droppedCount: null`. The raw original is backed up under `todo-app.tasks.backup.<ISO>` on a best-effort basis. Local judgment: an existing backup with identical content is reused, so repeated reloads don't pile up copies. A quota error maps to "Storage is full; your last change was not saved."
* Validation: Passed (rows 16 and 17 and the blocked-storage check).

### View and query selectors

* Related phase or task: P02-T05
* Files:
  * [src/domain/selectors.ts](../../../src/domain/selectors.ts)
* Behavior or functionality changed: view membership follows D-01, and `viewCounts` uses the same predicate, so badges equal list lengths. Search, filters, a stable and deterministic sort (no-date last, with `createdAt` and `id` tie-breaks) and `queryTasks` compose in a fixed view → search → filters → sort order. Also provides `dailyProgress` (D-02), `subtaskProgress`, `categoryOptions` and `isDefaultFilters`.
* Validation: Passed (rows 9–11 and 13).

### Persist-then-commit task store

* Related phase or task: P03-T01
* Files:
  * [src/state/tasksReducer.ts](../../../src/state/tasksReducer.ts), [src/state/taskStoreContext.ts](../../../src/state/taskStoreContext.ts), [src/state/TaskStoreProvider.tsx](../../../src/state/TaskStoreProvider.tsx)
* Behavior or functionality changed: a pure reducer handles create, update, toggle complete, delete, and add/rename/toggle/delete subtask, all by `id`. Create refuses an existing ID. The provider loads once through a lazy `useState` initializer and never writes at startup. `dispatch` computes the next list from a ref, calls `saveTasks` outside any state updater, and commits only on success. On failure, an error toast appears and the state is unchanged. Every action returns whether it committed. Context and provider are split into separate files so oxlint's component-export rule stays clean.
* Validation: Passed (rows 2, 12, 15 and 17).

### Clock hook, toasts and storage notices

* Related phase or task: P03-T02
* Files:
  * [src/state/useNow.ts](../../../src/state/useNow.ts), [src/state/toastContext.ts](../../../src/state/toastContext.ts), [src/state/ToastProvider.tsx](../../../src/state/ToastProvider.tsx)
  * [src/components/Notices/ToastRegion.tsx](../../../src/components/Notices/ToastRegion.tsx), [src/components/Notices/StorageNotice.tsx](../../../src/components/Notices/StorageNotice.tsx), [src/components/Notices/Notices.css](../../../src/components/Notices/Notices.css)
* Behavior or functionality changed: `useNow` refreshes every 60 s and when the tab becomes visible, and cleans up both listeners. Toasts render into an always-mounted `aria-live="polite"` region (info, auto-dismissed after 4 s) and a `role="alert"` region (errors, which stay until dismissed). A dismissible, non-modal storage notice explains recovered loads (unreadable, records set aside, or repaired, plus the backup outcome) and blocked storage.
* Validation: Passed (rows 16, 17 and 19, and the live region inspected in the keyboard check).

### Responsive shell and view navigation

* Related phase or task: P03-T03
* Files:
  * [src/components/AppShell/AppShell.tsx](../../../src/components/AppShell/AppShell.tsx), [src/components/AppShell/ViewNav.tsx](../../../src/components/AppShell/ViewNav.tsx), [src/components/AppShell/AppShell.css](../../../src/components/AppShell/AppShell.css)
* Behavior or functionality changed: the page has a skip link, header, `<nav aria-label="Views">` and `<main id="main">` with an `<h1>` naming the view. A single nav renders as a sidebar at 768px and wider (narrower from 768 to 1023px) and as a fixed bottom bar below 768px, using CSS only. Items are buttons with `aria-current="page"`, visible counts, and accessible names such as "Overdue, 3 tasks". Short labels appear on mobile, and the full label stays in the accessible name. The active view defaults to My Day, and focus stays on the nav button when the view changes.
* Validation: Passed (rows 11 and 18, and the keyboard tab order).

### Task rows with status, priority, deadline and subtask progress

* Related phase or task: P04-T01
* Files:
  * [src/components/TaskList/TaskList.tsx](../../../src/components/TaskList/TaskList.tsx), [src/components/TaskList/TaskItem.tsx](../../../src/components/TaskList/TaskItem.tsx), [src/components/TaskList/taskIds.ts](../../../src/components/TaskList/taskIds.ts), [src/components/TaskList/TaskList.css](../../../src/components/TaskList/TaskList.css)
* Behavior or functionality changed: the list is a semantic `ul`. Each row has a labeled checkbox (with a 44px label hit area on mobile), the title, a description preview, a priority badge with a text label, a deadline label (overdue shows the word "Overdue" and overdue tokens), a category chip, and a "x of y subtasks" disclosure that toggles subtasks immediately. Edit and Delete buttons are named with the task title. Completed rows use strikethrough and muted tone. Toggling announces "Task completed" or "Task reopened" only after a successful save.
* Validation: Passed (rows 3, 5 and 8). Fix found in browser checks: a class `display` rule overrode the `hidden` attribute, so collapsed subtask checkboxes stayed focusable. A global `[hidden] { display: none !important; }` in `base.css` fixes it, and a re-run confirmed they leave the tab order.

### Create and edit task dialog

* Related phase or task: P04-T02
* Files:
  * [src/components/TaskForm/TaskFormDialog.tsx](../../../src/components/TaskForm/TaskFormDialog.tsx), [src/components/TaskForm/TaskForm.css](../../../src/components/TaskForm/TaskForm.css)
* Behavior or functionality changed: a native modal `<dialog>` creates or edits a task. It has labeled fields for title, description (with a counter and a 2000 cap), priority (default medium), category (free text with a `<datalist>` of existing categories), date with Clear, and time (disabled until a date is set; clearing the date clears the time). Errors are inline, linked with `aria-describedby`, and focus moves to the first invalid field. Submit is guarded against repeats, and the dialog closes only after a successful commit. Edit updates by `id`, and the deadline round-trips through `fromDueAt`. Esc and Cancel close without saving, and focus returns to the opener. A 201-character title gets an inline error (no `maxLength` on the title, so the error is visible instead of silently truncated).
* Validation: Passed (rows 1, 2, 6 and 7, plus the keyboard dialog checks).

### Inline subtask editor

* Related phase or task: P04-T03
* Files:
  * [src/components/TaskForm/SubtaskEditor.tsx](../../../src/components/TaskForm/SubtaskEditor.tsx)
* Behavior or functionality changed: in the form you can add (Enter adds without submitting the form; blank adds nothing), rename (validated on blur and submit; an empty rename shows an error instead of deleting), toggle and delete subtasks. Each row has a labeled checkbox, a title input and a named delete button. Changes save with the task.
* Validation: Passed (row 8).

### Delete confirmation

* Related phase or task: P04-T04
* Files:
  * [src/components/ConfirmDialog/ConfirmDialog.tsx](../../../src/components/ConfirmDialog/ConfirmDialog.tsx), [src/components/ConfirmDialog/ConfirmDialog.css](../../../src/components/ConfirmDialog/ConfirmDialog.css)
* Behavior or functionality changed: a reusable modal confirm with Cancel first and focused, where Esc cancels. Delete reads "Delete “title”? This can't be undone." with a "Delete task" button. Confirming deletes by `id`, announces "Task deleted" and focuses the neighbouring row's checkbox (or the `<h1>`). Cancel returns focus to the Delete button.
* Validation: Passed (row 4, plus the keyboard focus checks).

### Quick-add and daily progress

* Related phase or task: P05-T01
* Files:
  * [src/components/Dashboard/QuickAdd.tsx](../../../src/components/Dashboard/QuickAdd.tsx), [src/components/Dashboard/DailyProgress.tsx](../../../src/components/Dashboard/DailyProgress.tsx), [src/components/Dashboard/Dashboard.css](../../../src/components/Dashboard/Dashboard.css)
* Behavior or functionality changed: a labeled single-field form creates a medium-priority task. In My Day it is due today with no time (D-08), and elsewhere it has no deadline. The toast says where the task went. The field clears only after a successful commit. Progress uses `<progress>` with "N of M done today", or "Nothing due today." when M = 0. Fix found in browser checks: two submits dispatched in the same event-loop task both read the stale title and created two tasks. A submit that is empty, or repeats the last added title, within 1 s of a successful add is now ignored.
* Validation: Passed (rows 12 and 13; the double-submit check failed before the fix and passed after).

### Search, filter and sort toolbar

* Related phase or task: P05-T02
* Files:
  * [src/components/Dashboard/Toolbar.tsx](../../../src/components/Dashboard/Toolbar.tsx)
* Behavior or functionality changed: a labeled search plus Status, Priority, Category, Due and Sort selects update the list immediately through `queryTasks`. Category options map back by index (All = null, names, Uncategorized = ''), so no string sentinel can collide. "Clear filters" appears only when a filter differs from the default. It resets search and filters, keeps sort and focuses search. Query state persists across views for the session and is not saved. Below 768px the selects collapse behind a "Filters" button with `aria-expanded` and `aria-controls`.
* Validation: Passed (rows 9, 10 and 14).

### Empty and no-results states

* Related phase or task: P05-T03
* Files:
  * [src/components/Dashboard/EmptyState.tsx](../../../src/components/Dashboard/EmptyState.tsx)
* Behavior or functionality changed: each view has its own empty copy. My Day and All Tasks offer a call to action that focuses quick-add. A distinct no-results state appears only when the view has tasks but filters hide them all, and offers "Clear filters". Local copy adjustment: the My Day empty title is "Your day is clear.", so it doesn't repeat the progress line's "Nothing due today."
* Validation: Passed (rows 14 and 15).

### Responsive tuning

* Related phase or task: P06-T01
* Files:
  * CSS files listed above
* Behavior or functionality changed: targets below 768px are at least 44px (nav items, row actions, checkbox hit areas, form and toolbar controls). Dialogs are `min(100% - 32px, 36rem)` wide and capped at the viewport height with internal scroll. The bottom nav respects the safe-area inset, and `main` is padded so it never covers the last item. Long titles wrap with `overflow-wrap: anywhere`. Content is centered at `--content-max` on wide screens.
* Validation: Passed (row 18 at 360, 768 and 1440 px, with a 150-character unbroken title).

### Accessibility and consistency pass

* Related phase or task: P06-T02
* Files:
  * CSS and components listed above
* Behavior or functionality changed: raw spacing and size values were moved into tokens (`--space-half`, `--sidebar-width-tablet`, control heights, checkbox sizes), and the `[hidden]` fix above was added. Component CSS now has no hard-coded color, spacing or radius values. The only raw values left are media-query breakpoints, the 1px visually-hidden clip, a 3px active-nav indicator and the textarea's minimum height.
* Validation: Passed (see the keyboard checks in the Validation Record).

### Manual verification checklist executed

* Related phase or task: P06-T03
* Files:
  * This changes record (no automated tests were added to the project, per `claude.md`)
* Behavior or functionality changed: none (verification only). The two defects it found are recorded under P04-T01 and P05-T01.
* Validation: Passed. See the Validation Record.

### Blocked-storage notice states that changes can't be saved (Review RV-001)

* Related phase or task: P03-T02
* Files:
  * [src/components/Notices/StorageNotice.tsx](../../../src/components/Notices/StorageNotice.tsx)
* Behavior or functionality changed: when `localStorage` is unavailable, the notice now reads "Your browser is blocking storage, so changes can't be saved." The old copy ("changes won't be kept after you close this page") suggested that changes would work until the page closed. In fact, persist-then-commit refuses every change when the save fails. The notice now matches the P03-T02 requirement and the app's real behavior.
* Validation: Passed (build and lint). The browser re-check was skipped (see the Validation Record).

### Row subtask checkboxes are named with their task (Review RV-002)

* Related phase or task: P04-T01
* Files:
  * [src/components/TaskList/TaskItem.tsx](../../../src/components/TaskList/TaskItem.tsx)
* Behavior or functionality changed: each subtask checkbox in a task row's expandable checklist now has an accessible name that includes both the subtask and the task, for example "Mark “Buy tickets” in “Trip” complete" (or "incomplete" when checked). This follows the row's completion-checkbox pattern. Subtasks with the same name under different tasks are now distinguishable, as P04-T01 requires. The visible text is unchanged.
* Validation: Passed (build and lint). The browser re-check was skipped (see the Validation Record).

## Implementation-Time Plan Updates

### Details notice copy aligned with the P03-T02 requirement (Review RV-001)

* Affected plan area or markers: [.copilot-tracking/details/2026-10-19/todo-app-details.md](../../details/2026-10-19/todo-app-details.md), P03-T02 message copy and P06-T03 checklist row 17
* What changed: the `unavailable` copy in the details now says "changes can't be saved". Row 17 now also expects a create or toggle under blocked storage to show an error toast and leave the list unchanged.
* Why: the details copy contradicted the plan's binding P03-T02 requirement ("says changes cannot be saved") and the behavior that FR-020 requires.
* Triggering evidence: Review RV-001, accepted by the user (review record RD-003).
* User answer or decision: "Use suggested action" for RV-001. No further decision was needed, because this is a factual correction toward an existing requirement.
* Reconciliation performed: the plan's P03-T02 Requirements already matched, so no plan-file change was needed. Markers P03-T02 and P04-T01 stay checked, because their Requirements hold again.
* Planning and critique state: unchanged (Ready). No follow-up critique.

### Disk-space blocker cleared by user decision

* Affected plan area or markers: P01-T01, and every check that needs `npm run build`
* What changed: no plan content changed. The environment blocker was resolved.
* Why: `npm install` failed with `ENOSPC` because C: had about 20 MB free.
* Triggering evidence: npm `TAR_ENTRY_ERROR ENOSPC`; `Get-PSDrive C` reported 0 bytes free; the npm cache held 619 MB.
* User answer or decision: "Clear npm cache". `npm cache clean --force` freed about 680 MB, and the install then succeeded with about 506 MB left free.
* Reconciliation performed: none needed.
* Planning and critique state: unchanged (Ready).

### Verification method for P06-T03

* Affected plan area or markers: P06-T02, P06-T03
* What changed: no plan content changed. The browser checklist ran in real headless Microsoft Edge (Chromium), driven over the DevTools protocol by throwaway scripts in the session scratchpad. It used DevTools timezone emulation, viewport emulation, and `localStorage` and `Storage.prototype.setItem` manipulation. No test files were added to the repository.
* Why: this session has no interactive browser, and the checklist's steps are DevTools operations that the protocol performs directly.
* Triggering evidence: Validation Record rows below.
* User answer or decision: none
* Reconciliation performed: limits are listed in the Validation Record.
* Planning and critique state: unchanged

## Business Alignment

* None

## Validation Record

| Check | Scope | Status | Evidence or reason |
|-------|-------|--------|--------------------|
| `npm run build` (`tsc -b && vite build`) | full plan | Passed | 0 type errors; 50 modules; JS 254 kB (78 kB gzip), CSS 17 kB |
| `npm run lint` (oxlint) | full plan | Passed | exit 0, no findings |
| Runtime dependencies | NFR-002 | Passed | only `react` and `react-dom` |
| Strict TS flags | NFR-001 | Passed | `strict` and `noUncheckedIndexedAccess` in `tsconfig.app.json` |
| Hard-coded colors / `new Date(` grep | NFR-007, P02-T02 | Passed | no colors outside `tokens.css`; no date-only parsing |
| Row 1 (FR-001, FR-022) | browser | Passed | whitespace-only and empty titles get inline errors with focus on Title; 201 chars → "Title must be 200 characters or fewer."; description `maxLength` 2000; valid task → "Task added" |
| Row 2 (FR-002, FR-021) | browser | Passed | edit renames in place; task count unchanged |
| Row 3 (FR-003) | browser | Passed | `completedAt` set; `data-completed` styling; Completed count 1; "Task completed" in the live region |
| Row 4 (FR-004) | browser | Passed | dialog names the task; Cancel focused; Esc keeps the task; confirm removes only it (other records byte-identical); "Task deleted" |
| Row 5 (FR-005, FR-016) | browser | Passed (DOM) | badges render text labels with priority token classes; colors checked by computed contrast, not by eye |
| Row 6 (FR-006, NFR-006) | browser | Passed | date-only today in Pacific/Honolulu, UTC and Pacific/Kiritimati: stored as local 23:59, in My Day, not overdue, edit round-trips date with an empty time; date+time round-trips 09:30 |
| Row 7 (FR-007) | browser | Passed (partial) | category trimmed; `<datalist>` filled from existing categories. The native suggestion popup can't be observed headless. |
| Row 8 (FR-008) | browser | Passed | Enter adds a subtask without submitting; blank ignored; empty rename shows an error; row toggle updates "1 of 2" and persists |
| Row 9 (FR-009) | browser | Passed | "HOTEL" matches description "Book hotel" |
| Row 10 (FR-010, FR-011) | browser | Passed | deadline sort puts the no-date task last; filters compose with the view |
| Row 11 (FR-012, FR-013) | browser | Passed | Upcoming badge counts tomorrow's task; badges match lists in every check |
| Row 12 (FR-014, D-08) | browser | Passed after fix | My Day quick-add is due today 23:59 with no time; three rapid submits → 1 task, no spurious error (failed before the fix: 2 tasks) |
| Row 13 (FR-015) | browser | Passed | "1 of 1 done today"; "Nothing due today." when none |
| Row 14 (FR-017) | browser | Passed | no-results state; Clear filters resets search and keeps sort |
| Row 15 (FR-018) | browser | Passed | fresh profile: key absent and empty state shown; reload keeps tasks |
| Row 16 (FR-019, NFR-005) | browser | Passed | `not json` → notice, backup holds the raw value, main key not overwritten; envelope with valid, invalid, duplicate-ID and date-only-dueAt records → 1 kept, "set aside 3", repaired, backup kept |
| Row 17 (FR-020, FR-023) | browser | Passed | `setItem` throwing a quota error → `role="alert"` "Storage is full…", list and checkbox unchanged, quick-add draft kept. `localStorage` getter throwing `SecurityError` → app renders with the "blocking storage" notice |
| Row 18 (FR-024, NFR-004) | browser | Passed | 360px: no horizontal scroll, fixed bottom nav, smallest target 44px; 768 and 1440: sidebar, no horizontal scroll |
| Row 19 (FR-025) | browser | Passed | a task due 3 s ahead shows "Overdue · 1 min" and Overdue count 1 after the visibility refresh. The 60 s interval itself was not timed. |
| Row 20 (NFR-001, NFR-002) | repo | Passed | see the rows above |
| Row 21 (NFR-003, NFR-007) | browser | Passed with limits | Tab order follows visual order with a visible ring on every stop; skip link focuses `main`; Tab stays inside the open dialog; Esc closes it and focus returns to the opener; Space toggles; every control has an accessible name. Not done: a real screen reader (live region content inspected instead, as the details allow) and an eye-check of contrast (ratios computed from tokens) |
| Row 22 (IDs over LAN) | browser | Passed | `http://192.168.1.101:4174`: `isSecureContext` false, `crypto.randomUUID` undefined, task created with a v4 ID and no error |

| `npm run build` after RV-001/RV-002 | review-finding scope | Passed | `tsc -b` 0 errors; 50 modules; JS 254.38 kB (78.37 kB gzip), CSS 16.76 kB |
| `npm run lint` after RV-001/RV-002 | review-finding scope | Passed | exit 0, no findings |
| Stale-copy grep | RV-001 | Passed | "won't be kept" no longer appears in `src/` or the details |
| Browser re-check of rows 17 and 21 | RV-001, RV-002 | Skipped | Both are a copy change and an `aria-label` with no logic change, and build plus type-checking cover them. Confirm by hand: block site data and read the notice; inspect a row subtask checkbox's accessible name in DevTools |

Limit: everything above ran in headless Chromium. A short hands-on pass in your own browser is still worth doing for visual polish, the native date, time and datalist pickers, a real screen reader, and a physical phone.

## Pre-Review Reconciliation

* Plan markers and task-local context: current. All `Pxx` and `Pxx-Txx` markers are checked, and no `Guidance:` blocks were needed because all tasks were implemented in this one pass.
* Completed-work entries and handoff prose: current
* Validation, blockers, remaining work, and follow-up items: current
* Review readiness: ready

## Blockers

* None. The disk-space blocker was cleared by clearing the npm cache.

## Remaining Work

* None in the plan. A hands-on visual and screen-reader pass is recommended (see the Validation Record limits).

## Follow-Up Items

* Canonical plan list: [.copilot-tracking/plans/2026-10-19/todo-app-plan.md](../../plans/2026-10-19/todo-app-plan.md), `## Follow-Up Items`
* `claude.md` points to `docs/requirements.md`, but the file is at `.claude/commands/docs/requirements.md`. Owner: user.
* Multi-tab sync through the `storage` event. Owner: user, for a future RPI loop.
* Dark theme (C9). Tokens make it additive. Owner: user, for a future RPI loop.
* Drive C: had about 500 MB free after the install. Low disk space can make saves fail in other tools. Owner: user (environment, outside the app).

## Return-to-Caller State

* Implementation execution status: Complete (full plan earlier; review findings RV-001 and RV-002 in this invocation)
* Declared scope and markers: full plan; P01–P06 and all 20 tasks checked; no remaining markers. RV-001 (P03-T02) and RV-002 (P04-T01) implemented; both markers remain checked
* Validation coverage: build and lint pass; checklist rows 1–22 executed in headless Chromium (all pass, rows 7 and 21 with the limits noted)
* Blockers: none
* Current plan updates: none to requirements or design; two process notes (disk space, verification method)
* Business alignment entries: none
* Planning and critique state: Ready; PC-001 to PC-004 were resolved before implementation
* Follow-up items: the three plan items plus disk-space headroom
* Review readiness or no-handoff reason: ready for review
* Continuation owner: user
