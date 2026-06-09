export interface HypotheticalInputs {
  burnCutPct: number
  additionalRevenue: number
  collectAR: boolean
  arDelayDays: number
  deferAPDays: number
}

export interface HypotheticalMetrics {
  totalCash: number
  monthlyBurn: number
  arOverdue: number
  apDueSoon: number
}

export interface HypotheticalOutcome {
  adjustedCash: number
  adjustedBurn: number
  runwayMonths: number
  runwayGainMonths: number
  cashIn6Mo: number
  baseCashIn6Mo: number
  arImpact: number
  apDeferralBenefit: number
}

export interface SimDelta {
  cashDelta: number
  arOverdueDelta: number
  apRiskDelta: number
  monthlyBurnDelta: number
  label: string
}

export type AggregateSimDelta = Omit<SimDelta, 'label'>

export const DEFAULT_HYPOTHETICAL_INPUTS: HypotheticalInputs = {
  burnCutPct: 15,
  additionalRevenue: 0,
  collectAR: false,
  arDelayDays: 0,
  deferAPDays: 0,
}

export function computeSimDelta(item: { source_agent: string; amount: number; description: string }): SimDelta {
  const amt = Math.abs(Number(item.amount))
  switch (item.source_agent) {
    case 'ar-collections':
      return { cashDelta: amt, arOverdueDelta: -amt, apRiskDelta: 0, monthlyBurnDelta: 0, label: item.description }
    case 'ap-vendor':
      // Fraudulent/duplicate invoices stopped = cash saved + AP risk eliminated
      return { cashDelta: amt, arOverdueDelta: 0, apRiskDelta: -amt, monthlyBurnDelta: 0, label: item.description }
    case 'budget-analyst':
      // Budget variance resolved = monthly burn reduction (treat flagged overage as recurring monthly savings)
      return { cashDelta: 0, arOverdueDelta: 0, apRiskDelta: 0, monthlyBurnDelta: -(amt / 12), label: item.description }
    default:
      return { cashDelta: amt, arOverdueDelta: 0, apRiskDelta: 0, monthlyBurnDelta: 0, label: item.description }
  }
}

export function aggregateSimDeltas(deltas: SimDelta[]): AggregateSimDelta {
  return deltas.reduce(
    (acc, d) => ({
      cashDelta: acc.cashDelta + d.cashDelta,
      arOverdueDelta: acc.arOverdueDelta + d.arOverdueDelta,
      apRiskDelta: acc.apRiskDelta + d.apRiskDelta,
      monthlyBurnDelta: acc.monthlyBurnDelta + d.monthlyBurnDelta,
    }),
    { cashDelta: 0, arOverdueDelta: 0, apRiskDelta: 0, monthlyBurnDelta: 0 },
  )
}

export function computeHypotheticalOutcome(
  metrics: HypotheticalMetrics,
  inputs: HypotheticalInputs,
): HypotheticalOutcome {
  const baseBurn = metrics.monthlyBurn
  const baseCash = metrics.totalCash
  const baseAR = metrics.arOverdue
  const baseAP = metrics.apDueSoon

  const adjustedBurn = Math.max(0, baseBurn * (1 - inputs.burnCutPct / 100) - inputs.additionalRevenue)

  let arImpact = 0
  if (inputs.collectAR) {
    arImpact += baseAR
  }
  if (inputs.arDelayDays > 0) {
    arImpact -= baseAR * Math.min(inputs.arDelayDays / 90, 1)
  }

  const apDeferralBenefit = inputs.deferAPDays > 0
    ? baseAP * Math.min(inputs.deferAPDays / 30, 1)
    : 0

  const adjustedCash = baseCash + arImpact + apDeferralBenefit
  const runwayMonths = adjustedBurn > 0 ? adjustedCash / adjustedBurn : 0
  const baseRunway = baseBurn > 0 ? baseCash / baseBurn : 0

  return {
    adjustedCash,
    adjustedBurn,
    runwayMonths,
    runwayGainMonths: runwayMonths - baseRunway,
    cashIn6Mo: Math.max(0, adjustedCash - adjustedBurn * 6),
    baseCashIn6Mo: Math.max(0, baseCash - baseBurn * 6),
    arImpact,
    apDeferralBenefit,
  }
}

export function computeArMissCashProjection(
  rows: { week_ending: string; total_cash: number; weekly_burn: number }[],
  arOverdue: number,
): { week: string; projected: number }[] {
  if (!rows.length) return []
  const latest = rows[rows.length - 1]
  const startCash = Number(latest.total_cash)
  const recent = rows.slice(-4)
  const avgWeeklyBurn = recent.reduce((s, r) => s + Number(r.weekly_burn), 0) / recent.length
  const weeksForward = rows.length
  const arWeeklyDrag = arOverdue / weeksForward

  return rows.map((r, i) => {
    const weeksFromEnd = rows.length - 1 - i
    const projected = Math.max(0, startCash - (avgWeeklyBurn + arWeeklyDrag) * weeksFromEnd)
    return { week: String(r.week_ending).slice(5), projected }
  })
}
