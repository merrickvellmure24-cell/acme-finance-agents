'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend,
} from 'recharts'

interface CashRow {
  week_ending: string
  total_cash: number
  weekly_burn: number
}

const CASH_THRESHOLD = 3_000_000  // $3M minimum threshold
const MONTHLY_REVENUE_ACCEL = 200_000  // $200K/mo revenue offset in acceleration scenario

function fmt(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

function addMonths(isoDate: string, n: number) {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 7)
}

export default function ForecastCharts() {
  const [rows, setRows] = useState<CashRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cash-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="px-4 py-4"><Card className="h-64 animate-pulse bg-muted" /></div>
  if (!rows.length) return null

  const lastRow = rows[rows.length - 1]
  const startCash = Number(lastRow.total_cash)
  const startDate = String(lastRow.week_ending)

  // Average monthly burn from last 4 weeks
  const recentRows = rows.slice(-4)
  const avgWeeklyBurn = recentRows.reduce((s, r) => s + Number(r.weekly_burn), 0) / recentRows.length
  const avgMonthlyBurn = avgWeeklyBurn * (52 / 12)

  // Build 9-month forward projection
  const forecastData = Array.from({ length: 10 }, (_, i) => {
    const label = i === 0 ? 'Now' : addMonths(startDate, i)
    const base = Math.max(0, startCash - avgMonthlyBurn * i)
    const discipline = Math.max(0, startCash - avgMonthlyBurn * 0.85 * i)  // 15% reduction
    const acceleration = Math.max(0, startCash - (avgMonthlyBurn * 0.80 * i) + (MONTHLY_REVENUE_ACCEL * i))  // 20% cut + revenue
    return { month: label, 'Base Case': base, 'Burn Discipline': discipline, 'Revenue Acceleration': acceleration }
  })

  // Find when each scenario hits threshold
  const baseExhaust = forecastData.find(d => d['Base Case'] <= CASH_THRESHOLD)
  const discExhaust = forecastData.find(d => d['Burn Discipline'] <= CASH_THRESHOLD)

  return (
    <div className="border-b border-border px-4 py-4 space-y-4">
      {/* Scenario summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-500/40 bg-red-500/5 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Base Case</p>
          <p className="text-base font-semibold text-red-300">{baseExhaust ? `${baseExhaust.month} threshold` : 'Stable'}</p>
          <p className="text-[11px] text-muted-foreground">Current burn maintained</p>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Burn Discipline</p>
          <p className="text-base font-semibold text-yellow-300">{discExhaust ? `${discExhaust.month} threshold` : 'Stable'}</p>
          <p className="text-[11px] text-muted-foreground">15% burn reduction</p>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Revenue Accel</p>
          <p className="text-base font-semibold text-green-300">Extended runway</p>
          <p className="text-[11px] text-muted-foreground">20% cut + {fmt(MONTHLY_REVENUE_ACCEL)}/mo rev</p>
        </Card>
      </div>

      {/* 9-month scenario chart */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">9-Month Cash Runway Scenarios</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={forecastData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickFormatter={v => `$${(Number(v) / 1e6).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={52} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
              formatter={(v: unknown) => [fmt(Number(v)), '']}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine y={CASH_THRESHOLD} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '$3M min', fontSize: 10, fill: '#ef4444', position: 'insideTopLeft' }} />
            <Line type="monotone" dataKey="Base Case" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Burn Discipline" stroke="#facc15" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            <Line type="monotone" dataKey="Revenue Acceleration" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="2 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-muted-foreground/50 italic">Projections based on {recentRows.length}-week trailing average burn of {fmt(avgMonthlyBurn)}/mo. Not a financial forecast.</p>
    </div>
  )
}
