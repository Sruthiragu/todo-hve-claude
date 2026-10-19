# To-Do App Requirements

Project-wide decisions (timezone strategy, length limits, stack details) are in `CLAUDE.md`. AI agent features are out of scope for this round; they are covered separately in `docs/requirements-ai.md`.

## A. Task management

Users must be able to:

- Create tasks with a required title and an optional description.
- Edit existing tasks.
- Mark tasks as complete and reopen completed tasks.
- Delete tasks, with a confirmation step.
- Assign a priority: Low, Medium, High, or Urgent.
- Set an optional due date and an optional due time.
- Assign a simple category or project.
- Add subtasks to a task and complete them.
- Search tasks by title and description.
- Filter tasks by status, priority, category, and due date.
- Sort tasks by creation date, priority, or deadline.

## B. Dashboard and navigation

Provide the following views:

- **My Day:** tasks due today.
- **Upcoming:** tasks due in the future.
- **Overdue:** incomplete tasks whose deadlines have passed.
- **Completed:** finished tasks.
- **All Tasks:** every task.

The dashboard must include:

- A quick-add task field.
- A daily progress indicator.
- Clear priority and deadline indicators.
- Useful empty states.
- Task counts for the relevant views.

## C. User experience

- Use a modern, minimalist interface.
- Provide a sidebar on desktop and an appropriate navigation pattern on mobile.
- Support desktop, tablet, and mobile screen sizes.
- Include accessible labels, keyboard navigation, and visible focus indicators.
- Provide validation messages and clear feedback after user actions.
- Include loading or initialization states where appropriate.
- Prevent accidental deletion through confirmation.
- Keep visual styling consistent throughout the application.
- Implement light and dark themes only if they do not delay core functionality.

## D. Business rules

- A task title is required and cannot contain only whitespace.
- Descriptions are optional and must have a reasonable maximum length.
- Completed and incomplete tasks must be visually distinguishable.
- Overdue tasks must be incomplete and have a deadline earlier than the current time.
- Tasks without deadlines must never be marked overdue.
- Date and time comparisons must follow one documented timezone strategy.
- Filtering and sorting must work together correctly.
- Deleting a task must not affect unrelated tasks.
- Task state must persist across browser refreshes using localStorage.
- Invalid or corrupted stored data must be handled gracefully.
- Task updates must not create duplicate task entries.
- Subtask completion must be reflected accurately in the parent task's progress.
- UI updates must remain consistent with successfully persisted local data.

## E. Technical stack

- **Frontend:** React, TypeScript, and Vite.
- **Styling:** a simple, maintainable styling solution.
- **State management:** React state and hooks, unless additional complexity is justified.
- **Persistence:** browser localStorage behind a small storage abstraction.