import { NextResponse } from 'next/server'
import { runCashReporter } from '@/lib/agents/cash-reporter'
import { runCashForecast } from '@/lib/agents/cash-forecast'
import { runBudgetAnalyst } from '@/lib/agents/budget-analyst'
import { runArCollections } from '@/lib/agents/ar-collections'
import { runApVendor } from '@/lib/agents/ap-vendor'
import { runContractWatchdog } from '@/lib/agents/contract-watchdog'
import { runCfoBriefing } from '@/lib/agents/cfo-briefing'
import parseAgentOutput from '@/lib/utils/parseAgentOutput'
import { saveAgentOutputV2, saveActionItem, clearAutoActionItems } from '@/lib/db/queries'

async function runAgent(name: string, fn: () => Promise<string>) {
  try {
    const raw = await fn()
    const parsed = parseAgentOutput(raw)
    await saveAgentOutputV2(
      name,
      parsed.dataScanned.join('\n'),
      parsed.reasoningSteps.join('\n'),
      parsed.report,
      parsed.health,
      JSON.stringify(parsed.conclusions),
      parsed.needsEscalation,
      JSON.stringify({ raw, parsed })
    )
    return { raw, parsed, error: null }
  } catch (err) {
    console.error(`[${name}]`, err)
    return { raw: '', parsed: parseAgentOutput(''), error: String(err) }
  }
}

function extractAmount(text: string): number {
  const m = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i)
  if (!m) return 0
  const raw = m[0].replace(/[$,]/g, '')
  const num = parseFloat(raw)
  if (/K/i.test(m[0])) return num * 1000
  if (/M/i.test(m[0])) return num * 1_000_000
  return num
}

export async function POST() {
  // Run 6 specialist agents in parallel
  const [cashReporter, cashForecast, budgetAnalyst, arCollections, apVendor, contractWatchdog] =
    await Promise.all([
      runAgent('cash-reporter', runCashReporter),
      runAgent('cash-forecast', runCashForecast),
      runAgent('budget-analyst', runBudgetAnalyst),
      runAgent('ar-collections', runArCollections),
      runAgent('ap-vendor', runApVendor),
      runAgent('contract-watchdog', runContractWatchdog),
    ])

  // CFO briefing runs after all 6
  const cfoBriefing = await runAgent('cfo-briefing', () =>
    runCfoBriefing({
      cashReporter: cashReporter.parsed,
      cashForecast: cashForecast.parsed,
      budgetAnalyst: budgetAnalyst.parsed,
      arCollections: arCollections.parsed,
      apVendor: apVendor.parsed,
      contractWatchdog: contractWatchdog.parsed,
    })
  )

  // Clear stale auto-generated action items, then create fresh ones from ALL agents' RED conclusions
  await clearAutoActionItems()

  const allAgents = [
    { name: 'cash-reporter', result: cashReporter },
    { name: 'cash-forecast', result: cashForecast },
    { name: 'budget-analyst', result: budgetAnalyst },
    { name: 'ar-collections', result: arCollections },
    { name: 'ap-vendor', result: apVendor },
    { name: 'contract-watchdog', result: contractWatchdog },
    { name: 'cfo-briefing', result: cfoBriefing },
  ]

  for (const { name, result } of allAgents) {
    const redItems = result.parsed.conclusions.filter(c => c.level === 'RED')
    for (const c of redItems) {
      await saveActionItem(name, c.text.slice(0, 250), extractAmount(c.text), '')
    }
  }

  return NextResponse.json({
    cashReporter: { raw: cashReporter.raw, parsed: cashReporter.parsed, error: cashReporter.error },
    cashForecast: { raw: cashForecast.raw, parsed: cashForecast.parsed, error: cashForecast.error },
    budgetAnalyst: { raw: budgetAnalyst.raw, parsed: budgetAnalyst.parsed, error: budgetAnalyst.error },
    arCollections: { raw: arCollections.raw, parsed: arCollections.parsed, error: arCollections.error },
    apVendor: { raw: apVendor.raw, parsed: apVendor.parsed, error: apVendor.error },
    contractWatchdog: { raw: contractWatchdog.raw, parsed: contractWatchdog.parsed, error: contractWatchdog.error },
    cfoBriefing: { raw: cfoBriefing.raw, parsed: cfoBriefing.parsed, error: cfoBriefing.error },
    completedAt: new Date().toISOString(),
  })
}
