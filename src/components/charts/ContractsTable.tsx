'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VendorRow {
  name: string
  category: string
  contract_type: string
  department_owner: string
  monthly_spend: number
  notes: string
}

function fmt(n: number) {
  return n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`
}

function contractBadge(type: string) {
  const t = String(type).toLowerCase()
  if (t.includes('no contract') || t === '') return <Badge variant="destructive" className="text-[10px] h-4">No Contract</Badge>
  if (t.includes('month') || t.includes('m2m')) return <Badge variant="secondary" className="text-[10px] h-4">Month-to-Month</Badge>
  if (t.includes('annual') || t.includes('yearly')) return <Badge variant="default" className="text-[10px] h-4">Annual</Badge>
  return <Badge variant="outline" className="text-[10px] h-4">{type}</Badge>
}

function rowClass(type: string) {
  const t = String(type).toLowerCase()
  if (t.includes('no contract') || t === '') return 'bg-red-500/5 border-red-500/20'
  if (t.includes('month') || t.includes('m2m')) return 'bg-yellow-500/5 border-yellow-500/20'
  return ''
}

export default function ContractsTable() {
  const [rows, setRows] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vendor-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="px-4 py-4"><Card className="h-48 animate-pulse bg-muted" /></div>
  if (!rows.length) return null

  const totalSpend = rows.reduce((s, r) => s + Number(r.monthly_spend || 0), 0)
  const noContract = rows.filter(r => !r.contract_type || String(r.contract_type).toLowerCase().includes('no contract'))
  const monthToMonth = rows.filter(r => String(r.contract_type || '').toLowerCase().includes('month'))
  const noContractSpend = noContract.reduce((s, r) => s + Number(r.monthly_spend || 0), 0)

  // Sort: no contract first, then month-to-month, then annual, by spend desc within each group
  const sortPriority = (r: VendorRow) => {
    const t = String(r.contract_type || '').toLowerCase()
    if (!t || t.includes('no contract')) return 0
    if (t.includes('month')) return 1
    return 2
  }
  const sorted = [...rows].sort((a, b) => sortPriority(a) - sortPriority(b) || Number(b.monthly_spend) - Number(a.monthly_spend))

  return (
    <div className="border-b border-border px-4 py-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Monthly Spend</p>
          <p className="text-xl font-semibold tabular-nums">{fmt(totalSpend)}</p>
          <p className="text-[11px] text-muted-foreground">{rows.length} vendors</p>
        </Card>
        <Card className={`px-3 py-2.5 ${noContract.length > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'}`}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">No Contract</p>
          <p className={`text-xl font-semibold tabular-nums ${noContract.length > 0 ? 'text-red-300' : ''}`}>{noContract.length}</p>
          <p className="text-[11px] text-muted-foreground">{fmt(noContractSpend)}/mo unprotected</p>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Month-to-Month</p>
          <p className="text-xl font-semibold tabular-nums text-yellow-300">{monthToMonth.length}</p>
          <p className="text-[11px] text-muted-foreground">Renewal risk</p>
        </Card>
      </div>

      {/* Vendor table */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">All Vendors — risk sorted</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Vendor</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Category</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Contract</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Owner</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Mo. Spend</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} className={`border-b border-border last:border-0 ${rowClass(r.contract_type)}`}>
                  <td className="px-3 py-2 font-medium">{String(r.name)}</td>
                  <td className="px-3 py-2 text-muted-foreground text-[11px]">{String(r.category || '—')}</td>
                  <td className="px-3 py-2">{contractBadge(r.contract_type)}</td>
                  <td className="px-3 py-2 text-muted-foreground text-[11px]">{String(r.department_owner || '—')}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{r.monthly_spend ? fmt(Number(r.monthly_spend)) : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground text-[11px] max-w-xs truncate" title={String(r.notes || '')}>{String(r.notes || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
