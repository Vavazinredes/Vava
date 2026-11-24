export const skills = ['Gramática', 'Vocabulário', 'Escuta', 'Fala', 'Leitura', 'Escrita'] as const
export const statuses = ['present', 'completed', 'incomplete'] as const
export type Status = typeof statuses[number]
export type Skill = typeof skills[number]
export type StudyEvent = {
  id: string
  day: string
  recordedAt: string
} & (
  | { kind: 'attendance'; status: Status; minutes: number }
  | { kind: 'assessment'; skill: Skill; score: number }
)

export function presenceId(day: string) {
  return '706f7274-656e-8000-8000-0000' + day.replaceAll('-', '')
}

export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value
}

export function parseBackup(input: unknown): StudyEvent[] {
  if (!input || typeof input !== 'object' || !('version' in input) || input.version !== 1 ||
      !('events' in input) || !Array.isArray(input.events)) throw Error('Use um backup JSON versão 1.')
  const events: StudyEvent[] = []
  for (const value of input.events) {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' ||
        !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value.id) ||
        !validDay(value.day) || typeof value.recordedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.recordedAt)) ||
        new Date(value.recordedAt).toISOString() !== value.recordedAt) throw Error('Evento com identificação ou data inválida.')
    const base = { id: value.id, day: value.day, recordedAt: value.recordedAt }
    if (value.kind === 'attendance' && statuses.includes(value.status) && Number.isInteger(value.minutes) &&
        value.minutes >= 0 && value.minutes <= 1440 && (value.status !== 'present' || value.minutes === 0)) {
      events.push({ ...base, kind: 'attendance', status: value.status, minutes: value.minutes })
    } else if (value.kind === 'assessment' && skills.includes(value.skill) &&
        Number.isInteger(value.score) && value.score >= 0 && value.score <= 100) {
      events.push({ ...base, kind: 'assessment', skill: value.skill, score: value.score })
    } else throw Error('Evento com registro ou avaliação inválida.')
  }
  return mergeEvents([], events)
}

export function mergeEvents(current: StudyEvent[], incoming: StudyEvent[]) {
  const byId = new Map(current.map(event => [event.id, event]))
  for (const event of incoming) {
    if (!byId.has(event.id)) byId.set(event.id, event)
  }
  return [...byId.values()]
}
