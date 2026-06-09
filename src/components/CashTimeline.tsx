'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from 'recharts'

interface WeekData { weekEnding: string; total: number; burn: number; notes?: string }

function fmt(n: number) { return `$${(n / 1e6).toFixed(2)}M` }
function fmtK(n: number) { return `$${(n / 1e3).toFixed(0)}K` }

export default function CashTimeline({ cashData }: { cashData: WeekData[] }) {
  if (!cashData.length) return null

  const chartData = cashData.map(d => ({
    week: String(d.weekEnding).slice(5),
    'Total Cash': Number(d.total),
    'Weekly Burn': Math.abs(Number(d.burn)),
    fullDate: d.weekEnding,
    notes: d.notes,
  }))

  return (
    <div className="px-4 py-4 border-b border-border space-y-4">
      <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Cash — 8 Week Trend</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={48} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
              formatter={(v, name) => [name === 'Total Cash' ? fmt(Number(v)) : fmtK(Number(v)), String(name)]}
            />
            <Area type="monotone" dataKey="Total Cash" stroke="#6366f1" strokeWidth={2} fill="url(#cashGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-24">
        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Weekly Burn</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={48} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} formatter={(v) => [fmtK(Number(v)), 'Burn']} />
            <Bar dataKey="Weekly Burn" fill="#ef4444" opacity={0.7} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
