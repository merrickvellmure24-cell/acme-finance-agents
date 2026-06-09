export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { runContractWatchdog } from '@/lib/agents/contract-watchdog'
import parseAgentOutput from '@/lib/utils/parseAgentOutput'
import { saveAgentOutputV2, getLatestAgentOutput } from '@/lib/db/queries'

export async function GET() {
  const row = await getLatestAgentOutput('contract-watchdog')
  return NextResponse.json(row)
}

export async function POST() {
  const raw = await runContractWatchdog()
  const parsed = parseAgentOutput(raw)
  await saveAgentOutputV2('contract-watchdog', parsed.dataScanned.join('\n'), parsed.reasoningSteps.join('\n'), parsed.report, parsed.health, JSON.stringify(parsed.conclusions), parsed.needsEscalation, JSON.stringify({ raw, parsed }))
  return NextResponse.json({ raw, parsed })
}
