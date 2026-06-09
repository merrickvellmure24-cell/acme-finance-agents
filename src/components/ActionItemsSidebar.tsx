'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AggregateSimDelta } from '@/lib/hypotheticals/scenarios'

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

const AGENT_LABELS: Record<string, string> = {
  'cash-reporter': 'Treasury',
  'cash-forecast': 'Forecast',
  'budget-analyst': 'Budget',
  'ar-collections': 'AR',
  'ap-vendor': 'AP',
  'contract-watchdog': 'Contracts',
  'cfo-briefing': 'Briefing',
}

function extractTitle(text: string): string {
  const cleaned = text.replace(/\*\*([^*]+?)\*\*/g, '$1').trim()
  const dashIdx = cleaned.indexOf(' — ')
  if (dashIdx > 0 && dashIdx < 90) return cleaned.slice(0, dashIdx)
  const colonIdx = cleaned.indexOf(': ')
  if (colonIdx > 0 && colonIdx < 55) return cleaned.slice(0, colonIdx)
  return cleaned.slice(0, 80) + (cleaned.length > 80 ? '…' : '')
}

function fmt(n: number) {
  if (!n) return null
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

function fmtDelta(n: number) {
  if (!n || Math.abs(n) < 100) return null
  const sign = n > 0 ? '+' : ''
  return n >= 1e6 ? `${sign}$${(n / 1e6).toFixed(2)}M` : `${sign}$${(Math.abs(n) / 1e3).toFixed(0)}K${n < 0 ? ' less' : ''}`
}

interface Props {
  items: ActionItem[]
  onSelectItem: (item: ActionItem, decision?: 'approved' | 'delegated') => void
  onViewAll: () => void
  isHypothetical?: boolean
  simApprovedItems?: ActionItem[]
  simDeltas?: AggregateSimDelta | null
  onResetSim?: () => void
}

export default function ActionItemsSidebar({
  items,
  onSelectItem,
  onViewAll,
  isHypothetical,
  simApprovedItems = [],
  simDeltas,
  onResetSim,
}: Props) {
  const [resolvedOpen, setResolvedOpen] = useState(false)

  // In sim mode, hide sim-approved items from open queue (they're "resolved" in the sim)
  const simApprovedIds = new Set(simApprovedItems.map(i => i.id))
  const openItems = items.filter(i => i.status === 'open' && !(isHypothetical && simApprovedIds.has(i.id)))
  const inProgressItems = items.filter(i => i.status === 'in-progress')
  const doneItems = items.filter(i => i.status === 'done').slice(0, 5)

  const hasSimActivity = isHypothetical && simApprovedItems.length > 0 && simDeltas

  return (
    <aside className="w-[28%] min-w-[260px] max-w-[360px] border-l border-border flex flex-col bg-card/30 flex-shrink-0">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Action Items</h2>
          {openItems.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">{openItems.length}</Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Decisions needed today</p>
      </div>

      {/* Simulation Ledger */}
      {hasSimActivity && (
        <div className="px-3 py-2.5 border-b border-yellow-500/30 bg-yellow-500/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-yellow-300 uppercase tracking-wider">
              ⚗ Simulation · {simApprovedItems.length} approved
            </span>
            {onResetSim && (
              <button
                onClick={onResetSim}
                className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition"
              >
                Reset ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {simDeltas.cashDelta !== 0 && (
              <span className="text-[10px] text-green-400">
                {fmtDelta(simDeltas.cashDelta)} cash
              </span>
            )}
            {simDeltas.arOverdueDelta !== 0 && (
              <span className="text-[10px] text-blue-400">
                {fmtDelta(simDeltas.arOverdueDelta)} AR overdue
              </span>
            )}
            {simDeltas.apRiskDelta !== 0 && (
              <span className="text-[10px] text-purple-400">
                {fmtDelta(simDeltas.apRiskDelta)} AP risk
              </span>
            )}
            {simDeltas.monthlyBurnDelta !== 0 && (
              <span className="text-[10px] text-orange-400">
                {fmtDelta(simDeltas.monthlyBurnDelta)}/mo burn
              </span>
            )}
          </div>
          {simApprovedItems.map(item => (
            <div key={item.id} className="flex items-center gap-1.5 mt-1">
              <span className="w-1 h-1 rounded-full bg-green-500/60 flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground/60 truncate">{extractTitle(item.description)}</span>
              <span className="text-[10px] text-green-400/70 flex-shrink-0">{fmt(Number(item.amount)) ?? ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {openItems.length === 0 && inProgressItems.length === 0 && !hasSimActivity && (
          <p className="text-xs text-muted-foreground/50 text-center py-8">No open items</p>
        )}
        {openItems.length === 0 && inProgressItems.length === 0 && hasSimActivity && (
          <p className="text-xs text-green-400/60 text-center py-4">All items resolved in simulation</p>
        )}

        {openItems.map(item => {
          const title = extractTitle(item.description)
          const amount = fmt(Number(item.amount))
          return (
            <div
              key={item.id}
              className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2"
            >
              <button
                onClick={() => onSelectItem(item)}
                className="w-full text-left"
              >
                <p className="text-xs font-semibold text-red-300 leading-snug">{title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {amount && <Badge variant="outline" className="text-[10px] h-4">{amount}</Badge>}
                  <span className="text-[10px] text-muted-foreground/50">{AGENT_LABELS[item.source_agent] ?? item.source_agent}</span>
                </div>
              </button>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2 bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/40"
                  onClick={() => onSelectItem(item, 'approved')}
                >
                  ✓ Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2 text-blue-300/70 border border-blue-500/20 hover:bg-blue-500/10"
                  onClick={() => onSelectItem(item, 'delegated')}
                >
                  ↗ Delegate
                </Button>
              </div>
            </div>
          )
        })}

        {inProgressItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Delegated</p>
            {inProgressItems.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="w-full text-left rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 hover:bg-blue-500/10 transition"
              >
                <p className="text-xs text-blue-300 leading-snug">{extractTitle(item.description)}</p>
                {item.owner && (
                  <span className="text-[10px] text-muted-foreground/50 mt-1 block">→ {item.owner}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {doneItems.length > 0 && (
          <div>
            <button
              onClick={() => setResolvedOpen(o => !o)}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 px-1"
            >
              <span className={`transition-transform ${resolvedOpen ? 'rotate-90' : ''}`}>▶</span>
              {doneItems.length} resolved
            </button>
            {resolvedOpen && (
              <div className="mt-1.5 space-y-1 pl-3">
                {doneItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="block w-full text-left text-[10px] text-muted-foreground/40 line-through hover:text-muted-foreground/60"
                  >
                    {extractTitle(item.description)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex-shrink-0">
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={onViewAll}>
          View all →
        </Button>
      </div>
    </aside>
  )
}
