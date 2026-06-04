'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ActionItemDetail from './ActionItemDetail'

interface ActionItem {
  id: number
  created_at: string
  source_agent: string
  description: string
  amount: number
  owner: string
  due_date: string
  status: string
  notes: string
}

interface Props { items: ActionItem[]; onUpdate: () => void }

const AGENT_ICON: Record<string, string> = {
  'cash-reporter': '💵', 'cash-forecast': '📈', 'budget-analyst': '📊',
  'ar-collections': '📥', 'ap-vendor': '📤', 'contract-watchdog': '📋',
  'cfo-briefing': '🏦', 'manual': '✏️',
}

function fmt(n: number) {
  if (!n) return null
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

function detectDecision(notes: string): 'approved' | 'delegated' | 'dismissed' | null {
  if (!notes) return null
  if (notes.startsWith('[APPROVED')) return 'approved'
  if (notes.startsWith('[DELEGATED')) return 'delegated'
  if (notes.startsWith('[DISMISSED')) return 'dismissed'
  return null
}

function truncate(s: string, n = 80) {
  const clean = s.replace(/\*\*([^*]+?)\*\*/g, '$1').replace(/^\*\*?\s*/g, '').trim()
  return clean.length > n ? clean.slice(0, n) + '…' : clean
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({ item, onClick }: { item: ActionItem; onClick: () => void }) {
  const amount = fmt(Number(item.amount))
  const icon = AGENT_ICON[item.source_agent] ?? '📌'
  const decision = detectDecision(item.notes ?? '')

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-card hover:bg-muted/30 p-3 space-y-2 transition group"
    >
      <p className="text-xs text-foreground leading-snug">{truncate(item.description)}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-sm">{icon}</span>
        {amount && <span className="text-[10px] font-mono text-muted-foreground">{amount}</span>}
        {item.owner && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.owner}</span>
        )}
        {decision === 'delegated' && item.owner && (
          <span className="text-[10px] text-blue-400">→ {item.owner}</span>
        )}
      </div>
    </button>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────
function KanbanCol({
  title, count, accent, items, onSelect,
}: {
  title: string
  count: number
  accent: string
  items: ActionItem[]
  onSelect: (item: ActionItem) => void
}) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px] flex-1">
      <div className={`flex items-center gap-2 pb-2 border-b-2 ${accent}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</p>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/30 text-center pt-6">—</p>
        )}
        {items.map(item => (
          <KanbanCard key={item.id} item={item} onClick={() => onSelect(item)} />
        ))}
      </div>
    </div>
  )
}

export default function ActionItemsPanel({ items, onUpdate }: Props) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)

  async function addItem() {
    if (!newDesc.trim()) return
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceAgent: 'manual', description: newDesc, amount: 0, owner: '' }),
    })
    setNewDesc(''); setAdding(false); onUpdate()
  }

  // Categorize items into kanban columns
  const colOpen = items.filter(i => i.status === 'open')
  const colDelegated = items.filter(i => i.status === 'in-progress')
  const colResolved = items.filter(i => i.status === 'done' && detectDecision(i.notes ?? '') === 'approved')
  const colDismissed = items.filter(i => i.status === 'done' && detectDecision(i.notes ?? '') === 'dismissed')
  // Items done but with old-style notes (no [APPROVED/DISMISSED] prefix)
  const colLegacyDone = items.filter(i => i.status === 'done' && !detectDecision(i.notes ?? ''))

  const openCount = colOpen.length

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Action Items</h2>
          {openCount > 0 && <Badge variant="destructive">{openCount} open</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-xs font-medium transition ${view === 'kanban' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ⬛ Pipeline
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-medium transition border-l border-border ${view === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ☰ Table
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAdding(a => !a)}>+ Add</Button>
        </div>
      </div>

      {adding && (
        <div className="flex gap-2">
          <Input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Describe the action item..."
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && addItem()}
          />
          <Button onClick={addItem}>Add</Button>
          <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}

      {!items.length ? (
        <Card className="border-border p-8 text-center">
          <p className="text-muted-foreground">No action items yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Run agents to auto-generate items from RED findings.</p>
        </Card>
      ) : view === 'kanban' ? (
        /* ── KANBAN VIEW ── */
        <div className="flex gap-4 overflow-x-auto pb-2">
          <KanbanCol
            title="Needs Action"
            count={colOpen.length}
            accent="border-red-500"
            items={colOpen}
            onSelect={setSelectedItem}
          />
          <KanbanCol
            title="Delegated"
            count={colDelegated.length}
            accent="border-blue-500"
            items={colDelegated}
            onSelect={setSelectedItem}
          />
          <KanbanCol
            title="Resolved"
            count={colResolved.length + colLegacyDone.length}
            accent="border-green-500"
            items={[...colResolved, ...colLegacyDone]}
            onSelect={setSelectedItem}
          />
          <KanbanCol
            title="Dismissed"
            count={colDismissed.length}
            accent="border-zinc-600"
            items={colDismissed}
            onSelect={setSelectedItem}
          />
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="space-y-1">
          {/* Open items */}
          {colOpen.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold pt-2 pb-1">Needs Action</p>
              {colOpen.map(item => <TableRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
            </div>
          )}
          {colDelegated.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold pt-3 pb-1">Delegated</p>
              {colDelegated.map(item => <TableRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
            </div>
          )}
          {(colResolved.length + colLegacyDone.length) > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold pt-3 pb-1">Resolved</p>
              {[...colResolved, ...colLegacyDone].map(item => <TableRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
            </div>
          )}
          {colDismissed.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/50 font-semibold pt-3 pb-1">Dismissed</p>
              {colDismissed.map(item => <TableRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
            </div>
          )}
        </div>
      )}

      <ActionItemDetail
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={() => { onUpdate(); setSelectedItem(null) }}
      />
    </div>
  )
}

function TableRow({ item, onClick }: { item: ActionItem; onClick: () => void }) {
  const amount = fmt(Number(item.amount))
  const icon = AGENT_ICON[item.source_agent] ?? '📌'
  const decision = detectDecision(item.notes ?? '')
  const STATUS_COLOR: Record<string, string> = {
    open: 'text-red-400', 'in-progress': 'text-blue-400', done: 'text-green-400',
  }
  const decisionLabel = decision === 'approved' ? 'Resolved' : decision === 'delegated' ? 'Delegated' : decision === 'dismissed' ? 'Dismissed' : item.status

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition text-left group border border-transparent hover:border-border"
    >
      <span className="text-base flex-shrink-0">{icon}</span>
      <p className={`flex-1 text-sm truncate ${item.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
        {truncate(item.description, 70)}
      </p>
      {amount && <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{amount}</span>}
      {item.owner && <span className="text-xs text-muted-foreground flex-shrink-0">{item.owner}</span>}
      <span className={`text-xs flex-shrink-0 ${STATUS_COLOR[item.status] ?? 'text-muted-foreground'}`}>{decisionLabel}</span>
      <span className="text-xs text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0">→</span>
    </button>
  )
}
