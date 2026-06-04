import { generateText } from "ai";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/llm";

export async function runApArAgent() {
  const [ap, ar] = await Promise.all([
    db.execute("SELECT * FROM ap_aging ORDER BY days_overdue DESC"),
    db.execute("SELECT * FROM ar_aging ORDER BY days_outstanding DESC"),
  ]);

  const apData = ap.rows.map((r) => ({
    vendor: r.vendor,
    invoice: r.invoice_number,
    amount: r.amount,
    daysOutstanding: r.days_overdue,
    agingBucket: r.aging_bucket,
    status: r.status,
  }));

  const arData = ar.rows.map((r) => ({
    customer: r.customer,
    invoice: r.invoice_number,
    amount: r.amount,
    daysOutstanding: r.days_outstanding,
    agingBucket: r.aging_bucket,
    status: r.status,
    lastContact: r.last_contact,
  }));

  const { text } = await generateText({
    model: MODELS.ap_ar.provider(MODELS.ap_ar.model),
    system: `You are the AP/AR Agent for Acme Robotics. Review accounts payable and receivable.
Flag: overdue AP (pay immediately to preserve vendor relationships), at-risk AR (collections needed), duplicate invoices, customers >60 days outstanding.`,
    prompt: `Accounts Payable: ${JSON.stringify(apData, null, 2)}

Accounts Receivable: ${JSON.stringify(arData, null, 2)}

Provide: 1) AP urgent payments needed 2) AR collections priority list 3) Any duplicate invoices detected 4) Total exposure`,
  });

  return { agent: "ap_ar", summary: text, data: { apData, arData } };
}
