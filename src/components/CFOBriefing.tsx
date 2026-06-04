'use client'
import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { AgentState } from './AgentPanel'
import AgentChat from './AgentChat'
import AgentStatusBar from './AgentStatusBar'
import ActionItemDetail from './ActionItemDetail'

interface ActionItem {
  id: number
  created_at: string
  source_agent: string
  description: string
  amount: number
  owner: string
  due_date: string
  status: string
  notes: string
}

const AGENT_KEYS = ['cash-reporter', 'cash-forecast', 'budget-analyst', 'ar-collections', 'ap-vendor', 'contract-watchdog'] as const
const AGENT_LABELS: Record<string, string> = {
  'cash-reporter': '💵 Cash',
  'cash-forecast': '📈 Forecast',
  'budget-analyst': '📊 Budget',
  'ar-collections': '📥 AR',
  'ap-vendor': '📤 AP',
  'contract-watchdog': '📋 Contracts',
}

interface Props {
  state: AgentState
  agentStates: Record<string, AgentState>
  onJumpToTab: (tab: string) => void
  actionItems: ActionItem[]
  onReloadActions: () => void
  onRerun: () => void
}

function stripMd(text: string) {
  return text
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/^\*\*?\s*/g, '')
    .trim()
}

function extractTitle(text: string): { title: string; body: string } {
  const cleaned = stripMd(text).replace(/^(CRITICAL|WARNING|ALERT|FLAG|ACTION REQUIRED|ISSUE):\s*/i, '')
  const dashIdx = cleaned.indexOf(' — ')
  if (dashIdx > 0 && dashIdx < 90) return { title: cleaned.slice(0, dashIdx), body: cleaned.slice(dashIdx + 3) }
  const colonIdx = cleaned.indexOf(': ')
  if (colonIdx > 0 && colonIdx < 55 && cleaned.slice(0, colonIdx).split(' ').length <= 7) {
    return { title: cleaned.slice(0, colonIdx), body: cleaned.slice(colonIdx + 2) }
  }
  // Only treat as sentence boundary when preceded by a letter (not a digit — avoids matching "1. Next item")
  const dotMatch = cleaned.search(/[a-zA-Z]\.\s+[A-Z]/)
  if (dotMatch > 19 && dotMatch < 110) return { title: cleaned.slice(0, dotMatch + 2), body: cleaned.slice(dotMatch + 3).trim() }
  return { title: cleaned, body: '' }
}

function formatBody(text: string): string {
  // Convert inline numbered list "1. xxx 2. xxx" to newline-separated
  return text.replace(/(\s+\d+\.\s)/g, '\n$1').trim()
}

function extractAmount(text: string): string | null {
  const m = text.match(/\$[\d,.]+[KMB]?/i)
  return m ? m[0] : null
}

function fmt(n: number) {
  if (!n) return null
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

interface HypoMetrics { totalCash: number; monthlyBurn: number; arOverdue: number }

export default function CFOBriefing({ state, agentStates, onJumpToTab, actionItems, onReloadActions, onRerun }: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)
  const [hypoMode, setHypoMode] = useState(false)
  const [hypoBurnCut, setHypoBurnCut] = useState(15)
  const [hypoRevenue, setHypoRevenue] = useState(0)
  const [hypoCollectAR, setHypoCollectAR] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<HypoMetrics | null>(null)
  const prevStatus = useRef(state.status)

  // Scroll to top on mount (navigation to this tab)
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [])

  // Scroll to top when briefing finishes — delay ensures React DOM settles first
  useEffect(() => {
    if (prevStatus.current === 'running' && state.status === 'complete') {
      setTimeout(() => {
        document.querySelector('main')?.scrollTo({ top: 0 })
      }, 150)
    }
    prevStatus.current = state.status
  }, [state.status])

  // Load metrics for hypothetical calculations
  useEffect(() => {
    if (hypoMode && !liveMetrics) {
      fetch('/api/metrics').then(r => r.json()).then(d => {
        if (d?.totalCash) setLiveMetrics({ totalCash: d.totalCash, monthlyBurn: d.monthlyBurn, arOverdue: d.arOverdue })
      }).catch(() => {})
    }
  }, [hypoMode, liveMetrics])

  // Hypothetical scenario calculations
  const baseBurn = liveMetrics?.monthlyBurn ?? 1190000
  const baseCash = liveMetrics?.totalCash ?? 12680000
  const baseAR = liveMetrics?.arOverdue ?? 186000
  const hypoBurn = Math.max(0, baseBurn * (1 - hypoBurnCut / 100) - hypoRevenue)
  const hypoCash = baseCash + (hypoCollectAR ? baseAR : 0)
  const hypoRunway = hypoBurn > 0 ? hypoCash / hypoBurn : 0
  const baseRunway = baseBurn > 0 ? baseCash / baseBurn : 0
  const runwayGain = hypoRunway - baseRunway

  const redItems = state.conclusions.filter(c => c.level === 'RED')
  const yellowItems = state.conclusions.filter(c => c.level === 'YELLOW')
  const greenItems = state.conclusions.filter(c => c.level === 'GREEN')

  // Use DB action items for the action panel (sourced from all agents)
  const openItems = actionItems.filter(i => i.status === 'open')
  const inProgressItems = actionItems.filter(i => i.status === 'in-progress')
  const doneItems = actionItems.filter(i => i.status === 'done')

  async function quickApprove(item: ActionItem) {
    await fetch('/api/action-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: 'done', notes: `[APPROVED ${new Date().toLocaleDateString()}]` }),
    })
    onReloadActions()
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (state.status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-lg w-full border-border">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="text-5xl">🏦</div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Finance Command Center</h2>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                7 AI agents are ready to analyze Acme Robotics&apos; financials — burn rate, receivables, payables, contracts, and more.
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-left">
              {[
                ['💵', 'Cash Position', 'Live burn rate & runway'],
                ['📈', 'Cash Forecast', '9-month scenario models'],
                ['📊', 'Budget', 'Variance analysis'],
                ['📥', 'Collections', 'AR priority queue'],
                ['📤', 'Payables', 'Fraud & payment audit'],
                ['📋', 'Contracts', 'Renewal risk radar'],
              ].map(([icon, name, desc]) => (
                <div key={name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-xs font-medium text-foreground">{name}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground/50 text-xs">
              Click <strong className="text-foreground">▶ Run All Agents</strong> in the sidebar to begin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Running ───────────────────────────────────────────────────────────────
  if (state.status === 'running') {
    const completed = Object.values(agentStates).filter(s => s.status === 'complete').length
    return (
      <div className="flex flex-col">
        <AgentStatusBar agentKey="cfo-briefing" agentName="CFO Briefing" model="DeepSeek-V3.2" provider="SambaNova" lastRun={null} status="running" />
        <div className="p-6 space-y-5">
          <p className="text-sm text-muted-foreground">Analyzing financials across all domains...</p>
          <div className="flex flex-wrap gap-2">
            {AGENT_KEYS.map(k => {
              const s = agentStates[k]
              const dotColor = !s || s.status === 'idle' ? 'bg-muted-foreground/30'
                : s.status === 'running' ? 'bg-yellow-400 animate-pulse'
                : s.status === 'complete' ? 'bg-green-500' : 'bg-destructive'
              return (
                <div key={k} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <span className="text-xs text-foreground">{AGENT_LABELS[k]}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground/60">
            {completed} of 6 specialist agents complete — CFO Briefing synthesizes last
          </p>
        </div>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  const reportHtml = state.report ? marked.parse(state.report) as string : ''

  return (
    <div className="flex flex-col gap-0">
      <AgentStatusBar agentKey="cfo-briefing" agentName="CFO Briefing" model="DeepSeek-V3.2" provider="SambaNova" lastRun={state.lastRun} status={state.status} onRerun={onRerun} />

      {/* Mode toggle */}
      <div className="px-6 pt-4 flex items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setHypoMode(false)}
            className={`px-3 py-1.5 transition font-medium ${!hypoMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Live Data
          </button>
          <button
            onClick={() => setHypoMode(true)}
            className={`px-3 py-1.5 transition font-medium ${hypoMode ? 'bg-yellow-500/20 text-yellow-300 border-l border-yellow-500/30' : 'text-muted-foreground hover:text-foreground border-l border-border'}`}
          >
            ⚗ Hypothetical
          </button>
        </div>
        {hypoMode && <span className="text-[10px] text-yellow-400/70 italic">Modeling a scenario — not live data</span>}
      </div>

      {/* Hypothetical scenario controls */}
      {hypoMode && (
        <div className="mx-6 mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
          <p className="text-xs font-semibold text-yellow-300 uppercase tracking-widest">Scenario Controls</p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Burn Rate Reduction</label>
                <span className="text-xs font-semibold text-yellow-300">{hypoBurnCut}%</span>
              </div>
              <input
                type="range" min={0} max={40} value={hypoBurnCut}
                onChange={e => setHypoBurnCut(Number(e.target.value))}
                className="w-full accent-yellow-400 h-1.5"
              />
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                New burn: ${((baseBurn * (1 - hypoBurnCut / 100)) / 1e6).toFixed(2)}M/mo (was ${(baseBurn / 1e6).toFixed(2)}M)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Additional Monthly Revenue</label>
                <span className="text-xs font-semibold text-yellow-300">${(hypoRevenue / 1e3).toFixed(0)}K/mo</span>
              </div>
              <input
                type="range" min={0} max={500000} step={25000} value={hypoRevenue}
                onChange={e => setHypoRevenue(Number(e.target.value))}
                className="w-full accent-yellow-400 h-1.5"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox" checked={hypoCollectAR}
                onChange={e => setHypoCollectAR(e.target.checked)}
                className="rounded accent-yellow-400"
              />
              <span className="text-xs text-muted-foreground">
                Collect overdue AR — add ${(baseAR / 1e3).toFixed(0)}K to cash
              </span>
            </label>
          </div>

          {/* Outcome card */}
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">New Monthly Burn</p>
              <p className="text-sm font-bold text-yellow-300">${(hypoBurn / 1e6).toFixed(2)}M</p>
              <p className="text-[10px] text-green-400">{hypoBurnCut > 0 ? `-$${((baseBurn - hypoBurn) / 1e3).toFixed(0)}K saved` : 'unchanged'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hypothetical Runway</p>
              <p className="text-sm font-bold text-yellow-300">{hypoRunway.toFixed(1)} mo</p>
              <p className={`text-[10px] ${runwayGain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {runwayGain > 0 ? '+' : ''}{runwayGain.toFixed(1)} mo vs now
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cash in 6 Mo</p>
              <p className="text-sm font-bold text-yellow-300">${Math.max(0, (hypoCash - hypoBurn * 6) / 1e6).toFixed(2)}M</p>
              <p className="text-[10px] text-muted-foreground/60">
                vs ${Math.max(0, (baseCash - baseBurn * 6) / 1e6).toFixed(2)}M base
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-7">

        {/* Executive Pulse — 30-second brief */}
        {(redItems.length > 0 || yellowItems.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-primary/60" />
              <h2 className="text-sm font-semibold text-foreground">Executive Pulse</h2>
              <span className="text-xs text-muted-foreground/50">— what needs your attention today</span>
            </div>
            <Card className="border-border bg-card">
              <CardContent className="px-4 py-4">
                <ul className="space-y-3">
                  {redItems.slice(0, 3).map((item, i) => {
                    const { title, body } = extractTitle(item.text)
                    const amount = extractAmount(item.text)
                    const formattedBody = formatBody(body)
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-foreground leading-snug">{title}</p>
                            {amount && <Badge variant="destructive" className="text-[10px] h-4 flex-shrink-0">{amount}</Badge>}
                          </div>
                          {formattedBody && (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{formattedBody}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                  {yellowItems.slice(0, 2).map((item, i) => {
                    const { title, body } = extractTitle(item.text)
                    const formattedBody = formatBody(body)
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-400 mt-1.5" />
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-semibold text-muted-foreground leading-snug">{title}</p>
                          {formattedBody && (
                            <p className="text-xs text-muted-foreground/60 leading-relaxed whitespace-pre-line">{formattedBody}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Critical Actions — from DB action items (all agents) */}
        {openItems.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-red-500" />
              <h2 className="text-sm font-semibold text-foreground">Action Queue</h2>
              <Badge variant="destructive" className="text-[10px] h-5">{openItems.length} open</Badge>
              <span className="text-xs text-muted-foreground/50 ml-1">— click any item for full details + context</span>
            </div>
            {openItems.map((item, i) => {
              const { title, body } = extractTitle(item.description)
              const amount = fmt(Number(item.amount))
              const agentLabel = AGENT_LABELS[item.source_agent] ?? item.source_agent
              return (
                <Card
                  key={i}
                  className="border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-red-300 leading-snug">{title}</p>
                          {amount && <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">{amount}</Badge>}
                        </div>
                        {body && body !== title && (
                          <p className="text-xs text-red-200/60 leading-relaxed line-clamp-2 mb-1">{body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/40">Surfaced by {agentLabel}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/40"
                        variant="ghost"
                        onClick={() => quickApprove(item)}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-blue-300/70 hover:text-blue-300 border border-blue-500/20 hover:bg-blue-500/10"
                        onClick={() => setSelectedItem(item)}
                      >
                        ↗ Delegate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground/50 ml-auto"
                        onClick={() => setSelectedItem(item)}
                      >
                        Full details →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>
        )}

        {/* Delegated / In-Progress — shows where delegated items went */}
        {inProgressItems.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-blue-400" />
              <h2 className="text-sm font-semibold text-foreground">Delegated</h2>
              <Badge variant="secondary" className="text-[10px] h-5">{inProgressItems.length}</Badge>
              <span className="text-xs text-muted-foreground/50 ml-1">— items you've assigned to the team</span>
            </div>
            {inProgressItems.map((item, i) => {
              const { title } = extractTitle(item.description)
              const amount = fmt(Number(item.amount))
              return (
                <Card
                  key={i}
                  className="border-blue-500/20 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-blue-300 leading-snug flex-1">{title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {amount && <Badge variant="outline" className="text-[10px] h-4">{amount}</Badge>}
                        {item.owner && (
                          <Badge variant="secondary" className="text-[10px] h-4">→ {item.owner}</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground/40">In Progress</span>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{item.notes}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </section>
        )}

        {/* Resolved — recently closed items for reference */}
        {doneItems.length > 0 && (
          <section>
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-muted-foreground/50 hover:text-muted-foreground transition">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                <span>{doneItems.length} resolved item{doneItems.length > 1 ? 's' : ''}</span>
              </summary>
              <div className="mt-2 space-y-1.5 pl-4">
                {doneItems.map((item, i) => {
                  const { title } = extractTitle(item.description)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/40">
                      <span className="w-1 h-1 rounded-full bg-green-500/40 flex-shrink-0" />
                      <span className="line-through">{title}</span>
                    </div>
                  )
                })}
              </div>
            </details>
          </section>
        )}

        {/* Watch Items */}
        {yellowItems.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-yellow-400" />
              <h2 className="text-sm font-semibold text-foreground">Monitor</h2>
            </div>
            {yellowItems.map((item, i) => {
              const { title, body } = extractTitle(item.text)
              return (
                <Card key={i} className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="px-4 py-3 space-y-1">
                    <p className="text-sm font-medium text-yellow-300 leading-snug">{title}</p>
                    {body && body !== title && (
                      <p className="text-xs text-yellow-200/60 leading-relaxed">{body}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </section>
        )}

        {/* Agents Handled Automatically */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
            <h2 className="text-sm font-semibold text-foreground">Agents Handled Automatically</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {AGENT_KEYS.map(k => {
              const s = agentStates[k]
              const hasRed = s?.conclusions?.some(c => c.level === 'RED')
              const hasYellow = s?.conclusions?.some(c => c.level === 'YELLOW')
              const dotColor = !s || s.status !== 'complete' ? 'bg-muted-foreground/30'
                : hasRed ? 'bg-red-500'
                : hasYellow ? 'bg-yellow-400'
                : 'bg-green-500'
              const stepCount = s?.reasoningSteps?.length ?? 0
              const dataCount = s?.dataScanned?.length ?? 0
              const tooltip = s?.status === 'complete'
                ? `${dataCount} data source${dataCount !== 1 ? 's' : ''} · ${stepCount} analysis step${stepCount !== 1 ? 's' : ''}`
                : 'Not run yet'
              return (
                <button
                  key={k}
                  onClick={() => onJumpToTab(k)}
                  title={tooltip}
                  className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 bg-card hover:bg-muted transition text-xs text-foreground group"
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span>{AGENT_LABELS[k]}</span>
                  {s?.status === 'complete' && (
                    <span className="text-muted-foreground/40 text-[10px] ml-0.5 group-hover:text-muted-foreground/70">
                      {stepCount} steps
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {greenItems.length > 0 && (
            <div className="mt-3 space-y-1">
              {greenItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                  <span className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0" />
                  {item.text}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Full CFO Analysis */}
        {reportHtml && (
          <Card className="border-border">
            <button
              onClick={() => setAnalysisOpen(o => !o)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition rounded-t-lg"
            >
              <span className={`text-muted-foreground/50 text-xs transition-transform duration-150 ${analysisOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
              <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Full CFO Analysis</span>
              <span className="text-xs text-muted-foreground/40 ml-1">— Complete AI-generated briefing</span>
            </button>
            {analysisOpen && (
              <CardContent className="pt-0 px-6 pb-6">
                <p className="text-[11px] text-muted-foreground/50 italic mb-4">AI-generated — verify key figures before distributing externally</p>
                <div
                  className="prose prose-invert prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:bg-muted [&_th]:text-xs [&_th]:uppercase [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:text-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />
              </CardContent>
            )}
          </Card>
        )}
      </div>

      <div className="border-t border-border">
        <AgentChat agent="briefing" />
      </div>

      {/* Detail drawer */}
      <ActionItemDetail
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={onReloadActions}
      />
    </div>
  )
}
