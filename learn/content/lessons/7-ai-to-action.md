## Concept

This lesson connects the **AI architecture** to what you see on screen. When you click **↻ Update** (top right), here's what actually happens:

### The flow

1. **6 specialist agents run in parallel** — each reads specific database tables, sends data to an LLM, and returns structured output
2. **CFO Briefing agent runs sequentially** — synthesizes all 6 outputs into one executive summary
3. **Action items are created** — every RED conclusion across all 7 agents becomes a tracked task
4. **Results are saved** — stored in Turso database so they persist between sessions

### The 7 agents

| Agent | Provider | Reads | Job |
|-------|----------|-------|-----|
| Treasury | Cerebras | cash_balance | Live cash & burn metrics |
| Cash Forecast | Groq | cash_balance | 9-month scenario projection |
| Budget | Groq | budget | Department variance analysis |
| Collections | Groq | ar_aging | Overdue invoice prioritization |
| Payables | SambaNova | ap_aging, vendors | Fraud audit + payment review |
| Contracts | Groq | vendors | Renewal & contract risk |
| CFO Briefing | SambaNova | All 6 agent outputs | Executive synthesis |

### Output structure

Every agent returns four sections (parsed by `parseAgentOutput`):

| Section | What it is | Why it matters |
|---------|-----------|----------------|
| **Data Scanned** | Which tables/rows were read | Proves the agent used real data |
| **Reasoning** | Step-by-step logic | Lets you validate the thinking |
| **Conclusions** | RED / YELLOW / GREEN findings | The actionable output |
| **Report** | Full markdown narrative | Detailed write-up for audit |

Payables also has a **Fraud Audit** section between Data Scanned and Reasoning.

### Conclusion severity

- **RED** — act now. Auto-creates an action item with dollar amount, owner, due date.
- **YELLOW** — monitor. Appears in CFO Briefing Monitor section.
- **GREEN** — healthy. Confirms what's on track.

### Action items

RED conclusions become Kanban cards: **Open → In Progress → Resolved → Dismissed**.

Click a card to open the detail drawer:
- **Approve** — commit to the action (with consequence preview)
- **Delegate** — assign to an owner
- **Dismiss** — reject with documented reason

**Consequence preview** calls an AI endpoint to estimate cash/runway impact before you commit.

## So what?

This architecture is designed for **trust and auditability** in finance:

1. **Specialists, not one generalist** — each agent owns one domain with a focused prompt
2. **Structured output** — not free-form chat; parseable sections the UI can render
3. **Human in the loop** — agents recommend, humans decide (Approve/Delegate/Dismiss)
4. **Audit trail** — every conclusion traceable to data sources and reasoning
5. **Different models for different jobs** — speed (Cerebras) for live metrics, depth (SambaNova) for fraud and synthesis

When you're **vibecoding** (building with AI assistance), you typically touch:
- Agent prompts in `src/lib/agents/*.ts`
- UI components in `src/components/`
- API routes in `src/app/api/`
- **Not** the database client (`db.ts`) or API keys (`.env.local`)

The agents run automatically when you click **↻ Update** — you don't call LLMs manually.

## On the dashboard

- **↻ Update** → top right — runs all 7 agents, shows live count `◌ 3/7`
- **CFO Briefing** → Financial Snapshot Card + Executive Pulse (computed verdict headlines)
- **Any agent tab** → conclusion cards + collapsed audit trail + data provenance labels
- **Action Items sidebar** → right side — open/delegated/resolved items
- **Data ▾ dropdown** → top nav → Transactions, Contracts, All Actions
- **Agent Status Bar** → shows provider pill, model, and which database tables were read

## Try it

1. Click **↻ Update** and watch the count increment (e.g., `◌ 3/7`)
2. On CFO Briefing, read the **verdict headline** on the Financial Snapshot Card — it's computed, not static
3. Click the top RED item in the Action Items sidebar
4. In the detail drawer, read the AI consequence preview, then click **Confirm**
5. Go to any agent tab, look at the Agent Status Bar — you'll see the database tables it read (e.g., `ar_aging · 15 invoices`)
6. Expand **Audit Trail → Reasoning Chain** — follow the logic for one conclusion

## If they ask…

> **"How is this different from ChatGPT for finance?"**

"ChatGPT doesn't read your database, doesn't run on a schedule, and doesn't produce structured audit trails. These agents query live financial data, output standardized RED/YELLOW/GREEN conclusions with dollar impacts, and auto-create trackable action items. It's the difference between asking an analyst a question and having seven analysts deliver a Monday morning briefing."

> **"What if the AI is wrong?"**

"That's why every conclusion has an audit trail — Data Scanned shows exactly what was read, Reasoning shows the logic, and you Approve or Dismiss each action item. The human is always the decision-maker. The AI prioritizes and recommends; it doesn't execute payments or fire people."

> **"Why different AI providers per agent?"**

"Speed vs depth tradeoff. Cash Position needs the fastest response for live metrics — Cerebras. Fraud detection and executive synthesis need the deepest reasoning — SambaNova. Budget and collections are pattern-matching tasks where Groq's versatile model works well. It's model routing, not random choice."
