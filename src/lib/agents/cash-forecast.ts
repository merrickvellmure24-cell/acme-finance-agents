import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import { getCashBalance, getBudget } from '../db/queries'

export async function runCashForecast(): Promise<string> {
  const [cashRows, budgetRows] = await Promise.all([getCashBalance(), getBudget()])

  const latestCash = cashRows[cashRows.length - 1]
  const recentBurns = cashRows.slice(-4).map(r => Number(r.weekly_burn))
  const avgWeeklyBurn = recentBurns.reduce((a, b) => a + b, 0) / recentBurns.length
  const currentMonthlyBurn = avgWeeklyBurn * 4.33

  const m = AGENT_MODELS['cash-forecast']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 3500,
    providerOptions: { groq: { reasoningEffort: 'none' } },
    prompt: `You are the Cash Forecast agent for Acme Robotics. Your job is forward-looking financial modeling — not what happened, but what WILL happen. Show every single calculation so the CFO can verify it with a calculator.

CURRENT POSITION:
- Total cash: $${Number(latestCash?.total_cash ?? 0).toLocaleString()} (as of ${latestCash?.week_ending})
- Operating: $${Number(latestCash?.operating ?? 0).toLocaleString()} | Reserve: $${Number(latestCash?.reserve ?? 0).toLocaleString()}
- Current avg weekly burn: $${Math.round(avgWeeklyBurn).toLocaleString()} → $${Math.round(currentMonthlyBurn).toLocaleString()}/month

CASH HISTORY (all 8 weeks):
${JSON.stringify(cashRows.map(r => ({ week: r.week_ending, total: r.total_cash, burn: r.weekly_burn })), null, 2)}

BUDGET DATA:
${JSON.stringify(budgetRows.map(r => ({ dept: r.department, month: r.month, planned: r.planned, actual: r.actual })), null, 2)}

KEY CONTEXT:
- Danger zone: $3M cash (below this, bridge raises become difficult for Series B)
- Guidance ceiling: $1.0M/month burn
- Guidance target: $850K/month burn
- Identified one-time costs: $77K conference sponsorships + $14.5K Apex duplicate = $91.5K (~$22.5K/week inflator in recent period)

Analyze and output in EXACTLY this format:

##DATA_SCANNED##
List every data source: "• [table] — [N] rows ([range])"

##REASONING##
Number every step. Format: "What I found: [exact number] — Why this matters: [benchmark] — Implication: [business meaning]"

Step 1: Confirm current burn rate with exact calculation
Step 2: BASE CASE projection — apply $${Math.round(currentMonthlyBurn).toLocaleString()}/mo. Show cash at end of months 1, 3, 6, 9. Calculate: exact date cash hits $3M. Exact date cash hits $0. Show the arithmetic.
Step 3: SCENARIO A — Enforce burn discipline to $1.0M/mo. Required monthly reduction = current burn minus $1.0M. Show new runway. Calculate: what minimum monthly cut is needed to reach 18-month runway? 24-month runway? Show algebra.
Step 4: SCENARIO B — Revenue acceleration. If $200K/month more cash in (e.g. MidWest Fulfillment $48K collected + better collections). Show runway impact. Calculate the exact month difference.
Step 5: Biggest single lever. What one action has the most runway impact? Quantify it.
Step 6: Tripwire — in which scenario and when does cash drop below $3M? This is the CFO's early warning.

##CONCLUSIONS##
RED: [if Base Case hits $3M within 6 months]
YELLOW: [if Base Case hits $3M in 6-12 months, or any scenario shows tight runway]
GREEN: [what's working in favor of the company]

##REPORT##
Open with: "What I analyzed: [sources]. What I was looking for: [questions]. What I found: [most important finding]."
Then: full scenario analysis with all calculations visible. Include a summary table of all 3 scenarios.`,
  })

  return text
}
