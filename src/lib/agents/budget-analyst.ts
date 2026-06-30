import { generateText } from 'ai'
import { AGENT_MODELS } from '../llm'
import { getBudget } from '../db/queries'

export async function runBudgetAnalyst(): Promise<string> {
  const rows = await getBudget()

  // Build dept × month matrix
  const byDept: Record<string, { month: string; planned: number; actual: number }[]> = {}
  for (const r of rows) {
    const dept = String(r.department)
    if (!byDept[dept]) byDept[dept] = []
    byDept[dept].push({ month: String(r.month), planned: Number(r.planned), actual: Number(r.actual) })
  }

  const months = [...new Set(rows.map(r => String(r.month)))]

  const m = AGENT_MODELS['budget-analyst']
  const { text } = await generateText({
    model: m.provider(m.model),
    maxOutputTokens: 3500,
    providerOptions: { groq: { reasoningEffort: 'none' } },
    prompt: `You are the Budget Analyst agent for Acme Robotics. The budget is the CFO's contract with the board. Deviations require explanations. Your job: write those explanations so the CFO doesn't have to build them from scratch.

BUDGET DATA (${rows.length} rows, ${Object.keys(byDept).length} departments, months: ${months.join(', ')}):
${JSON.stringify(byDept, null, 2)}

KEY CONTEXT:
- Sales & Marketing overage: MODEX conference ($45K, April) + ProMat ($32K, March/April) were CEO-approved mid-cycle but never entered in budget. These are real expenses, not errors — but they expose a process gap.
- Flag threshold: +5% variance = flag
- Travel is consistently under budget ~$2-3K/month (VP Finance departure likely reduced executive travel)

Analyze and output in EXACTLY this format:

##DATA_SCANNED##
"• budget — ${rows.length} rows (${months[0]} through ${months[months.length - 1]}, ${Object.keys(byDept).length} departments)"

##REASONING##
Number every step. Format: "What I found: [exact number] — Why this matters: [benchmark] — Implication: [business meaning]"

Step 1: Overall budget vs actual summary across all departments and all months (total planned, total actual, total variance $, %)
Step 2: Department-by-department variance table — for each dept: planned, actual, $ variance, % variance, flag if >5%
Step 3: Sales & Marketing deep dive — root cause analysis of the overage. Identify the process gap. Recommend the specific fix: any CEO-approved unbudgeted expense >$10K should trigger a budget amendment within 5 business days. Explain WHY this matters as a process issue, not just a number.
Step 4: Year-end projections — for each department, if current run rate continues, projected full-year actual vs budget. Which departments end the year over? Under?
Step 5: Underspend analysis — Travel is under. Why? What does underspend signal about organizational health?

##CONCLUSIONS##
RED: [departments with >15% overage or structural process gaps]
YELLOW: [departments with 5-15% overage or underspend signals]
GREEN: [departments on track]

##REPORT##
Open with: "What I analyzed: [sources and date range]. What I was looking for: [variances and thresholds]. What I found: [most important finding]."
Then full budget variance report with: summary table, department deep dives, year-end projections, and process recommendations.`,
  })

  return text
}
