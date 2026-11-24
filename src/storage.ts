import { createClient } from '@supabase/supabase-js'
import { mergeEvents, parseBackup, type StudyEvent } from './qa'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
const localKey = 'porteno.events.v1'

export async function loadEvents() {
  if (!supabase) return parseBackup(JSON.parse(localStorage.getItem(localKey) ?? '{"version":1,"events":[]}'))
  const events: StudyEvent[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('porteno_events').select('event').order('id').range(offset, offset + 499)
    if (error) throw error
    events.push(...parseBackup({ version: 1, events: data.map(row => row.event) }))
    if (data.length < 500) return events
  }
}

export async function saveEvents(events: StudyEvent[], userId: string | null) {
  if (!events.length) return
  if (!supabase) {
    const save = async () => localStorage.setItem(localKey, JSON.stringify({ version: 1, events: mergeEvents(await loadEvents(), events) }))
    if (navigator.locks) await navigator.locks.request(localKey, save)
    else await save()
    return
  }
  if (!userId) throw Error('Entre para salvar registros.')
  const { error } = await supabase.from('porteno_events').upsert(
    events.map(event => ({ id: event.id, owner_id: userId, event })),
    { onConflict: 'owner_id,id', ignoreDuplicates: true },
  )
  if (error) throw error
}
