# Acme Robotics — Finance Command Center

## Project
- **Location:** `~/Desktop/acme-finance-agents`
- **Stack:** Next.js 16.2.7 (App Router, Turbopack), TypeScript, Tailwind v4, shadcn/ui (dark mode), Recharts
- **Database:** Turso (libSQL) — `fleet-demogoblin-merrickvellmure24-cell.aws-us-east-1.turso.io`
- **Cache:** Upstash Redis
- **AI SDK:** `ai` v6, `@ai-sdk/groq`, `@ai-sdk/openai-compatible`
- **Purpose:** Real CFO decision-making platform for Acme Robotics (Series B, $12.68M cash, 47 employees)

## Commands
```bash
npm run dev      # start on localhost:3000
npm run ingest   # reload xlsx data into Turso (run after schema changes)
npx tsc --noEmit # type check
```

## DO NOT TOUCH
- `src/lib/db.ts` — Turso client
- `src/lib/llm.ts` — provider config (edit models here if needed)
- `scripts/ingest.ts` — data ingest script
- `.env.local` — all API keys

## Database Tables (Turso)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `cash_balance` | week_ending, total_cash, operating, reserve, weekly_burn | 8 rows |
| `budget` | department, month, planned, actual | 8 depts × 6 months (wide→tall) |
| `ap_aging` | vendor, invoice_number, amount, days_overdue, status, aging_bucket | 20 rows |
| `ar_aging` | customer, invoice_number, amount, days_outstanding, status, aging_bucket, last_contact | 15 rows |
| `vendors` | name, category, contract_type, department_owner, monthly_spend, notes | 26 rows |
| `transactions` | date, vendor, amount, category, department, status, description | 69 rows |
| `agent_outputs` | run_at, agent, data_scanned, reasoning_chain, full_report, health, flags, needs_escalation, raw_json | structured agent results |
| `action_items` | created_at, source_agent, description, amount, owner, due_date, status, notes | auto-created from RED conclusions on every run-all |
| `agent_briefings` | legacy — superseded by agent_outputs | keep, don't delete |

## Agent Architecture
All agents in `src/lib/agents/`. Output format uses section markers:
`##DATA_SCANNED## ##REASONING## ##CONCLUSIONS## ##REPORT##`
AP/Vendor agent also has `##FRAUD_AUDIT##` between DATA_SCANNED and REASONING.

| Agent | File | Provider | Model | Why |
|-------|------|----------|-------|-----|
| cash-reporter | cash-reporter.ts | Cerebras | gpt-oss-120b | Fastest — live metrics |
| cash-forecast | cash-forecast.ts | Groq | llama-3.3-70b-versatile | DeepSeek has no balance |
| budget-analyst | budget-analyst.ts | Groq | llama-3.3-70b-versatile | Fast pattern matching |
| ar-collections | ar-collections.ts | Groq | llama-3.3-70b-versatile | Fast |
| ap-vendor | ap-vendor.ts | SambaNova | DeepSeek-V3.2 | Largest free model for fraud detection |
| contract-watchdog | contract-watchdog.ts | Groq | llama-3.3-70b-versatile | Structured lookup |
| cfo-briefing | cfo-briefing.ts | SambaNova | DeepSeek-V3.2 | Best free synthesis model, runs sequentially |

**IMPORTANT:** DeepSeek API key has no balance — do not route agents to `deepseek.com`.
**IMPORTANT:** OpenRouter free tier is rate-limited and flaky — avoid for critical agents.
**IMPORTANT:** `@ai-sdk/openai-compatible` (not `@ai-sdk/openai`) is required for Cerebras/SambaNova/OpenRouter.

## Key Files
```
src/
  app/
    page.tsx                      # Main layout — SidebarProvider + SidebarInset. No cashData state.
    layout.tsx                    # dark class on <html>, TooltipProvider
    api/
      agents/run-all/route.ts     # POST — parallel agents, then CFO briefing, then action items from ALL RED conclusions
      agents/<name>/route.ts      # GET (latest output) + POST (run single agent)
      chat/route.ts               # Streaming chat, ?agent= param
      metrics/route.ts            # GET — KPI data
      action-items/route.ts       # GET/POST/PATCH
      transactions/route.ts       # GET with filters
      cash-data/route.ts          # GET — raw cash_balance rows
      budget-data/route.ts        # GET — raw budget rows
      ar-data/route.ts            # GET — raw ar_aging rows
      ap-data/route.ts            # GET — raw ap_aging rows
      vendor-data/route.ts        # GET — raw vendors rows
  components/
    AppSidebar.tsx                # Left sidebar navigation
    KPIBar.tsx                    # 4 KPI cards — guards against undefined on refetch
    AgentPanel.tsx                # Agent tab: charts always shown, ConclusionCards, collapsed AuditTrail
    CFOBriefing.tsx               # Home: idle→running→complete. Complete = Executive Pulse + Action Queue + Monitor + Full Analysis
    ActionItemDetail.tsx          # Slide-in Sheet drawer for action item decisions (Approve/Delegate/Dismiss)
    AgentStatusBar.tsx            # Provider pill + status dot + re-run button
    DataScanned.tsx               # Collapsible data sources (collapsed by default)
    ReasoningChain.tsx            # Collapsed by default, scrolls within container only (no page scroll)
    ConclusionCards.tsx           # RED/YELLOW/GREEN cards with extracted title+body. Strips ##MARKERS## and [brackets].
    AgentReport.tsx               # Collapsible markdown report with copy/download
    AgentChat.tsx                 # Per-agent scoped chat (manual streaming fetch)
    TransactionExplorer.tsx       # Filterable table with CSV export
    ActionItemsPanel.tsx          # Full action items table with inline editing
    AlertBanner.tsx               # Red alert bar for critical issues
    charts/
      CashPositionCharts.tsx      # Fetches /api/cash-data — 8-week area + burn bar + metric cards
      ForecastCharts.tsx          # Fetches /api/cash-data — 3-scenario 9-month line chart
      BudgetCharts.tsx            # Fetches /api/budget-data — grouped bar + variance table
      CollectionsCharts.tsx       # Fetches /api/ar-data — aging bar + invoice table
      PayablesCharts.tsx          # Fetches /api/ap-data — invoice table sorted by overdue
      ContractsTable.tsx          # Fetches /api/vendor-data — vendor risk-sorted table
  lib/
    db.ts                         # Turso client (DO NOT TOUCH)
    llm.ts                        # AGENT_MODELS config
    redis.ts                      # Upstash client
    db/queries.ts                 # All DB query functions + clearAutoActionItems()
    agents/                       # 7 agent files
    utils/parseAgentOutput.ts     # Parses ##SECTION## markers. Handles bold **RED:** variants. Strips ##REPORT artifacts.
  components/ui/                  # shadcn components — textarea.tsx added
scripts/
  ingest.ts                       # Reads xlsx from /data, loads Turso
data/
  *.xlsx                          # Source spreadsheets
```

## Data Flow — Charts
Chart components are self-fetching and independent of agent run state. They always show live DB data.
- `AgentPanel` renders `<AgentCharts agentKey={...}>` above ConclusionCards for every agent tab.
- No `cashData` prop on AgentPanel — removed. Charts fetch their own data.

## Data Flow — Action Items
- `run-all/route.ts` calls `clearAutoActionItems()` then creates items from RED conclusions across all 7 agents.
- `source_agent = 'manual'` is protected from deletion; all others are cleared on re-run.
- CFOBriefing reads action items from the `actionItems` prop (loaded by page.tsx from /api/action-items).

## parseAgentOutput Bug Fixes (completed)
1. Section slice now uses `markers[i+1].start` (exact marker start) instead of `lastIndexOf('##')` — was slicing partial marker text into conclusions.
2. Conclusion regex now matches `**RED:**` / `**YELLOW:**` / `**GREEN:**` (DeepSeek/SambaNova bold output).
3. Post-parse cleanup strips trailing `##MARKER` text and leading `[placeholder]` brackets from conclusion text.

## Provider Setup
```typescript
// src/lib/llm.ts — AGENT_MODELS is the source of truth
import { createGroq } from "@ai-sdk/groq"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
// cerebras, sambanova, openrouter all use createOpenAICompatible
```

## Known Issues / Gotchas
- `maxOutputTokens` not `maxTokens` — AI SDK v6 renamed this
- `useChat` from `ai/react` does NOT exist in this version — use manual fetch+streaming
- shadcn `Select.onValueChange` returns `string | null` — always guard with `v && ...`
- Recharts tooltip `formatter` receives `ValueType | undefined` — cast with `Number(v)`
- Recharts `labelFormatter` payload arg is `readonly` — type as `readonly { payload?: {...} }[]`
- shadcn init creates circular `--font-sans: var(--font-sans)` — fixed to literal Geist names in globals.css
- Budget data is wide format in xlsx (months as columns) — ingest.ts pivots to tall format

## Company Context (for agent prompts)
- Series B, $18M raised March 2025 (Bessemer)
- 47 employees, SLO-based
- Cash: $12.68M total ($11.18M operating + $1.5M reserve)
- Monthly burn guidance: $850K–$1.0M ($196K–$231K/week)
- Current burn: ~$310K/week → ~$1.34M/month (34-58% above guidance)
- Runway: ~9.5 months at current burn
- Key issues: MODEX ($45K) + ProMat ($32K) conference overage, Apex Logistics duplicate invoices ($14.5K), MidWest Fulfillment $48K AR 92 days overdue

## UI Design System
- **Dark mode enforced** — `dark` class on `<html>` in layout.tsx
- **Base:** shadcn/ui new-york style, zinc palette
- **Charts:** Recharts (AreaChart/BarChart/LineChart — see CashTimeline.tsx for pattern)
- Health colors: RED=destructive, YELLOW=yellow-400, GREEN=green-500
- Provider pills: Cerebras=purple, Groq=orange, SambaNova=emerald
- Sidebar navigation — `SidebarProvider` wraps entire page
- All chart components follow same pattern: useEffect fetch → loading skeleton → render
- AuditTrail section (DataScanned + ReasoningChain + AgentReport) is collapsed by default on every agent page
