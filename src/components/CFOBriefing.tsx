'use client'
import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { AgentState } from './AgentPanel'
import AgentChat from './AgentChat'
import AgentStatusBar from './AgentStatusBar'
import FinancialSnapshotCard from './charts/FinancialSnapshotCard'
import type { AggregateSimDelta } from '@/lib/hypotheticals/scenarios'

async function exportActionItemsCSV() {
  const items = await fetch('/api/action-items').then(r => r.json()).catch(() => [])
  if (!Array.isArray(items) || items.length === 0) { alert('No action items to export.'); return }

  const AGENT_LABELS: Record<string, string> = {
    'cash-reporter': 'Treasury', 'cash-forecast': 'Forecast', 'budget-analyst': 'Budget',
    'ar-collections': 'AR Collections', 'ap-vendor': 'Payables', 'contract-watchdog': 'Contracts', 'cfo-briefing': 'CFO Briefing',
  }

  const headers = ['ID', 'Source', 'Description', 'Amount ($)', 'Status', 'Owner', 'Due Date', 'Notes', 'Created']
  const rows = items.map((item: {
    id: number; source_agent: string; description: string; amount: number;
    status: string; owner: string; due_date: string; notes: string; created_at: string;
  }) => [
    String(item.id),
    AGENT_LABELS[item.source_agent] ?? item.source_agent,
    (item.description ?? '').replace(/\*\*/g, '').replace(/"/g, '""').slice(0, 200),
    item.amount ? String(Math.abs(Number(item.amount))) : '',
    item.status ?? '',
    item.owner ?? '',
    item.due_date ? new Date(item.due_date).toLocaleDateString() : '',
    (item.notes ?? '').replace(/"/g, '""').slice(0, 150),
    item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
  ])

  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `acme-action-items-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const AGENT_KEYS = ['cash-reporter', 'cash-forecast', 'budget-analyst', 'ar-collections', 'ap-vendor', 'contract-watchdog'] as const
const AGENT_LABELS: Record<string, string> = {
  'cash-reporter': '🏛️ Treasury',
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
  onRerun: () => void
  simDeltas?: AggregateSimDelta | null
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
  const dotMatch = cleaned.search(/[a-zA-Z]\.\s+[A-Z]/)
  if (dotMatch > 19 && dotMatch < 110) return { title: cleaned.slice(0, dotMatch + 2), body: cleaned.slice(dotMatch + 3).trim() }
  return { title: cleaned, body: '' }
}

function formatBody(text: string): string {
  return text.replace(/(\s+\d+\.\s)/g, '\n$1').trim()
}

function extractAmount(text: string): string | null {
  const m = text.match(/\$[\d,.]+[KMB]?/i)
  return m ? m[0] : null
}

export default function CFOBriefing({ state, agentStates, onJumpToTab, onRerun, simDeltas }: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [monitorOpen, setMonitorOpen] = useState(false)
  const prevStatus = useRef(state.status)

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    if (prevStatus.current === 'running' && state.status === 'complete') {
      setTimeout(() => {
        document.querySelector('main')?.scrollTo({ top: 0 })
      }, 150)
    }
    prevStatus.current = state.status
  }, [state.status])

  const redItems = state.conclusions.filter(c => c.level === 'RED')
  const yellowItems = state.conclusions.filter(c => c.level === 'YELLOW')
  const greenItems = state.conclusions.filter(c => c.level === 'GREEN')

  if (state.status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-lg w-full border-border">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="text-5xl">🏦</div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Your first-hour briefing is ready to run</h2>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                Seven AI agents will scan cash, forecasts, budget, AR, AP, and contracts — then synthesize findings into decisions for you.
              </p>
            </div>

            <div className="space-y-2 text-left">
              {[
                { step: '1', label: 'Click ↻ Update (top right)', sub: '~60 seconds', color: 'bg-primary text-primary-foreground' },
                { step: '2', label: 'Review alerts in Executive Pulse', sub: '2 minutes', color: 'bg-muted text-muted-foreground' },
                { step: '3', label: 'Act on items in the sidebar', sub: 'your call', color: 'bg-muted text-muted-foreground' },
              ].map(({ step, label, sub, color }) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card/50">
                  <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${color}`}>
                    {step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{label}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">{sub}</span>
                </div>
              ))}
            </div>

            <Separator />
            <div className="grid grid-cols-2 gap-2 text-left">
              {[
                ['🏛️', 'Treasury', 'Cash & runway'],
                ['📈', 'Forecast', '9-month scenarios'],
                ['📊', 'Budget', 'Variance analysis'],
                ['📥', 'AR', 'Collections priority'],
                ['📤', 'AP', 'Payment audit'],
              ].map(([icon, name, desc]) => (
                <div key={name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                  <span className="text-sm">{icon}</span>
                  <div>
                    <p className="text-xs font-medium text-foreground">{name}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.status === 'running') {
    const completed = Object.values(agentStates).filter(s => s.status === 'complete').length
    return (
      <div className="flex flex-col">
        <AgentStatusBar agentKey="cfo-briefing" agentName="CFO Briefing" model="DeepSeek-V3.2" provider="SambaNova" lastRun={null} status="running" />
        <div className="p-6 space-y-5">
          <p className="text-sm text-muted-foreground">Preparing your first-hour briefing across all domains...</p>
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

  const reportHtml = state.report ? marked.parse(state.report) as string : ''

  // Computed verdict headlines
  const criticalCount = redItems.length
  const pulseHeadline = criticalCount > 0
    ? `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} need a decision today`
    : yellowItems.length > 0
    ? `${yellowItems.length} item${yellowItems.length > 1 ? 's' : ''} to monitor — no critical blockers`
    : 'All clear — no critical issues flagged'

  const monitorHeadline = yellowItems.length > 0
    ? `${yellowItems.length} item${yellowItems.length > 1 ? 's' : ''} to watch`
    : 'Monitor'

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center">
        <div className="flex-1">
          <AgentStatusBar agentKey="cfo-briefing" agentName="CFO Briefing" model="DeepSeek-V3.2" provider="SambaNova" lastRun={state.lastRun} status={state.status} onRerun={onRerun} />
        </div>
        <button
          onClick={exportActionItemsCSV}
          title="Export all action items as a spreadsheet (ID, source, description, amount, status, owner, due date)"
          className="flex-shrink-0 mr-4 text-[10px] text-muted-foreground/50 hover:text-foreground flex items-center gap-1 transition"
        >
          ⬇ Export Action Items
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Good morning — your first-hour briefing</h2>
          <p className="text-xs text-muted-foreground mt-1">Essential cash, forecast, and priority issues for Acme Robotics today</p>
        </div>

        {/* Financial Snapshot — single full-width card replacing two weak sparklines */}
        <section>
          <FinancialSnapshotCard
            simCashDelta={simDeltas?.cashDelta ?? 0}
            simMonthlyBurnDelta={simDeltas?.monthlyBurnDelta ?? 0}
          />
        </section>

        {(redItems.length > 0 || yellowItems.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1 h-4 rounded-full ${criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-400'}`} />
              <h2 className="text-sm font-semibold text-foreground">
                {pulseHeadline}
              </h2>
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

        {yellowItems.length > 0 && (
          <section>
            <button
              onClick={() => setMonitorOpen(o => !o)}
              className="flex items-center gap-2 mb-2 w-full text-left"
            >
              <span className={`text-muted-foreground/50 text-xs transition-transform ${monitorOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
              <div className="w-1 h-4 rounded-full bg-yellow-400" />
              <h2 className="text-sm font-semibold text-foreground">{monitorHeadline}</h2>
              <Badge variant="secondary" className="text-[10px] h-5">{yellowItems.length}</Badge>
            </button>
            {monitorOpen && (
              <div className="space-y-2.5">
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
              </div>
            )}
          </section>
        )}

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
    </div>
  )
}
