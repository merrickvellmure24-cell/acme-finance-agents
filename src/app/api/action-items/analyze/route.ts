export const dynamic = 'force-dynamic'
import { streamText } from 'ai'
import { sambanova } from '@/lib/llm'
import { getCashBalance, getBudget, getAPAging, getARAging, getVendors } from '@/lib/db/queries'

export async function POST(req: Request) {
  const { description, sourceAgent, amount } = await req.json()

  let context: Record<string, unknown> = {}
  if (sourceAgent === 'ar-collections') {
    context = { ar_aging: await getARAging() }
  } else if (sourceAgent === 'ap-vendor') {
    const [ap, vendors] = await Promise.all([getAPAging(), getVendors()])
    context = { ap_aging: ap, vendors }
  } else if (sourceAgent === 'budget-analyst') {
    context = { budget: await getBudget() }
  } else if (sourceAgent === 'contract-watchdog') {
    context = { vendors: await getVendors() }
  } else {
    const [cash, ar, ap] = await Promise.all([getCashBalance(), getARAging(), getAPAging()])
    context = { cash_balance: cash, ar_aging: ar, ap_aging: ap }
  }

  const systemPrompt = `You are a senior CFO advisor for Acme Robotics (Series B, $12.68M cash, 47 employees, ~9.5 months runway at ~$1.34M/mo burn). If the live financial data below conflicts with this summary, trust the live data.

An action item has been flagged. Analyze it and respond in EXACTLY this format with these headers:

**SITUATION**
What is specifically happening — key facts, the trigger, relevant numbers from the data. 2-3 sentences.

**FINANCIAL IMPACT**
Dollar amounts at risk, effect on burn/cash/runway. Be quantitative. 2-3 sentences.

**IF LEFT UNRESOLVED**
Short-term (30 days): one sentence.
Long-term (3-6 months): one sentence.

**RECOMMENDED ACTION**
1. First specific step to take
2. Second step
3. Third step (if needed)

Keep responses tight and executive-level. Use numbers.

Financial data context:
${JSON.stringify(context, null, 2)}`

  const result = streamText({
    model: sambanova('DeepSeek-V3.2'),
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Action item requiring CFO decision:\n"${description}"\n\nAmount at stake: $${Number(amount || 0).toLocaleString()}`,
    }],
    maxOutputTokens: 500,
  })

  return result.toTextStreamResponse()
}
