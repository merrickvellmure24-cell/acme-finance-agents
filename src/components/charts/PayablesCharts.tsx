'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface APRow {
  vendor: string
  invoice_number: string
  amount: number
  days_overdue: number
  status: string
  aging_bucket: string
}

function fmt(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

export default function PayablesCharts() {
  const [rows, setRows] = useState<APRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actioned, setActioned] = useState<Record<string, 'scheduled' | 'disputed'>>({})
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ap-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function schedulePayment(row: APRow) {
    const key = String(row.invoice_number)
    setPending(key)
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAgent: 'ap-vendor',
        description: `Schedule payment to ${row.vendor} — Invoice ${row.invoice_number} for ${fmt(Number(row.amount))} (${row.days_overdue > 0 ? `${row.days_overdue}d overdue` : 'current'})`,
        amount: Number(row.amount),
        owner: '',
      }),
    }).catch(() => {})
    setPending(null)
    setActioned(prev => ({ ...prev, [key]: 'scheduled' }))
  }

  async function flagDispute(row: APRow) {
    const key = String(row.invoice_number)
    setPending(key)
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAgent: 'ap-vendor',
        description: `FLAG DISPUTE: ${row.vendor} invoice ${row.invoice_number} — ${fmt(Number(row.amount))} requires review before payment. Possible duplicate or unauthorized charge.`,
        amount: Number(row.amount),
        owner: '',
      }),
    }).catch(() => {})
    setPending(null)
    setActioned(prev => ({ ...prev, [key]: 'disputed' }))
  }

  if (loading) return <div className="px-4 py-4"><Card className="h-48 animate-pulse bg-muted" /></div>
  if (!rows.length) return null

  const total = rows.reduce((s, r) => s + Number(r.amount), 0)
  const atRisk = rows.filter(r => Number(r.days_overdue) > 14)
  const atRiskTotal = atRisk.reduce((s, r) => s + Number(r.amount), 0)
  const pendingHold = rows.filter(r => String(r.status).toLowerCase().includes('pending') || String(r.status).toLowerCase().includes('hold'))

  const sorted = [...rows].sort((a, b) => Number(b.days_overdue) - Number(a.days_overdue))

  function rowClass(r: APRow) {
    const days = Number(r.days_overdue)
    const status = String(r.status).toLowerCase()
    if (status.includes('hold') || status.includes('dispute')) return 'bg-red-500/10 border-red-500/30'
    if (days > 30) return 'bg-red-500/5 border-red-500/20'
    if (days > 14) return 'bg-yellow-500/5 border-yellow-500/20'
    return ''
  }

  function statusBadge(r: APRow) {
    const s = String(r.status).toLowerCase()
    if (s.includes('hold') || s.includes('dispute')) return <Badge variant="destructive" className="text-[10px] h-4">HOLD</Badge>
    if (s.includes('pending')) return <Badge variant="secondary" className="text-[10px] h-4">Pending</Badge>
    if (s.includes('paid')) return <Badge variant="outline" className="text-[10px] h-4">Paid</Badge>
    return <Badge variant="outline" className="text-[10px] h-4">{String(r.status)}</Badge>
  }

  return (
    <div className="border-b border-border px-4 py-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total AP</p>
          <p className="text-xl font-semibold tabular-nums">{fmt(total)}</p>
          <p className="text-[11px] text-muted-foreground">{rows.length} invoices</p>
        </Card>
        <Card className={`px-3 py-2.5 ${atRiskTotal > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'}`}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">At Risk (&gt;14d overdue)</p>
          <p className={`text-xl font-semibold tabular-nums ${atRiskTotal > 0 ? 'text-red-300' : ''}`}>{fmt(atRiskTotal)}</p>
          <p className="text-[11px] text-muted-foreground">{atRisk.length} invoices · {Math.round(atRiskTotal / total * 100)}% of AP</p>
        </Card>
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Pending / Hold</p>
          <p className="text-xl font-semibold tabular-nums">{pendingHold.length}</p>
          <p className="text-[11px] text-muted-foreground">Awaiting approval</p>
        </Card>
      </div>

      {/* Invoice table with action buttons */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">All Invoices — sorted by overdue days</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Vendor</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Invoice</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Amount</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Days Overdue</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aging</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const key = String(r.invoice_number)
                const days = Number(r.days_overdue)
                const status = String(r.status).toLowerCase()
                const isDuplicate = key.includes('APEX') || status.includes('hold') || status.includes('dispute')
                const isOverdue = days > 0
                const action = actioned[key]
                return (
                  <tr key={i} className={`border-b border-border last:border-0 ${rowClass(r)}`}>
                    <td className="px-3 py-2 font-medium">{String(r.vendor)}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">{String(r.invoice_number)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(Number(r.amount))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={days > 30 ? 'text-red-400 font-semibold' : days > 14 ? 'text-yellow-400' : 'text-muted-foreground'}>
                        {days > 0 ? `${days}d` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-[11px]">{String(r.aging_bucket || '—')}</td>
                    <td className="px-3 py-2">{statusBadge(r)}</td>
                    <td className="px-3 py-2 text-right">
                      {action === 'scheduled' ? (
                        <span className="text-[10px] text-green-400">✓ Scheduled</span>
                      ) : action === 'disputed' ? (
                        <span className="text-[10px] text-red-400">⚑ Flagged</span>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          {isDuplicate ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              disabled={pending === key}
                              onClick={() => flagDispute(r)}
                            >
                              Flag Dispute
                            </Button>
                          ) : isOverdue ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              disabled={pending === key}
                              onClick={() => schedulePayment(r)}
                            >
                              {pending === key ? '...' : 'Schedule Pay'}
                            </Button>
                          ) : null}
                        </div>
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
