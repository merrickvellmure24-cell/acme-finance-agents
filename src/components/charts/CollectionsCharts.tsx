'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'

interface ARRow {
  customer: string
  invoice_number: string
  amount: number
  days_outstanding: number
  status: string
  aging_bucket: string
  last_contact: string
}

function fmt(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

const BUCKET_ORDER = ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days']
const BUCKET_COLORS: Record<string, string> = {
  'Current':    '#22c55e',
  '1-30 days':  '#facc15',
  '31-60 days': '#f97316',
  '61-90 days': '#ef4444',
  '90+ days':   '#dc2626',
}

export default function CollectionsCharts() {
  const [rows, setRows] = useState<ARRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reminded, setReminded] = useState<Set<string>>(new Set())
  const [reminding, setReminding] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ar-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function sendReminder(row: ARRow) {
    const key = String(row.invoice_number)
    setReminding(key)
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAgent: 'ar-collections',
        description: `Follow up with ${row.customer} on invoice ${row.invoice_number} — $${Number(row.amount).toLocaleString()} overdue ${row.days_outstanding} days. Last contact: ${row.last_contact ? String(row.last_contact).slice(0, 10) : 'never'}`,
        amount: Number(row.amount),
        owner: '',
      }),
    }).catch(() => {})
    setReminding(null)
    setReminded(prev => new Set([...prev, key]))
  }

  if (loading) return <div className="px-4 py-4"><Card className="h-48 animate-pulse bg-muted" /></div>
  if (!rows.length) return null

  const totalAR = rows.reduce((s, r) => s + Number(r.amount), 0)
  const overdue = rows.filter(r => Number(r.days_outstanding) > 0)
  const overdueTotal = overdue.reduce((s, r) => s + Number(r.amount), 0)
  const avgArAge = totalAR > 0
    ? Math.round(rows.reduce((s, r) => s + Number(r.amount) * Number(r.days_outstanding), 0) / totalAR)
    : 0

  const bucketMap: Record<string, number> = {}
  for (const r of rows) {
    const b = String(r.aging_bucket || 'Current')
    bucketMap[b] = (bucketMap[b] || 0) + Number(r.amount)
  }
  const bucketData = BUCKET_ORDER
    .filter(b => bucketMap[b] > 0)
    .map(b => ({ bucket: b.replace(' days', 'd'), fullBucket: b, Amount: bucketMap[b] }))

  const sorted = [...rows].sort((a, b) => Number(b.days_outstanding) - Number(a.days_outstanding))

  function rowBg(days: number) {
    if (days >= 90) return 'bg-red-500/10 border-red-500/30'
    if (days >= 60) return 'bg-orange-500/10 border-orange-500/30'
    if (days >= 30) return 'bg-yellow-500/10 border-yellow-500/30'
    return ''
  }

  return (
    <div className="border-b border-border px-4 py-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total AR</p>
          <p className="text-xl font-semibold tabular-nums">{fmt(totalAR)}</p>
          <p className="text-[11px] text-muted-foreground">{rows.length} invoices</p>
        </Card>
        <Card className={`px-3 py-2.5 ${overdueTotal > 100000 ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'}`}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Overdue</p>
          <p className={`text-xl font-semibold tabular-nums ${overdueTotal > 100000 ? 'text-red-300' : ''}`}>{fmt(overdueTotal)}</p>
          <p className="text-[11px] text-muted-foreground">{overdue.length} invoices past due · {Math.round(overdueTotal / totalAR * 100)}% of AR</p>
        </Card>
        <Card className={`px-3 py-2.5 ${avgArAge > 45 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-card'}`}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg AR Age</p>
          <p className={`text-xl font-semibold tabular-nums ${avgArAge > 45 ? 'text-yellow-300' : ''}`}>{avgArAge} days</p>
          <p className="text-[11px] text-muted-foreground">Weighted by invoice $</p>
        </Card>
      </div>

      {/* Aging bucket chart */}
      {bucketData.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">AR by Aging Bucket</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={bucketData} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Aging Bucket', position: 'insideBottom', offset: -10, style: { fill: '#6b7280', fontSize: 10 } }} />
              <YAxis tickFormatter={v => fmt(Number(v))} tick={{ fontSize: 10, fill: '#9ca3af' }} width={56} label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#6b7280', fontSize: 10 } }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12 }}
                formatter={(v: unknown) => [fmt(Number(v)), 'AR Balance']}
                labelFormatter={(_l: unknown, p: readonly { payload?: { fullBucket?: string } }[]) => p[0]?.payload?.fullBucket ?? ''}
              />
              <Bar dataKey="Amount" radius={[3, 3, 0, 0]}>
                {bucketData.map((entry, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[entry.fullBucket] ?? '#60a5fa'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Invoice table with action buttons */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Outstanding Invoices — sorted by days overdue</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Customer</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Invoice</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Amount</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Days Out</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Last Contact</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const key = String(r.invoice_number)
                const days = Number(r.days_outstanding)
                const isOverdue = days > 0
                const wasReminded = reminded.has(key)
                return (
                  <tr key={i} className={`border-b border-border last:border-0 ${rowBg(days)}`}>
                    <td className="px-3 py-2 font-medium">{String(r.customer)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{String(r.invoice_number)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(Number(r.amount))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={days >= 90 ? 'text-red-400 font-semibold' : days >= 60 ? 'text-orange-400' : days >= 30 ? 'text-yellow-400' : days > 0 ? 'text-muted-foreground' : 'text-green-400'}>
                        {days > 0 ? `${days}d` : days < 0 ? `${Math.abs(days)}d early` : 'Due today'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={String(r.status) === 'At Risk' ? 'destructive' : String(r.status).toLowerCase().includes('over') ? 'destructive' : 'outline'} className="text-[10px] h-4">
                        {String(r.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.last_contact ? String(r.last_contact).slice(0, 10) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {isOverdue ? (
                        wasReminded ? (
                          <span className="text-[10px] text-green-400">✓ Added to queue</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                            disabled={reminding === key}
                            onClick={() => sendReminder(r)}
                          >
                            {reminding === key ? '...' : 'Send Reminder'}
                          </Button>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
