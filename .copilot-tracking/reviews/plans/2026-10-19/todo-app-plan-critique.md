<!-- markdownlint-disable-file -->
# RPI Plan Critique: To-do web app (requirements A–D)

## Metadata

* Task ID: todo-app
* Critique date: 2026-10-19
* Plan: .copilot-tracking/plans/2026-10-19/todo-app-plan.md
* Critique execution: Complete
* Critique depth: standard
* Depth provenance: default
* Critique type: initial
* Earlier critique: not applicable

## Inputs and Criterion Boundary

* Task context and caller requirements: build requirements A–D under claude.md (strict TS, plain CSS, hooks only, localStorage behind src/storage, no automated tests, timezone strategy, length limits). Standalone /task-plan, with user-owned decisions.
* Research and evidence considered: .copilot-tracking/research/2026-10-19/todo-app-research.md, .claude/commands/docs/requirements.md, claude.md, and the companion .copilot-tracking/details/2026-10-19/todo-app-details.md.
* Decisions, dependencies, task Goals, and task Requirements considered: D-01 to D-08, P01–P06 with all task blocks, FR-001 to FR-025, NFR-001 to NFR-007, the Risks table.
* Assessment boundary: the credibility of the plan and details against the supplied evidence. This critique does not verify the stack versions again or test the browser behavior itself.

## Coverage Assessment

| Requirement, research, phase, or task ID | Coverage | Evidence or concern |
|------------------------------------------|----------|---------------------|
| Requirements A1–A8, B1–B10, C1–C8, D1–D13 | Covered | Mapped to FR-001 to FR-025 and cited by tasks; P06-T03 checklist rows 1–22 exercise each FR and NFR |
| C9 dark theme | Covered (descoped) | D-03, listed in Non-Goals and Follow-Up Items |
| A10 category filter (FR-010) | Partial | See PC-001: the sentinel value collides with user data |
| D10 corrupt data (FR-019) | Partial | See PC-003: the recovered-result contract and the repair semantics are inconsistent between plan and details |
| claude.md limits | Partial | See PC-004: the category cap appears only in details and also drives the storage guards |
| P04 dependencies | Partial | See PC-002 |
| Research risks H/M | Covered | Date parsing (P02-T02, NFR-006), startup overwrite (P03-T01), randomUUID (P02-T03), staleness (P03-T02) |

## Verdict

* Verdict: Revise
* Rationale: The plan is coherent and covers everything in the boundary, but has one type-contract defect that would cause wrong filter results, one contract inconsistency in corrupt-data handling, an unbound constant that can drop stored data, and a missing task dependency. All four are direct planner corrections and need no user decision.

## Findings

<!-- rpi:critique id=PC-001 -->
### PC-001 [Medium]: Category filter sentinel collides with real category names

* Related IDs: P02-T01, P02-T05, P05-T02, FR-010
* Evidence: plan P02-T01 contract `category: string | 'all'`, where '' means uncategorized. D-05 allows any free-text category.
* Concern: `string | 'all'` collapses to `string`. A user category named "all" cannot be selected as a filter, and selecting "All" would be indistinguishable from it.
* Impact: wrong filter results for a valid input (A10, D9).
* Smallest useful change: change the contract to a non-colliding representation, for example `category: null | string`, where `null` = all and '' = uncategorized. Update the details and DEFAULT_QUERY to match.
* Action owner: planning parent
* Exact resolving evidence: the P02-T01 contract and the P05-T02 details use a representation in which no user string equals the "all" value.
* Decision route: direct planner correction

<!-- rpi:critique id=PC-002 -->
### PC-002 [Low]: P04-T01 omits its dependency on the shell's active view

* Related IDs: P04-T01, P03-T03
* Evidence: P04-T01 details render `selectView(tasks, view, now)` using the active view owned by P03-T03. P04-T01 Dependencies list P02-T02, P02-T05, P03-T01 and P03-T02 only.
* Concern: the dependency graph understates ordering.
* Impact: an implementer following dependencies could build the list before there is a view or a host region.
* Smallest useful change: add P03-T03 to the P04-T01 Dependencies.
* Action owner: planning parent
* Exact resolving evidence: P04-T01 Dependencies include P03-T03.
* Decision route: direct planner correction

<!-- rpi:critique id=PC-003 -->
### PC-003 [Medium]: The recovered load contract can't express an unreadable payload, and repair semantics differ between plan and details

* Related IDs: P02-T04, P03-T02, FR-019
* Evidence: the plan's `LoadResult` gives `recovered` a `droppedCount: number`. Details P02-T04 step 3 returns droppedCount 0 for unparseable data, while the P03-T02 notice says "We kept N task(s) and set aside the rest". The plan's P02-T04 says recovery and backup happen "when anything is dropped". Details step 6 also triggers them on repairs.
* Concern: for a fully unreadable payload, the notice would read "kept 0 and set aside the rest" with a count of 0, which is misleading. The plan and details also disagree on whether repairs report `recovered` and write a backup.
* Impact: misleading feedback (C5), and inconsistent implementation of D10.
* Smallest useful change: make `droppedCount: number | null` (null = payload unreadable), and state in the plan that repairs also count as recovered and trigger the backup. Align the notice copy in details P03-T02.
* Action owner: planning parent
* Exact resolving evidence: the P02-T04 contract and Requirements in the plan match details P02-T04 and P03-T02.
* Decision route: direct planner correction

<!-- rpi:critique id=PC-004 -->
### PC-004 [Low]: The category length cap is unbound but used by the storage guards

* Related IDs: P02-T03, P02-T04, FR-007
* Evidence: details P02-T03 introduces a 50-character category cap "the implementer may choose". Details P02-T04 guards drop records whose string lengths exceed LIMITS.
* Concern: if the cap isn't fixed in LIMITS and shared, a later change could make the guard drop previously valid stored tasks. claude.md sets no category limit.
* Impact: possible silent data loss on load (D10, D13).
* Smallest useful change: bind `categoryMax: 50` in the plan's P02-T03 Requirements as a LIMITS constant shared by the validator and the guard. Have the guard truncate rather than drop an over-long category.
* Action owner: planning parent
* Exact resolving evidence: the plan's P02-T03 Requirements name the category cap, and details P02-T04 repair rules cover over-long categories.
* Decision route: direct planner correction

## Strengths and Residual Risk

* The save-then-commit design, the lazy initializer and the no-startup-write rule directly address the two High research risks.
* Date logic takes `now` as a parameter everywhere, which makes manual verification of FR-025 and NFR-006 tractable.
* The manual checklist in details P06-T03 traces every FR and NFR, which is credible validation under the no-tests rule.
* Residual risk (accepted by the user via D-04): a date-only deadline viewed in another timezone may show a shifted date.

## Questions or Blocking Evidence Gaps

* None

## Limitations

* The critique ran inline in the planning session rather than in an isolated subagent, so independence is procedural only.
* Mermaid rendering was not previewed.

## Recommended Next Action

* Highest-impact finding: PC-001
* Action owner: planning parent
* Smallest next action: apply PC-001 to PC-004 as one batch of direct corrections
* User response required: no
