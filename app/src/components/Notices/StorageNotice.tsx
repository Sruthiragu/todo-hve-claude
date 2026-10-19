import { useState } from 'react'
import type { LoadResult } from '../../storage/index.ts'
import './Notices.css'

function describe(result: LoadResult): string | null {
  switch (result.status) {
    case 'ok':
    case 'empty':
      return null
    case 'unavailable':
      return "Your browser is blocking storage, so changes can't be saved."
    case 'recovered': {
      let message: string
      if (result.droppedCount === null) {
        message = "Your saved tasks couldn't be read, so the app started empty."
      } else if (result.droppedCount > 0) {
        const kept = result.tasks.length
        message = `Some saved data was damaged. We kept ${kept} ${kept === 1 ? 'task' : 'tasks'} and set aside ${result.droppedCount}.`
      } else {
        message = 'Some saved tasks had small problems and were fixed.'
      }
      return result.backupKey === null
        ? `${message} A backup copy couldn't be saved.`
        : `${message} A backup copy of the original data was saved.`
    }
  }
}

export function StorageNotice({ result }: { result: LoadResult }) {
  const [dismissed, setDismissed] = useState(false)
  const message = describe(result)
  if (message === null || dismissed) return null

  return (
    <div className="notice" role="status">
      <p className="notice__message">{message}</p>
      <button type="button" className="btn btn--small" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  )
}
