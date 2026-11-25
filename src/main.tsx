import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { activities, activityId, missions, type Activity } from './activities'
import { summarize } from './analyst'
import { exercises, lesson } from './curator'
import { dailyGoal, daysUntil, deadline, localDay, moveDay, shiftDay } from './planner'
import { parseBackup, type StudyEvent } from './qa'
import { cachedEvents, hasCachedHistory, loadEvents, localBackup, saveEvents, supabase } from './storage'
import { acceptsAnswer } from './teacher'
import './style.css'

const tabs = [
  ['hoje', 'Hoje'], ['aulas', 'Aulas'], ['imersao', 'Vídeos e imersão'],
  ['praticar', 'Praticar'], ['revisoes', 'Revisões'], ['historico', 'Histórico'], ['configuracoes', 'Configurações'],
] as const
const SkillRadar = lazy(() => import('./skill-radar'))
const statuses = { present: 'Presença', completed: 'Concluído', incomplete: 'Incompleto' }
const dateLabel = (day: string) => day.split('-').reverse().join('/')
const currentTab = () => tabs.find(([id]) => location.hash === '#' + id)?.[0] ?? 'hoje'

function App() {
  const [user, setUser] = useState<string | null | undefined>(supabase ? undefined : null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const result = supabase?.auth.onAuthStateChange((_event, session) => setUser(session?.user.id ?? null))
    return () => result?.data.subscription.unsubscribe()
  }, [])

  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(fields.get('email')), password: String(fields.get('password')),
      })
      if (error) setMessage('Confira seu e-mail e sua senha e tente novamente.')
    } catch {
      setMessage('Confira a conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="shell"><a href="#conteudo" className="skip" onClick={event => { event.preventDefault(); document.getElementById('conteudo')?.focus() }}>Pular para o conteúdo</a>
    <header className="masthead"><a href="#hoje" className="brand">Proyecto Porteño <small>3.0</small></a>
      <span>Buenos Aires · Argentina</span>
    </header>
    <main id="conteudo" tabIndex={-1}>{user === undefined ? <p role="status">Verificando sua sessão…</p> : supabase && !user ?
      <section className="panel login"><h1>Seu diário porteño</h1><p>Entre para acessar seu histórico.</p>
        <form onSubmit={logIn}>
          <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          <button disabled={busy}>Entrar</button>
        </form>
        {message && <p role="status">{message}</p>}
      </section> : <Dashboard key={user ?? 'local'} user={user} />}
  </main></div>
}

function Dashboard({ user }: { user: string | null }) {
  const [events, setEvents] = useState<StudyEvent[]>([])
  const [tab, setTab] = useState(currentTab)
  const [today, setToday] = useState(localDay)
  const [anchor, setAnchor] = useState(() => localStorage.getItem('porteno.shift') ?? '')
  const [status, setStatus] = useState('Carregando histórico…')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const request = useRef<AbortController | null>(null)
  const active = useRef(false)

  function refresh() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    try {
      const cached = cachedEvents(user)
      setEvents(cached)
      setReady(hasCachedHistory(user) || cached.length > 0)
    } catch {
      setStatus('O histórico local não pôde ser lido. Atualize ao voltar à internet.')
    }
    void loadEvents(user, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setEvents(result)
      setReady(true)
      setStatus(supabase ? 'Histórico atualizado com o Supabase' : 'Histórico neste navegador')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('Sem confirmação do Supabase. Os registros locais aguardam nova tentativa.')
    })
  }

  useEffect(() => {
    active.current = true
    const changeTab = () => setTab(currentTab())
    const recheck = () => {
      setToday(localDay())
      refresh()
    }
    const receiveHistory = (event: StorageEvent) => {
      if (event.key === 'porteno.events.v1' || (user && event.key === 'porteno.cache.' + user)) {
        setEvents(cachedEvents(user))
      }
    }
    const interval = window.setInterval(() => setToday(localDay()), 30_000)
    window.addEventListener('storage', receiveHistory)
    window.addEventListener('hashchange', changeTab)
    window.addEventListener('online', recheck)
    window.addEventListener('focus', recheck)
    refresh()
    return () => {
      active.current = false
      request.current?.abort()
      clearInterval(interval)
      window.removeEventListener('storage', receiveHistory)
      window.removeEventListener('hashchange', changeTab)
      window.removeEventListener('online', recheck)
      window.removeEventListener('focus', recheck)
    }
  }, [user])

  async function persist(records: StudyEvent[]) {
    setSaving(true)
    try {
      await saveEvents(records, user)
      if (active.current) refresh()
    } catch {
      if (active.current) setStatus('Não foi possível salvar neste navegador. Verifique o espaço disponível e tente novamente.')
    } finally {
      if (active.current) setSaving(false)
    }
  }

  const stats = summarize(events, today)
  const assessed = stats.radar.filter(point => point.score !== null)
  const goal = dailyGoal(today, anchor)
  const minutes = stats.days.get(today)?.minutes ?? 0
  const percentage = Math.min(100, 100 * minutes / goal)
  const countdown = daysUntil(today, moveDay)
  const done = (activity: Activity) => events.some(event =>
    event.kind === 'activity' && event.day === today && event.activity === activity)
  const next = missions.find(activity => !done(activity))
  const destinations = { listening: '#imersao', grammar: '#aulas', writing: '#praticar', speaking: '#praticar' }
  const log = (activity: Activity) => {
    if (done(activity)) return
    void persist([{ kind: 'activity', activity, source: 'self', day: today,
      id: activityId(today, activity), recordedAt: new Date().toISOString() }])
  }

  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, events }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'porteno-' + today + '.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function mission(activity: Activity) {
    const item = activities[activity]
    return <li className="row" key={activity}>
      <div><strong>{item.title}</strong><p>{item.description}</p>{'url' in item && <a href={item.url} target="_blank" rel="noreferrer">Abrir no YouTube</a>}</div>
      {done(activity) ? <span className="done">Concluída</span> :
        <button type="button" disabled={!ready || saving} onClick={() => log(activity)}>Marcar como feita</button>}
    </li>
  }

  return <>
    <nav aria-label="Áreas de estudo">{tabs.map(([id, title]) =>
      <a key={id} href={'#' + id} aria-current={id === tab ? 'page' : undefined}>{title}</a>)}</nav>
    <p className="sync" role="status">{status}</p>
    {tab === 'hoje' && <>
      <section className="hero">
        <div className="sun" aria-hidden="true" /><div className="obelisk" aria-hidden="true" />
        <p>Mudança para Buenos Aires · <time dateTime={moveDay}>{dateLabel(moveDay)}</time></p>
        <h1>{today < moveDay ? <><strong>{countdown}</strong> dias para Buenos Aires</> :
          today === moveDay ? '¡Llegó el día!' : 'Buenos Aires'}</h1>
        <p>A2 sólido / B1 conversacional até <time dateTime={deadline}>{dateLabel(deadline)}</time></p>
      </section>
      <section className="panel progress-panel">
        <div className="spread"><h2>Meta de estudo de hoje</h2><strong>{ready ? percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—'}</strong></div>
        <progress aria-label="Minutos registrados em relação à meta diária" max={100} value={ready ? percentage : undefined} />
        <div className="spread"><p>{ready ? minutes + ' de ' + goal + ' min registrados' : 'Aguardando histórico'}</p><p>Tempo de estudo</p></div>
        <div className="totals">
          <p><strong>{ready ? stats.attendance : '—'}</strong> Dias com presença</p>
          <p><strong>{ready ? stats.minutes : '—'}</strong> Minutos registrados</p>
          <p><strong>{ready ? missions.filter(done).length : '—'} / {missions.length}</strong> Missões de hoje</p>
        </div>
      </section>
      <section className="panel"><h2>Missões de hoje</h2>
        <p>Próximo passo · {next ? <a href={destinations[next]}>{activities[next].title}</a> : <a href="#revisoes">Revisar o que você praticou</a>}</p>
        <ul className="rows">{missions.map(mission)}</ul>
      </section>
    </>}
    {tab === 'aulas' && <section className="panel"><h1>Aulas</h1><h2>{lesson}</h2>
      <p lang="es-AR">Voy al café. ¿Venís al café? ¿A qué hora vas, vos?</p>
      <p>Use IR para se deslocar até outro lugar e VENIR para se aproximar do lugar de referência de quem fala.</p>
      <a className="action" href="#revisoes">Revisar com exemplos</a>
      <ul className="rows">{mission('grammar')}</ul>
    </section>}
    {tab === 'imersao' && <section className="panel"><h1>Vídeos e imersão</h1>
      <p>Escolha um vídeo e use a missão para anotar expressões que você ouviu.</p>
      <ul className="rows">{mission('video-voseo')}{mission('video-barrios')}{mission('listening')}</ul>
      <h2>Registros de imersão</h2>
      <History events={events.filter(event => event.kind === 'activity' && (event.activity === 'listening' || event.activity.startsWith('video-')))} />
    </section>}
    {tab === 'praticar' && <section className="panel"><h1>Praticar com o professor</h1>
      <p>Abra o ChatGPT e selecione a conversa “Corrigir possessivos espanhóis” no seu histórico. Ao concluir, peça ao professor para salvar as evidências no Supabase, se o conector estiver disponível na conversa.</p>
      <a className="action" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Abrir ChatGPT</a>
      <p lang="es-AR">Para começar: «Practiquemos cómo invitar a alguien a tomar un café usando el voseo».</p>
      <ul className="rows">{mission('writing')}{mission('speaking')}</ul>
    </section>}
    {tab === 'revisoes' && <Review key={today} progressKey={'porteno.review.ir-venir.' + (user ?? 'local') + '.' + today} />}
    {tab === 'historico' && <section className="panel"><h1>Histórico</h1>
      {ready ? <>
        <h2>Atividade nos últimos 84 dias</h2>
        <ol className="calendar">{Array.from({ length: 84 }, (_, index) => {
          const day = shiftDay(today, index - 83)
          const entry = stats.days.get(day)
          const label = dateLabel(day) + ' · ' + (entry ? statuses[entry.status] : 'Sem presença')
          return <li key={day} className={entry?.status} title={label} aria-label={label} />
        })}</ol>
        <p className="calendar-legend">{Object.entries(statuses).map(([status, label]) =>
          <span key={status}><i className={status} aria-hidden="true" />{label}</span>)}</p>
        <h2>Avaliações registradas</h2>
        {assessed.length >= 3 && <Suspense fallback={<p>Carregando radar…</p>}><SkillRadar points={assessed} /></Suspense>}
        {assessed.length ? <ul>{assessed.map(point => <li key={point.skill}>{point.skill} · {point.score}/100</li>)}</ul> :
          <p>Nenhuma avaliação registrada.</p>}
        <h2>Registros por dia</h2>
        <History events={events} />
      </> : <p>Aguardando histórico.</p>}
    </section>}
    {tab === 'configuracoes' && <section className="panel"><h1>Configurações</h1>
      <p>Dia de estudo em São Paulo · mesmo horário de Buenos Aires durante o plano.</p>
      <label>Sábado de plantão confirmado<input type="date" value={anchor} onChange={event => {
        const value = event.target.value
        if (value && new Date(value).getUTCDay() !== 6) { setStatus('Escolha um sábado de plantão.'); return }
        localStorage.setItem('porteno.shift', value)
        setAnchor(value)
      }} /></label>
      <div className="settings">
        <button type="button" onClick={refresh}>Atualizar histórico</button>
        <button type="button" disabled={!ready} onClick={exportData}>Baixar backup privado</button>
        <label>Restaurar backup privado<input type="file" accept=".json,application/json" disabled={!ready || saving}
          onChange={async event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            try {
              if (file.size > 5_000_000) throw Error('Arquivo muito grande')
              const backup = parseBackup(JSON.parse(await file.text()))
              if (active.current) await persist(backup)
            } catch { setStatus('Escolha um backup válido, com até 5 MB.') }
          }} /></label>
        {supabase && user && <button type="button" disabled={!ready || saving} onClick={() => {
          try {
            const records = localBackup()
            if (records.length) void persist(records)
            else setStatus('Nenhum registro do modo local encontrado neste navegador.')
          } catch { setStatus('O histórico do modo local não pôde ser lido.') }
        }}>Migrar registros deste navegador</button>}
        {supabase && user && <button type="button" onClick={async () => {
          const { error } = await supabase!.auth.signOut({ scope: 'local' })
          if (error) setStatus('Não foi possível sair. Tente novamente.')
        }}>Sair da conta</button>}
      </div>
    </section>}
  </>
}

function History({ events }: { events: StudyEvent[] }) {
  if (!events.length) return <p>Nenhum registro por aqui.</p>
  return <ul className="rows">{[...events].sort((a, b) => b.day.localeCompare(a.day) ||
    b.recordedAt.localeCompare(a.recordedAt) || a.id.localeCompare(b.id)).map(event => <li className="row" key={event.id}>
      <time dateTime={event.day}>{dateLabel(event.day)}</time>
      <span>{event.kind === 'attendance' ? statuses[event.status] + ' · ' + event.minutes + ' min'
        : event.kind === 'assessment' ? event.skill + ' · ' + event.score + '/100'
        : activities[event.activity].title + (event.source === 'teacher' ? ' · Sessão com professor' : ' · Concluída')}</span>
    </li>)}</ul>
}

const hints = [
  'Você está indo para outro lugar. Exemplo: Voy al trabajo.',
  'O convite é para o lugar onde você está. Exemplo: ¿Venís al barrio mañana?',
  'Use IR com vos. Exemplo: ¿Vas al centro?',
]

function Review({ progressKey }: { progressKey: string }) {
  const [index, setIndex] = useState(() => {
    const value = Number(localStorage.getItem(progressKey))
    return Number.isInteger(value) && value >= 0 && value <= exercises.length ? value : 0
  })
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [solved, setSolved] = useState(false)
  const item = exercises[index]
  return <section className="panel"><h1>Revisões e erros</h1>
    {item ? <form onSubmit={event => {
      event.preventDefault()
      if (acceptsAnswer(index, answer)) { setSolved(true); setFeedback('¡Bien!') }
      else { setShowHint(true); setFeedback('Tente novamente usando a pista.') }
    }}>
      <p>{item.prompt}</p>
      <label>Sua resposta<input value={answer} onChange={event => setAnswer(event.target.value)} required /></label>
      <div className="settings">
        <button disabled={solved || reveal}>Conferir resposta</button>
        <button type="button" onClick={() => setShowHint(true)}>Ver pista e exemplo</button>
        {showHint && !solved && <button type="button" onClick={() => setReveal(true)}>Revelar resposta</button>}
        {(solved || reveal) && <button type="button" onClick={() => {
          localStorage.setItem(progressKey, String(index + 1))
          setIndex(index + 1); setAnswer(''); setFeedback(''); setShowHint(false); setReveal(false); setSolved(false)
        }}>Avançar</button>}
      </div>
      <p role="status">{feedback} {showHint && hints[index]} {reveal && 'Resposta: ' + item.answer + '.'}</p>
    </form> : <p lang="es-AR">¡Terminaste la revisión!</p>}
  </section>
}

createRoot(document.getElementById('root')!).render(<App />)
