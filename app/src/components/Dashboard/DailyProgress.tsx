import { dailyProgress } from '../../domain/selectors.ts'
import type { Task } from '../../domain/types.ts'
import './Dashboard.css'

/** Progress across tasks due today, whichever view is active. */
export function DailyProgress({ tasks, now }: { tasks: Task[]; now: Date }) {
  const { done, total } = dailyProgress(tasks, now)

  if (total === 0) {
    return <p className="daily-progress daily-progress--empty">Nothing due today.</p>
  }

  return (
    <div className="daily-progress">
      <progress className="daily-progress__bar" max={total} value={done} aria-label="Today's progress" />
      <p className="daily-progress__text">
        {done} of {total} done today
      </p>
    </div>
  )
}
