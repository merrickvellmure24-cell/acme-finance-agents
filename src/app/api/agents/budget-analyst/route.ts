import { NextResponse } from 'next/server'
import { runBudgetAnalyst } from '@/lib/agents/budget-analyst'
import parseAgentOutput from '@/lib/utils/parseAgentOutput'
import { saveAgentOutputV2, getLatestAgentOutput } from '@/lib/db/queries'

export async function GET() {
  const row = await getLatestAgentOutput('budget-analyst')
  return NextResponse.json(row)
}

export async function POST() {
  const raw = await runBudgetAnalyst()
  const parsed = parseAgentOutput(raw)
  await saveAgentOutputV2('budget-analyst', parsed.dataScanned.join('\n'), parsed.reasoningSteps.join('\n'), parsed.report, parsed.health, JSON.stringify(parsed.conclusions), parsed.needsEscalation, JSON.stringify({ raw, parsed }))
  return NextResponse.json({ raw, parsed })
}
