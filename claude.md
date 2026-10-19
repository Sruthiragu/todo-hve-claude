# Project rules

- App: personal to-do web app, single user. Full requirements are in docs/requirements.md.
- Stack: React + TypeScript (strict) + Vite. Plain CSS with CSS variables. React state and hooks only.
- Persistence: localStorage behind a small storage module (src/storage).
- Testing: no automated tests in this project; verify manually in the browser.
- Timezone strategy: deadlines are entered and shown in the user's local browser timezone and stored as ISO 8601 strings. "Today" means the user's local calendar day. A task with a date but no time is due at 23:59 local time that day.
- Limits: title 1-200 characters, not whitespace-only; description up to 2,000 characters; subtask title 1-200 characters.
- HVE workflow: research, plan, implement and review files go under .copilot-tracking/. Never skip a phase, and never build beyond the current plan.