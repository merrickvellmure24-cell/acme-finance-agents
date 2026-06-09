import { createClient } from "@libsql/client";

type DbClient = ReturnType<typeof createClient>

let client: DbClient | null = null

function getDbClient(): DbClient {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN")
  }

  client ??= createClient({ url, authToken })
  return client
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop: keyof DbClient) {
    const dbClient = getDbClient()
    const value = dbClient[prop]
    return typeof value === "function" ? value.bind(dbClient) : value
  },
})

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      description TEXT,
      amount REAL,
      category TEXT,
      vendor TEXT,
      type TEXT
    );
    CREATE TABLE IF NOT EXISTS budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT,
      month TEXT,
      planned REAL,
      actual REAL
    );
    CREATE TABLE IF NOT EXISTS ap_aging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor TEXT,
      invoice_number TEXT,
      amount REAL,
      due_date TEXT,
      days_overdue INTEGER,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS ar_aging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer TEXT,
      invoice_number TEXT,
      amount REAL,
      due_date TEXT,
      days_outstanding INTEGER,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category TEXT,
      contract_on_file INTEGER,
      department_owner TEXT,
      monthly_spend REAL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS cash_balance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_ending TEXT,
      balance REAL,
      weekly_burn REAL
    );
    CREATE TABLE IF NOT EXISTS agent_briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT,
      agent TEXT,
      summary TEXT,
      findings TEXT,
      severity TEXT
    );
  `);
}
