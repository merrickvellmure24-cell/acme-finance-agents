'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend,
} from 'recharts'

interface CashRow {
  week_ending: string
  total_cash: number
  operating: number
  reserve: number
  weekly_burn: number
}

const BURN_GUIDANCE = 231000 // $231K/week upper guidance

function fmt(n: number) {
  if (!n) return '$0'
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

function fmtK(n: number) {
  return `$${(n / 1e3).toFixed(0)}K`
}

export default function CashPositionCharts() {
  const [rows, setRows] = useState<CashRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cash-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
    </div>
  )
  if (!rows.length) return null

  const latest = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  // Use last 4 weeks for burn (consistent with KPI bar)
  const recentRows = rows.slice(-4)
  const avgBurn = recentRows.reduce((s, r) => s + Number(r.weekly_burn), 0) / recentRows.length
  const daysOfCash = latest ? Math.round(Number(latest.total_cash) / (avgBurn / 7)) : 0
  const burnVsGuidance = avgBurn / BURN_GUIDANCE
  const burnStatus = burnVsGuidance > 1.3 ? 'red' : burnVsGuidance > 1.1 ? 'yellow' : 'green'

  const chartData = rows.map(r => ({
    week: String(r.week_ending).slice(5),
    'Total Cash': Number(r.total_cash),
    Operating: Number(r.operating),
    Reserve: Number(r.reserve),
    Burn: Number(r.weekly_burn),
  }))

  return (
    <div className="border-b border-border">
      {/* Metric cards */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Cash</p>
          <p className="text-xl font-semibold tabular-nums">{fmt(Number(latest?.total_cash))}</p>
          <p className="text-[11px] text-muted-foreground">
            Operating {fmt(Number(latest?.operating))} · Reserve {fmt(Number(latest?.reserve))}
          </p>
        </Card>
        <Card className={`border-border bg-card px-3 py-2.5 ${burnStatus === 'red' ? 'border-l-2 border-l-red-500' : burnStatus === 'yellow' ? 'border-l-2 border-l-yellow-400' : ''}`}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg Weekly Burn</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-semibold tabular-nums">{fmtK(avgBurn)}</p>
            <Badge variant={burnStatus === 'red' ? 'destructive' : burnStatus === 'yellow' ? 'secondary' : 'default'} className="text-[10px] h-5">
              {burnVsGuidance > 1 ? `+${Math.round((burnVsGuidance - 1) * 100)}% over guidance` : 'On target'}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">Guidance: {fmtK(BURN_GUIDANCE)}/wk</p>
        </Card>
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Days of Cash</p>
          <p className="text-xl font-semibold tabular-nums">{daysOfCash}d</p>
          <p className="text-[11px] text-muted-foreground">At current burn rate</p>
        </Card>
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Week-over-Week</p>
          <p className="text-xl font-semibold tabular-nums">
            {prev && latest ? fmt(Math.abs(Number(latest.total_cash) - Number(prev.total_cash))) : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {prev && latest
              ? Number(latest.total_cash) < Number(prev.total_cash) ? 'decrease' : 'increase'
              : '—'}
          </p>
        </Card>
      </div>

      {/* Cash balance area chart */}
      <div className="px-4 pb-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">8-Week Cash Balance</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Week', position: 'insideBottom', offset: -2, style: { fill: '#6b7280', fontSize: 10 } }} />
            <YAxis tickFormatter={v => `$${(Number(v) / 1e6).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#9ca3af' }} width={56} label={{ value: 'Cash ($M)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#6b7280', fontSize: 10 } }} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12 }}
              formatter={(v: unknown) => [fmt(Number(v)), '']}
            />
            <Area type="monotone" dataKey="Total Cash" stroke="#3b82f6" fill="url(#cashGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Burn rate bar chart */}
      <div className="px-4 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Weekly Burn vs Guidance</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tickFormatter={v => fmtK(Number(v))} tick={{ fontSize: 10, fill: '#9ca3af' }} width={56} label={{ value: 'Burn ($K)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#6b7280', fontSize: 10 } }} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12 }}
              formatter={(v: unknown) => [fmtK(Number(v)), 'Weekly Burn']}
            />
            <ReferenceLine y={BURN_GUIDANCE} stroke="#facc15" strokeDasharray="4 2" label={{ value: `Guidance ${fmtK(BURN_GUIDANCE)}`, fontSize: 10, fill: '#facc15', position: 'insideTopRight' }} />
            <Bar dataKey="Burn" fill="#ef4444" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
