import assert from 'node:assert/strict'
import { summarize } from '../src/analyst'
import { localDay, suggest } from '../src/planner'
import { parseBackup, presenceId, type StudyEvent } from '../src/qa'
import { acceptsAnswer } from '../src/teacher'

const day = '2026-11-24'
const attendance = (number: number, status: 'present' | 'completed' | 'incomplete', minutes: number): StudyEvent => ({
  kind: 'attendance', day, status, minutes,
  id: '00000000-0000-4000-8000-00000000000' + number,
  recordedAt: day + 'T15:0' + number + ':00.000Z',
})
const present = attendance(1, 'present', 0)
const completed = attendance(2, 'completed', 40)
const incomplete = attendance(3, 'incomplete', 15)
const assessment: StudyEvent = {
  kind: 'assessment', id: '00000000-0000-4000-8000-000000000005',
  day, recordedAt: day + 'T17:00:00.000Z', skill: 'Gramática', score: 78,
}
assert.equal(summarize([present], day).completed, 0)
assert.equal(summarize([completed, present, attendance(4, 'present', 0)], day).minutes, 40)
const result = summarize([completed, incomplete, assessment], day)
assert.equal(result.completed, 0)
assert.equal(result.attendance, 1)
assert.equal(result.minutes, 15)
assert.equal(result.radar[0].score, 78)
assert.equal(result.radar[1].score, null)
assert.equal(summarize([assessment], '2026-11-23').radar[0].score, null)
assert.deepEqual(parseBackup({ version: 1, events: [present, present] }), [present])
assert.throws(() => parseBackup({ version: 1, events: [{ ...present, day: '2026-02-31' }] }))
assert.throws(() => parseBackup({ version: 1, events: [{ ...present, minutes: 15 }] }))
assert.equal(localDay(new Date('2026-11-25T01:00:00Z')), day)
assert.equal(suggest('2026-12-19', '2026-11-21', false).minutes, 15)
assert.equal(suggest('2026-12-20', '2026-11-21', false).minutes, 15)
assert.equal(suggest('2026-12-21', '2026-11-21', false).minutes, 120)
assert.equal(suggest('2026-12-25', '', false).minutes, 15)
assert.equal(acceptsAnswer(1, ' VENÍS '), true)
assert.equal(acceptsAnswer(1, 'venis'), false)
assert.equal(presenceId(day), '706f7274-656e-8000-8000-000020261124')
assert.notEqual(presenceId(day), presenceId('2026-11-25'))
console.log('18 verificações de domínio aprovadas.')

import { activityId } from '../src/activities'
import { dailyGoal, daysUntil, moveDay } from '../src/planner'

const activity: StudyEvent = {
  kind: 'activity', day, activity: 'grammar', source: 'teacher',
  id: activityId(day, 'grammar'), recordedAt: day + 'T17:00:00.000Z',
}
const retained = parseBackup({ version: 1, events: [present, attendance(5, 'incomplete', 75), activity, activity] })
assert.equal(retained.length, 3)
assert.equal(summarize(retained, day).minutes, 75)
assert.equal(summarize(retained, day).attendance, 1)
assert.equal(summarize(retained, day).completed, 0)
assert.equal(dailyGoal(day, ''), 90)
assert.equal(daysUntil(day, moveDay), 31)
assert.throws(() => parseBackup({ version: 1, events: [{ ...activity, activity: 'listening' }] }))
assert.throws(() => parseBackup({ version: 1, events: [{ ...activity, source: 'unknown' }] }))
assert.notEqual(activityId(day, 'grammar'), activityId('2026-11-25', 'grammar'))
