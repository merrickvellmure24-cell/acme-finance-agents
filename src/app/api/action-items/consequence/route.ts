export const dynamic = 'force-dynamic'
import { streamText } from 'ai'
import { sambanova } from '@/lib/llm'
import { getARAging, getAPAging, getBudget, getVendors, getCashBalance } from '@/lib/db/queries'

function buildPrompt(
  description: string,
  sourceAgent: string,
  amount: number,
  decision: string,
  delegateName?: string,
  delegateDept?: string,
): string {
  const amtStr = amount ? `$${Number(amount).toLocaleString()}` : 'an unspecified amount'

  if (decision === 'delegated') {
    return `The CFO is delegating the following action item to ${delegateName || 'a team member'} in the ${delegateDept || 'relevant'} department.

Action item: "${description}"
Financial impact: ${amtStr}

Write a delegation brief addressed to ${delegateName || 'the responsible team member'}. Include:
1. Context — what the issue is and why it matters (2-3 sentences)
2. Your assignment — exactly what needs to be done and by when (propose a specific deadline)
3. Financial stakes — what is at risk if this isn't resolved
4. Resources / next steps — any contacts, data, or systems they'll need
5. Escalation — who to contact if they hit a blocker

Address the brief to ${delegateName || 'the assignee'} and sign it from "Office of the CFO — Acme Robotics".
Output ONLY the brief, formatted and ready to share.`
  }

  if (decision === 'dismissed') {
    return `The CFO reviewed and dismissed the following action item without taking action.

Action item: "${description}"
Amount flagged: ${amtStr}

Write a brief dismissal rationale for the internal record. It should explain:
- What was evaluated
- Why no immediate action is warranted at this time
- Any conditions that would warrant revisiting this decision
- Who reviewed it (CFO) and the review date (today)

Keep it to 4-6 sentences. Output ONLY the rationale, formatted for internal filing.`
  }

  // Approve — build artifact based on source agent
  const approvePrompts: Record<string, string> = {
    'ar-collections': `The CFO has approved taking action on an overdue accounts receivable item.

Issue: "${description}"
Amount overdue: ${amtStr}

Draft a professional collections email from the Acme Robotics Finance team to the customer. The email must:
- State the invoice amount and how many days it has been outstanding
- Set a clear payment deadline (7 business days from today)
- Offer a contact method for questions or to arrange a payment plan
- Be firm but professional — preserve the relationship while making clear action is required
- Be signed: "Acme Robotics Finance Team | finance@acmerobotics.com"

Output ONLY the email (Subject line + body), ready to send.`,

    'ap-vendor': `The CFO has approved action on an accounts payable / vendor issue.

Issue: "${description}"
Amount at stake: ${amtStr}

If this is a payment hold or dispute: draft a formal vendor dispute notice requesting clarification or correction before payment is released.
If this is an approval to pay: draft a brief payment authorization memo for internal records.

Determine which is appropriate from the issue description. Output ONLY the letter or memo, formatted and ready to use.`,

    'budget-analyst': `The CFO has approved corrective action on a budget overspend.

Issue: "${description}"
Amount over budget: ${amtStr}

Draft a corrective action memo to the department head responsible for the overspend. Include:
- The specific overspend amount and percentage over budget
- A directive to reduce discretionary spend by a specific target (calculate based on amount)
- A required timeline for the reduction
- A request for a written spending plan within 5 business days
- Acknowledgment that all discretionary spend above $1,000 requires CFO pre-approval until the variance is resolved

Sign from: "CFO — Acme Robotics". Output ONLY the memo.`,

    'contract-watchdog': `The CFO has approved action on a vendor contract issue.

Issue: "${description}"
Amount at risk: ${amtStr}

Draft a vendor action notice (renewal request, renegotiation notice, or contract requirement notice — determine from context). Include:
- The specific contract situation (renewal timing, missing contract, spend exposure)
- What Acme Robotics requires from the vendor
- A response deadline
- Consequences of non-response (default to month-to-month at current rate, or contract required)

Sign from: "Acme Robotics — Vendor Relations | legal@acmerobotics.com". Output ONLY the notice.`,
  }

  const defaultApprovePrompt = `The CFO has approved taking action on this financial issue.

Issue: "${description}"
Amount: ${amtStr}

Draft a brief internal action memo documenting:
- What the issue was
- What action is being taken
- Who is responsible for execution
- Expected resolution timeline
- How the result will be confirmed

Sign from: "CFO — Acme Robotics". Output ONLY the memo.`

  return approvePrompts[sourceAgent] ?? defaultApprovePrompt
}

export async function POST(req: Request) {
  const { description, sourceAgent, amount, decision, delegateName, delegateDept } = await req.json()

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

  const userPrompt = buildPrompt(description, sourceAgent, Number(amount ?? 0), decision, delegateName, delegateDept)
    + `\n\nRelevant financial data for context:\n${JSON.stringify(context, null, 2)}`

  const result = streamText({
    model: sambanova('DeepSeek-V3.2'),
    system: `You are the CFO of Acme Robotics (Series B, $12.68M cash, 47 employees). Generate a professional, ready-to-use business document. Be specific with names, amounts, and dates from the context. Output ONLY the requested document — no preamble, no explanation, no commentary.`,
    messages: [{ role: 'user', content: userPrompt }],
    maxOutputTokens: 700,
  })

  return result.toTextStreamResponse()
}
