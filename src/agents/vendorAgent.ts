import { generateText } from "ai";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/llm";

export async function runVendorAgent() {
  const [vendors, transactions] = await Promise.all([
    db.execute("SELECT * FROM vendors"),
    db.execute(
      "SELECT vendor, SUM(amount) as total, COUNT(*) as count FROM transactions GROUP BY vendor ORDER BY total DESC LIMIT 30"
    ),
  ]);

  const vendorList = vendors.rows.map((r) => ({
    name: r.name,
    category: r.category,
    contract_type: r.contract_type || "NONE",
    owner: r.department_owner || "UNKNOWN",
    monthly_spend: r.monthly_spend,
    notes: r.notes,
  }));

  const spendSummary = transactions.rows.map((r) => ({
    vendor: r.vendor,
    total: r.total,
    invoices: r.count,
  }));

  const { text } = await generateText({
    model: MODELS.vendor.provider(MODELS.vendor.model),
    system: `You are the Vendor Watch Agent for Acme Robotics. Detect anomalies in vendor spend and flag risks.
Red flags: vendors with no contract, no department owner, duplicate invoices, one-time vendors with large spend, new vendors not in the approved list.`,
    prompt: `Vendor registry: ${JSON.stringify(vendorList, null, 2)}

Transaction spend by vendor: ${JSON.stringify(spendSummary, null, 2)}

Flag: 1) Vendors with no contract 2) Potential duplicates 3) Unapproved/unknown vendors 4) Anomalous spend patterns`,
  });

  return { agent: "vendor", summary: text, data: { vendorList, spendSummary } };
}
