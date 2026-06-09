## Concept

**Accounts Receivable (AR)** is money customers owe you for work already delivered. Until they pay, that cash is unavailable — you've done the work and spent the money, but the revenue is trapped.

**DSO (Days Sales Outstanding)** measures collection speed using accounts receivable and credit sales over a period. Because this demo dataset has open invoices but not trailing credit sales, the dashboard uses **Avg AR Age** instead: a dollar-weighted average of how old the open receivables are. Lower is better.

**Aging buckets** group invoices by how overdue they are:
- Current (not yet due)
- 1–30 days overdue
- 31–60 days
- 61–90 days
- 90+ days (highest collection risk)

## Acme example

Acme has **15 open customer invoices** totaling significant AR, with **$186K overdue**:

| Customer | Amount | Days overdue | Risk |
|----------|--------|-------------|------|
| MidWest Fulfillment | $48K | 92 days | Critical — likely needs escalation |
| Others | Various | Mixed | See Collections tab |

Healthy B2B DSO is often **30–45 days**, but use that only when you have sales data. For this dashboard, treat Avg AR Age above **45–60 days** as a collections warning. At 92 days, MidWest is approaching write-off territory.

## So what?

AR is not cash. A CFO cannot pay payroll with overdue invoices.

| Action | When | Impact |
|--------|------|--------|
| Send reminder | 1–30 days overdue | Low cost, often effective |
| Phone call | 30–60 days | Personal escalation |
| Payment plan | 60–90 days | Recover partial vs write-off |
| Legal/collections | 90+ days | Last resort |
| Write-off | No recovery path | Removes from AR, hits P&L |

Collecting MidWest's $48K would add **~1.1 days of runway** ($48K ÷ $1.34M/mo × 30 days). Small individually, but AR collection at scale is a primary cash management lever.

At asset managers like Vanguard, AR is less central (clients pay fees on schedule). But the **principle** — cash timing, working capital, collection discipline — applies to any business with receivables.

## On the dashboard

- **KPI Bar** → AR Overdue card ($186K, High Risk badge — just below the top nav)
- **Collections tab** → aging bar chart + invoice table with days overdue and last contact date
- **Conclusion cards** → agent prioritizes which accounts need urgent action

## Try it

1. Click **Collections** in the top nav
2. Find **MidWest Fulfillment** in the invoice table — note amount and days overdue
3. Look at the aging chart — which bucket has the most dollars?
4. Read the agent's RED conclusion about MidWest
5. Check **last contact date** — has anyone called them?

## If they ask…

> **"Why is AR overdue a cash problem if revenue is already booked?"**

"Revenue on the P&L doesn't pay vendors. Cash pays vendors. Every day a customer is late, Acme is effectively lending them money interest-free while still paying its own bills. At 9.5 months runway, you can't afford to be a bank for your customers."

> **"How would you handle MidWest at 92 days?"**

"Escalate immediately — phone call to their AP lead, not another email. If no response in 5 business days, propose a payment plan or partial payment. Document every contact in the notes field. At 120 days, I'd recommend a write-off reserve."
