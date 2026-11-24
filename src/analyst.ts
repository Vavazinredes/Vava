import { skills, type StudyEvent } from './qa'

export function summarize(events: StudyEvent[], today: string) {
  const days = new Map<string, Extract<StudyEvent, { kind: 'attendance' }>>()
  const assessments = new Map<string, Extract<StudyEvent, { kind: 'assessment' }>>()
  const ordered = [...events].filter(event => event.day <= today)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id))
  for (const event of ordered) {
    if (event.kind === 'attendance') {
      if (event.status !== 'present' || !days.has(event.day)) days.set(event.day, event)
    } else {
      const previous = assessments.get(event.skill)
      if (!previous || previous.day <= event.day) assessments.set(event.skill, event)
    }
  }
  const records = [...days.values()]
  return {
    days,
    attendance: days.size,
    completed: records.filter(event => event.status === 'completed').length,
    minutes: records.reduce((total, event) => total + event.minutes, 0),
    radar: skills.map(skill => ({ skill, score: assessments.get(skill)?.score ?? null })),
  }
}
