/**
 * The only module that touches localStorage. Nothing here throws to callers:
 * every failure comes back as a result value.
 */
import type { Task } from '../domain/types.ts'
import { readTask } from './guards.ts'

export type LoadResult =
  | { status: 'ok'; tasks: Task[] }
  | { status: 'empty'; tasks: [] }
  | {
      status: 'recovered'
      tasks: Task[]
      /** null means the stored payload could not be read at all. */
      droppedCount: number | null
      repairedCount: number
      /** null when the backup copy could not be written. */
      backupKey: string | null
    }
  | { status: 'unavailable'; tasks: []; error: string }

export type SaveResult = { ok: true } | { ok: false; error: string }

const STORAGE_KEY = 'todo-app.tasks'
const BACKUP_PREFIX = 'todo-app.tasks.backup.'
const VERSION = 1

function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Returns the stored task array, or null when the payload is unreadable. */
function parseEnvelope(raw: string): unknown[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const envelope = parsed as { version?: unknown; tasks?: unknown }
  if (envelope.version !== VERSION || !Array.isArray(envelope.tasks)) return null
  return envelope.tasks
}

/**
 * Keeps a copy of the original raw data. Reuses an existing backup with the
 * same content so repeated reloads do not pile up copies. Best effort only.
 */
function backUp(storage: Storage, raw: string): string | null {
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key !== null && key.startsWith(BACKUP_PREFIX) && storage.getItem(key) === raw) return key
    }
    const key = `${BACKUP_PREFIX}${new Date().toISOString()}`
    storage.setItem(key, raw)
    return key
  } catch {
    return null
  }
}

export function loadTasks(): LoadResult {
  const storage = getStorage()
  if (!storage) return { status: 'unavailable', tasks: [], error: 'Storage is not available.' }

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch (error) {
    return { status: 'unavailable', tasks: [], error: describeError(error) }
  }
  if (raw === null) return { status: 'empty', tasks: [] }

  const items = parseEnvelope(raw)
  if (items === null) {
    return { status: 'recovered', tasks: [], droppedCount: null, repairedCount: 0, backupKey: backUp(storage, raw) }
  }

  const tasks: Task[] = []
  const ids = new Set<string>()
  let droppedCount = 0
  let repairedCount = 0
  for (const item of items) {
    const result = readTask(item)
    if (!result || ids.has(result.value.id)) {
      droppedCount++
      continue
    }
    ids.add(result.value.id)
    tasks.push(result.value)
    if (result.repaired) repairedCount++
  }

  if (droppedCount === 0 && repairedCount === 0) return { status: 'ok', tasks }
  return { status: 'recovered', tasks, droppedCount, repairedCount, backupKey: backUp(storage, raw) }
}

export function saveTasks(tasks: Task[]): SaveResult {
  try {
    const storage = getStorage()
    if (!storage) return { ok: false, error: 'Storage is not available, so your change was not saved.' }
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, tasks }))
    return { ok: true }
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      return { ok: false, error: 'Storage is full; your last change was not saved.' }
    }
    return { ok: false, error: 'Your change could not be saved.' }
  }
}
