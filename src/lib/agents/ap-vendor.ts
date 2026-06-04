import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import { getAPAging, getVendors, getTransactions } from '../db/queries'

export async function runApVendor(): Promise<string> {
  const [apRows, vendorRows, txRows] = await Promise.all([getAPAging(), getVendors(), getTransactions()])

  const apData = apRows.map(r => ({
    vendor: r.vendor, invoice: r.invoice_number, amount: r.amount,
    dueDate: r.due_date, daysOut: r.days_overdue, bucket: r.aging_bucket, status: r.status,
  }))
  const vendorData = vendorRows.map(r => ({
    name: r.name, category: r.category, contractType: r.contract_type,
    owner: r.department_owner, monthlySpend: r.monthly_spend, notes: r.notes,
  }))
  const spendByVendor: Record<string, number> = {}
  for (const tx of txRows) {
    const v = String(tx.vendor)
    spendByVendor[v] = (spendByVendor[v] || 0) + Number(tx.amount)
  }
  const totalAP = apData.reduce((s, r) => s + Number(r.amount), 0)

  const m = AGENT_MODELS['ap-vendor']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 4000,
    prompt: `You are the AP & Vendor Risk agent for Acme Robotics. Accounts payable is where fraud, error, and unauthorized spend hide. With the VP of Finance gone, you are the internal auditor. $${totalAP.toLocaleString()} in open AP. At least $25,500 is either duplicate or unauthorized.

AP AGING DATA (${apData.length} invoices):
${JSON.stringify(apData, null, 2)}

VENDOR MASTER (${vendorData.length} vendors):
${JSON.stringify(vendorData, null, 2)}

TRANSACTION SPEND BY VENDOR (last 69 transactions):
${JSON.stringify(spendByVendor, null, 2)}

Analyze and output in EXACTLY this format:

##DATA_SCANNED##
"• ap_aging — ${apData.length} invoices, $${totalAP.toLocaleString()} total open AP"
"• vendors — ${vendorData.length} vendors in master list"
"• transactions — ${txRows.length} transactions analyzed for spend patterns"

##FRAUD_AUDIT##
This section ALWAYS appears. Audit these specific items:

APEX LOGISTICS DUPLICATE: Find invoices APEX-2026-104 and APEX-2026-108. Both are $14,500, both described as "fulfillment strategy engagement," overlapping dates. Same vendor, same amount, same description = strong duplicate billing indicator. RECOMMENDED ACTION: Hold both invoices. Contact Apex Logistics for documentation proving two separate deliverables. Do not pay either until confirmed.

HELIOS IMAGING ($6,200): Appears in transactions but may not be in vendor master. No department owner, no contract. This is unauthorized spend. RECOMMENDED ACTION: Identify who authorized this payment. Add to vendor master or void depending on legitimacy.

GLOBAL STRATEGIC CONSULTING ($4,800): No prior history, no contract, no department owner. Single invoice "Strategic services." RECOMMENDED ACTION: Identify approver, verify deliverable, add contract or dispute.

Total identified at-risk AP: $14,500 (potential duplicate) + $6,200 (unauthorized) + $4,800 (unauthorized) = $25,500 minimum. Could be $40,000 if both Apex invoices are duplicates.

##REASONING##
Number every step. Format: "What I found: [exact number] — Why this matters: [benchmark] — Implication: [business meaning]"

Step 1: Payment priority for legitimate invoices — what must be paid THIS WEEK to avoid late fees or service disruption? What can be deferred 30 days? Rank by contractual due date and vendor criticality (AWS = critical, Iron Mountain = deferrable).
Step 2: Vendor spend vs contracted amounts — compare each vendor's actual 60-day spend to expected_monthly from vendor master. Flag anyone 20%+ over contract.
Step 3: Datacenter West analysis — find their AP invoice and compare to expected monthly. Calculate the overage percentage and dollar amount. Why might this be over?
Step 4: Vendors with no contract or no owner — list them with monthly spend. These are unprotected relationships.
Step 5: Total at-risk AP summary — legitimate due now vs deferrable vs hold pending investigation.

##CONCLUSIONS##
RED: [duplicate/unauthorized invoices with specific amounts — do not pay until verified]
YELLOW: [invoices approaching due dates or spend over contract]
GREEN: [legitimate vendor relationships within expected parameters]

##REPORT##
Open with: "What I analyzed: [three data sources]. What I was looking for: [fraud patterns, unauthorized spend, payment priorities]. What I found: [most important finding]."
Then: fraud audit findings, payment priority schedule, vendor spend analysis, and a clear list of what to pay vs hold vs investigate.`,
  })

  return text
}
