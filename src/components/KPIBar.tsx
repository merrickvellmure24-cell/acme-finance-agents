'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  sub?: string
  accent?: 'red' | 'yellow' | 'green' | 'neutral'
}

function KPICard({ label, value, badge, sub, accent = 'neutral' }: KPICardProps) {
  const borderClass = {
    red: 'border-l-2 border-l-red-500',
    yellow: 'border-l-2 border-l-yellow-400',
    green: 'border-l-2 border-l-green-500',
    neutral: '',
  }[accent]

  return (
    <Card className={`px-4 py-3 flex flex-col gap-1 bg-card border-border ${borderClass}`}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {badge && <Badge variant={badge.variant} className="text-[10px] h-5">{badge.label}</Badge>}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  )
}

export default function KPIBar({ runStatus }: { runStatus: 'idle' | 'running' }) {
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
    <div className="border-b border-border bg-card/50 px-4 py-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Card key={i} className="px-4 py-3 h-[72px] animate-pulse bg-muted" />)}
      </div>
    </div>
  )

  const BURN_GUIDANCE_MO = 1_000_000  // $1M/mo upper guidance
  const TARGET_RUNWAY_MO = 18

  const runwayAccent: KPICardProps['accent'] = m.runway < 12 ? 'red' : m.runway < 18 ? 'yellow' : 'green'
  const runwayBadge = m.runway < 12
    ? { label: 'Critical', variant: 'destructive' as const }
    : m.runway < 18
    ? { label: 'Watch', variant: 'secondary' as const }
    : { label: 'Healthy', variant: 'default' as const }
  const runwayDelta = m.runway - TARGET_RUNWAY_MO

  const burnPct = m.monthlyBurn > 0 ? Math.round((m.monthlyBurn - BURN_GUIDANCE_MO) / BURN_GUIDANCE_MO * 100) : 0
  const burnAccent: KPICardProps['accent'] = burnPct > 30 ? 'red' : burnPct > 10 ? 'yellow' : 'neutral'

  const arPct = m.totalAR > 0 ? Math.round(m.arOverdue / m.totalAR * 100) : 0
  const arAccent: KPICardProps['accent'] = m.arOverdue > 100000 ? 'red' : m.arOverdue > 50000 ? 'yellow' : 'neutral'
  const arBadge = m.arOverdue > 50000
    ? { label: 'High Risk', variant: 'destructive' as const }
    : { label: 'Normal', variant: 'default' as const }

  const apPct = m.totalAP > 0 ? Math.round(m.apRisk / m.totalAP * 100) : 0

  return (
    <div className="border-b border-border bg-card/50 px-4 py-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Cash on Hand"
          value={fmt(m.totalCash)}
          sub={`Operating + Reserve · ${fmt(m.monthlyBurn)}/mo burn`}
          accent={burnAccent}
          badge={burnPct > 0 ? { label: `+${burnPct}% over guidance`, variant: 'destructive' as const } : undefined}
        />
        <KPICard
          label="Runway"
          value={`~${m.runway}mo`}
          badge={runwayBadge}
          sub={`Target: ${TARGET_RUNWAY_MO}mo · ${runwayDelta >= 0 ? '+' : ''}${runwayDelta.toFixed(1)}mo vs target`}
          accent={runwayAccent}
        />
        <KPICard
          label="AR Overdue"
          value={fmt(m.arOverdue)}
          badge={arBadge}
          sub={m.totalAR > 0 ? `${arPct}% of $${(m.totalAR / 1e3).toFixed(0)}K total AR` : 'Outstanding receivables'}
          accent={arAccent}
        />
        <KPICard
          label="AP at Risk"
          value={fmt(m.apRisk)}
          sub={m.totalAP > 0 ? `${apPct}% of $${(m.totalAP / 1e3).toFixed(0)}K total AP · ${timeAgo(m.lastRun)}` : `Analysis: ${timeAgo(m.lastRun)}`}
          accent={m.apRisk > 50000 ? 'yellow' : 'neutral'}
        />
      </div>
    </div>
  )
}
