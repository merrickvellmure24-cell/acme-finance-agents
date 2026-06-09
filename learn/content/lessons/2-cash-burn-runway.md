## Concept

**Cash** is the money in your bank accounts. **Burn** is how fast you spend it. **Runway** is how long until it runs out.

These three numbers are the survival equation for any company that isn't yet profitable.

### The formulas

- **Monthly burn** = cash spent in a month (or average weekly burn × 4.33)
- **Runway (months)** = Total Cash ÷ Monthly Burn
- **Operating cash** = day-to-day spendable cash (excludes reserve)

## Acme example

| Metric | Value | Context |
|--------|-------|---------|
| Total cash | $12.68M | Operating + reserve |
| Operating cash | $11.18M | What you actually spend from |
| Reserve | $1.5M | Emergency buffer, not daily use |
| Weekly burn (current) | ~$310K/week | vs guidance $196K–$231K/week |
| Monthly burn (current) | ~$1.34M/mo | vs guidance $850K–$1.0M/mo |
| Runway | ~9.5 months | Target: 18+ months |

The burn spike is partly explained by conference overages: MODEX ($45K) + ProMat ($32K) = $77K in a single category.

## So what?

| Runway | Typical CFO response |
|--------|---------------------|
| 18+ months | Monitor weekly, focus on growth |
| 12–18 months | Tighten hiring, review discretionary spend |
| 6–12 months | Active cost reduction, accelerate collections, board update |
| < 6 months | Emergency measures — fundraise, layoffs, or asset sale |

At 9.5 months, Acme is in the **"board conversation"** zone. The CFO would:
- Freeze non-essential hiring
- Demand department burn-down plans
- Accelerate AR collections (every $100K collected = ~2.5 days of runway)
- Hold all discretionary AP until budget review

**Burn above guidance isn't automatically bad** — if it's driven by revenue-generating investment with clear ROI, the CFO approves it. If it's conference overages with no pipeline return, it's a problem.

## On the dashboard

- **KPI Bar** → Cash on Hand + Runway cards (just below the top nav)
- **Treasury tab** → 8-week area chart + weekly burn bars
- **Conclusion cards** → Agent flags burn vs guidance gaps

The area chart shows three lines: total cash, operating, and reserve. The burn bar chart shows week-over-week spend — spikes are visible immediately.

## Try it

1. Click **Treasury** in the top nav
2. Look at the weekly burn bar chart — identify the highest week
3. Find the RED or YELLOW conclusion about burn rate
4. Calculate runway yourself: $12.68M ÷ $1.34M = ~9.5 months. Does the KPI bar agree?
5. Expand **Audit Trail → Data Scanned** — confirm the agent read `cash_balance` table rows

## If they ask…

> **"What's the difference between total cash and operating cash?"**

"Total cash includes a $1.5M reserve account that isn't for daily operations. The CFO manages spend against operating cash ($11.18M) while treating the reserve as a deliberate buffer — drawing on it requires a specific decision."

> **"How do you know if burn is 'too high'?"**

"Compare to approved guidance ($850K–$1M/month) and to revenue growth. Burn above guidance without proportional revenue growth shortens runway. At Acme, 34–58% above guidance with only 9.5 months runway is a clear signal to investigate."
