import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import { getARAging } from '../db/queries'

export async function runArCollections(): Promise<string> {
  const rows = await getARAging()

  const arData = rows.map(r => ({
    customer: r.customer,
    invoice: r.invoice_number,
    amount: r.amount,
    daysOut: r.days_outstanding,
    bucket: r.aging_bucket,
    status: r.status,
    lastContact: r.last_contact,
    dueDate: r.due_date,
  }))

  const totalAR = arData.reduce((s, r) => s + Number(r.amount), 0)
  const overdueAR = arData.filter(r => Number(r.daysOut) > 0).reduce((s, r) => s + Number(r.amount), 0)

  const m = AGENT_MODELS['ar-collections']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 3500,
    prompt: `You are the AR Collections agent for Acme Robotics. $${totalAR.toLocaleString()} is sitting in receivables. That's cash the company has earned but not collected. With $1.34M/month burn, uncollected receivables can extend runway by weeks. Your job: tell the CFO exactly who to call and in what order.

AR AGING DATA (${rows.length} invoices, $${totalAR.toLocaleString()} total, $${overdueAR.toLocaleString()} overdue):
${JSON.stringify(arData, null, 2)}

KEY CONTEXT:
- Today's date: June 3, 2026
- MidWest Fulfillment Co: $48K, 92 days outstanding, last contact March 1 (94 days ago) — write-off risk
- Healthy AR benchmark: >70% of AR in Current bucket
- Since this dataset has open invoices but not trailing credit sales, calculate weighted average AR age instead of true DSO
- $1.34M/month burn rate context

Analyze and output in EXACTLY this format:

##DATA_SCANNED##
"• ar_aging — ${rows.length} rows, $${totalAR.toLocaleString()} total AR"

##REASONING##
Number every step. Format: "What I found: [exact number] — Why this matters: [benchmark] — Implication: [business meaning]"

Step 1: AR aging breakdown by bucket — Current | 1-30 days | 31-60 days | 61-90 days | 90+ days. Show $ amount and % of total for each. Compare to >70% current benchmark.
Step 2: Weighted average AR age — sum(amount × days outstanding) ÷ total AR. Compare to a 45-day collection target and clearly state this is an aging proxy, not true DSO.
Step 3: MidWest Fulfillment priority — $48K, 92 days, last contact 94 days ago. At 90+ days with no contact, this transitions from collections to write-off risk. Calculate: if written off, what is the runway impact in days? (total AR lost ÷ daily burn). Recommend VP-level escalation call, not email. 14-day payment plan deadline.
Step 4: Collection priority stack-rank — rank ALL overdue invoices by ($ amount × days overdue). Show the ordered list. Highest product = call first.
Step 5: Collectibility assessment — for each overdue invoice: HIGH/MEDIUM/LOW likelihood based on days outstanding and last contact. Total "likely collectible" vs "at risk of write-off" in dollars.

##CONCLUSIONS##
RED: [invoices 90+ days or write-off risk with specific dollar amounts]
YELLOW: [invoices 30-90 days needing follow-up]
GREEN: [current invoices and healthy collection metrics]

##REPORT##
Open with: "What I analyzed: [sources]. What I was looking for: [collection risks and AR aging]. What I found: [most important finding]."
Then: full collections report with aging breakdown, AR age analysis, MidWest Fulfillment escalation recommendation, and the priority call list.`,
  })

  return text
}
