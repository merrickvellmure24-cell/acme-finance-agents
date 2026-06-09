'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AggregateSimDelta } from '@/lib/hypotheticals/scenarios'

interface Metrics { totalCash: number; monthlyBurn: number; runway: number; arOverdue: number; apRisk: number; totalAR: number; totalAP: number; lastRun: string | null }

function fmt(n: number) {
  if (typeof n !== 'number' || isNaN(n)) return '—'
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60000) return 'Just now'
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
  return `${Math.floor(d / 86400000)}d ago`
}

interface KPICardProps {
  label: string
  value: string
  tooltip: string
  badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  sub?: string
  accent?: 'red' | 'yellow' | 'green' | 'neutral'
  simBadge?: string
}

function KPICard({ label, value, tooltip, badge, sub, accent = 'neutral', simBadge }: KPICardProps) {
  const borderClass = {
    red: 'border-l-2 border-l-red-500',
    yellow: 'border-l-2 border-l-yellow-400',
    green: 'border-l-2 border-l-green-500',
    neutral: '',
  }[accent]

  return (
    <Card className={`px-4 py-3 flex flex-col gap-1 bg-card border-border ${borderClass}`}>
      <Tooltip>
        <TooltipTrigger>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium cursor-default w-fit flex items-center gap-1">
            {label}
            <span className="text-muted-foreground/30 text-[9px]">ⓘ</span>
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {badge && <Badge variant={badge.variant} className="text-[10px] h-5">{badge.label}</Badge>}
        {simBadge && (
          <Badge variant="outline" className="text-[10px] h-5 border-yellow-500/50 text-yellow-300">
            ⚗ {simBadge}
          </Badge>
        )}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  )
}

interface Props {
  runStatus: 'idle' | 'running'
  simDeltas?: AggregateSimDelta | null
}

export default function KPIBar({ runStatus, simDeltas }: Props) {
  const [m, setM] = useState<Metrics | null>(null)

  useEffect(() => {
    const load = () =>
      fetch('/api/metrics')
        .then(r => r.json())
        .then(data => { if (data && typeof data.totalCash === 'number') setM(data) })
        .catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (!m) return (
    <div className="border-b border-border bg-card/50 px-4 py-3 flex-shrink-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Card key={i} className="px-4 py-3 h-[72px] animate-pulse bg-muted" />)}
      </div>
    </div>
  )

  const BURN_GUIDANCE_MO = 1_000_000
  const TARGET_RUNWAY_MO = 18

  // Apply sim deltas on top of live data
  const adjCash = m.totalCash + (simDeltas?.cashDelta ?? 0)
  const adjBurn = Math.max(0, m.monthlyBurn + (simDeltas?.monthlyBurnDelta ?? 0))
  const adjAR = Math.max(0, m.arOverdue + (simDeltas?.arOverdueDelta ?? 0))
  const adjAP = Math.max(0, m.apRisk + (simDeltas?.apRiskDelta ?? 0))
  const adjRunway = adjBurn > 0 ? adjCash / adjBurn : 0

  const runwayAccent: KPICardProps['accent'] = adjRunway < 12 ? 'red' : adjRunway < 18 ? 'yellow' : 'green'
  const runwayBadge = adjRunway < 12
    ? { label: 'Critical', variant: 'destructive' as const }
    : adjRunway < 18
    ? { label: 'Watch', variant: 'secondary' as const }
    : { label: 'Healthy', variant: 'default' as const }
  const runwayDelta = adjRunway - TARGET_RUNWAY_MO

  const burnPct = adjBurn > 0 ? Math.round((adjBurn - BURN_GUIDANCE_MO) / BURN_GUIDANCE_MO * 100) : 0
  const burnAccent: KPICardProps['accent'] = burnPct > 30 ? 'red' : burnPct > 10 ? 'yellow' : 'neutral'

  const arPct = m.totalAR > 0 ? Math.round(adjAR / m.totalAR * 100) : 0
  const arAccent: KPICardProps['accent'] = adjAR > 100000 ? 'red' : adjAR > 50000 ? 'yellow' : 'neutral'
  const arBadge = adjAR > 50000
    ? { label: 'High Risk', variant: 'destructive' as const }
    : { label: 'Normal', variant: 'default' as const }

  const apPct = m.totalAP > 0 ? Math.round(adjAP / m.totalAP * 100) : 0

  const hasSim = simDeltas && (
    simDeltas.cashDelta !== 0 || simDeltas.arOverdueDelta !== 0 ||
    simDeltas.apRiskDelta !== 0 || simDeltas.monthlyBurnDelta !== 0
  )

  function simBadgeFor(delta: number): string | undefined {
    if (!hasSim || delta === 0) return undefined
    const sign = delta > 0 ? '+' : ''
    return `${sign}${fmt(Math.abs(delta))} sim`
  }

  return (
    <div className="border-b border-border bg-card/50 px-4 py-3 flex-shrink-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Cash on Hand"
          value={fmt(adjCash)}
          tooltip="Total cash available — operating account plus reserve buffer. Monthly burn tells you how fast it's being spent."
          sub={`Operating + Reserve · ${fmt(adjBurn)}/mo burn`}
          accent={burnAccent}
          badge={burnPct > 0 ? { label: `+${burnPct}% over guidance`, variant: 'destructive' as const } : undefined}
          simBadge={simBadgeFor(simDeltas?.cashDelta ?? 0)}
        />
        <KPICard
          label="Runway"
          value={`~${adjRunway.toFixed(1)}mo`}
          tooltip="How many months until cash runs out at the current burn rate. Target is 18+ months — below 12 months is critical."
          badge={runwayBadge}
          sub={`Target: ${TARGET_RUNWAY_MO}mo · ${runwayDelta >= 0 ? '+' : ''}${runwayDelta.toFixed(1)}mo vs target`}
          accent={runwayAccent}
          simBadge={hasSim && simDeltas ? `${(adjRunway - m.monthlyBurn > 0 ? m.totalCash / m.monthlyBurn : 0).toFixed(1) !== adjRunway.toFixed(1) ? `${adjRunway.toFixed(1)}mo sim` : ''}` : undefined}
        />
        <KPICard
          label="AR Overdue"
          value={fmt(adjAR)}
          tooltip="Money customers owe Acme Robotics for services already delivered. Overdue AR tightens cash flow directly."
          badge={arBadge}
          sub={m.totalAR > 0 ? `${arPct}% of ${fmt(m.totalAR)} total AR` : 'Outstanding receivables'}
          accent={arAccent}
          simBadge={simBadgeFor(simDeltas?.arOverdueDelta ?? 0)}
        />
        <KPICard
          label="AP at Risk"
          value={fmt(adjAP)}
          tooltip="Vendor invoices flagged as potentially duplicate, unauthorized, or disputed. Review before paying."
          sub={m.totalAP > 0 ? `${apPct}% of ${fmt(m.totalAP)} total AP · ${timeAgo(m.lastRun)}` : `Analysis: ${timeAgo(m.lastRun)}`}
          accent={adjAP > 50000 ? 'yellow' : 'neutral'}
          simBadge={simBadgeFor(simDeltas?.apRiskDelta ?? 0)}
        />
      </div>
    </div>
  )
}
