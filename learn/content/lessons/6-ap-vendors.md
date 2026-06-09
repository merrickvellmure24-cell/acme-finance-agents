## Concept

**Accounts Payable (AP)** is money you owe vendors. Paying invoices reduces cash. Paying **wrong** invoices — duplicates, unauthorized charges, fraud — wastes cash you can't recover.

**Vendor management** tracks the 26 vendor relationships: contract terms, monthly spend, renewal dates, and risk flags.

The Payables agent runs a unique **fraud audit** — an AI review for duplicate charges, suspicious patterns, and payment holds.

## Acme example

**AP at risk: $78K** — invoices flagged for review before payment.

Key issues in demo data:

| Issue | Amount | Type |
|-------|--------|------|
| Apex Logistics duplicate invoices | $14.5K | Duplicate — pay once, not twice |
| Payment holds | Various | Paused pending review |
| M2M vendors | Ongoing | No price protection, renewal risk |

**26 vendors** tracked with contract type (annual, month-to-month, none on file), monthly spend, and department owner.

## So what?

AP management is cash **protection**:

| Risk | What happens | CFO response |
|------|-------------|--------------|
| Duplicate payment | Cash gone, hard to recover | Fraud audit before batch pay |
| Unauthorized invoice | Vendor fraud or internal error | Hold + investigate |
| M2M high-spend vendor | Price increases without notice | Negotiate annual contract |
| Overdue AP (legitimate) | Vendor relationship damage | Pay on time to maintain supply chain |

The Apex Logistics duplicate ($14.5K) is exactly the kind of error that slips through when AP teams process volume manually. At $1.34M/month burn, $14.5K is small — but duplicates are **systemic** (if one vendor has duplicates, others might too).

## On the dashboard

- **KPI Bar** → AP at Risk card ($78K)
- **Payables tab** → invoice table sorted by overdue days, fraud audit section, payment holds
- **Contracts tab** → vendor risk table sorted by exposure
- **Transactions tab** → filter by vendor name (e.g. "Apex Logistics")

## Try it

1. Go to **Payables** in the sidebar
2. Find the **fraud audit** section — read the Apex Logistics duplicate finding
3. Check the invoice table for payment hold flags
4. Switch to **Contracts** — find vendors with month-to-month or no contract
5. Go to **Transactions** — filter by "Apex Logistics" and count duplicate-looking entries

## If they ask…

> **"How does AI fraud detection work here?"**

"The Payables agent reads every open invoice and transaction, then runs pattern matching for duplicates — same vendor, similar amounts, close dates. It flags findings in a dedicated fraud audit section before any payment is recommended. A human still approves — the AI catches what volume processing misses."

> **"Why track contracts separately from AP?"**

"AP is tactical — pay this invoice today. Contracts are strategic — are we exposed to price increases, do we have leverage to renegotiate, when does this renewal hit? A month-to-month SaaS vendor at $25K/month with no contract is a $300K/year risk with zero price protection."
