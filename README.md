# Acme Robotics — Finance Command Center

A CFO decision-making platform prototype built with Next.js, multi-agent AI, and a live financial database. Designed around **the first hour of a CFO's morning** — surfacing cash position, burn risk, overdue receivables, and payment anomalies in one interface.

> Built as a learning project and portfolio piece. The underlying financial data is realistic (Series B startup, $12.68M cash, 47 employees) but anonymized/simulated.

---

## What it does

The app runs **7 specialized AI agents** in parallel across different financial domains, then synthesizes their findings into a CFO briefing. The CFO can approve, delegate, or dismiss action items — either for real (Live mode) or as a simulation (Scenario mode) to preview financial impact before committing.

**Key capabilities:**
- Live cash position, runway, burn vs. guidance, AR overdue, AP at risk
- 7 AI agents scanning different financial tables (cash, budget, AR, AP, contracts, forecasts)
- Simulation mode: approve action items and immediately see the projected financial impact on KPIs and charts — without touching the database
- Financial Snapshot Card with 9-month cash projection and automated verdict headlines
- Action item workflow with AI-generated emails and delegation tracking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                    │
│                                                             │
│  TopNav → KPIBar → CFOBriefing ← FinancialSnapshotCard     │
│                       ↕                                     │
│  AgentPanel ← AgentChat ← AgentStatusBar                   │
│                       ↕                                     │
│  ActionItemsSidebar ← SimDelta engine (client-side)        │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch()
┌──────────────────────────▼──────────────────────────────────┐
│                    Next.js API Routes                        │
│                                                             │
│  /api/agents/run-all  →  7 agents in parallel              │
│  /api/agents/<name>   →  GET (latest) / POST (run)         │
│  /api/metrics         →  KPI aggregates                    │
│  /api/action-items    →  CRUD for CFO decisions            │
│  /api/chat            →  Streaming chat per agent          │
│  /api/*-data          →  Raw table reads (cash, AR, AP…)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼────────┐                ┌─────────▼───────┐
│  Turso (libSQL) │                │  Upstash Redis  │
│  8 tables       │                │  Response cache │
│  ~150 rows      │                └─────────────────┘
└─────────────────┘
```

---

## Agent Architecture

Each agent is an isolated async function that reads specific DB tables, calls an LLM, and writes structured output back to the database. Different agents use different providers based on their task requirements:

| Agent | File | Provider | Model | Why this provider |
|-------|------|----------|-------|-------------------|
| `cfo-briefing` | `cfo-briefing.ts` | SambaNova | DeepSeek-V3.2 | Best free model for multi-section synthesis |
| `cash-reporter` | `cash-reporter.ts` | Cerebras | gpt-oss-120b | Fastest inference — live metrics need speed |
| `cash-forecast` | `cash-forecast.ts` | Groq | llama-3.3-70b | Low-latency, good at numerical reasoning |
| `budget-analyst` | `budget-analyst.ts` | Groq | llama-3.3-70b | Fast pattern matching across 48 rows |
| `ar-collections` | `ar-collections.ts` | Groq | llama-3.3-70b | Fast structured analysis |
| `ap-vendor` | `ap-vendor.ts` | SambaNova | DeepSeek-V3.2 | Largest free model — fraud detection needs depth |
| `contract-watchdog` | `contract-watchdog.ts` | Groq | llama-3.3-70b | Structured lookup, simple reasoning |

**Agent output format** — every agent writes output using section markers:
```
##DATA_SCANNED## → what tables/rows were read
##REASONING##    → chain-of-thought analysis steps
##CONCLUSIONS##  → RED / YELLOW / GREEN flagged findings
##REPORT##       → full markdown report for the CFO
```

The `parseAgentOutput` utility extracts these sections for display in the UI. RED conclusions automatically become action items.

---

## Simulation Mode — How it works

This is the technically interesting piece. When the CFO switches to **Scenario (⚗ Hypo) mode**:

1. Action item approvals don't write to the database
2. Instead, each approved item is passed through `computeSimDelta()` — a **pure function** that maps the item's `source_agent` and `amount` to a financial impact:
   - AR collections item → `+cashDelta`, `-arOverdueDelta`
   - AP fraud item → `+cashDelta`, `-apRiskDelta`
   - Budget overage item → `-monthlyBurnDelta`
3. All approved item deltas are **aggregated client-side** with `aggregateSimDeltas()`
4. The aggregate is passed as a prop to `KPIBar` and `FinancialSnapshotCard` which render adjusted values with a yellow `⚗` badge

This design is intentional — no database writes, no server round trips. The simulation is entirely a UI concern, making it instant and reversible.

```typescript
// src/lib/hypotheticals/scenarios.ts
export function computeSimDelta(item): SimDelta {
  switch (item.source_agent) {
    case 'ar-collections': return { cashDelta: amt, arOverdueDelta: -amt, ... }
    case 'ap-vendor':      return { cashDelta: amt, apRiskDelta: -amt, ... }
    case 'budget-analyst': return { monthlyBurnDelta: -(amt / 12), ... }
  }
}
```

---

## Database Tables (Turso / libSQL)

| Table | Rows | Purpose |
|-------|------|---------|
| `cash_balance` | 8 | Weekly cash snapshots — operating, reserve, burn |
| `budget` | 48 | Department × month planned vs actual (wide→tall pivot in ingest) |
| `ap_aging` | 20 | Vendor invoices by aging bucket, flags duplicates |
| `ar_aging` | 15 | Customer invoices with days outstanding, last contact |
| `vendors` | 26 | Vendor contracts with spend, category, risk |
| `transactions` | 69 | Line-item transactions for audit trail |
| `agent_outputs` | 7 | Latest agent run — reasoning chain, conclusions, full report |
| `action_items` | varies | CFO decisions created from RED conclusions on each run |

---

## Data Flow — Charts are self-fetching

Chart components don't receive data as props — they fetch independently from API routes. This means they always show live data regardless of whether an agent has run recently.

```
AgentPanel renders <TreasuryCharts />
     ↓
TreasuryCharts calls useEffect → fetch('/api/cash-data')
     ↓
/api/cash-data queries Turso cash_balance table
     ↓
Returns 8-week history → chart renders
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (localhost:3000)
npm run dev

# Reload financial data from xlsx files into Turso
npm run ingest

# Type check
npx tsc --noEmit
```

**Environment variables** (`.env.local`):
```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
GROQ_API_KEY=
CEREBRAS_API_KEY=
SAMBANOVA_API_KEY=
```

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Server components + API routes in one repo |
| Language | TypeScript | Type safety for financial calculations |
| Styling | Tailwind v4 + shadcn/ui | Dark mode, consistent design system |
| Charts | Recharts | Composable React charting |
| Database | Turso (libSQL) | Edge-friendly SQLite — no connection pooling |
| Cache | Upstash Redis | Serverless-compatible, agent output caching |
| AI SDK | Vercel AI SDK v6 | Unified interface across Groq/Cerebras/SambaNova |

---

## Key Technical Decisions

**Why multiple AI providers instead of one?**
Different tasks have different requirements. Cerebras is the fastest inference provider available (sub-second for the cash reporter which runs on every page load context). Groq's llama-3.3-70b handles 5 of the 7 agents well at high speed. SambaNova's DeepSeek-V3.2 is the largest free model available — used for fraud detection (AP/vendor) and synthesis (CFO briefing) where reasoning depth matters more than speed.

**Why Turso instead of Postgres?**
Turso uses libSQL (a SQLite fork) and is edge-deployable with no connection pooling required. For a read-heavy dashboard with ~150 rows of financial data, SQLite is more than sufficient and eliminates infrastructure complexity.

**Why client-side simulation instead of server-side?**
The simulation produces no side effects — it's purely a "what if I did this?" preview. Running it client-side means zero latency, no API calls, and the CFO can reset the simulation instantly. The alternative (server-side simulation with a temporary write) would be more complex with no benefit for this use case.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main layout — state management hub
│   ├── layout.tsx                  # Dark mode root
│   └── api/
│       ├── agents/run-all/         # Parallel agent execution
│       ├── agents/[name]/          # Per-agent GET/POST
│       ├── metrics/                # KPI aggregates
│       ├── action-items/           # CFO decision CRUD
│       ├── chat/                   # Streaming agent chat
│       └── *-data/                 # Raw table reads
├── components/
│   ├── CFOBriefing.tsx             # Home dashboard
│   ├── AgentPanel.tsx              # Per-agent detail view
│   ├── TopNav.tsx                  # Navigation + mode toggle
│   ├── KPIBar.tsx                  # 4 vital metrics
│   ├── ActionItemsSidebar.tsx      # Right sidebar decisions
│   ├── ActionItemDetail.tsx        # Drawer with AI brief + chat
│   ├── HypotheticalPanel.tsx       # Scenario controls (floating)
│   └── charts/
│       ├── FinancialSnapshotCard.tsx   # Main briefing chart
│       ├── CashPositionCharts.tsx      # 8-week treasury view
│       ├── TreasuryCharts.tsx          # Full treasury tab
│       └── ...                         # Budget, AR, AP charts
├── lib/
│   ├── db.ts                       # Turso client
│   ├── llm.ts                      # Provider config
│   ├── hypotheticals/scenarios.ts  # SimDelta engine
│   └── hooks/useCashData.ts        # Shared data hook
└── learn/                          # Companion learning app
```

---

*Built with [Next.js](https://nextjs.org), [Turso](https://turso.tech), [Groq](https://groq.com), [Cerebras](https://cerebras.ai), [SambaNova](https://sambanova.ai), and [Vercel AI SDK](https://sdk.vercel.ai)*
