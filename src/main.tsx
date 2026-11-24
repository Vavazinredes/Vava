import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { summarize } from './analyst'
import { exercises, lesson } from './curator'
import { deadline, goals, localDay, shiftDay, suggest } from './planner'
import { parseBackup, presenceId, skills, type Skill, type Status, type StudyEvent } from './qa'
import { loadEvents, saveEvents, supabase } from './storage'
import { acceptsAnswer } from './teacher'
import { Button, Card } from './ui'
import './style.css'

const labels = { present: 'Presença', completed: 'Concluído', incomplete: 'Incompleto' }
const SkillRadar = lazy(() => import('./skill-radar'))
const dateLabel = (day: string) => day.split('-').reverse().join('/')
const errorText = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String(error.message) : 'Falha ao acessar os registros.'

function App() {
  const [user, setUser] = useState<string | null>(null)
  const [events, setEvents] = useState<StudyEvent[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [today, setToday] = useState(localDay)
  const [anchor, setAnchor] = useState(() => localStorage.getItem('porteno.shift') ?? '')
  const [sports, setSports] = useState(false)
  const [goal, setGoal] = useState<number>()
  const [minutes, setMinutes] = useState('')
  const [skill, setSkill] = useState<Skill>(skills[0])
  const [score, setScore] = useState('')
  const [exercise, setExercise] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const plan = suggest(today, anchor, sports)
  const stats = summarize(events, today)
  const current = stats.days.get(today)
  const assessed = stats.radar.filter(point => point.score !== null)

  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDay()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user.id ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    let active = true
    setReady(false)
    setEvents([])
    if (!supabase || user) loadEvents().then(result => {
      if (active) { setEvents(result); setReady(true) }
    }).catch(error => { if (active) setMessage(errorText(error)) })
    return () => { active = false }
  }, [user])

  async function persist(incoming: StudyEvent[]) {
    setBusy(true)
    setMessage('')
    try {
      await saveEvents(incoming, user)
      setMessage('Registros salvos.')
      setEvents(await loadEvents())
    } catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }

  function baseEvent() {
    return { id: crypto.randomUUID(), day: today, recordedAt: new Date().toISOString() }
  }

  function record(status: Status) {
    if (status === 'present' && current) return
    const value = status === 'present' ? 0 : Number(minutes)
    if ((status !== 'present' && !minutes.trim()) || !Number.isInteger(value) || value < 0 || value > 1440) {
      setMessage('Informe os minutos reais de estudo, de 0 a 1.440.')
      return
    }
    const base = baseEvent()
    void persist([{ ...base, id: status === 'present' ? presenceId(today) : base.id, kind: 'attendance', status, minutes: value }])
  }

  function assess(event: FormEvent) {
    event.preventDefault()
    void persist([{ ...baseEvent(), kind: 'assessment', skill, score: Number(score) }])
  }

  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(fields.get('email')), password: String(fields.get('password')),
      })
      setMessage(error ? error.message : '')
    } catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }

  function exportData() {
    const file = new Blob([JSON.stringify({ version: 1, events }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'porteno-' + today + '.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-semibold">Proyecto Porteño</span>
      <div className="flex items-center gap-3 text-sm">{supabase ? (user ? 'Conta conectada' : 'Conta privada') : 'Dados neste navegador'}
        {user && <Button disabled={busy} onClick={async () => {
          const result = await supabase?.auth.signOut()
          if (result?.error) setMessage(result.error.message)
        }}>Sair</Button>}
      </div>
    </header>
    <section className="hero rounded-[2rem] p-7 text-white sm:p-12">
      <p className="text-sm text-emerald-100">Espanhol de Buenos Aires · até {dateLabel(deadline)}</p>
      <h1 className="my-3 text-5xl leading-none sm:text-7xl" lang="es-AR">¡Vamos, che!</h1>
      <p className="text-emerald-100">Sua prática, suas metas e seu progresso.</p>
    </section>
    {message && <p role="status" className="rounded-xl bg-amber-100 p-3">{message}</p>}
    {supabase && !user ? <Card>
      <h2>Entrar</h2>
      <form className="mt-4 flex flex-wrap gap-3" onSubmit={logIn}>
        <input aria-label="E-mail" name="email" type="email" autoComplete="username" placeholder="E-mail" required />
        <input aria-label="Senha" name="password" type="password" autoComplete="current-password" placeholder="Senha" required />
        <Button type="submit" disabled={busy}>Entrar</Button>
      </form>
    </Card> : <>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {([['Dias com presença', stats.attendance], ['Dias concluídos', stats.completed], ['Minutos registrados', stats.minutes]] as const).map(([label, value]) =>
          <Card key={label} className="p-3 sm:p-5"><p className="text-xs sm:text-sm">{label}</p><p className="mt-2 text-3xl font-semibold">{ready ? value : '—'}</p></Card>)}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2>Hoje · {dateLabel(today)}</h2>
          <p className="my-2 text-sm">{plan.context} · Check-in às 12h · {current ? labels[current.status] : 'Sem registro'}</p>
          <label className="field">Meta de estudo<select value={goal ?? plan.minutes} onChange={event => setGoal(Number(event.target.value))}>
            {goals.map(value => <option key={value} value={value}>{value} min</option>)}
          </select></label>
          <label className="field">Sábado de um plantão confirmado<input type="date" value={anchor} onChange={event => {
            const day = event.target.value
            if (day && new Date(day).getUTCDay() !== 6) { setMessage('Escolha um sábado de plantão.'); return }
            setAnchor(day); localStorage.setItem('porteno.shift', day); setMessage('')
          }} /></label>
          <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={sports} onChange={event => setSports(event.target.checked)} /> Futevôlei hoje</label>
          <label className="field">Minutos estudados<input type="number" min="0" max="1440" value={minutes} onChange={event => setMinutes(event.target.value)} /></label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy || !ready || !!current} onClick={() => record('present')}>Registrar presença</Button>
            <Button disabled={busy || !ready} onClick={() => record('completed')}>Concluir</Button>
            <Button disabled={busy || !ready} onClick={() => record('incomplete')}>Registrar incompleto</Button>
          </div>
        </Card>
        <Card>
          <h2>Prática guiada</h2>
          <p className="mb-4 mt-1 text-sm text-stone-600">{lesson} · IR, VENIR e voseo</p>
          {exercises[exercise] ? <form className="space-y-4" onSubmit={event => {
            event.preventDefault()
            if (acceptsAnswer(exercise, answer)) { setExercise(exercise + 1); setAnswer(''); setFeedback('¡Bien!') }
            else setFeedback('Tentá de nuevo.')
          }}>
            <p>{exercises[exercise].prompt}</p>
            <label className="field">Sua resposta<input value={answer} onChange={event => setAnswer(event.target.value)} required /></label>
            <Button type="submit">Responder</Button>
            <p role="status">{feedback}</p>
          </form> : <p lang="es-AR">¡Terminaste los ejercicios!</p>}
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2>Mapa de atividade</h2>
          <p className="mt-1 text-sm text-stone-600">Últimos 84 dias</p>
          <ol className="mt-4 grid grid-flow-col grid-cols-12 grid-rows-7 gap-1.5">
            {Array.from({ length: 84 }, (_, index) => {
              const day = shiftDay(today, index - 83)
              const status = stats.days.get(day)?.status
              const label = dateLabel(day) + ' · ' + (status ? labels[status] : 'Sem registro')
              return <li key={day} className={'aspect-square rounded ' + (status ?? 'empty')} title={label} aria-label={label} />
            })}
          </ol>
          <p className="mt-4 flex flex-wrap gap-3 text-xs">{Object.entries(labels).map(([status, label]) =>
            <span key={status}><i className={'mr-1 inline-block size-3 rounded-sm ' + status} />{label}</span>)}</p>
        </Card>
        <Card>
          <h2>Habilidades avaliadas</h2>
          {assessed.length >= 3
            ? <Suspense fallback={<p>Carregando radar…</p>}><SkillRadar points={assessed} /></Suspense>
            : <p className="my-4 text-sm text-stone-600">O radar aparece quando houver avaliações em três habilidades.</p>}
          {assessed.length > 0 &&
            <ul className="mb-3 flex flex-wrap gap-2 text-xs">{stats.radar.map(point => <li key={point.skill}>{point.skill} · {point.score ?? 'Sem avaliação'}</li>)}</ul>
          }
          <form onSubmit={assess} className="flex flex-wrap items-end gap-2">
            <label className="field">Habilidade<select value={skill} onChange={event => setSkill(event.target.value as Skill)}>
              {skills.map(item => <option key={item}>{item}</option>)}
            </select></label>
            <label className="field">Nota (0–100)<input className="w-28" type="number" min="0" max="100" required value={score} onChange={event => setScore(event.target.value)} /></label>
            <Button type="submit" disabled={busy || !ready}>Salvar avaliação</Button>
          </form>
        </Card>
      </div>
      <Card>
        <h2>Histórico</h2>
        <div className="my-4 flex flex-wrap items-center gap-3">
          <Button disabled={!ready || busy} onClick={exportData}>Exportar JSON</Button>
          <label className="field">Importar JSON<input type="file" accept=".json,application/json" disabled={!ready || busy} onChange={async event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            try { await persist(parseBackup(JSON.parse(await file.text()))) }
            catch (error) { setMessage(errorText(error)) }
          }} /></label>
        </div>
        <ul className="space-y-2 text-sm">{[...stats.days.values()].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14).map(event =>
          <li key={event.day}>{dateLabel(event.day)} · {labels[event.status]}{event.status !== 'present' && ' · ' + event.minutes + ' min'}</li>)}</ul>
      </Card>
    </>}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
