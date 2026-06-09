'use client'
import { Card } from '@/components/ui/card'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { useCashData, fmtCash } from '@/lib/hooks/useCashData'

const CASH_THRESHOLD = 3_000_000
const BURN_GUIDANCE_WK = 231_000

interface Props {
  simCashDelta?: number
  simMonthlyBurnDelta?: number
}

function addMonths(isoDate: string, n: number) {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 7).slice(5)
}

export default function FinancialSnapshotCard({ simCashDelta = 0, simMonthlyBurnDelta = 0 }: Props) {
  const { rows, loading } = useCashData()

  if (loading) {
    return <Card className="h-48 animate-pulse bg-muted w-full" />
  }
  if (!rows.length) return null

  const latest = rows[rows.length - 1]
  const recentRows = rows.slice(-4)
  const avgWeeklyBurn = recentRows.reduce((s, r) => s + Number(r.weekly_burn), 0) / recentRows.length
  const avgMonthlyBurn = avgWeeklyBurn * (52 / 12)
  const startCash = Number(latest.total_cash)
  const startDate = String(latest.week_ending)
  const hasSim = simCashDelta !== 0 || simMonthlyBurnDelta !== 0
  const adjustedCash = startCash + simCashDelta
  const adjustedMonthlyBurn = Math.max(0, avgMonthlyBurn + simMonthlyBurnDelta)
  const adjustedWeeklyBurn = adjustedMonthlyBurn / (52 / 12)
  const displayedCash = hasSim ? adjustedCash : startCash
  const displayedMonthlyBurn = hasSim ? adjustedMonthlyBurn : avgMonthlyBurn
  const displayedWeeklyBurn = hasSim ? adjustedWeeklyBurn : avgWeeklyBurn

  const burnOverGuidancePct = BURN_GUIDANCE_WK > 0
    ? Math.round((displayedWeeklyBurn - BURN_GUIDANCE_WK) / BURN_GUIDANCE_WK * 100)
    : 0
  const runwayMonths = displayedMonthlyBurn > 0 ? displayedCash / displayedMonthlyBurn : 0
  const runwayStatus: 'red' | 'yellow' | 'green' = runwayMonths < 12 ? 'red' : runwayMonths < 18 ? 'yellow' : 'green'

  // 9-month projection for the chart
  const forecastData = Array.from({ length: 10 }, (_, i) => {
    const label = i === 0 ? 'Now' : addMonths(startDate, i)
    const base = Math.max(0, startCash - avgMonthlyBurn * i)
    const simAdj = hasSim ? Math.max(0, adjustedCash - adjustedMonthlyBurn * i) : undefined
    return { month: label, base, simAdj }
  })

  const monthsToThreshold = forecastData.findIndex(d => (hasSim ? d.simAdj ?? d.base : d.base) <= CASH_THRESHOLD)
  const thresholdMonth = monthsToThreshold > 0 ? forecastData[monthsToThreshold]?.month : null

  // Verdict headline
  let verdict: string
  let verdictColor: string
  if (burnOverGuidancePct > 30) {
    verdict = thresholdMonth
      ? `Cash hits $3M warning in ~${monthsToThreshold} months — burn ${burnOverGuidancePct}% above target`
      : `Burn ${burnOverGuidancePct}% above guidance — runway risk building`
    verdictColor = 'text-red-400'
  } else if (burnOverGuidancePct > 10) {
    verdict = `Burn slightly above target (+${burnOverGuidancePct}%) — monitor closely`
    verdictColor = 'text-yellow-400'
  } else {
    verdict = 'Burn on target — cash position stable'
    verdictColor = 'text-green-400'
  }

  const runwayBarColor = runwayStatus === 'red' ? 'bg-red-500' : runwayStatus === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'
  const runwayBarWidth = Math.min(100, (runwayMonths / 24) * 100)

  return (
    <Card className="border-border bg-card p-4 w-full">
      {/* Verdict headline */}
      <p className={`text-xs font-semibold mb-3 leading-snug ${verdictColor}`}>
        {verdict}
        {hasSim && (
          <span className="text-yellow-300 ml-2">
            · simulation applied
            {simCashDelta !== 0 ? ` · ${simCashDelta > 0 ? '+' : '-'}${fmtCash(Math.abs(simCashDelta))} cash` : ''}
            {simMonthlyBurnDelta !== 0 ? ` · ${simMonthlyBurnDelta > 0 ? '+' : '-'}${fmtCash(Math.abs(simMonthlyBurnDelta))}/mo burn` : ''}
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: vitals */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Cash</p>
            <p className="text-lg font-semibold tabular-nums">
              {fmtCash(displayedCash)}
            </p>
            <p className="text-[10px] text-muted-foreground">at {fmtCash(displayedMonthlyBurn)}/mo burn</p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Runway</p>
            <p className={`text-lg font-semibold tabular-nums ${runwayStatus === 'red' ? 'text-red-400' : runwayStatus === 'yellow' ? 'text-yellow-400' : 'text-green-400'}`}>
              {runwayMonths.toFixed(1)}mo
            </p>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden w-full">
              <div className={`h-full rounded-full transition-all ${runwayBarColor}`} style={{ width: `${runwayBarWidth}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{18 - runwayMonths > 0 ? `${(18 - runwayMonths).toFixed(1)}mo below target` : 'above target'}</p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Burn vs Target</p>
            <p className={`text-lg font-semibold tabular-nums ${burnOverGuidancePct > 20 ? 'text-red-400' : burnOverGuidancePct > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
              {burnOverGuidancePct > 0 ? `+${burnOverGuidancePct}%` : `${burnOverGuidancePct}%`}
            </p>
            <p className="text-[10px] text-muted-foreground">{fmtCash(displayedWeeklyBurn)}/wk {hasSim ? 'sim' : 'actual'}</p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">$3M Threshold</p>
            <p className={`text-lg font-semibold tabular-nums ${thresholdMonth ? 'text-red-400' : 'text-green-400'}`}>
              {thresholdMonth ? `${monthsToThreshold}mo` : 'Safe'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {thresholdMonth ? `Warning: ${thresholdMonth}` : 'No breach forecast'}
            </p>
          </div>
        </div>

        {/* Right: 9-month projection */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">9-Month Cash Projection</p>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={forecastData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="snapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="simSnapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                tickFormatter={v => `$${(Number(v) / 1e6).toFixed(1)}M`}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={44}
              />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
                formatter={(v: unknown) => [fmtCash(Number(v)), '']}
              />
              <ReferenceLine
                y={CASH_THRESHOLD}
                stroke="#ef4444"
                strokeDasharray="4 2"
                label={{ value: '$3M min', fontSize: 9, fill: '#ef4444', position: 'insideTopRight' }}
              />
              <Area type="monotone" dataKey="base" stroke="#3b82f6" fill="url(#snapGrad)" strokeWidth={2} dot={false} name="Base case" />
              {hasSim && (
                <Line type="monotone" dataKey="simAdj" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Sim adjusted" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
