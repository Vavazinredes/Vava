import { createClient } from '@supabase/supabase-js'
import { activityId, type Activity } from './activities'
import { mergeEvents, parseBackup, type StudyEvent } from './qa'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
const localKey = 'porteno.events.v1'
const cacheKey = (userId: string) => 'porteno.cache.' + userId
const queuePrefix = (userId: string) => 'porteno.pending.' + userId + '.'
const serialize = (events: StudyEvent[]) => JSON.stringify({ version: 1, events })
function read(key: string) {
  return parseBackup(JSON.parse(localStorage.getItem(key) ?? serialize([])))
}

function pending(userId: string) {
  const prefix = queuePrefix(userId)
  return Object.keys(localStorage).filter(key => key.startsWith(prefix))
    .map(key => ({ key, events: read(key) }))
}

export function hasCachedHistory(userId: string | null) {
  return !supabase || (userId !== null && localStorage.getItem(cacheKey(userId)) !== null)
}

export function cachedEvents(userId: string | null) {
  if (!supabase) return read(localKey)
  if (!userId) return []
  return mergeEvents(read(cacheKey(userId)), pending(userId).flatMap(record => record.events))
}

async function pages<T>(fetchPage: (cursor: T | undefined) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = []
  let cursor: T | undefined
  for (;;) {
    const { data, error } = await fetchPage(cursor)
    if (error) throw error
    if (!data) throw Error('O servidor não retornou o histórico.')
    rows.push(...data)
    if (data.length < 500) return rows
    cursor = data[data.length - 1]
  }
}

export async function loadEvents(userId: string | null, signal: AbortSignal) {
  const client = supabase
  if (!client || !userId) return cachedEvents(userId)
  const queued = pending(userId)
  for (const { key, events } of queued) {
    const legacy = events.filter(event => event.kind !== 'activity')
    const activities = events.filter(event => event.kind === 'activity')
    if (legacy.length) {
      const { error } = await client.from('porteno_events').upsert(
        legacy.map(event => ({ id: event.id, owner_id: userId, event })),
        { onConflict: 'owner_id,id', ignoreDuplicates: true },
      ).abortSignal(signal)
      if (error) throw error
    }
    if (activities.length) {
      const { error } = await client.from('porteno_activities').upsert(
        activities.map(event => ({ owner_id: userId, day: event.day, activity: event.activity, recorded_at: event.recordedAt, source: 'self' })),
        { onConflict: 'owner_id,day,activity', ignoreDuplicates: true },
      ).abortSignal(signal)
      if (error) throw error
    }
    if (signal.aborted) throw signal.reason
  }

  const [legacy, activities] = await Promise.all([
    pages<{ id: string; event: unknown }>(cursor => {
      const query = client.from('porteno_events').select('id,event').eq('owner_id', userId).order('id').limit(500)
      return (cursor ? query.gt('id', cursor.id) : query).abortSignal(signal)
    }),
    pages<{ day: string; activity: Activity; recorded_at: string; source: string }>(cursor => {
      const query = client.from('porteno_activities').select('day,activity,recorded_at,source')
        .eq('owner_id', userId).order('day').order('activity').limit(500)
      return (cursor ? query.or('day.gt.' + cursor.day + ',and(day.eq.' + cursor.day + ',activity.gt.' + cursor.activity + ')') : query).abortSignal(signal)
    }),
  ])
  const remote = parseBackup({ version: 1, events: [
    ...legacy.map(row => row.event),
    ...activities.map(row => ({
      kind: 'activity', id: activityId(row.day, row.activity), day: row.day,
      activity: row.activity, source: row.source, recordedAt: new Date(row.recorded_at).toISOString(),
    })),
  ] })
  if (signal.aborted) throw signal.reason
  localStorage.setItem(cacheKey(userId), serialize(remote))
  for (const record of queued) localStorage.removeItem(record.key)
  return cachedEvents(userId)
}

export async function saveEvents(events: StudyEvent[], userId: string | null) {
  if (!supabase) {
    const save = () => localStorage.setItem(localKey, serialize(mergeEvents(read(localKey), events)))
    if (navigator.locks) await navigator.locks.request(localKey, save)
    else save()
    return
  }
  if (!userId) throw Error('Entre para salvar registros.')
  const existing = new Set(cachedEvents(userId).map(event => event.id))
  for (const event of events) {
    if (!existing.has(event.id)) localStorage.setItem(queuePrefix(userId) + crypto.randomUUID(), serialize([event]))
  }
}

export function localBackup() {
  return read(localKey)
}
