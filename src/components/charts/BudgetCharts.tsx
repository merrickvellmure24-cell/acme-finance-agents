'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

interface BudgetRow {
  department: string
  month: string
  planned: number
  actual: number
}

function fmt(n: number) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return abs >= 1e6 ? `${sign}$${(abs / 1e6).toFixed(1)}M` : `${sign}$${(abs / 1e3).toFixed(0)}K`
}

export default function BudgetCharts() {
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/budget-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="px-4 py-4"><Card className="h-64 animate-pulse bg-muted" /></div>
  if (!rows.length) return null

  // Aggregate YTD by department
  const deptMap: Record<string, { planned: number; actual: number }> = {}
  for (const r of rows) {
    if (!deptMap[r.department]) deptMap[r.department] = { planned: 0, actual: 0 }
    deptMap[r.department].planned += Number(r.planned)
    deptMap[r.department].actual += Number(r.actual)
  }

  const deptData = Object.entries(deptMap).map(([dept, v]) => ({
    dept: dept.replace(' & ', '/').replace('Customer Success', 'CX').replace('Engineering', 'Eng').replace('Manufacturing', 'Mfg').replace('Office & Facilities', 'Office').replace('Sales & Marketing', 'Sales').replace('Travel', 'Travel'),
    fullDept: dept,
    Planned: v.planned,
    Actual: v.actual,
    variance: v.actual - v.planned,
    pct: v.planned > 0 ? ((v.actual - v.planned) / v.planned) * 100 : 0,
  })).sort((a, b) => b.pct - a.pct)

  const totalPlanned = deptData.reduce((s, d) => s + d.Planned, 0)
  const totalActual = deptData.reduce((s, d) => s + d.Actual, 0)
  const totalVariance = totalActual - totalPlanned

  return (
    <div className="border-b border-border px-4 py-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">YTD Budget</p>
          <p className="text-xl font-semibold tabular-nums">{fmt(totalPlanned)}</p>
        </Card>
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">YTD Actual</p>
          <p className="text-xl font-semibold tabular-nums">{fmt(totalActual)}</p>
        </Card>
        <Card className={`px-3 py-2.5 ${totalVariance > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Variance</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-xl font-semibold tabular-nums ${totalVariance > 0 ? 'text-red-300' : 'text-green-300'}`}>{fmt(totalVariance)}</p>
            <Badge variant={totalVariance > 0 ? 'destructive' : 'default'} className="text-[10px] h-5">
              {totalVariance > 0 ? '+' : ''}{((totalVariance / totalPlanned) * 100).toFixed(1)}%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Grouped bar chart */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Budget vs Actual by Department (YTD)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deptData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="dept" tick={{ fontSize: 9, fill: '#9ca3af' }} />
            <YAxis tickFormatter={v => fmt(Number(v))} tick={{ fontSize: 10, fill: '#9ca3af' }} width={56} label={{ value: 'Spend ($)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#6b7280', fontSize: 10 } }} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12 }}
              formatter={(v: unknown) => [fmt(Number(v)), '']}
              labelFormatter={(_label: unknown, payload: readonly { payload?: { fullDept?: string } }[]) =>
                (payload[0]?.payload?.fullDept ?? '') as string
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Planned" fill="#6b7280" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Actual" fill="#818cf8" fillOpacity={0.9} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Variance table */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Department Variance Detail</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Department</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Budget</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Actual</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Variance</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">% Over</th>
              </tr>
            </thead>
            <tbody>
              {deptData.map((d, i) => (
                <tr key={i} className={`border-b border-border last:border-0 ${d.pct > 15 ? 'bg-red-500/5' : d.pct > 5 ? 'bg-yellow-500/5' : ''}`}>
                  <td className="px-3 py-2 font-medium">{d.fullDept}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{fmt(d.Planned)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(d.Actual)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${d.variance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {d.variance > 0 ? '+' : ''}{fmt(d.variance)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Badge
                      variant={d.pct > 15 ? 'destructive' : d.pct > 5 ? 'secondary' : 'outline'}
                      className="text-[10px] h-4"
                    >
                      {d.pct > 0 ? '+' : ''}{d.pct.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
