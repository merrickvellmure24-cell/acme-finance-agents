'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ActionItem { id: number; created_at: string; source_agent: string; description: string; amount: number; owner: string; due_date: string; status: string; notes: string }
interface Props { items: ActionItem[]; onUpdate: () => void }

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'destructive' as never,
  'in-progress': 'secondary',
  done: 'outline',
}

export default function ActionItemsPanel({ items, onUpdate }: Props) {
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState('')

  async function update(id: number, updates: Record<string, string>) {
    await fetch('/api/action-items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    onUpdate()
  }

  async function addItem() {
    if (!newDesc.trim()) return
    await fetch('/api/action-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceAgent: 'manual', description: newDesc, amount: 0, owner: '' }) })
    setNewDesc(''); setAdding(false); onUpdate()
  }

  const open = items.filter(i => i.status !== 'done')
  const done = items.filter(i => i.status === 'done')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Action Items</h2>
          {open.length > 0 && <Badge variant="destructive">{open.length} open</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setAdding(a => !a)}>+ Add Item</Button>
      </div>

      {adding && (
        <div className="flex gap-2">
          <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe the action item..." className="flex-1" onKeyDown={e => e.key === 'Enter' && addItem()} />
          <Button onClick={addItem}>Add</Button>
          <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}

      {!items.length ? (
        <Card className="border-border p-8 text-center">
          <p className="text-muted-foreground">No action items yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Run agents to auto-generate items from RED findings.</p>
        </Card>
      ) : (
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider">Description</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Source</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Owner</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Due Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...open, ...done].map(item => (
                <TableRow key={item.id} className={`border-border ${item.status === 'done' ? 'opacity-50' : ''}`}>
                  <TableCell className={`text-sm max-w-xs ${item.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.description}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {item.amount > 0 ? `$${Number(item.amount).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.source_agent}</Badge></TableCell>
                  <TableCell>
                    <Input
                      defaultValue={item.owner ?? ''}
                      onBlur={e => { if (e.target.value !== item.owner) update(item.id, { owner: e.target.value }) }}
                      placeholder="Assign..."
                      className="h-7 text-xs w-28 bg-transparent border-muted"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      defaultValue={item.due_date ?? ''}
                      onChange={e => update(item.id, { dueDate: e.target.value })}
                      className="h-7 text-xs w-32 bg-transparent border-muted [color-scheme:dark]"
                    />
                  </TableCell>
                  <TableCell>
                    <Select defaultValue={item.status} onValueChange={v => v && update(item.id, { status: v })}>
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
