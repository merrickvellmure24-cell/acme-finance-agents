'use client'
import { Card } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useCashData } from '@/lib/hooks/useCashData'

const CASH_THRESHOLD = 3_000_000
const MONTHLY_REVENUE_ACCEL = 200_000

function fmt(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

function addMonths(isoDate: string, n: number) {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 7)
}

export default function ForecastDashboardSparkline() {
  const { rows, loading } = useCashData()

  if (loading) return <Card className="h-36 animate-pulse bg-muted" />
  if (!rows.length) return null

  const lastRow = rows[rows.length - 1]
  const startCash = Number(lastRow.total_cash)
  const startDate = String(lastRow.week_ending)
  const recentRows = rows.slice(-4)
  const avgWeeklyBurn = recentRows.reduce((s, r) => s + Number(r.weekly_burn), 0) / recentRows.length
  const avgMonthlyBurn = avgWeeklyBurn * (52 / 12)

  const forecastData = Array.from({ length: 10 }, (_, i) => {
    const label = i === 0 ? 'Now' : addMonths(startDate, i).slice(5)
    const base = Math.max(0, startCash - avgMonthlyBurn * i)
    const discipline = Math.max(0, startCash - avgMonthlyBurn * 0.85 * i)
    const acceleration = Math.max(0, startCash - (avgMonthlyBurn * 0.80 * i) + (MONTHLY_REVENUE_ACCEL * i))
    return { month: label, base, discipline, acceleration }
  })

  const baseExhaust = forecastData.find(d => d.base <= CASH_THRESHOLD)

  return (
    <Card className="border-border bg-card p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Forecast · 9-Month Scenarios</p>
      <p className="text-xs text-muted-foreground mb-2">
        Base case {baseExhaust ? `hits $3M by ${baseExhaust.month}` : 'stable'} at current burn
      </p>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={forecastData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tickFormatter={v => `$${(Number(v) / 1e6).toFixed(1)}M`} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={44} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
            formatter={(v: unknown) => [fmt(Number(v)), '']}
          />
          <Line type="monotone" dataKey="base" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Base" />
          <Line type="monotone" dataKey="discipline" stroke="#eab308" strokeWidth={1.5} dot={false} name="Discipline" />
          <Line type="monotone" dataKey="acceleration" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Accel" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
