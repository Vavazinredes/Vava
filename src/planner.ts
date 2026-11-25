import { validDay } from './qa'

export const deadline = '2027-02-28'
export const moveDay = '2026-12-25'
export const goals = [15, 40, 90, 120, 150]
export const timezone = 'America/Sao_Paulo'
const dayMs = 86_400_000

export function localDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}

export function shiftDay(day: string, offset: number) {
  return new Date(Date.parse(day) + offset * dayMs).toISOString().slice(0, 10)
}

export function suggest(day: string, shiftAnchor: string, sports: boolean) {
  const weekday = new Date(day).getUTCDay()
  const anchored = validDay(shiftAnchor) && new Date(shiftAnchor).getUTCDay() === 6
  const offset = anchored ? ((Date.parse(day) - Date.parse(shiftAnchor)) / dayMs % 28 + 28) % 28 : -1
  if (day === moveDay) return { minutes: 15, context: 'Mudança' }
  if (offset === 0 || offset === 1) return { minutes: 15, context: 'Plantão · 08–22h' }
  if (sports) return { minutes: 40, context: 'Dia de futevôlei' }
  if (offset === 2) return { minutes: 120, context: 'Segunda de folga' }
  if (weekday >= 1 && weekday <= 5) return { minutes: 40, context: 'Trabalho · 08–16h · almoço 12–13h' }
  return { minutes: 90, context: 'Fim de semana' }
}

export function daysUntil(day: string, target: string) {
  return Math.max(0, (Date.parse(target) - Date.parse(day)) / dayMs)
}

export function dailyGoal(day: string, shiftAnchor: string) {
  return day === '2026-11-24' ? 90 : suggest(day, shiftAnchor, false).minutes
}
