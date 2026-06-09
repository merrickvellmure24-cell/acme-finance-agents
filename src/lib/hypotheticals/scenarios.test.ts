/**
 * Unit tests for the SimDelta engine.
 *
 * WHY THESE TESTS MATTER (for interview context):
 * Financial calculations that drive real decisions must be provably correct.
 * A bug in computeSimDelta could show a CFO the wrong cash impact and lead to
 * a wrong approval decision. These tests verify the math before any UI is involved.
 *
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest'
import { computeSimDelta, aggregateSimDeltas, type SimDelta } from './scenarios'

// ─── computeSimDelta ─────────────────────────────────────────────────────────

describe('computeSimDelta', () => {
  /**
   * AR Collections: customer pays overdue invoice.
   * Expected: cash increases, AR overdue decreases by the same amount.
   * e.g. MidWest Fulfillment pays their $48K overdue invoice →
   *   cash +$48K, AR overdue -$48K
   */
  it('AR collection increases cash and reduces AR overdue', () => {
    const delta = computeSimDelta({
      source_agent: 'ar-collections',
      amount: 48000,
      description: 'MidWest Fulfillment overdue $48K',
    })
    expect(delta.cashDelta).toBe(48000)
    expect(delta.arOverdueDelta).toBe(-48000)
    expect(delta.apRiskDelta).toBe(0)
    expect(delta.monthlyBurnDelta).toBe(0)
  })

  /**
   * AP Vendor (fraud): duplicate invoice is stopped/recovered.
   * Expected: cash preserved or recovered, AP risk eliminated.
   * e.g. Apex Logistics duplicate invoice $14.5K stopped →
   *   cash +$14.5K (don't pay it), AP risk -$14.5K
   */
  it('AP fraud resolution increases cash and reduces AP risk', () => {
    const delta = computeSimDelta({
      source_agent: 'ap-vendor',
      amount: 14500,
      description: 'Apex Logistics duplicate invoice $14.5K',
    })
    expect(delta.cashDelta).toBe(14500)
    expect(delta.apRiskDelta).toBe(-14500)
    expect(delta.arOverdueDelta).toBe(0)
    expect(delta.monthlyBurnDelta).toBe(0)
  })

  /**
   * Budget analyst: conference overage resolved (spending stopped).
   * Expected: no immediate cash impact, but monthly burn decreases.
   * The overage amount is divided by 12 to get monthly burn reduction
   * (treat it as an annualized savings).
   * e.g. $77K conference overage resolved → -$6.4K/month burn reduction
   */
  it('Budget overage resolution reduces monthly burn', () => {
    const delta = computeSimDelta({
      source_agent: 'budget-analyst',
      amount: 77000,
      description: 'MODEX + ProMat conference overage',
    })
    expect(delta.monthlyBurnDelta).toBeCloseTo(-77000 / 12, 1)
    expect(delta.cashDelta).toBe(0)
    expect(delta.arOverdueDelta).toBe(0)
    expect(delta.apRiskDelta).toBe(0)
  })

  /**
   * Default (other agents): treat amount as cash impact.
   */
  it('default agent type maps amount to cashDelta', () => {
    const delta = computeSimDelta({
      source_agent: 'contract-watchdog',
      amount: 25000,
      description: 'Vendor contract savings',
    })
    expect(delta.cashDelta).toBe(25000)
  })

  /**
   * Amount is always treated as absolute value.
   * Negative amounts (stored as e.g. -$14500 in some DB rows) should not flip the sign.
   */
  it('handles negative amount values by taking absolute value', () => {
    const delta = computeSimDelta({
      source_agent: 'ar-collections',
      amount: -48000,
      description: 'Negative amount test',
    })
    expect(delta.cashDelta).toBe(48000)
    expect(delta.arOverdueDelta).toBe(-48000)
  })
})

// ─── aggregateSimDeltas ───────────────────────────────────────────────────────

describe('aggregateSimDeltas', () => {
  /**
   * Aggregating multiple approved action items should sum each dimension.
   * This is how the CFO sees the combined effect of all their approvals.
   */
  it('sums all delta dimensions across multiple items', () => {
    const deltas: SimDelta[] = [
      { cashDelta: 48000, arOverdueDelta: -48000, apRiskDelta: 0, monthlyBurnDelta: 0, label: 'AR collection' },
      { cashDelta: 14500, arOverdueDelta: 0, apRiskDelta: -14500, monthlyBurnDelta: 0, label: 'AP fraud' },
      { cashDelta: 0, arOverdueDelta: 0, apRiskDelta: 0, monthlyBurnDelta: -6000, label: 'Budget cut' },
    ]
    const agg = aggregateSimDeltas(deltas)
    expect(agg.cashDelta).toBe(62500)           // +$62.5K total cash impact
    expect(agg.arOverdueDelta).toBe(-48000)     // AR reduced by $48K
    expect(agg.apRiskDelta).toBe(-14500)        // AP risk reduced by $14.5K
    expect(agg.monthlyBurnDelta).toBe(-6000)    // -$6K/month burn
  })

  /**
   * Edge case: empty array should return zero across all dimensions.
   */
  it('returns zero aggregate for empty array', () => {
    const agg = aggregateSimDeltas([])
    expect(agg.cashDelta).toBe(0)
    expect(agg.arOverdueDelta).toBe(0)
    expect(agg.apRiskDelta).toBe(0)
    expect(agg.monthlyBurnDelta).toBe(0)
  })

  /**
   * Real scenario: approve all three flagged items in Acme's data.
   * MidWest Fulfillment $48K (AR) + Apex Logistics $14.5K (AP) + conference $77K (budget)
   * Expected cash impact: $48K + $14.5K = $62.5K (budget is burn, not immediate cash)
   */
  it('real Acme scenario: approving all three action items', () => {
    const items = [
      { source_agent: 'ar-collections', amount: 48000, description: 'MidWest Fulfillment' },
      { source_agent: 'ap-vendor', amount: 14500, description: 'Apex duplicate' },
      { source_agent: 'budget-analyst', amount: 77000, description: 'Conference overage' },
    ]
    const agg = aggregateSimDeltas(items.map(computeSimDelta))
    expect(agg.cashDelta).toBe(62500)
    expect(agg.arOverdueDelta).toBe(-48000)
    expect(agg.apRiskDelta).toBe(-14500)
    expect(agg.monthlyBurnDelta).toBeCloseTo(-77000 / 12, 1)
  })
})
