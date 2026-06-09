'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Tx { id: number; date: string; vendor: string; amount: number; category: string; department: string; status: string; description: string }

export default function TransactionExplorer() {
  const [rows, setRows] = useState<Tx[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category && category !== 'all') params.set('category', category)
    if (status && status !== 'all') params.set('status', status)
    fetch(`/api/transactions?${params}`).then(r => r.json()).then(d => { setRows(d.rows ?? []); setTotal(d.total ?? 0) })
  }, [search, category, status])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  function exportCsv() {
    const header = 'Date,Vendor,Amount,Category,Department,Status'
    const lines = rows.map(r => `${r.date},"${r.vendor}",${r.amount},${r.category},${r.department},${r.status}`)
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `acme-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Transactions</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendor or description..."
          className="flex-1 min-w-48 max-w-xs"
        />
        <Select value={category} onValueChange={v => setCategory(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {['Software', 'Infrastructure', 'Personnel', 'Marketing', 'Operations', 'Professional Services'].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => setStatus(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Posted">Posted</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">Showing {rows.length} of {total} transactions</p>

      <Card className="border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Vendor</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Amount</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Category</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Department</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <React.Fragment key={r.id}>
                <TableRow
                  className="cursor-pointer border-border"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.date}</TableCell>
                  <TableCell className="font-medium text-sm">{r.vendor}</TableCell>
                  <TableCell className={`font-mono text-sm ${Number(r.amount) > 10000 ? 'text-destructive' : r.status === 'Pending' ? 'text-yellow-400' : 'text-foreground'}`}>
                    ${Number(r.amount).toLocaleString()}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.category}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.department}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'Pending' ? 'secondary' : 'default'} className="text-xs">{r.status}</Badge>
                  </TableCell>
                </TableRow>
                {expanded === r.id && (
                  <TableRow key={`${r.id}-exp`} className="bg-muted/30 border-border">
                    <TableCell colSpan={6} className="text-xs text-muted-foreground py-3 px-4">
                      <span className="font-medium text-foreground">Description: </span>{r.description}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
