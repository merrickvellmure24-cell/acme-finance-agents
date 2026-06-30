import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import { getVendors } from '../db/queries'

export async function runContractWatchdog(): Promise<string> {
  const rows = await getVendors()

  const vendors = rows.map(r => ({
    name: r.name,
    category: r.category,
    contractType: r.contract_type,
    owner: r.department_owner,
    monthlySpend: r.monthly_spend,
    notes: r.notes,
  }))

  const totalMonthlySpend = vendors.reduce((s, v) => s + Number(v.monthlySpend), 0)

  const m = AGENT_MODELS['contract-watchdog']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 3000,
    providerOptions: { groq: { reasoningEffort: 'none' } },
    prompt: `You are the Contract Watchdog agent for Acme Robotics. With the VP of Finance gone, no one is watching contract renewals. An auto-renewing Salesforce contract at $50K with no negotiation is a real risk. You are the contract manager the company no longer has.

VENDOR DATA (${vendors.length} vendors, $${totalMonthlySpend.toLocaleString()}/month total spend):
${JSON.stringify(vendors, null, 2)}

KEY CONTEXT:
- Salesforce noted "Renewal Sept 2026" = ~3 months away, $4,200/month = $50,400/year. Decision needed NOW.
- Stale contract threshold: last_reviewed > 6 months ago (before December 2025)
- Month-to-month contracts = 30-day reprice/termination risk
- Today's date: June 3, 2026

Analyze and output in EXACTLY this format:

##DATA_SCANNED##
"• vendors — ${vendors.length} vendors, $${totalMonthlySpend.toLocaleString()}/month total contracted spend"

##REASONING##
Number every step. Format: "What I found: [exact fact] — Why this matters: [risk/benchmark] — Implication: [what CFO must do]"

Step 1: RENEWAL RADAR — scan all vendor notes for renewal dates. Find Salesforce Sept 2026. Calculate annual value. State exactly why the negotiation decision must be made NOW (procurement lead time, leverage window). List any other renewals found.
Step 2: STALE CONTRACTS — vendors with last_reviewed date before December 2025. List name + monthly spend. Flag by spend size (high spend + stale = highest risk). Calculate total monthly spend in stale contracts.
Step 3: MONTH-TO-MONTH RISKS — vendors with contract_type = 'month-to-month'. List them + monthly spend. Calculate total monthly revenue at risk if any vendor reprices or terminates.
Step 4: NO CONTRACT / NO OWNER — vendors with no formal contract AND no department_owner. These are the most dangerous — no legal protection and no relationship owner. List name + spend.
Step 5: Total uncontracted or at-risk monthly spend — sum all flagged categories. As a % of total $${totalMonthlySpend.toLocaleString()}/month, how exposed is the company?
Step 6: Priority list — which 3 contracts should the CFO address in the next 30 days and why? Be specific about what action to take on each.

##CONCLUSIONS##
RED: [renewals with tight deadlines or high-spend contracts with no legal protection]
YELLOW: [stale contracts or month-to-month risks above $5K/month]
GREEN: [well-managed contracts with active owners and current reviews]

##REPORT##
Open with: "What I analyzed: vendor master with ${vendors.length} vendors. What I was looking for: renewal risks, stale contracts, and unprotected spend. What I found: [most important finding]."
Then: full contract risk report with renewal radar, stale contract list, MTM exposure, and the CFO's 30-day action list.`,
  })

  return text
}
