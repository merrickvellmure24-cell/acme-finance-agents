import { NextResponse } from 'next/server'
import { runCfoBriefing } from '@/lib/agents/cfo-briefing'
import { runCashReporter } from '@/lib/agents/cash-reporter'
import { runCashForecast } from '@/lib/agents/cash-forecast'
import { runBudgetAnalyst } from '@/lib/agents/budget-analyst'
import { runArCollections } from '@/lib/agents/ar-collections'
import { runApVendor } from '@/lib/agents/ap-vendor'
import { runContractWatchdog } from '@/lib/agents/contract-watchdog'
import parseAgentOutput from '@/lib/utils/parseAgentOutput'
import { saveAgentOutputV2, getLatestAgentOutput, saveActionItem } from '@/lib/db/queries'

export async function GET() {
  const row = await getLatestAgentOutput('cfo-briefing')
  return NextResponse.json(row)
}

export async function POST() {
  const [cr, cf, ba, ar, ap, cw] = await Promise.all([
    runCashReporter().then(parseAgentOutput),
    runCashForecast().then(parseAgentOutput),
    runBudgetAnalyst().then(parseAgentOutput),
    runArCollections().then(parseAgentOutput),
    runApVendor().then(parseAgentOutput),
    runContractWatchdog().then(parseAgentOutput),
  ])
  const raw = await runCfoBriefing({ cashReporter: cr, cashForecast: cf, budgetAnalyst: ba, arCollections: ar, apVendor: ap, contractWatchdog: cw })
  const parsed = parseAgentOutput(raw)
  await saveAgentOutputV2('cfo-briefing', parsed.dataScanned.join('\n'), parsed.reasoningSteps.join('\n'), parsed.report, parsed.health, JSON.stringify(parsed.conclusions), parsed.needsEscalation, JSON.stringify({ raw, parsed }))
  for (const c of parsed.conclusions.filter(c => c.level === 'RED')) {
    const m = c.text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i)
    const amount = m ? parseFloat(m[0].replace(/[$,]/g, '')) * (/K/i.test(m[0]) ? 1000 : /M/i.test(m[0]) ? 1000000 : 1) : 0
    await saveActionItem('cfo-briefing', c.text.slice(0, 200), amount, '')
  }
  return NextResponse.json({ raw, parsed })
}
