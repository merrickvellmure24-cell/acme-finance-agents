'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PROVIDER_COLORS: Record<string, string> = {
  Cerebras: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Groq:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  SambaNova:'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  OpenRouter:'bg-muted text-muted-foreground border-border',
  Anthropic:'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  'cash-reporter':     'Monitors current cash position, burn rate, and runway',
  'cash-forecast':     'Projects cash 9 months forward across 3 scenarios',
  'budget-analyst':    'Compares actual spend against budget, flags variances',
  'ar-collections':    'Tracks customer payment status, identifies collection risks',
  'ap-vendor':         'Audits vendor invoices for duplicates and unauthorized spend',
  'contract-watchdog': 'Monitors contract renewals and uncontracted vendor risk',
  'cfo-briefing':      'Synthesizes all agent findings into prioritized executive actions',
}

// Which database tables each agent reads — shown as data provenance
const AGENT_DATA_SOURCES: Record<string, { table: string; rows: string }[]> = {
  'cash-reporter':     [{ table: 'cash_balance', rows: '8 weeks' }],
  'cash-forecast':     [{ table: 'cash_balance', rows: '8 weeks' }],
  'budget-analyst':    [{ table: 'budget', rows: '48 rows' }, { table: 'transactions', rows: '69 txns' }],
  'ar-collections':    [{ table: 'ar_aging', rows: '15 invoices' }],
  'ap-vendor':         [{ table: 'ap_aging', rows: '20 invoices' }, { table: 'vendors', rows: '26 vendors' }],
  'contract-watchdog': [{ table: 'vendors', rows: '26 vendors' }],
  'cfo-briefing':      [{ table: 'agent_outputs', rows: '6 agents' }],
}

interface Props {
  agentKey: string; agentName: string; model: string; provider: string
  lastRun: Date | null; status: 'idle' | 'running' | 'complete' | 'error'; onRerun?: () => void
}

function timeAgo(d: Date | null) {
  if (!d) return null
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

export default function AgentStatusBar({ agentKey, agentName, model, provider, lastRun, status, onRerun }: Props) {
  const dotClass = status === 'idle' ? 'bg-muted-foreground/40' : status === 'running' ? 'bg-yellow-400 animate-pulse' : status === 'complete' ? 'bg-green-500' : 'bg-destructive'
  const pillClass = PROVIDER_COLORS[provider] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{agentName}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${pillClass}`}>{provider} · {model}</span>
          {lastRun && <span className="text-xs text-muted-foreground">{timeAgo(lastRun)}</span>}
          {status === 'running' && <span className="text-xs text-yellow-400 animate-pulse">Analyzing...</span>}
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-0.5">
          <p className="text-xs text-muted-foreground">{AGENT_DESCRIPTIONS[agentKey] ?? ''}</p>
          {AGENT_DATA_SOURCES[agentKey]?.map(src => (
            <span key={src.table} className="text-[10px] font-mono text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded">
              {src.table} · {src.rows}
            </span>
          ))}
        </div>
      </div>
      {(status === 'complete' || status === 'error') && onRerun && (
        <Button variant="outline" size="sm" onClick={onRerun} className="flex-shrink-0 h-7 text-xs">Re-run</Button>
      )}
    </div>
  )
}
