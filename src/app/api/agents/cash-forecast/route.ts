export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { runCashForecast } from '@/lib/agents/cash-forecast'
import parseAgentOutput from '@/lib/utils/parseAgentOutput'
import { saveAgentOutputV2, getLatestAgentOutput } from '@/lib/db/queries'

export async function GET() {
  const row = await getLatestAgentOutput('cash-forecast')
  return NextResponse.json(row)
}

export async function POST() {
  const raw = await runCashForecast()
  const parsed = parseAgentOutput(raw)
  await saveAgentOutputV2('cash-forecast', parsed.dataScanned.join('\n'), parsed.reasoningSteps.join('\n'), parsed.report, parsed.health, JSON.stringify(parsed.conclusions), parsed.needsEscalation, JSON.stringify({ raw, parsed }))
  return NextResponse.json({ raw, parsed })
}
