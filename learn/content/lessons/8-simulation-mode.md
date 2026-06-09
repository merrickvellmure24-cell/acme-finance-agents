## Concept

**Simulation mode** (⚗ Hypo) lets you preview the financial impact of a decision *before* committing to it. No database changes, no emails sent — just a real-time calculation of "what would happen if I approved this?"

This matters in finance because decisions have downstream effects. If you approve collecting MidWest Fulfillment's $48K overdue invoice, cash goes up and AR overdue goes down. If you stop paying a duplicate vendor invoice, AP risk goes down. Simulation mode shows you those numbers *before* you pick up the phone.

---

## Two types of simulation

### 1. Action Item Approval (SimDelta engine)

When you switch to **⚗ Hypo mode** and approve an action item, the app:

1. Does **NOT** write to the database
2. Instead, passes the item through `computeSimDelta()` — a pure function that maps the action item to its financial impact
3. Aggregates all approved item deltas with `aggregateSimDeltas()`
4. Shows the combined effect in the **KPI Bar** (with a yellow `⚗` badge) and **Financial Snapshot Chart**

Each type of action item has a different impact:

| Source agent | When you approve | What changes |
|---|---|---|
| AR Collections | Customer pays overdue invoice | Cash ↑ · AR overdue ↓ |
| AP / Payables | Duplicate invoice stopped | Cash preserved · AP risk ↓ |
| Budget | Conference overage resolved | Monthly burn ↓ (annualized) |

The **Simulation Ledger** in the action sidebar shows a running total of all your sim approvals: `+$62K cash · AP risk -$14.5K · Reset ✕`.

### 2. Scenario Controls (assumption sliders)

Click **⚙ Scenarios** (top right when in Hypo mode) to open the floating scenario panel. These sliders let you model assumptions:

| Slider | What it asks | Real-world meaning |
|---|---|---|
| Burn Rate Reduction | If we cut spend by X%, new burn = ? | Imagine laying off a team or canceling contracts |
| Additional Revenue | If we close $X in new deals this month | New contract signed, not yet AR |
| AR Collection Delay | If customers pay X days late | Supply chain issues, disputes, seasonal slowdown |
| Defer AP | If we delay vendor payments X days | Preserves cash short-term, risks vendor relationships |
| Collect overdue AR | If MidWest pays now | Toggle: +$186K immediate cash |

The scenario panel shows a live outcome: adjusted cash, new monthly burn, hypothetical runway, and cash in 6 months.

---

## Why this is technically interesting

The simulation uses **no server calls** and **no database writes**. Every calculation is a pure function:

```typescript
// Pure function: takes an item, returns its financial impact
function computeSimDelta(item) {
  if (item.source_agent === 'ar-collections') {
    return { cashDelta: +item.amount, arOverdueDelta: -item.amount }
  }
  // ...
}

// Aggregate all approvals into one combined view
const totalImpact = aggregateSimDeltas(approvedItems.map(computeSimDelta))
```

**Pure function** means: same input always gives same output, no side effects. In finance, this matters because you never want a simulation to accidentally write a real transaction.

The KPI bar and charts receive the aggregate as a prop (`simDeltas`) and just add it to the live numbers. When you reset the simulation or switch back to Live mode, the state clears and the numbers go back to real data.

---

## So what? (Finance angle)

This is a simplified version of what quants and risk desks do with "scenario analysis":

- **Stress testing**: "What happens to our liquidity if 30% of AR doesn't come in?" (a real bank regulatory question)
- **Decision pre-approval**: Before a CFO authorizes a $48K write-off, they want to see the cash impact first
- **What-if modeling**: "If we cut burn by 15% and close one more enterprise deal, do we make it to Series C?"

At a firm like Vanguard, scenario analysis is central to portfolio construction (what happens to bond prices if rates rise 2%?) and risk management (how does our equity book perform under a 2008-style shock?). The concept is the same as what you've built here, just applied to financial instruments instead of startup burn rates.

---

## On the dashboard

1. Click **⚗ Hypo** in the top nav
2. A yellow banner appears: "Scenario mode — changes are simulated only"
3. Click **⚙ Scenarios** to open the floating controls panel
4. In the Action Items sidebar, click **✓ Approve** on a RED item
5. Watch the KPI bar update with `⚗` badges showing the delta
6. The Simulation Ledger (top of sidebar) shows cumulative impact
7. Click **Reset ✕** to clear all simulated approvals

---

## Try it

1. Switch to **⚗ Hypo** mode
2. Open **⚙ Scenarios** and drag "Burn Rate Reduction" to 25% — note the new runway
3. Close scenarios, then approve the MidWest Fulfillment AR action item in the Action Items sidebar (right side)
4. Look at the KPI bar — Cash on Hand should show `⚗ +$48K sim`
5. The AR Overdue card should show `⚗ -$48K`
6. Check the Financial Snapshot Card — the green dashed line shows the sim-adjusted trajectory
7. Click **Reset ✕** in the Simulation Ledger to clear everything
8. Switch back to **Live** — all numbers return to real data

---

## If they ask…

> **"How is simulation different from what you'd do in Excel?"**

"Excel what-ifs require you to manually update formulas and there's no audit trail. This simulation tracks each approval as a discrete delta with a source (which agent, which item, what amount), aggregates them in real time, and shows the combined effect instantly. You can reset it without touching the database. And because it's based on the same formulas as the live data, the math is consistent."

> **"Why not just write to a 'draft' table in the database?"**

"For this use case, there's no benefit. The simulation is ephemeral — the CFO runs it, makes a decision, and either commits it (Live mode Approve) or discards it. Client-side state is faster, simpler, and safer. Server-side draft tables would add complexity without adding value."
