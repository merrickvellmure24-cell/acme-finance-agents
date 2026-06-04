import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import { getCashBalance, getTransactions } from '../db/queries'

export async function runCashReporter(): Promise<string> {
  const [cashRows, txRows] = await Promise.all([getCashBalance(), getTransactions()])

  const cashData = cashRows.map(r => ({
    week: r.week_ending,
    total: r.total_cash,
    operating: r.operating,
    reserve: r.reserve,
    burn: r.weekly_burn,
  }))

  const recentTx = txRows.slice(0, 30).map(r => ({
    date: r.date, vendor: r.vendor, amount: r.amount, category: r.category, dept: r.department,
  }))

  const m = AGENT_MODELS['cash-reporter']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 3000,
    prompt: `You are the Cash Reporter agent for Acme Robotics, a Series B warehouse automation startup (47 employees).
The CFO just lost their VP of Finance and uses your output every day to understand the company's cash position.
Your job: be a rigorous financial analyst. Show every calculation. Explain every benchmark. Never hide uncertainty.

CASH BALANCE DATA (8 weeks, chronological):
${JSON.stringify(cashData, null, 2)}

RECENT TRANSACTIONS (sample for context):
${JSON.stringify(recentTx, null, 2)}

COMPANY CONTEXT: Monthly burn guidance is $850K–$1.0M/month ($196K–$231K/week). Reserve ($1.5M) is off-limits for normal operations. CFO manages against operating balance ($11.18M).

Analyze and output in EXACTLY this format with these exact section markers:

##DATA_SCANNED##
List every data source you used, format: "• [table] — [N] rows ([date range])"

##REASONING##
Number every step. Each step MUST follow: "What I found: [specific number] — Why this matters: [benchmark/threshold] — Implication: [business meaning]"

Include these numbered steps:
1. Current cash position: break out operating vs reserve, state why they're managed separately
2. Weekly burn trend: list all 8 weeks explicitly, identify trend direction
3. Monthly burn projection: (most recent week × 4.33), compare to $850K–$1M guidance
4. Runway calculation: total cash ÷ monthly burn
5. Sensitivity table: at current burn / at $1M ceiling / at $850K target — months remaining in each scenario
6. One-time events: identify the April conference sponsorships ($77K: MODEX $45K + ProMat $32K) and May Apex duplicate ($14.5K) — distinguish structural from one-time burn

##CONCLUSIONS##
RED: [only if burn > $1M/mo sustained OR runway < 9 months]
YELLOW: [if burn is 10-30% above guidance ceiling OR runway 9-12 months]
GREEN: [what is actually healthy]

##REPORT##
Open with: "What I analyzed: [data sources and date ranges]. What I was looking for: [questions and thresholds]. What I found: [one sentence most important finding]."
Then provide the full CFO-ready cash position report with all calculations visible.`,
  })

  return text
}
