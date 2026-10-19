<!-- markdownlint-disable-file -->
# Task Research: todo-app

| Field              | Value                       |
|--------------------|-----------------------------|
| Date               | 2026-10-19                  |
| Researcher / agent | rpi-research (Claude Code)  |
| Output mode        | convergence                 |

## Executive Summary

* Bottom line: The repository is greenfield. It contains only the HVE tooling, claude.md and the requirements file. The full scope in sections A, B, C and D can be built with the mandated stack (React 19 + TypeScript strict + Vite 8, plain CSS, hooks, localStorage) and needs no extra runtime dependencies. The browser platform already provides what the hard parts need: `<dialog>` for delete confirmation, `Intl`/`Date` for local-time handling, and `crypto.randomUUID` for IDs. The riskiest area is date handling. The data model has to record whether a deadline has a time, and date-only strings must never be parsed with `new Date("YYYY-MM-DD")`.
* Why this matters: Business rules D4–D6 (overdue logic and a single timezone strategy) and D10–D13 (corrupt storage, no duplicates, UI consistent with persisted data) are where a naive build breaks quietly. The plan has to design them explicitly.
* Research status: Complete. One cycle ran all three waves. The user answered the three product questions: views may overlap, daily progress is completion of tasks due today, and the theme is light only.
* Confidence and uncertainty: High for the stack, platform APIs and date pitfalls, which are backed by primary sources. The view and progress rules are now user-confirmed decisions.

## What You May Not Know

* The requirements file isn't at docs/requirements.md. It's at .claude/commands/docs/requirements.md, a Claude Code slash command, and the project rules file is claude.md (lowercase). docs/requirements-ai.md is referenced but doesn't exist. It's out of scope anyway.
* The current Vite template ships TypeScript ~7.0 (the native Go compiler) and no longer writes `"strict": true` into the tsconfig, because TypeScript 6.0 made `strict` the default. Strict mode is therefore on, but CLAUDE.md requires it explicitly, so the plan should still set it so the requirement is visible.
* `new Date("2026-10-19")` parses as UTC midnight, not local midnight. In any timezone west of UTC, a date-only deadline would land on the previous day.
* `crypto.randomUUID()` only works in secure contexts. `localhost` qualifies, but opening the dev server from a phone over a LAN IP (`vite --host`) does not, so ID generation would throw during mobile testing.
* The template's default linter is oxlint, not ESLint.

## Findings

### The workspace is greenfield and the requirements live in an unexpected place

No src/, package.json or docs/ folder exists. The git history shows only two HVE setup commits. The authoritative requirements are .claude/commands/docs/requirements.md, sections A–E. The project rules are in claude.md. Planning should scaffold from scratch and cite these real paths.

* Questions: Q1
* Evidence state: Evidence-backed finding
* Evidence: C1, C2, C3, C4
* Confidence and limits: High. A missing docs/requirements-ai.md has no effect, because AI features are explicitly out of scope.

### The mandated stack is current and needs no extra runtime dependencies

The create-vite 9.3.0 react-ts template pins react/react-dom ^19.3.1, vite ^8.3.4, @vitejs/plugin-react ^6.1.2, typescript ~7.0.2 and oxlint. Vite 8 requires Node ^20.19 or >=22.12, and the local Node is 22.21.0. Every requirement can be met with React state and hooks (`useReducer` plus a context or prop drilling), plain CSS custom properties, and browser APIs. Requirement E says extra state libraries need justification, and nothing found here justifies one.

* Questions: Q2
* Evidence state: Evidence-backed finding
* Evidence: C5, W1, W2
* Confidence and limits: High for the versions as of 2026-10-19. Run `npm create vite@latest` at implementation time and pin whatever it emits.

### Strict TypeScript is the default, but should be stated explicitly

TypeScript 6.0 made `strict` default to true, `types` default to `[]`, and `noUncheckedSideEffectImports` default to true. The template's tsconfig.app.json sets `types: ["vite/client"]`, which covers CSS side-effect imports, and leaves out `strict`. Adding `"strict": true` (and optionally `noUncheckedIndexedAccess`) changes nothing at runtime and makes the CLAUDE.md rule checkable.

* Questions: Q2
* Evidence state: Evidence-backed finding
* Evidence: C5, W3
* Confidence and limits: High. The source is the official release notes.

### Date and time handling needs an explicit model to satisfy CLAUDE.md and D4–D6

CLAUDE.md fixes the strategy. Users enter and see deadlines in the browser's local timezone. Deadlines are stored as ISO 8601. "Today" means the local calendar day. A date with no time is due at 23:59 local time. The evidence implies three constraints:

1. Date-only strings are parsed as UTC (W4). Build dates from their parts (`new Date(y, m-1, d, 23, 59)`) or from a local date-time string without an offset (`"YYYY-MM-DDTHH:mm"`, which is parsed as local).
2. Storing only the computed 23:59 instant as an ISO string loses whether the user picked a time. The edit form and the "no time" display couldn't round-trip. The model needs to keep either a `hasTime` flag next to the ISO `dueAt`, or separate `dueDate` and `dueTime` fields from which the instant is derived.
3. Overdue is `!completed && dueAt != null && dueAt < now` (D4, D5). "Today" bucketing compares against local start and end of day. A task with no deadline has `dueAt = null` and can never be overdue, due today or upcoming. It appears only in All Tasks and Completed.

`<input type="date">` and `<input type="time">` give local `YYYY-MM-DD` and `HH:mm` strings that fit this model directly.

* Questions: Q3, Q4
* Evidence state: Evidence-backed finding
* Evidence: C2, W4
* Confidence and limits: High for the parsing behavior. Whether to store an instant plus a flag or the local parts is a design choice (D-04). Storing local parts keeps the "date without time" meaning stable if the user travels across timezones. Storing an instant matches the "stored as ISO 8601" wording more literally. Recommendation: store `dueAt` as an ISO string (UTC `Z`) plus `hasDueTime: boolean`. This satisfies CLAUDE.md literally and round-trips the form.

### localStorage needs a defensive storage module

Reading `localStorage` can throw `SecurityError` (blocked storage, `file:` origins), and `setItem` can throw `QuotaExceededError`. D10 (corrupt data) and D13 (UI consistent with persisted data) together mean src/storage should:

- Wrap reads in try/catch, then `JSON.parse`, then run a runtime shape validation.
- Keep a versioned envelope (`{ version, tasks }`).
- Drop or repair invalid records instead of crashing, and back up unreadable raw data under a separate key rather than overwriting it.
- Report write failures so the UI can show an error.

The app should only commit state, or show success feedback, after a save succeeds. Concretely: compute the next state, attempt the save, then either dispatch the change or roll back and show an error. No validation library is needed, and hand-written type guards are enough for strict TypeScript.

* Questions: Q5
* Evidence state: Evidence-backed finding
* Evidence: C2, W5
* Confidence and limits: High for the exceptions. The rollback approach is a design inference.

### React 19 StrictMode affects how initialization should be written

The Vite template wraps the app in `<StrictMode>`, which runs effects twice in development. Loading storage through a lazy `useState`/`useReducer` initializer, not a mount effect, avoids double loads and an initial empty-state write that could overwrite saved data. A brief initialization state (requirement C6) can still be shown while the module validates data.

* Questions: Q5, Q7
* Evidence state: Partially supported claim
* Evidence: C5 (template main.tsx uses StrictMode); the double-invoke behavior is from general React documentation knowledge and was not fetched this cycle.
* Confidence and limits: Medium-high. This affects implementation patterns, not scope.

### Native `<dialog>` covers the confirmation and accessibility requirements cheaply

`showModal()` makes the background inert, moves focus inside, closes on Esc, and implies `aria-modal="true"`. `<dialog>` has been Baseline widely available since March 2022. That covers C7, D8 and part of C4 for delete confirmation without a library. MDN advises always providing an explicit close or cancel button, and using `autofocus` on the safest action (Cancel for a destructive delete).

* Questions: Q6
* Evidence state: Evidence-backed finding
* Evidence: W6
* Confidence and limits: High. Returning focus to the triggering element after close should be checked manually.

### ID generation must not break mobile-device testing

`crypto.randomUUID()` is Baseline but secure-context only. Mobile testing over plain-HTTP LAN would break task creation. Use a fallback such as `Date.now().toString(36)` plus `Math.random()`, or `crypto.getRandomValues`, which is available in non-secure contexts. Stable unique IDs, plus updating tasks by ID with `map` instead of appending, address D7 and D11.

* Questions: Q5
* Evidence state: Evidence-backed finding
* Evidence: W7
* Confidence and limits: High.

### Requirement coverage map (A–D)

Every item maps onto a small set of components and pure functions. No item needs a backend or a library.

| Area | Items | Building block |
|------|-------|----------------|
| A1–A2, D1, D2 | Create and edit, title required (1–200, not whitespace-only), description ≤ 2,000 | Task form with inline validation messages; shared `validateTask` |
| A3, D3 | Complete and reopen; visually distinct | Checkbox toggle; completed styling (strikethrough, muted) |
| A4, C7, D7 | Delete with confirmation; no collateral changes | `<dialog>` confirmation; delete by ID |
| A5, B8 | Priority Low/Medium/High/Urgent; clear indicators | Union type; color plus text label (not color alone) |
| A6, B8 | Optional due date and time; deadline indicator | Date/time inputs; relative label such as "Overdue · 2h" |
| A7 | Category or project | Free-text string with datalist suggestions from existing categories |
| A8, D12 | Subtasks with completion; parent progress | `subtasks[]` (title 1–200); progress = done/total |
| A9–A11, D9 | Search, filter (status, priority, category, due), sort (created, priority, deadline) | One pure pipeline: view → search → filters → sort, so they compose |
| B1–B5, D4, D5 | My Day, Upcoming, Overdue, Completed, All | Pure `selectView(tasks, view, now)` predicates |
| B6 | Quick-add | Title-only input on the dashboard, Enter to add |
| B7 | Daily progress | Done ÷ total among tasks due today (D-02) |
| B9 | Empty states | Per-view message plus call to action; separate "no results for filters" state |
| B10 | Counts | Badge counts from the same predicates |
| C1, C8 | Minimalist, consistent | CSS variables (color, spacing, radius, type scale) |
| C2, C3 | Sidebar on desktop; mobile navigation | Sidebar ≥ ~768px; bottom tab bar or drawer below |
| C4 | Labels, keyboard, focus | Native controls, `<label>`, `:focus-visible` outline, skip link, `aria-current` on nav |
| C5 | Validation and feedback | Inline errors plus an `aria-live` status toast ("Task deleted") |
| C6 | Loading/initialization | Brief init state while storage is read and validated |
| C9 | Light/dark | Out of scope this round: light only (D-03) |
| D6 | One timezone strategy | Documented in claude.md; single date utility module |
| D8 | Deleting doesn't affect others | Filter by ID |
| D10, D13 | Corrupt data; UI matches persisted data | Storage module finding above |
| D11 | No duplicates | Update by ID; quick-add guards against double submit |

* Questions: Q1, Q4, Q6, Q7
* Evidence state: Evidence-backed finding
* Evidence: C1, C2
* Confidence and limits: The coverage is complete against the requirements text. The building blocks are recommendations, not a plan.

## Recommendation and Alternatives

* Recommendation: Scaffold with the official create-vite react-ts template and add `"strict": true` explicitly. Use one `useReducer` store with a persistence wrapper (save first, commit after) behind src/storage. Use a pure, timezone-aware domain module for dates, view predicates, filtering and sorting. Store `dueAt` as an ISO string plus `hasDueTime`. Use plain CSS with custom properties. Use native `<dialog>`. No runtime dependencies beyond react and react-dom.
* Rationale: This meets every CLAUDE.md constraint (C2), uses current template defaults (C5, W1–W3), avoids the date-parsing trap (W4), and handles storage failures (W5).
* What could change this result: A later decision to support travelers across timezones, which would favor storing local date and time parts (D-04).

| Option | Benefits | Costs and risks | Evidence | Disposition |
|--------|----------|-----------------|----------|-------------|
| useReducer + context, plain CSS, native APIs | Meets the CLAUDE.md stack exactly; zero extra dependencies | More hand-written validation | C2, C5 | selected |
| Add Zustand/Redux for state | Devtools | Violates "React state and hooks only" | C2 | rejected |
| Add zod for storage validation | Concise schemas | Extra dependency for a small shape | C2 | rejected (hand-written guards suffice) |
| date-fns / Temporal for dates | Less date arithmetic | Extra dependency; Temporal support uneven | W4 | rejected; a small local utility is enough |
| Store local date and time parts instead of an ISO instant | Stable across travel | Deviates from the literal "stored as ISO 8601" wording | C2, W4 | viable alternative (D-04) |
| Custom modal instead of `<dialog>` | Full styling control | Must replicate focus trapping, Esc and inert | W6 | rejected |

## Scope and Questions

* Goal: Evidence needed to plan the build of the to-do app in .claude/commands/docs/requirements.md, sections A, B, C and D, under claude.md.
* Audience and use: The user and the downstream Plan phase.
* In scope: Repository state, requirements, project rules, stack versions, browser API behavior relevant to the requirements.
* Out of scope: AI features (requirements-ai.md), automated tests (claude.md says manual verification), backend or sync, planning, app code.
* Decision and evidence criteria: Every A–D item mapped to a feasible approach within the CLAUDE.md constraints. Primary sources for platform claims.
* Requested output: Convergent recommendation with planning readiness.

| ID | Question | Source | Status |
|----|----------|--------|--------|
| Q1 | What exists in the repository, and where are the requirements and rules? | inferred | answered |
| Q2 | What are the current versions and defaults for the mandated stack? | inferred | answered |
| Q3 | How should the CLAUDE.md timezone strategy be implemented without parsing bugs? | explicit (D6) | answered |
| Q4 | How are the five views and overdue defined precisely? | explicit (B, D4, D5) | answered (D-01) |
| Q5 | How should persistence handle corruption, failures, duplicates and consistency? | explicit (D10, D11, D13) | answered |
| Q6 | How should delete confirmation and accessibility be delivered? | explicit (C4, C7) | answered |
| Q7 | What do daily progress and initialization states mean? | explicit (B7, C6) | answered (D-02) |

## Decisions and Feedback

| Group | Decision or feedback item | Status | Owner | Rationale or input needed | Evidence | Impact of answer |
|-------|---------------------------|--------|-------|---------------------------|----------|------------------|
| D-01 | View membership | confirmed | user | My Day = all tasks due today (completed and already-late included); Overdue = incomplete and past deadline (can overlap My Day); Upcoming = due tomorrow or later | C1 | Defines the view predicates and counts |
| D-02 | Daily progress formula | confirmed | user | Completed ÷ total among tasks due today ("3 of 5 done today"); 0 due today shows an empty state | C1 | Defines the progress indicator |
| D-03 | Light/dark theme in this round | confirmed | user | Light only this round; keep colors in CSS variables so a theme can be added later | C1 | Scope of the CSS work |
| D-04 | Deadline storage: ISO `dueAt` + `hasDueTime` | proposed | agent | Satisfies the literal CLAUDE.md wording and round-trips the form | C2, W4 | Data model |
| D-05 | Category as free text with suggestions (no category management screen) | proposed | agent | A7 says "simple"; avoids extra CRUD | C1 | UI scope |
| D-06 | Subtasks: add, rename, toggle, delete inline; no due dates or priorities | proposed | agent | A8 only requires add and complete | C1 | UI scope |
| D-07 | No new runtime dependencies | proposed | agent | CLAUDE.md stack rule | C2 | Dependencies |

## Risks and Open Questions

| Priority | Type | Risk, question, or research item | Impact | Smallest action or evidence needed | Owner |
|----------|------|----------------------------------|--------|-------------------------------------|-------|
| H | risk | Date-only parsing as UTC shifts deadlines by a day | Wrong overdue and My Day results | Single date utility; never `new Date("YYYY-MM-DD")` | downstream |
| H | risk | Initial empty state saved over existing data at startup | Data loss | Lazy initializer; save only after user actions | downstream |
| M | risk | `crypto.randomUUID` unavailable over LAN HTTP | Create fails on phone testing | Fallback ID generator | downstream |
| M | risk | Views go stale at midnight or when a deadline passes | Stale overdue state while the tab stays open | Re-render on a minute interval and on `visibilitychange` | downstream |
| L | open question | Multi-tab edits overwrite each other | Lost edits across tabs | Optional `storage` event listener; single user, so low priority | downstream |
| L | further research | A11y checks against WCAG 2.2 AA | Quality | Manual keyboard and screen-reader pass at review | downstream |

## Planning Readiness and Next Step

| Field | Record |
|-------|--------|
| Research disposition | executed |
| Decision participation | user-owned (standalone /task-research invocation) |
| Planning Readiness | Ready: evidence is complete (C1–C5, W1–W7) and D-01 to D-03 are confirmed by the user |
| Research depth and helpers | Cycle 1: Wider, Deeper and Contrarian completed; no helper subagent used |
| Blockers | none |
| Output mode and planning support | convergence; supports planning |
| Continuation owner | user |
| Required gates or confirmations | Decision walkthrough D-01 to D-03 completed |
| Next action | /task-plan (this repository's equivalent of /rpi-plan) |
| Primary evidence file | .copilot-tracking/research/2026-10-19/todo-app-research.md; date source: current date |

## Research Record

### Method and Boundaries

| Field | Record |
|-------|--------|
| Research posture and provenance | balanced; default |
| Completion basis | All A–D items mapped; platform claims checked against primary sources; contrarian wave found no stack-level blocker |
| Explicit limits or deadline | none |
| Codebase and external scope | whole workspace excluding .hve-core internals beyond workflow files; npm registry, MDN, TypeScript docs |
| Initial candidate areas | claude.md, .claude/commands/docs/requirements.md, git history; npm, MDN, typescriptlang.org |
| Evidence root | .copilot-tracking/research/ (default; the codebase root) |
| Constraints and excluded sources | Research only; no app code; requirements-ai.md excluded |
| Prior knowledge | No prior .copilot-tracking artifacts existed |

### Extensions and Participation

#### Extension Registry

| Kind | Candidate | Provenance and scoped contract | Selected or skipped reason |
|------|-----------|--------------------------------|----------------------------|
| instruction | hve-core/copilot-tracking.instructions.md | applyTo .copilot-tracking/research/** | selected: path, header and plain-text path conventions |
| instruction | hve-core/copilot-tracking-location.instructions.md | applyTo **/.copilot-tracking/** | selected: tracking root at the repository root |
| instruction | hve-core/licensing-posture.instructions.md | applyTo **/.copilot-tracking/** | selected: MDN/TS excerpts paraphrased, with short quotes only |
| instruction | coding-standards/typescript/typescript-doc-comments.instructions.md | applyTo **/*.ts(x) | skipped for research; relevant to Implement (TSDoc on reusable APIs) |
| skill | accessibility (WCAG 2.2, APG) | research-relevant domain skill | skipped this cycle; candidate for the Review phase |

#### Direction and Participation Log

| Checkpoint or change | Question, direction, or rationale | Answer or no-interaction reason | Result and revalidation effect |
|----------------------|-----------------------------------|---------------------------------|--------------------------------|
| intake | Requirements path mismatch (docs/ vs .claude/commands/docs/) | No question; the only matching file is unambiguous | Used the existing file |
| convergence | D-01 views, D-02 progress, D-03 theme | Overlap allowed; due-today completion; light only | Decisions confirmed; Ready; C9 descoped |

### Research Cycle Log

#### Cycle 1

* Active posture, controls, and limits: balanced; research only; AI features excluded.

##### Wave 1: Wider

* Focus and questions: Q1, Q2. Repository state, requirement and rule files, stack versions.
* Evidence: C1–C5, W1, W2.
* Reflection: Greenfield confirmed. The template changed (TS 7, oxlint, no explicit `strict`), so it needs a deeper look.

##### Wave 2: Deeper

* Focus and questions: Q2–Q6. TypeScript defaults, date parsing, storage exceptions, `<dialog>`.
* Evidence: W3, W4, W5, W6.
* Reflection: Date parsing and storage failure modes are the main design drivers.

##### Wave 3: Contrarian

* Focus and questions: Does anything justify libraries (state, validation, dates)? Can platform APIs fail in realistic usage?
* Evidence: W7 (randomUUID secure-context limit); C5 (StrictMode in template); C2 (stack rule).
* Reflection: No library justified. Found two environment pitfalls (LAN HTTP, StrictMode init) that are now recorded as risks.

##### Synthesis and Re-entry

| Material or claim | Evidence | Disposition | Rationale | User-facing effect |
|-------------------|----------|-------------|-----------|--------------------|
| Stack needs no extra dependencies | C2, C5 | accepted | All requirements map to hooks and platform APIs | Recommendation |
| Store instant + hasDueTime | C2, W4 | accepted (D-04 proposed) | Round-trips the form, literal ISO rule | Finding |
| Use date-fns/Temporal | W4 | rejected | Small utility suffices; dependency rule | Alternatives |
| View overlap and progress semantics | C1 | deferred to user | Product choice | D-01, D-02 |

* Another complete three-wave cycle needed: no
* Trigger or stop basis: All questions answered; remaining items are user decisions, not evidence gaps.
* Readiness or revalidation effect: Ready; D-01 to D-03 confirmed.

### Evidence Log

* Helpers: none

| ID | Claim or finding | Source or location | Retrieved and version | Tool | Confidence | Notes |
|----|------------------|--------------------|-----------------------|------|------------|-------|
| C1 | Requirements A–E (to-do features, views, UX, business rules, stack) | .claude/commands/docs/requirements.md, all sections | not applicable | read | high | File is a slash command; docs/ folder absent |
| C2 | Project rules: stack, timezone strategy, limits, no automated tests, HVE workflow | claude.md, "Project rules" | not applicable | read | high | Lowercase filename |
| C3 | Repository contains only .claude, .hve-core (gitignored), .gitignore, claude.md | workspace root listing; .gitignore | not applicable | search | high | No src/, package.json or docs/ |
| C4 | History is two HVE setup commits | git log | not applicable | read-only CLI | high | |
| C5 | react-ts template: React ^19.3.1, Vite ^8.3.4, plugin-react ^6.1.2, TS ~7.0.2, oxlint; tsconfig.app.json has no `strict` key; types vite/client | create-vite 9.3.0 package, template-react-ts | npm, 2026-10-19 | npm pack (read-only) | high | Inspected in the session scratchpad |
| W1 | Current versions: vite 8.3.4, react 19.3.1, typescript 7.0.2, @vitejs/plugin-react 6.1.2 | npm registry, https://www.npmjs.com/ | 2026-10-19 | npm view | high | |
| W2 | Vite engines: node ^20.19.0 or >=22.12.0; local node 22.21.0 | npm registry, vite package metadata | 2026-10-19 | npm view | high | |
| W3 | TS 6.0: strict defaults to true; types defaults to []; noUncheckedSideEffectImports true | TypeScript 6.0 release notes, https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html | 2026-10-19 | web fetch | high | Secondary coverage (visualstudiomagazine.com) agrees |
| W4 | Date-only ISO strings parse as UTC; date-time without offset parses as local | MDN Date.parse, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse | 2026-10-19 | web fetch | high | |
| W5 | localStorage access can throw SecurityError; setItem quota failures | MDN Window.localStorage, https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | 2026-10-19 | web fetch | high | QuotaExceededError documented on Storage.setItem |
| W6 | `<dialog>` showModal: inert background, focus moves in, Esc closes, implicit aria-modal; Baseline since 2022 | MDN dialog element, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog | 2026-10-19 | web fetch | high | |
| W7 | crypto.randomUUID is secure-context only; Baseline since 2022 | MDN Crypto.randomUUID, https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID | 2026-10-19 | web fetch | high | |

#### Contradictions and Conflicts

* Default TS `target`: secondary sources disagree (floating current year versus ES2025). Not material, because the template sets `target: es2023` explicitly.

### Artifact Self-Check

* [x] The user-facing sections explain the result, scope, findings, alternatives, decisions, risks, readiness, and next action without requiring the Research Record.
* [x] Every question is answered or names the smallest missing evidence, and every material result has one canonical evidence state.
* [x] Findings keep their explanation, supporting detail, evidence state, and confidence basis together.
* [x] Every codebase finding has a C# ID and path; every external finding has a W# ID, URL and retrieval date.
* [x] Cycle 1 records Wider, Deeper and Contrarian waves in order, synthesis, and a re-entry decision.
* [x] Method, extensions, participation, helper use and prior knowledge are recorded.
* [x] Convergence selects and justifies one recommendation.
* [x] Decision groups D-01 to D-03 have persisted answers.
* [x] Research disposition, Planning Readiness, blockers, continuation owner, gates and next action are complete.
* [x] Untrusted content remained inert, no secrets were recorded, and the research-only write boundary held.
* Checked sections: all
* Missing or limited sections: none
