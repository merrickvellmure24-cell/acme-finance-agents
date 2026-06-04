'use client'
import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface ActionItem {
  id: number
  source_agent: string
  description: string
  amount: number
  status: string
  notes: string
  owner: string
  created_at: string
}

interface Props {
  item: ActionItem | null
  onClose: () => void
  onUpdate: () => void
}

const AGENT_LABELS: Record<string, string> = {
  'cash-reporter': '💵 Cash Position',
  'cash-forecast': '📈 Cash Forecast',
  'budget-analyst': '📊 Budget',
  'ar-collections': '📥 Collections',
  'ap-vendor': '📤 Payables',
  'contract-watchdog': '📋 Contracts',
  'cfo-briefing': '🏦 CFO Briefing',
}

function fmtAmount(n: number) {
  if (!n) return null
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

// Parse streamed markdown into sections
function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const headers = ['SITUATION', 'FINANCIAL IMPACT', 'IF LEFT UNRESOLVED', 'RECOMMENDED ACTION']
  let current = ''
  for (const line of text.split('\n')) {
    const stripped = line.replace(/\*\*/g, '').trim()
    const matched = headers.find(h => stripped.toUpperCase().startsWith(h))
    if (matched) {
      current = matched
      sections[current] = ''
    } else if (current) {
      sections[current] = (sections[current] ?? '') + line + '\n'
    }
  }
  return sections
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

function Inner({ item, onClose, onUpdate }: { item: ActionItem; onClose: () => void; onUpdate: () => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [chatTab, setChatTab] = useState<'decision' | 'chat'>('decision')
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-load streaming analysis when drawer opens
  useEffect(() => {
    setAnalysis('')
    setAnalyzing(true)
    const ctrl = new AbortController()

    fetch('/api/action-items/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: item.description, sourceAgent: item.source_agent, amount: item.amount }),
      signal: ctrl.signal,
    }).then(async res => {
      if (!res.body) return
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setAnalysis(prev => prev + dec.decode(value, { stream: true }))
      }
    }).catch(() => {}).finally(() => setAnalyzing(false))

    return () => ctrl.abort()
  }, [item.id])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function decide(decision: 'approved' | 'delegated' | 'dismissed') {
    setSaving(true)
    const statusMap: Record<string, string> = { approved: 'done', delegated: 'in-progress', dismissed: 'done' }
    const noteText = `[${decision.toUpperCase()} ${new Date().toLocaleDateString()}]${note ? ` — ${note}` : ''}`
    await fetch('/api/action-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        status: statusMap[decision],
        notes: noteText,
        ...(decision === 'delegated' && note ? { owner: note.split(' ')[0] } : {}),
      }),
    })
    setSaving(false)
    setNote('')
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
    const itemCtx = `Action item requiring CFO decision: "${item.description}" | Amount at risk: $${Number(item.amount).toLocaleString()} | Surfaced by: ${item.source_agent} agent | Current status: ${item.status}`

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
        setChatMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: reply }
          return updated
        })
      }
      if (!reply.trim()) {
        setChatMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'The AI provider is temporarily rate-limited. Please try again in a moment.' }
          return updated
        })
      }
    } catch (err) {
      setChatMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Connection error: ${String(err)}` }
        return updated
      })
    }
    setChatLoading(false)
  }

  const sections = parseSections(analysis)
  const amount = fmtAmount(Number(item.amount))
  const { title: rawTitle } = (() => {
    const t = item.description.replace(/\*\*([^*]+?)\*\*/g, '$1').replace(/^\*\*?\s*/g, '').trim()
    const dash = t.indexOf(' — ')
    if (dash > 0 && dash < 90) return { title: t.slice(0, dash) }
    const colon = t.indexOf(': ')
    if (colon > 0 && colon < 55 && t.slice(0, colon).split(' ').length <= 7) return { title: t.slice(0, colon) }
    return { title: t.slice(0, 90) + (t.length > 90 ? '…' : '') }
  })()

  return (
    <>
      <SheetHeader className="pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="destructive" className="text-[10px] h-5">Critical</Badge>
          <span className="text-xs text-muted-foreground">{AGENT_LABELS[item.source_agent] ?? item.source_agent}</span>
          {amount && <Badge variant="outline" className="text-[10px] h-5">{amount}</Badge>}
          <Badge variant={item.status === 'done' ? 'default' : item.status === 'in-progress' ? 'secondary' : 'destructive'} className="text-[10px] h-5 ml-auto">
            {item.status}
          </Badge>
        </div>
        <SheetTitle className="text-base font-bold text-left leading-snug text-foreground">{rawTitle}</SheetTitle>
      </SheetHeader>

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
              {[120, 80, 100, 90].map((w, i) => (
                <div key={i} className="h-3 bg-muted rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {[
                { key: 'SITUATION', label: 'What\'s Happening', color: 'border-blue-500/30 bg-blue-500/5', textColor: 'text-blue-200' },
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
                      {content || (analyzing ? '...' : '')}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Decision */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Make a Decision</p>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`Add context, next steps, or who to delegate to...\n\nFor Approve: describe what action was taken\nFor Delegate: name the owner (e.g. "Finance team — Sarah")\nFor Dismiss: explain why no action is needed`}
              className="text-sm resize-none h-24"
            />
            <div className="space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={saving} onClick={() => decide('approved')}>
                ✓ Approve — Mark as Resolved
              </Button>
              <Button variant="secondary" className="w-full" disabled={saving} onClick={() => decide('delegated')}>
                ↗ Delegate — Assign to Team
              </Button>
              <Button variant="outline" className="w-full text-muted-foreground" disabled={saving} onClick={() => decide('dismissed')}>
                ✕ Dismiss — No Action Required
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
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
            {chatMessages.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground/50 space-y-2">
                <p>Ask anything about this action item.</p>
                <div className="space-y-1.5">
                  {['What are the alternatives to approving this?', 'How does this compare to industry norms?', 'What\'s the fastest path to resolution?'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="block w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-muted/40 text-xs text-muted-foreground transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.role === 'assistant' && !msg.content && chatLoading
                    ? <span className="animate-pulse text-muted-foreground">Thinking...</span>
                    : msg.content
                  }
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-border pt-3 pb-1 flex gap-2">
            <Textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
              placeholder="Ask a question about this action item..."
              className="text-sm resize-none h-16 flex-1"
            />
            <Button size="sm" onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="self-end h-8 px-3">
              {chatLoading ? '...' : 'Send'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default function ActionItemDetail({ item, onClose, onUpdate }: Props) {
  return (
    <Sheet open={!!item} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg flex flex-col overflow-hidden p-6">
        {item && <Inner item={item} onClose={onClose} onUpdate={onUpdate} />}
      </SheetContent>
    </Sheet>
  )
}
