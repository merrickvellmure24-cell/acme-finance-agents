'use client'
import { Card } from '@/components/ui/card'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { useCashData, fmtCash } from '@/lib/hooks/useCashData'
import { computeArMissCashProjection } from '@/lib/hypotheticals/scenarios'

const CASH_THRESHOLD = 3_000_000

interface Props {
  arDelayDays?: number
  arOverdue?: number
  cashDelta?: number
}

export default function TreasuryDashboardCharts({ arDelayDays = 0, arOverdue = 186000, cashDelta = 0 }: Props) {
  const { rows, loading } = useCashData()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="h-36 animate-pulse bg-muted" />
        <Card className="h-36 animate-pulse bg-muted" />
      </div>
    )
  }
  if (!rows.length) return null

  const latest = rows[rows.length - 1]
  const recentRows = rows.slice(-4)
  const avgWeeklyBurn = recentRows.reduce((s, r) => s + Number(r.weekly_burn), 0) / recentRows.length

  // Project 4 weeks forward
  const projectedRows = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(String(latest.week_ending))
    d.setDate(d.getDate() + (i + 1) * 7)
    return { week: d.toISOString().slice(5, 10), projected: Math.max(0, Number(latest.total_cash) - avgWeeklyBurn * (i + 1)) }
  })

  const arMissData = arDelayDays > 0 ? computeArMissCashProjection(rows, arOverdue) : []
  const chartData = rows.map((r, i) => ({
    week: String(r.week_ending).slice(5),
    cash: Number(r.total_cash),
    simCash: cashDelta !== 0 ? Number(r.total_cash) + cashDelta : undefined,
    arMiss: arMissData[i]?.projected,
  }))

  // Add projected points
  const fullData = [
    ...chartData,
    ...projectedRows.map(p => ({
      week: p.week,
      cash: undefined,
      simCash: undefined,
      projected: p.projected,
      simProjected: cashDelta !== 0 ? p.projected + cashDelta : undefined,
      arMiss: undefined,
    })),
  ]

  const moMonthsToThreshold = avgWeeklyBurn > 0
    ? ((Number(latest.total_cash) - CASH_THRESHOLD) / (avgWeeklyBurn * 4.33)).toFixed(1)
    : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Treasury · 8-Week Cash</p>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-lg font-semibold tabular-nums">
            {cashDelta !== 0 ? fmtCash(Number(latest.total_cash) + cashDelta) : fmtCash(Number(latest.total_cash))}
          </span>
          {cashDelta !== 0 && (
            <span className="text-xs text-green-400">
              +{fmtCash(cashDelta)} sim
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            Op {fmtCash(Number(latest.operating))} · Res {fmtCash(Number(latest.reserve))}
          </span>
        </div>
        {moMonthsToThreshold && (
          <p className="text-[10px] text-red-400/80 mb-1">
            At current burn: hits $3M threshold in ~{moMonthsToThreshold} months
          </p>
        )}
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={fullData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dashCashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="simCashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickFormatter={v => `$${(Number(v) / 1e6).toFixed(1)}M`} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={44} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
              formatter={(v: unknown) => [fmtCash(Number(v)), '']}
            />
            <ReferenceLine y={CASH_THRESHOLD} stroke="#ef4444" strokeDasharray="3 2" label={{ value: '$3M min', fontSize: 9, fill: '#ef4444', position: 'insideTopRight' }} />
            <Area type="monotone" dataKey="cash" stroke="#3b82f6" fill="url(#dashCashGrad)" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
            <Area type="monotone" dataKey="projected" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Projected" />
            {cashDelta !== 0 && (
              <Area type="monotone" dataKey="simCash" stroke="#22c55e" fill="url(#simCashGrad)" strokeWidth={1.5} strokeDasharray="3 2" dot={false} name="Sim (approved)" />
            )}
            {arDelayDays > 0 && (
              <Area type="monotone" dataKey="arMiss" stroke="#f97316" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="If AR delayed" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
