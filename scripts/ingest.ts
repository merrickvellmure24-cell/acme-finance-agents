import * as XLSX from "xlsx";
import { createClient } from "@libsql/client";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

function readSheet(file: string): Record<string, unknown>[] {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}

async function ingest() {
  const dataDir = path.join(__dirname, "../data");

  // Clear and recreate tables
  await db.executeMultiple(`
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS budget;
    DROP TABLE IF EXISTS ap_aging;
    DROP TABLE IF EXISTS ar_aging;
    DROP TABLE IF EXISTS vendors;
    DROP TABLE IF EXISTS cash_balance;
    DROP TABLE IF EXISTS agent_briefings;
    CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, description TEXT, amount REAL, category TEXT, vendor TEXT, department TEXT, status TEXT);
    CREATE TABLE budget (id INTEGER PRIMARY KEY AUTOINCREMENT, department TEXT, month TEXT, planned REAL, actual REAL);
    CREATE TABLE ap_aging (id INTEGER PRIMARY KEY AUTOINCREMENT, vendor TEXT, invoice_number TEXT, amount REAL, due_date TEXT, days_overdue INTEGER, status TEXT, aging_bucket TEXT);
    CREATE TABLE ar_aging (id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT, invoice_number TEXT, amount REAL, due_date TEXT, days_outstanding INTEGER, status TEXT, aging_bucket TEXT, last_contact TEXT);
    CREATE TABLE vendors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category TEXT, contract_type TEXT, department_owner TEXT, monthly_spend REAL, notes TEXT);
    CREATE TABLE cash_balance (id INTEGER PRIMARY KEY AUTOINCREMENT, week_ending TEXT, total_cash REAL, operating REAL, reserve REAL, weekly_burn REAL);
    CREATE TABLE agent_briefings (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, agent TEXT, summary TEXT, findings TEXT, severity TEXT);
  `);

  // --- Transactions ---
  const txRows = readSheet(path.join(dataDir, "Transactions.xlsx")) as Record<string, unknown>[];
  for (const r of txRows) {
    await db.execute({
      sql: "INSERT INTO transactions (date, description, amount, category, vendor, department, status) VALUES (?,?,?,?,?,?,?)",
      args: [String(r["Date"] ?? ""), String(r["Description"] ?? ""), Number(r["Amount"] ?? 0), String(r["Category"] ?? ""), String(r["Vendor"] ?? ""), String(r["Department"] ?? ""), String(r["Status"] ?? "")],
    });
  }
  console.log(`✓ Transactions: ${txRows.length} rows`);

  // --- Budget (wide format → tall format) ---
  const budgetRows = readSheet(path.join(dataDir, "Budget_2026.xlsx")) as Record<string, unknown>[];
  for (const r of budgetRows) {
    const dept = String(r["Category"] ?? "");
    const keys = Object.keys(r).filter(k => k !== "Category");
    // Keys come in pairs: "Dec 2025 Planned", "Dec 2025 Actual", etc.
    const months = new Set(keys.map(k => k.replace(" Planned", "").replace(" Actual", "").replace(" (MTD)", "").trim()));
    for (const month of months) {
      const planned = Number(r[`${month} Planned`] ?? r[`${month} (MTD) Planned`] ?? 0);
      const actual  = Number(r[`${month} Actual`]  ?? r[`${month} (MTD) Actual`]  ?? 0);
      await db.execute({
        sql: "INSERT INTO budget (department, month, planned, actual) VALUES (?,?,?,?)",
        args: [dept, month, planned, actual],
      });
    }
  }
  console.log(`✓ Budget: ${budgetRows.length} departments`);

  // --- AP Aging ---
  const apRows = readSheet(path.join(dataDir, "AP_Aging.xlsx")) as Record<string, unknown>[];
  for (const r of apRows) {
    await db.execute({
      sql: "INSERT INTO ap_aging (vendor, invoice_number, amount, due_date, days_overdue, status, aging_bucket) VALUES (?,?,?,?,?,?,?)",
      args: [String(r["Vendor"] ?? ""), String(r["Invoice Number"] ?? ""), Number(r["Amount"] ?? 0), String(r["Due Date"] ?? ""), Number(r["Days Outstanding"] ?? 0), String(r["Status"] ?? ""), String(r["Aging Bucket"] ?? "")],
    });
  }
  console.log(`✓ AP Aging: ${apRows.length} rows`);

  // --- AR Aging ---
  const arRows = readSheet(path.join(dataDir, "AR_Aging.xlsx")) as Record<string, unknown>[];
  for (const r of arRows) {
    await db.execute({
      sql: "INSERT INTO ar_aging (customer, invoice_number, amount, due_date, days_outstanding, status, aging_bucket, last_contact) VALUES (?,?,?,?,?,?,?,?)",
      args: [String(r["Customer"] ?? ""), String(r["Invoice Number"] ?? ""), Number(r["Amount"] ?? 0), String(r["Due Date"] ?? ""), Number(r["Days Outstanding"] ?? 0), String(r["Status"] ?? ""), String(r["Aging Bucket"] ?? ""), String(r["Last Contact"] ?? "")],
    });
  }
  console.log(`✓ AR Aging: ${arRows.length} rows`);

  // --- Vendors ---
  const vendorRows = readSheet(path.join(dataDir, "Vendors.xlsx")) as Record<string, unknown>[];
  for (const r of vendorRows) {
    await db.execute({
      sql: "INSERT INTO vendors (name, category, contract_type, department_owner, monthly_spend, notes) VALUES (?,?,?,?,?,?)",
      args: [String(r["Vendor Name"] ?? ""), String(r["Category"] ?? ""), String(r["Contract Type"] ?? ""), String(r["Department Owner"] ?? ""), Number(r["Expected Monthly Spend"] ?? 0), String(r["Notes"] ?? "")],
    });
  }
  console.log(`✓ Vendors: ${vendorRows.length} rows`);

  // --- Cash Balance (calculate weekly burn from consecutive rows) ---
  const cashRows = readSheet(path.join(dataDir, "Cash_Balance.xlsx")) as Record<string, unknown>[];
  for (let i = 0; i < cashRows.length; i++) {
    const r = cashRows[i];
    const prev = cashRows[i - 1];
    const total = Number(r["Total Cash"] ?? 0);
    const prevTotal = prev ? Number(prev["Total Cash"] ?? 0) : total;
    const burn = prevTotal - total; // positive = money went out
    await db.execute({
      sql: "INSERT INTO cash_balance (week_ending, total_cash, operating, reserve, weekly_burn) VALUES (?,?,?,?,?)",
      args: [String(r["Week Ending"] ?? ""), total, Number(r["Operating Account"] ?? 0), Number(r["Reserve Account"] ?? 0), burn],
    });
  }
  console.log(`✓ Cash Balance: ${cashRows.length} rows`);

  console.log("\n✅ Ingest complete — all real data loaded");
  process.exit(0);
}

ingest().catch((e) => { console.error(e); process.exit(1); });
