export const activities = {
  listening: { title: 'Missão auditiva', description: 'Escute espanhol portenho e identifique duas expressões.' },
  grammar: { title: 'IR, VENIR e voseo', description: 'Revise a direção do movimento e as formas com vos.' },
  writing: { title: 'Conversação escrita', description: 'Combine um encontro numa troca de mensagens.' },
  speaking: { title: 'Saudações e LL/Y', description: 'Pratique saudações e a pronúncia rioplatense.' },
  'video-voseo': { title: 'Presente com voseo', description: 'Argentinian Spanish With Gaia · 8 min', url: 'https://www.youtube.com/watch?v=5StaJt0VWqU' },
  'video-barrios': { title: 'Livros nos bairros de Buenos Aires', description: 'Easy Argentine Spanish · 7 min', url: 'https://www.youtube.com/watch?v=Zh5n7OB3dQU' },
} as const

export type Activity = keyof typeof activities
export const missions = ['listening', 'grammar', 'writing', 'speaking'] as const

export function activityId(day: string, activity: Activity) {
  const codes = { listening: '0001', grammar: '0002', writing: '0003', speaking: '0004', 'video-voseo': '0005', 'video-barrios': '0006' }
  return '706f7274-656e-8001-8000-' + day.replaceAll('-', '') + codes[activity]
}
