import { db } from '../db'

// ── Data fetchers ──────────────────────────────────────────────────────────────

export async function getCashBalance() {
  const r = await db.execute('SELECT * FROM cash_balance ORDER BY week_ending ASC')
  return r.rows
}

export async function getTransactions(filters?: {
  search?: string
  category?: string
  status?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
}) {
  let sql = 'SELECT * FROM transactions WHERE 1=1'
  const args: (string | number)[] = []

  if (filters?.search) {
    sql += ' AND (vendor LIKE ? OR description LIKE ?)'
    args.push(`%${filters.search}%`, `%${filters.search}%`)
  }
  if (filters?.category) {
    sql += ' AND category = ?'
    args.push(filters.category)
  }
  if (filters?.status) {
    sql += ' AND status = ?'
    args.push(filters.status)
  }
  if (filters?.minAmount !== undefined) {
    sql += ' AND amount >= ?'
    args.push(filters.minAmount)
  }
  if (filters?.maxAmount !== undefined) {
    sql += ' AND amount <= ?'
    args.push(filters.maxAmount)
  }
  if (filters?.startDate) {
    sql += ' AND date >= ?'
    args.push(filters.startDate)
  }
  if (filters?.endDate) {
    sql += ' AND date <= ?'
    args.push(filters.endDate)
  }

  sql += ' ORDER BY date DESC'
  const r = await db.execute({ sql, args })
  return r.rows
}

export async function getBudget() {
  const r = await db.execute('SELECT * FROM budget ORDER BY department, month')
  return r.rows
}

export async function getAPAging() {
  const r = await db.execute('SELECT * FROM ap_aging ORDER BY days_overdue DESC')
  return r.rows
}

export async function getARAging() {
  const r = await db.execute('SELECT * FROM ar_aging ORDER BY days_outstanding DESC')
  return r.rows
}

export async function getVendors() {
  const r = await db.execute('SELECT * FROM vendors ORDER BY name')
  return r.rows
}

// ── Agent output storage ───────────────────────────────────────────────────────

export async function saveAgentOutputV2(
  agent: string,
  dataScanned: string,
  reasoningChain: string,
  fullReport: string,
  health: string,
  flags: string,
  needsEscalation: boolean,
  rawJson: string
) {
  await db.execute({
    sql: `INSERT INTO agent_outputs (run_at, agent, data_scanned, reasoning_chain, full_report, health, flags, needs_escalation, raw_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      new Date().toISOString(),
      agent,
      dataScanned,
      reasoningChain,
      fullReport,
      health,
      flags,
      needsEscalation ? 1 : 0,
      rawJson,
    ],
  })
}

export async function getLatestAgentOutput(agent: string) {
  const r = await db.execute({
    sql: 'SELECT * FROM agent_outputs WHERE agent = ? ORDER BY run_at DESC LIMIT 1',
    args: [agent],
  })
  return r.rows[0] ?? null
}

export async function getLatestBriefing() {
  return getLatestAgentOutput('cfo-briefing')
}

// ── Action items ───────────────────────────────────────────────────────────────

export async function getActionItems() {
  const r = await db.execute(
    "SELECT * FROM action_items ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in-progress' THEN 1 ELSE 2 END, created_at DESC"
  )
  return r.rows
}

export async function saveActionItem(
  sourceAgent: string,
  description: string,
  amount: number,
  owner: string
) {
  await db.execute({
    sql: 'INSERT INTO action_items (created_at, source_agent, description, amount, owner, status) VALUES (?, ?, ?, ?, ?, ?)',
    args: [new Date().toISOString(), sourceAgent, description, amount, owner, 'open'],
  })
}

// Remove open auto-generated items before a fresh run so we don't accumulate duplicates
export async function clearAutoActionItems() {
  await db.execute(
    "DELETE FROM action_items WHERE status = 'open' AND source_agent != 'manual'"
  )
}

export async function updateActionItem(
  id: number,
  updates: { owner?: string; dueDate?: string; status?: string; notes?: string }
) {
  const fields: string[] = []
  const args: (string | number)[] = []

  if (updates.owner !== undefined) { fields.push('owner = ?'); args.push(updates.owner) }
  if (updates.dueDate !== undefined) { fields.push('due_date = ?'); args.push(updates.dueDate) }
  if (updates.status !== undefined) { fields.push('status = ?'); args.push(updates.status) }
  if (updates.notes !== undefined) { fields.push('notes = ?'); args.push(updates.notes) }

  if (!fields.length) return
  args.push(id)
  await db.execute({ sql: `UPDATE action_items SET ${fields.join(', ')} WHERE id = ?`, args })
}

// ── Metrics ────────────────────────────────────────────────────────────────────

export async function getMetrics() {
  const [cash, arOverdue, apRisk, arTotal, apTotal, lastRun] = await Promise.all([
    db.execute('SELECT total_cash, weekly_burn FROM cash_balance ORDER BY week_ending DESC LIMIT 4'),
    db.execute("SELECT SUM(amount) as total FROM ar_aging WHERE days_outstanding > 0"),
    db.execute("SELECT SUM(amount) as total FROM ap_aging WHERE days_overdue > 14"),
    db.execute("SELECT SUM(amount) as total FROM ar_aging"),
    db.execute("SELECT SUM(amount) as total FROM ap_aging"),
    db.execute('SELECT run_at FROM agent_outputs ORDER BY run_at DESC LIMIT 1'),
  ])

  const cashRows = cash.rows
  const latestCash = Number(cashRows[0]?.total_cash ?? 0)
  const avgWeeklyBurn = cashRows.length
    ? cashRows.reduce((s, r) => s + Number(r.weekly_burn ?? 0), 0) / cashRows.length
    : 0
  const monthlyBurn = avgWeeklyBurn * 4.33
  const runway = monthlyBurn > 0 ? latestCash / monthlyBurn : 0

  return {
    totalCash: latestCash,
    monthlyBurn: Math.round(monthlyBurn),
    runway: Math.round(runway * 10) / 10,
    arOverdue: Number(arOverdue.rows[0]?.total ?? 0),
    apRisk: Number(apRisk.rows[0]?.total ?? 0),
    totalAR: Number(arTotal.rows[0]?.total ?? 0),
    totalAP: Number(apTotal.rows[0]?.total ?? 0),
    lastRun: (lastRun.rows[0]?.run_at as string) ?? null,
  }
}
