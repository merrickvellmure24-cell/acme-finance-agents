import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

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
