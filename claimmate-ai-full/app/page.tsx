'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Bot, Check, ChevronRight, CircleHelp, FileCheck2, FileText, Languages, Menu, Mic, Paperclip, Play, ShieldCheck, Sparkles, Upload, X, Zap } from 'lucide-react'

const steps = [
  { n: '01', title: 'Understand', text: 'Ask questions in plain language and get answers grounded in your policy.' },
  { n: '02', title: 'Prepare', text: 'Receive a personalized checklist of exactly what your claim needs.' },
  { n: '03', title: 'Submit', text: 'AI checks every document before you send it to prevent avoidable delays.' },
  { n: '04', title: 'Track', text: 'See what is happening next, with human support whenever it matters.' },
]

type DocStatus = 'Verified' | 'Required' | 'Low quality'
type DocumentItem = { id: string; name: string; status: DocStatus; confidence: number; uploadedAt: string }
type Claim = { id: string; type: string; status: string; createdAt: string; documents: DocumentItem[] }
type Readiness = { overall: number; coverageMatch: number; documentsComplete: number; risk: string; verified: number; total: number }
type AuthUser = { id: string; name: string; email: string }

function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20">
        <ShieldCheck className="size-5" />
      </span>
      <span>
        ClaimMate <span className="text-cyan-300">AI</span>
      </span>
    </div>
  )
}

function Stars() {
  return (
    <div className="stars" aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
    </div>
  )
}

export default function Page() {
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState<'demo' | 'agent' | 'policy' | 'auth' | null>(null)
  const [tab, setTab] = useState<'overview' | 'documents' | 'assistant'>('overview')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([{ from: 'ai', text: 'Hi. I found one missing document in your health claim. How can I help?' }])
  const [isSending, setIsSending] = useState(false)
  const [assistantError, setAssistantError] = useState('')
  const [language, setLanguage] = useState('EN')

  const [claim, setClaim] = useState<Claim | null>(null)
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [claimError, setClaimError] = useState('')
  const [creatingClaim, setCreatingClaim] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingDocName = useRef<string>('')

  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenu(false)
  }

  const loadClaim = async (id?: string) => {
    try {
      const response = await fetch(`/api/claims${id ? `?id=${id}` : ''}`)
      if (!response.ok) throw new Error('Could not load claim.')
      const data = await response.json()
      setClaim(data.claim)
      setReadiness(data.readiness)
      setClaimError('')
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Could not load claim.')
    }
  }

  useEffect(() => {
    loadClaim()
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  const submitAuth = async () => {
    setAuthError('')
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Enter your email and password.')
      return
    }
    if (authMode === 'signup' && !authName.trim()) {
      setAuthError('Enter your name.')
      return
    }
    setAuthLoading(true)
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authMode === 'signup'
            ? { name: authName, email: authEmail, password: authPassword }
            : { email: authEmail, password: authPassword },
        ),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? 'Something went wrong.')
      setUser(data.user)
      setModal(null)
      setAuthName('')
      setAuthEmail('')
      setAuthPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  const startClaim = async () => {
    setCreatingClaim(true)
    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Health insurance' }),
      })
      if (!response.ok) throw new Error('Could not start a new claim.')
      const data = await response.json()
      setClaim(data.claim)
      setReadiness(data.readiness)
      setModal(null)
      setTab('documents')
      scroll('features')
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Could not start a new claim.')
    } finally {
      setCreatingClaim(false)
    }
  }

  const triggerUpload = (docName: string) => {
    pendingDocName.current = docName
    fileInputRef.current?.click()
  }

  const handleFileChosen: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !claim) return
    const docName = pendingDocName.current
    setUploadingDoc(docName)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('claimId', claim.id)
      formData.append('docName', docName)
      const response = await fetch('/api/documents', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed. Please try again.')
      const data = await response.json()
      setClaim(data.claim)
      setReadiness(data.readiness)
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
    } finally {
      setUploadingDoc(null)
    }
  }

  const send = async () => {
    const trimmed = message.trim()
    if (!trimmed || isSending) return
    const nextMessages = [...messages, { from: 'user' as const, text: trimmed }]
    setMessages(nextMessages)
    setMessage('')
    setAssistantError('')
    setIsSending(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, claimId: claim?.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? 'The assistant is temporarily unavailable.')
      setMessages([...nextMessages, { from: 'ai', text: data.text }])
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'The assistant is temporarily unavailable.')
    } finally {
      setIsSending(false)
    }
  }

  const requiredDoc = claim?.documents.find((d) => d.status === 'Required')

  return (
    <main className="min-h-screen overflow-hidden bg-[#070a0f] text-[#eef6ff]">
      <Stars />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChosen} />

      <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/[.07] bg-[#070a0f]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <button onClick={() => scroll('journey')}>How it works</button>
            <button onClick={() => scroll('features')}>Features</button>
            <button onClick={() => scroll('security')}>Security</button>
            <button onClick={() => scroll('insurers')}>For insurers</button>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="status"><span /> AI assistant online</span>
            {user ? (
              <>
                <span className="text-sm text-slate-300">Hi, {user.name.split(' ')[0]}</span>
                <button className="text-sm text-slate-300" onClick={logout}>Sign out</button>
              </>
            ) : (
              <button className="text-sm text-slate-300" onClick={() => { setAuthMode('login'); setAuthError(''); setModal('auth') }}>Sign in</button>
            )}
            <button className="button button-small" onClick={() => setModal('demo')}>Get started <ArrowRight className="size-4" /></button>
          </div>
          <button className="md:hidden" onClick={() => setMenu(!menu)} aria-label="Open menu">{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && (
          <div className="flex flex-col gap-5 border-t border-white/[.07] bg-[#0b1017] p-6 text-slate-300 md:hidden">
            <button onClick={() => scroll('journey')}>How it works</button>
            <button onClick={() => scroll('features')}>Features</button>
            <button onClick={() => scroll('security')}>Security</button>
            <button onClick={() => setModal('demo')}>Get started</button>
          </div>
        )}
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-40 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:pt-48">
        <div className="relative z-10">
          <div className="eyebrow"><Sparkles className="size-3.5" /> AI-powered financial journeys</div>
          <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-7xl">
            Insurance claims, <span className="gradient-text">without the confusion.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
            ClaimMate AI turns complex policies and claim paperwork into clear, actionable next steps — so every customer can move forward with confidence.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button className="button" onClick={() => setModal('demo')}>Start a claim <ArrowRight className="size-4" /></button>
            <button className="button button-ghost" onClick={() => scroll('journey')}><Play className="size-4 fill-current" /> Explore ClaimMate</button>
          </div>
          <div className="mt-9 flex flex-wrap gap-5 text-sm text-slate-500">
            <span><Check /> Explain policies</span>
            <span><Check /> Prevent errors</span>
            <span><Check /> Human support</span>
          </div>
        </div>
        <div className="relative">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass dashboard-preview">
            <div className="flex items-center justify-between border-b border-white/[.08] pb-5">
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-slate-500">Claim readiness</p>
                <p className="mt-1 text-sm text-slate-300">{claim?.type ?? 'Health insurance'} · {claim?.id ?? 'CLM-2026-10428'}</p>
              </div>
              <span className="badge-success">{claim?.status ?? 'Under review'}</span>
            </div>
            <div className="grid items-center gap-8 py-7 sm:grid-cols-[.9fr_1.1fr]">
              <div className="score-ring"><div><strong>{readiness?.overall ?? 92}%</strong><small>readiness</small></div></div>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Coverage match</span><b>{readiness?.coverageMatch ?? 92}%</b></div>
                  <div className="meter"><i style={{ width: `${readiness?.coverageMatch ?? 92}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Documents complete</span><b>{readiness?.documentsComplete ?? 80}%</b></div>
                  <div className="meter"><i style={{ width: `${readiness?.documentsComplete ?? 80}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Submission risk</span><b className="text-amber-300">{readiness?.risk ?? 'Medium'}</b></div>
                  <div className="meter amber"><i style={{ width: `${readiness?.risk === 'Low' ? 25 : readiness?.risk === 'High' ? 80 : 52}%` }} /></div>
                </div>
              </div>
            </div>
            <div className="ai-insight">
              <Bot className="size-5 text-cyan-300" />
              <p>{requiredDoc ? `Your claim appears eligible. ${requiredDoc.name} is still required before submission.` : 'Your claim is fully documented and ready for submission.'}</p>
            </div>
            <div className="mt-5 flex gap-3">
              <button className="button button-small" onClick={() => setTab('documents')}>Review documents</button>
              <button className="button button-small button-ghost" onClick={() => setTab('assistant')}>Ask ClaimMate</button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-white/[.015]">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 text-sm text-slate-400 sm:grid-cols-4 lg:px-8">
          <span className="text-slate-300">Built for clearer journeys</span>
          <span><Check /> Policy clarity</span>
          <span><Check /> Error prevention</span>
          <span><Check /> Transparent tracking</span>
        </div>
      </section>

      <section id="journey" className="section">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <div className="eyebrow">The ClaimMate method</div>
            <h2>From confusion to resolution.</h2>
            <p className="lead">One intelligent layer that translates policy complexity into practical action.</p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {steps.map((s) => (
              <motion.div whileHover={{ y: -6 }} key={s.n} className="journey-card">
                <span className="step-number">{s.n}</span>
                <div className="step-line" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <ChevronRight className="mt-7 size-5 text-cyan-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="section pt-4">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="eyebrow">Interactive workspace</div>
              <h2>Your claim universe, in one place.</h2>
            </div>
            <div className="flex rounded-xl border border-white/[.08] bg-white/[.03] p-1">
              <button className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}>Overview</button>
              <button className={tab === 'documents' ? 'tab active' : 'tab'} onClick={() => setTab('documents')}>Documents</button>
              <button className={tab === 'assistant' ? 'tab active' : 'tab'} onClick={() => setTab('assistant')}>AI assistant</button>
            </div>
          </div>

          {claimError && <p className="mt-4 text-sm text-red-400">{claimError}</p>}

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-8">
              {tab === 'overview' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Active claims', '1', claim ? claim.status : '—', ShieldCheck],
                    ['Claim readiness', `${readiness?.overall ?? 92}%`, readiness && readiness.overall > 85 ? 'Excellent' : 'In progress', Zap],
                    ['Documents', `${readiness?.verified ?? 0} / ${readiness?.total ?? 4}`, `${(readiness?.total ?? 4) - (readiness?.verified ?? 0)} required`, FileCheck2],
                    ['Resolution', '4–6 days', 'Estimated', CircleHelp],
                  ].map(([a, b, c, Icon]: any) => (
                    <div className="stat-card" key={a}>
                      <span className="icon-box"><Icon className="size-5" /></span>
                      <p>{a}</p>
                      <strong>{b}</strong>
                      <small>{c}</small>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'documents' && (
                <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
                  <div className="upload-zone" onClick={() => triggerUpload(requiredDoc?.name ?? claim?.documents[0]?.name ?? 'Document')}>
                    <Upload className="mx-auto size-8 text-cyan-300" />
                    <h3>{uploadingDoc ? 'Analyzing document…' : requiredDoc ? `Drop your ${requiredDoc.name.toLowerCase()} here` : 'All required documents received'}</h3>
                    <p>PDF · JPG · PNG · up to 20 MB</p>
                    <button className="button button-small mt-5" disabled={!requiredDoc && !uploadingDoc}>
                      {uploadingDoc ? 'Analyzing…' : requiredDoc ? 'Upload document' : 'Nothing pending'}
                    </button>
                  </div>
                  <div className="glass p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Document center</h3>
                      <span className="text-xs text-slate-500">{readiness?.verified ?? 0} / {readiness?.total ?? 4} ready</span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {(claim?.documents ?? []).map((d) => (
                        <div className="document-row" key={d.id}>
                          <FileText className="size-5 text-slate-500" />
                          <div className="min-w-0 flex-1">
                            <b>{d.name}</b>
                            <small>{d.uploadedAt ? `Uploaded ${new Date(d.uploadedAt).toLocaleDateString()} · AI confidence ${d.confidence}%` : 'Not yet uploaded'}</small>
                          </div>
                          <span className={d.status === 'Verified' ? 'text-emerald-300' : d.status === 'Low quality' ? 'text-amber-300' : 'text-slate-400'}>{d.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'assistant' && (
                <div className="glass mx-auto max-w-3xl p-5">
                  <div className="flex items-center gap-3 border-b border-white/[.08] pb-4">
                    <span className="ai-orb"><Bot className="size-5" /></span>
                    <div>
                      <h3 className="font-medium">ClaimMate AI</h3>
                      <p className="text-xs text-slate-500">Your intelligent insurance companion</p>
                    </div>
                    <span className="ml-auto status"><span /> online</span>
                  </div>
                  <div className="chat-area">
                    {messages.map((m, i) => (
                      <div key={i} className={m.from === 'ai' ? 'chat ai' : 'chat user'}>
                        {m.text}
                        {m.from === 'ai' && <button onClick={() => setModal('policy')} className="policy-link">Policy reference · Section 4.2</button>}
                      </div>
                    ))}
                    {isSending && <div className="chat ai">Thinking…</div>}
                  </div>
                  {assistantError && <p className="mt-2 text-sm text-red-400">{assistantError}</p>}
                  <div className="chat-input">
                    <Paperclip className="size-4 text-slate-500" />
                    <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask anything about your policy..." />
                    <button onClick={send} aria-label="Send message"><ArrowRight className="size-4" /></button>
                    <button onClick={() => setModal('agent')} aria-label="Voice input"><Mic className="size-4" /></button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section id="security" className="section border-t border-white/[.06]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
          <div>
            <div className="eyebrow"><ShieldCheck className="size-3.5" /> Built for trust</div>
            <h2>Your claim data stays protected.</h2>
            <p className="lead">AI helps with the journey. Human approval remains at the center of every high-impact decision.</p>
            <button className="button button-ghost mt-7" onClick={() => setModal('policy')}>Explore our security <ArrowRight className="size-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Encryption', 'Private by design, protected in transit and at rest.'],
              ['Role-based access', 'The right people see the right information.'],
              ['Consent management', 'You stay in control of every document and decision.'],
              ['Human approval', 'Complex cases always have a human path.'],
            ].map(([a, b]) => (
              <motion.div whileHover={{ y: -5 }} className="security-card" key={a}>
                <ShieldCheck className="size-5 text-cyan-300" />
                <h3>{a}</h3>
                <p>{b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="insurers" className="section">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="glass flex flex-col justify-between gap-8 p-8 sm:p-12 lg:flex-row lg:items-center">
            <div>
              <div className="eyebrow">For insurers and fintechs</div>
              <h2 className="max-w-xl">Turn every support moment into momentum.</h2>
              <p className="lead max-w-xl">Reduce incomplete submissions, accelerate verification, and give your team more time for the cases that need human judgment.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="impact"><strong>30%</strong><span>fewer incomplete claims</span></div>
              <div className="impact"><strong>40%</strong><span>faster verification</span></div>
              <div className="impact"><strong>25%</strong><span>fewer repetitive queries</span></div>
              <div className="impact"><strong>20%</strong><span>higher satisfaction</span></div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.07] px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>From uncertainty to successful action. © 2026 ClaimMate AI</p>
          <button onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')} className="flex items-center gap-2"><Languages className="size-4" /> {language}</button>
        </div>
      </footer>

      <AnimatePresence>
        {modal && (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="modal glass" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setModal(null)}><X className="size-5" /></button>
              {modal === 'demo' && (
                <>
                  <span className="ai-orb"><Sparkles className="size-5" /></span>
                  <h2 className="mt-5 text-3xl">Ready to move your claim forward?</h2>
                  <p className="mt-3 text-slate-400">ClaimMate will check your coverage, documents and next best action in one guided flow.</p>
                  <div className="mt-7 grid gap-3">
                    <button className="button w-full justify-center" onClick={startClaim} disabled={creatingClaim}>
                      {creatingClaim ? 'Starting…' : 'Launch interactive demo'} <ArrowRight className="size-4" />
                    </button>
                    <button className="button button-ghost w-full justify-center" onClick={() => setModal(null)}>Maybe later</button>
                  </div>
                </>
              )}
              {modal === 'policy' && (
                <>
                  <div className="eyebrow">Explainable AI</div>
                  <h2 className="mt-4 text-3xl">Policy reference</h2>
                  <div className="policy-box mt-6">
                    <b>Section 4.2 — Hospitalization Coverage</b>
                    <p>Hospitalization exceeding 24 hours is covered when supported by a discharge summary and itemized bill.</p>
                  </div>
                  <p className="mt-5 text-sm text-slate-400">Matched condition: hospital admission · Confidence: 92%</p>
                  <button className="button mt-7" onClick={() => setModal(null)}>Got it <Check className="size-4" /></button>
                </>
              )}
              {modal === 'agent' && (
                <>
                  <span className="icon-box"><Bot className="size-5" /></span>
                  <h2 className="mt-5 text-3xl">Connect with a specialist</h2>
                  <p className="mt-3 text-slate-400">Your case may benefit from human guidance. Live handoff isn't wired up in this demo yet — the AI assistant below is fully functional in the meantime.</p>
                  <div className="mt-7 grid gap-3">
                    <button className="button w-full justify-center" onClick={() => { setModal(null); setTab('assistant'); scroll('features') }}>Continue with AI <ArrowRight className="size-4" /></button>
                    <button className="button button-ghost w-full justify-center" onClick={() => setModal(null)}>Close</button>
                  </div>
                </>
              )}
              {modal === 'auth' && (
                <>
                  <span className="icon-box"><ShieldCheck className="size-5" /></span>
                  <h2 className="mt-5 text-3xl">{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
                  <p className="mt-3 text-slate-400">{authMode === 'login' ? 'Sign in to see your claim.' : 'Set up an account to track your claim.'}</p>
                  <div className="mt-7 grid gap-3">
                    {authMode === 'signup' && (
                      <input
                        className="auth-input"
                        placeholder="Full name"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                      />
                    )}
                    <input
                      className="auth-input"
                      type="email"
                      placeholder="Email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                    <input
                      className="auth-input"
                      type="password"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitAuth()}
                    />
                    {authError && <p className="text-sm text-red-400">{authError}</p>}
                    <button className="button w-full justify-center" onClick={submitAuth} disabled={authLoading}>
                      {authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
                    </button>
                    <button
                      className="button button-ghost w-full justify-center"
                      onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError('') }}
                    >
                      {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
