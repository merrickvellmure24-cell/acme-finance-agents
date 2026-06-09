'use client'
import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ActionItem {
  id: number
  source_agent: string
  description: string
  amount: number
  status: string
  notes: string
  owner: string
  created_at: string
  due_date: string
}

interface Props {
  item: ActionItem | null
  initialDecision?: 'approved' | 'delegated' | 'dismissed'
  simulationMode?: boolean
  onClose: () => void
  onUpdate: () => void
  onSimApprove?: (item: ActionItem) => void
}

const AGENT_LABELS: Record<string, string> = {
  'cash-reporter': '🏛️ Treasury',
  'cash-forecast': '📈 Cash Forecast',
  'budget-analyst': '📊 Budget',
  'ar-collections': '📥 Collections',
  'ap-vendor': '📤 Payables',
  'contract-watchdog': '📋 Contracts',
  'cfo-briefing': '🏦 CFO Briefing',
}

const DEPTS = ['Finance', 'Legal', 'Operations', 'Engineering', 'Sales', 'HR', 'Management']

type DecisionType = 'approved' | 'delegated' | 'dismissed'
type Phase = 'deciding' | 'previewing' | 'decided'

function fmtAmount(n: number) {
  if (!n) return null
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

function detectDecision(notes: string): DecisionType | null {
  if (!notes) return null
  if (notes.startsWith('[APPROVED')) return 'approved'
  if (notes.startsWith('[DELEGATED')) return 'delegated'
  if (notes.startsWith('[DISMISSED')) return 'dismissed'
  return null
}

function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const headers = ['SITUATION', 'FINANCIAL IMPACT', 'IF LEFT UNRESOLVED', 'RECOMMENDED ACTION']
  let current = ''
  for (const line of text.split('\n')) {
    const stripped = line.replace(/\*\*/g, '').trim()
    const matched = headers.find(h => stripped.toUpperCase().startsWith(h))
    if (matched) { current = matched; sections[current] = '' }
    else if (current) { sections[current] = (sections[current] ?? '') + line + '\n' }
  }
  return sections
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

function Inner({
  item,
  initialDecision,
  simulationMode,
  onClose,
  onUpdate,
  onSimApprove,
}: {
  item: ActionItem
  initialDecision?: DecisionType
  simulationMode?: boolean
  onClose: () => void
  onUpdate: () => void
  onSimApprove?: (item: ActionItem) => void
}) {
  const existingDecision = detectDecision(item.notes ?? '')
  const [phase, setPhase] = useState<Phase>(existingDecision ? 'decided' : 'deciding')
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null)
  const [artifact, setArtifact] = useState('')
  const [editedArtifact, setEditedArtifact] = useState('')
  const [artifactLoading, setArtifactLoading] = useState(false)
  const [delegateName, setDelegateName] = useState('')
  const [delegateDept, setDelegateDept] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(false)
  const [chatTab, setChatTab] = useState<'decision' | 'chat'>('decision')
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const artifactAbortRef = useRef<AbortController | null>(null)
  const initialDecisionHandled = useRef(false)

  // Auto-load streaming analysis when drawer opens (only if not yet decided)
  function loadAnalysis() {
    if (existingDecision) return
    setAnalysis('')
    setAnalysisError(false)
    setAnalyzing(true)
    const ctrl = new AbortController()
    fetch('/api/action-items/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: item.description, sourceAgent: item.source_agent, amount: item.amount }),
      signal: ctrl.signal,
    }).then(async res => {
      if (!res.body) { setAnalysisError(true); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
        setAnalysis(full)
      }
      if (!full.trim()) setAnalysisError(true)
    }).catch(err => {
      if ((err as Error).name !== 'AbortError') setAnalysisError(true)
    }).finally(() => setAnalyzing(false))
    return () => ctrl.abort()
  }

  useEffect(() => {
    const cleanup = loadAnalysis()
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (initialDecision && !existingDecision && !initialDecisionHandled.current) {
      initialDecisionHandled.current = true
      startPreview(initialDecision)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDecision, item.id])

  async function startPreview(dec: DecisionType) {
    // For delegate, need name first — just set phase and let user fill form
    setPendingDecision(dec)
    setArtifact('')
    setEditedArtifact('')
    setNote('')
    setPhase('previewing')
    if (dec !== 'delegated') {
      await generateArtifact(dec, '', '')
    }
  }

  async function generateArtifact(dec: DecisionType, name: string, dept: string) {
    artifactAbortRef.current?.abort()
    const ctrl = new AbortController()
    artifactAbortRef.current = ctrl
    setArtifactLoading(true)
    setArtifact('')
    setEditedArtifact('')
    try {
      const res = await fetch('/api/action-items/consequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: item.description,
          sourceAgent: item.source_agent,
          amount: item.amount,
          decision: dec,
          delegateName: name || undefined,
          delegateDept: dept || undefined,
        }),
        signal: ctrl.signal,
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const dec2 = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec2.decode(value, { stream: true })
        setArtifact(full)
        setEditedArtifact(full)
      }
    } catch { /* aborted */ } finally {
      setArtifactLoading(false)
    }
  }

  async function confirmDecision() {
    if (!pendingDecision) return
    setSaving(true)
    const statusMap: Record<DecisionType, string> = { approved: 'done', delegated: 'in-progress', dismissed: 'done' }
    const header = `[${pendingDecision.toUpperCase()} ${new Date().toLocaleDateString()}]`
      + (simulationMode ? ' [SIMULATED]' : '')
      + (pendingDecision === 'delegated' && delegateName ? ` → ${delegateName}${delegateDept ? ` (${delegateDept})` : ''}` : '')
      + (note ? ` — ${note}` : '')
    const noteText = header + (editedArtifact ? `\n\n${editedArtifact}` : '')

    if (!simulationMode) {
      await fetch('/api/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: statusMap[pendingDecision],
          notes: noteText,
          ...(pendingDecision === 'delegated' && delegateName ? { owner: delegateName } : {}),
        }),
      })
    }
    setSaving(false)
    if (!simulationMode) {
      onUpdate()
    } else if (pendingDecision === 'approved') {
      onSimApprove?.(item)
    }
    setPhase('decided')
  }

  async function undo() {
    setSaving(true)
    await fetch('/api/action-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: 'open', notes: '' }),
    })
    setSaving(false)
    onUpdate()
    onClose()
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    const userMsg: ChatMsg = { role: 'user', content: text }
    const next = [...chatMessages, userMsg]
    setChatMessages(next)
    setChatLoading(true)
    const agentMap: Record<string, string> = {
      'ar-collections': 'ar', 'ap-vendor': 'ap', 'budget-analyst': 'budget',
      'contract-watchdog': 'contracts', 'cash-reporter': 'cash', 'cash-forecast': 'cash',
    }
    const chatAgent = agentMap[item.source_agent] ?? 'briefing'
    const itemCtx = `Action item: "${item.description}" | Amount: $${Number(item.amount).toLocaleString()} | Agent: ${item.source_agent}`
    try {
      const res = await fetch(`/api/chat?agent=${chatAgent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, itemContext: itemCtx }),
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let reply = ''
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        reply += dec.decode(value, { stream: true })
        setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: reply }; return u })
      }
      if (!reply.trim()) {
        setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'The AI provider is temporarily rate-limited. Please try again.' }; return u })
      }
    } catch (err) {
      setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: `Error: ${String(err)}` }; return u })
    }
    setChatLoading(false)
  }

  const sections = parseSections(analysis)
  const amount = fmtAmount(Number(item.amount))

  const rawTitle = (() => {
    const t = item.description.replace(/\*\*([^*]+?)\*\*/g, '$1').replace(/^\*\*?\s*/g, '').trim()
    const dash = t.indexOf(' — ')
    if (dash > 0 && dash < 90) return t.slice(0, dash)
    const colon = t.indexOf(': ')
    if (colon > 0 && colon < 55 && t.slice(0, colon).split(' ').length <= 7) return t.slice(0, colon)
    return t.slice(0, 90) + (t.length > 90 ? '…' : '')
  })()

  // Parse stored decision artifact from notes
  const [decisionHeader, storedArtifact] = (() => {
    if (!item.notes) return ['', '']
    const parts = item.notes.split('\n\n')
    return [parts[0] ?? '', parts.slice(1).join('\n\n')]
  })()

  const DECISION_COLORS: Record<DecisionType, { bg: string; border: string; text: string; label: string }> = {
    approved: { bg: 'bg-green-500/5', border: 'border-green-500/30', text: 'text-green-400', label: '✓ Approved' },
    delegated: { bg: 'bg-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-400', label: '↗ Delegated' },
    dismissed: { bg: 'bg-zinc-500/5', border: 'border-zinc-500/30', text: 'text-zinc-400', label: '✕ Dismissed' },
  }

  return (
    <>
      {/* Header */}
      <SheetHeader className="pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {existingDecision
            ? <Badge variant="outline" className={`text-[10px] h-5 ${DECISION_COLORS[existingDecision].text}`}>{DECISION_COLORS[existingDecision].label}</Badge>
            : <Badge variant="destructive" className="text-[10px] h-5">Needs Action</Badge>
          }
          <span className="text-xs text-muted-foreground">{AGENT_LABELS[item.source_agent] ?? item.source_agent}</span>
          {amount && <Badge variant="outline" className="text-[10px] h-5">{amount}</Badge>}
        </div>
        <SheetTitle className="text-base font-bold text-left leading-snug text-foreground">{rawTitle}</SheetTitle>
      </SheetHeader>

      {/* ── PREVIEW PHASE ── */}
      {phase === 'previewing' && (
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { artifactAbortRef.current?.abort(); setPhase('deciding'); setPendingDecision(null) }}
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
            >
              ← Back
            </button>
            <span className="text-xs text-muted-foreground/40">·</span>
            <span className={`text-xs font-medium ${DECISION_COLORS[pendingDecision!].text}`}>
              {DECISION_COLORS[pendingDecision!].label}
            </span>
          </div>

          {/* Delegation form */}
          {pendingDecision === 'delegated' && (
            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign to</p>
              <Input
                value={delegateName}
                onChange={e => setDelegateName(e.target.value)}
                placeholder="Person's name..."
                className="text-sm h-9"
              />
              <Select value={delegateDept} onValueChange={v => v && setDelegateDept(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Department..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={!delegateName.trim() || artifactLoading}
                onClick={() => generateArtifact('delegated', delegateName, delegateDept)}
              >
                {artifactLoading ? <span className="animate-pulse">Generating brief…</span> : '✦ Generate Delegation Brief'}
              </Button>
            </div>
          )}

          {/* Artifact */}
          {(pendingDecision !== 'delegated' || artifact) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {pendingDecision === 'approved' ? 'Generated Document' : pendingDecision === 'delegated' ? 'Delegation Brief' : 'Dismissal Record'}
                </p>
                {artifactLoading && <span className="text-xs text-muted-foreground animate-pulse">Writing…</span>}
              </div>
              <Textarea
                value={editedArtifact}
                onChange={e => setEditedArtifact(e.target.value)}
                className="text-xs font-mono leading-relaxed resize-none min-h-[200px]"
                placeholder={artifactLoading ? 'Generating…' : 'Document will appear here…'}
              />
              <p className="text-[10px] text-muted-foreground/40">You can edit this before confirming. It will be saved with the decision.</p>
            </div>
          )}

          {/* Optional note */}
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a personal note or context (optional)..."
            className="text-sm resize-none h-16"
          />

          <Button
            className="w-full"
            disabled={saving || artifactLoading || (pendingDecision === 'delegated' && !editedArtifact)}
            onClick={confirmDecision}
          >
            {saving ? 'Saving…' : simulationMode
              ? `✓ Confirm Simulation — ${pendingDecision === 'approved' ? 'Preview Only' : pendingDecision === 'delegated' ? 'Preview Delegation' : 'Preview Dismiss'}`
              : `✓ Confirm — ${pendingDecision === 'approved' ? 'Mark Resolved' : pendingDecision === 'delegated' ? `Assign to ${delegateName || 'Team'}` : 'Dismiss'}`}
          </Button>
        </div>
      )}

      {/* ── DECIDED PHASE ── */}
      {phase === 'decided' && (
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {existingDecision && (
            <div className={`rounded-lg border p-4 ${DECISION_COLORS[existingDecision].border} ${DECISION_COLORS[existingDecision].bg}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${DECISION_COLORS[existingDecision].text}`}>
                {DECISION_COLORS[existingDecision].label}
              </p>
              <p className="text-xs text-muted-foreground">{decisionHeader}</p>
            </div>
          )}

          {storedArtifact && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filed Document</p>
              <div className="rounded-lg border border-border bg-muted/10 p-4">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground font-sans">{storedArtifact}</pre>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full text-muted-foreground hover:text-foreground"
              disabled={saving}
              onClick={undo}
            >
              {saving ? 'Reopening…' : '↩ Reopen This Item'}
            </Button>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">This will move the item back to Open and clear the decision record.</p>
          </div>
        </div>
      )}

      {/* ── DECIDING PHASE ── */}
      {phase === 'deciding' && (
        <>
          {/* Tab toggle */}
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setChatTab('decision')}
              className={`flex-1 py-2.5 text-xs font-medium transition ${chatTab === 'decision' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Analysis &amp; Decision
            </button>
            <button
              onClick={() => setChatTab('chat')}
              className={`flex-1 py-2.5 text-xs font-medium transition ${chatTab === 'chat' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              💬 Discuss with AI
            </button>
          </div>

          {chatTab === 'decision' ? (
            <div className="flex-1 overflow-y-auto py-5 space-y-5">
              {/* AI Analysis sections */}
              {(analyzing && !analysis) ? (
                <div className="space-y-3 animate-pulse">
                  {[100, 80, 90, 85].map((w, i) => (
                    <div key={i} className="h-3 bg-muted rounded" style={{ width: `${w}%` }} />
                  ))}
                  <p className="text-xs text-muted-foreground/40 pt-1">Analyzing with SambaNova DeepSeek-V3.2…</p>
                </div>
              ) : analysisError ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">Could not load analysis — the AI provider may be temporarily busy.</p>
                  <button onClick={loadAnalysis} className="text-xs text-primary hover:underline">↺ Retry analysis</button>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  {[
                    { key: 'SITUATION', label: "What's Happening", color: 'border-blue-500/30 bg-blue-500/5', textColor: 'text-blue-200' },
                    { key: 'FINANCIAL IMPACT', label: 'Financial Impact', color: 'border-red-500/30 bg-red-500/5', textColor: 'text-red-200' },
                    { key: 'IF LEFT UNRESOLVED', label: 'If Left Unresolved', color: 'border-orange-500/30 bg-orange-500/5', textColor: 'text-orange-200' },
                    { key: 'RECOMMENDED ACTION', label: 'Recommended Action', color: 'border-green-500/30 bg-green-500/5', textColor: 'text-green-200' },
                  ].map(({ key, label, color, textColor }) => {
                    const content = sections[key]?.trim()
                    if (!content && !analyzing) return null
                    return (
                      <div key={key} className={`rounded-lg border p-3.5 ${color}`}>
                        <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${textColor}`}>{label}</p>
                        <p className={`text-xs leading-relaxed ${textColor} opacity-90 whitespace-pre-line`}>
                          {content || (analyzing ? '…' : '')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {/* Decision buttons */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Make a Decision</p>
                <p className="text-xs text-muted-foreground/60">Clicking a decision will show you a preview — including a drafted document — before anything is saved.</p>
                <div className="space-y-2">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => startPreview('approved')}>
                    ✓ Approve — See what happens &amp; confirm
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => startPreview('delegated')}>
                    ↗ Delegate — Assign to a team member
                  </Button>
                  <Button variant="outline" className="w-full text-muted-foreground" onClick={() => startPreview('dismissed')}>
                    ✕ Dismiss — Review rationale &amp; confirm
                  </Button>
                </div>
              </div>

              {item.notes && (
                <div className="border border-border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Previous Decision</p>
                  <p className="text-xs text-muted-foreground">{item.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground/50 space-y-2">
                    <p>Ask anything about this action item.</p>
                    <div className="space-y-1.5">
                      {['What are the alternatives?', 'How does this compare to industry norms?', 'What\'s the fastest path to resolution?'].map(q => (
                        <button key={q} onClick={() => setChatInput(q)}
                          className="block w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-muted/40 text-xs text-muted-foreground transition">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      {msg.role === 'assistant' && !msg.content && chatLoading
                        ? <span className="animate-pulse text-muted-foreground">Thinking…</span>
                        : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-border pt-3 pb-1 flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="Ask a question..."
                  className="text-sm resize-none h-16 flex-1"
                />
                <Button size="sm" onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="self-end h-8 px-3">
                  {chatLoading ? '…' : 'Send'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function ActionItemDetail({ item, initialDecision, simulationMode, onClose, onUpdate, onSimApprove }: Props) {
  return (
    <Sheet open={!!item} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg flex flex-col overflow-hidden p-6">
        {item && (
          <Inner
            key={`${item.id}-${initialDecision ?? 'none'}`}
            item={item}
            initialDecision={initialDecision}
            simulationMode={simulationMode}
            onClose={onClose}
            onUpdate={onUpdate}
            onSimApprove={onSimApprove}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
