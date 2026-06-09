import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import type { ParsedAgentOutput } from '../utils/parseAgentOutput'

interface AgentInputs {
  cashReporter: ParsedAgentOutput
  cashForecast: ParsedAgentOutput
  budgetAnalyst: ParsedAgentOutput
  arCollections: ParsedAgentOutput
  apVendor: ParsedAgentOutput
  contractWatchdog: ParsedAgentOutput
}

export async function runCfoBriefing(inputs: AgentInputs): Promise<string> {
  const summarize = (name: string, parsed: ParsedAgentOutput) => `
=== ${name.toUpperCase()} ===
HEALTH: ${parsed.health}
CONCLUSIONS:
${parsed.conclusions.map(c => `${c.level}: ${c.text}`).join('\n')}
KEY REASONING (top 5 steps):
${parsed.reasoningSteps.slice(0, 5).join('\n')}
REPORT SUMMARY (first 500 chars):
${parsed.report.slice(0, 500)}
`

  const context = [
    summarize('Cash Reporter', inputs.cashReporter),
    summarize('Cash Forecast', inputs.cashForecast),
    summarize('Budget Analyst', inputs.budgetAnalyst),
    summarize('AR Collections', inputs.arCollections),
    summarize('AP & Vendor Risk', inputs.apVendor),
    summarize('Contract Watchdog', inputs.contractWatchdog),
  ].join('\n')

  const m = AGENT_MODELS['cfo-briefing']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 4000,
    prompt: `You are the CFO Briefing agent for Acme Robotics — the VP of Finance substitute. You have read all 6 specialist agent reports. Your job: synthesize, find connections, rank priorities, and write recommendations requiring genuine judgment. The CFO has 20 minutes in the morning before their first meeting.

SIX AGENT REPORTS:
${context}

SYNTHESIS INSTRUCTIONS:
- Find connections BETWEEN agents that neither would catch alone (e.g., Cash Reporter's burn + AP Vendor's duplicate invoice findings = single root cause: financial controls degraded when VP Finance left)
- Rank issues ACROSS domains — a $48K AR write-off risk matters MORE than a $3K travel underspend
- Every recommendation must be: what action, why it can't wait, dollar/runway consequence of inaction
- The CFO should never feel like they're trusting a black box

Output in EXACTLY this format:

##DATA_SCANNED##
"• 6 specialist agent reports synthesized: cash-reporter, cash-forecast, budget-analyst, ar-collections, ap-vendor, contract-watchdog"
"• Underlying data: cash_balance (8wks), transactions (69), budget (8 depts), ap_aging (20), ar_aging (15), vendors (26)"

##REASONING##
Number every synthesis step. Show the connections explicitly.

Step 1: Cash + Forecast synthesis — what do burn rate and runway projections tell us together? Quote specific numbers from both agents. What is the combined implication?
Step 2: AP fraud + Cash connection — quote the duplicate/unauthorized AP amount from the Payables report. What does this mean for cash? How many days of runway is at stake?
Step 3: AR write-off risk + Cash Forecast connection — if MidWest Fulfillment ($48K) writes off, how does that change the Forecast's Base Case? Quantify the runway impact in days.
Step 4: Budget process gap + Future cash risk — the CEO-approved expenses that bypassed budget. If this continues unchecked, what is the risk to cash planning accuracy?
Step 5: Contract renewal + Cash planning — the Salesforce renewal in Sept 2026. If it auto-renews at current rate with no negotiation, what is the cash impact vs negotiating a 20% reduction?
Step 6: Root cause synthesis — what single underlying cause connects the most issues? (Likely: loss of VP Finance = degraded financial controls across AP, AR, budget process, and contract management)

##CONCLUSIONS##
RED: [issues requiring CFO personal action this week — with dollar amounts and deadlines]
YELLOW: [issues requiring delegation this week]
GREEN: [metrics within normal range — reassure the CFO these are fine]

##REPORT##

## YOUR #1 PRIORITY THIS WEEK
[One bolded sentence. The single most important action. Include: what action, why it can't wait, dollar/runway consequence of inaction.]

## FINANCIAL HEALTH SCORECARD
| Metric | Value | Status | Trend | Benchmark |
|--------|-------|--------|-------|-----------|
[Fill in: Total Cash | Monthly Burn | Runway | AR Overdue | AP Anomalies | Budget Variance]
Status = RED/YELLOW/GREEN. Trend = ↑ ↓ →. Benchmark = what healthy looks like.

## REQUIRES IMMEDIATE ACTION (CFO must personally decide)
[Numbered items. Each: Issue | Dollar impact | Decision needed (yes/no or A/B) | Deadline | If not acted on: consequence]

## DELEGATION QUEUE (assign to others today)
[Items: Task | Suggested owner | Why them | By when]

## WHAT AGENTS HANDLED AUTOMATICALLY
[Brief bullets of things analyzed and found normal. Reassures CFO the routine things are routine.]

## HOW WE GOT HERE
[3-4 sentences in plain English: what your 6 AI agents analyzed, what data they used, how they reached conclusions. Any number in this briefing can be traced to a specific calculation in the individual agent tabs. Close the loop — the CFO should never feel like they're trusting a black box.]`,
  })

  return text
}
