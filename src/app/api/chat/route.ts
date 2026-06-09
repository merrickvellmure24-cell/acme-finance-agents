export const dynamic = 'force-dynamic'
import { streamText } from 'ai'
import { cerebras } from '@/lib/llm'
import { getCashBalance, getTransactions, getBudget, getAPAging, getARAging, getVendors, getLatestAgentOutput } from '@/lib/db/queries'

const COMPANY_CONTEXT = `
Acme Robotics Company Context:
- Series B startup, raised $18M in March 2025 (Bessemer Venture Partners)
- 47 employees, robotics/logistics automation industry
- Current cash: $12.68M ($11.18M operating + $1.5M reserve)
- Monthly burn: ~$1.19M/mo (34-58% above guidance of $850K-$1M/mo)
- Runway: ~10.6 months at current burn
- Key risks: MidWest Fulfillment $48K AR 92 days overdue, Apex duplicate invoices $25.5K, MODEX/ProMat conference overspend $77K, Salesforce renewal upcoming
- Stage: Pre-revenue scaling phase typical of Series B robotics company
`

const ADVISOR_ROLE = `You are a senior CFO advisor and startup finance expert with 20+ years experience. Your role:
1. Use the company's actual financial data as primary context
2. Apply professional expertise: startup finance, AR/AP management, SaaS/robotics industry benchmarks, fundraising, cash management
3. Answer questions that go BEYOND just the data — provide industry context, best practices, strategic perspective
4. When asked "is this normal?", compare to Series B startup benchmarks
5. When asked "why?", explain the business/operational reasons behind financial patterns
6. When asked for advice, give specific actionable recommendations, not just data recitation
7. Be direct, executive-level, and quantitative

${COMPANY_CONTEXT}
`

const AGENT_DESCRIPTIONS: Record<string, string> = {
  cash: `${ADVISOR_ROLE}Currently focused on: cash position, weekly burn trends, and runway analysis. You have 8 weeks of cash balance data.`,
  cashForecast: `${ADVISOR_ROLE}Currently focused on: 9-month cash projections across multiple scenarios. You have cash history and can model burn/revenue scenarios.`,
  budget: `${ADVISOR_ROLE}Currently focused on: budget variance analysis across all 8 departments. You can explain why departments over/underspend and what to do about it.`,
  ar: `${ADVISOR_ROLE}Currently focused on: accounts receivable, collections strategy, and customer payment patterns. You have all 15 AR records.`,
  ap: `${ADVISOR_ROLE}Currently focused on: accounts payable, vendor risk, duplicate invoice detection, and payment optimization. You have AP and vendor data.`,
  contracts: `${ADVISOR_ROLE}Currently focused on: vendor contract risk, renewal timing, and spend optimization. You have the full vendor master.`,
  briefing: `${ADVISOR_ROLE}You have access to all financial data across cash, budget, AR, AP, and vendor contracts. Synthesize across domains to answer any CFO-level question.`,
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const agent = searchParams.get('agent') ?? 'briefing'
  const { messages, itemContext } = await req.json()

  let context: Record<string, unknown> = {}

  if (agent === 'cash' || agent === 'cashForecast') {
    const [cash, tx] = await Promise.all([getCashBalance(), getTransactions()])
    context = { cash_balance: cash, recent_transactions: tx.slice(0, 20) }
  } else if (agent === 'budget') {
    context = { budget: await getBudget() }
  } else if (agent === 'ar') {
    context = { ar_aging: await getARAging() }
  } else if (agent === 'ap') {
    const [ap, vendors, tx] = await Promise.all([getAPAging(), getVendors(), getTransactions()])
    context = { ap_aging: ap, vendors, transactions: tx.slice(0, 30) }
  } else if (agent === 'contracts') {
    context = { vendors: await getVendors() }
  } else {
    const [cash, budget, ap, ar, latestBriefing] = await Promise.all([
      getCashBalance(),
      getBudget(),
      getAPAging(),
      getARAging(),
      getLatestAgentOutput('cfo-briefing'),
    ])
    context = { cash_balance: cash, budget, ap_aging: ap, ar_aging: ar, latest_briefing: latestBriefing?.full_report ?? 'No briefing yet' }
  }

  const systemPrompt = `${AGENT_DESCRIPTIONS[agent] ?? AGENT_DESCRIPTIONS.briefing}
${itemContext ? `\nCurrently helping the CFO with this specific action item: ${itemContext}\nFocus answers on this issue and related context.\n` : ''}
Current financial data:
${JSON.stringify(context, null, 2)}`

  const result = streamText({
    model: cerebras('gpt-oss-120b'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
