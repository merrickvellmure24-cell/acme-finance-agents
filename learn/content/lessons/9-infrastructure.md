## Concept

Every web app is built on a **stack** — a set of technologies that handle different layers of the work. Understanding your stack means you can explain *why* each piece exists, not just *that* it exists. This lesson breaks down every layer of the Finance Command Center.

---

## The full stack

```
Browser (you)
    │  opens localhost:3000
    ▼
Next.js (the framework)
    │  serves pages, handles routing
    │  runs API routes on the server
    ▼
API Routes (/api/*)
    │  query the database
    │  call AI providers
    ▼
Turso (database)          Upstash Redis (cache)
    │                           │
    └──── both return data ─────┘
    ▼
AI Providers (Groq / Cerebras / SambaNova)
    │  LLMs analyze the data
    ▼
Agent outputs saved to Turso → UI renders results
```

---

## Next.js — the framework

**What it is:** A React framework that lets you write both the frontend (what you see in the browser) and the backend (the server logic) in one project, using TypeScript.

**Why it's used here:** The app needs both:
- React components for the UI (charts, KPI cards, agent panels)
- Server-side API routes to query the database (you can't run a database client in a browser for security reasons)

Next.js's **App Router** handles this in one codebase. Files in `app/page.tsx` are frontend pages. Files in `app/api/*/route.ts` are backend HTTP endpoints.

**Version note:** This uses Next.js 16 with Turbopack (faster development builds). Some APIs differ from older versions — always check the docs.

---

## Turso — the database

**What it is:** A SQLite database hosted in the cloud, accessible via an HTTP API.

**Why SQLite?** SQLite is a file-based database — not a server you connect to, but a file you read/write. This makes it extremely simple to deploy and fast for small-to-medium datasets.

**Why Turso specifically?** Standard SQLite doesn't work well with serverless environments (like Vercel) because serverless functions don't have persistent file systems. Turso solves this by hosting the SQLite file and exposing it over HTTP. The client (`@libsql/client`) connects via a URL and auth token — no connection pooling needed.

For Acme's ~150 rows of financial data, this is more than sufficient.

**Tables you interact with:**

| Table | What it holds | How it's used |
|-------|--------------|---------------|
| `cash_balance` | Weekly cash snapshots | Charts, KPI bar, agent analysis |
| `budget` | Planned vs actual by dept/month | Budget agent, variance charts |
| `ar_aging` | Customer overdue invoices | Collections agent, AR KPI |
| `ap_aging` | Vendor invoices with aging | Payables agent, AP risk KPI |
| `vendors` | Vendor contracts and risk | Contracts agent, AP audit |
| `transactions` | Line-item spend | Transaction Explorer |
| `agent_outputs` | Latest agent run results | All agent tabs, CFO Briefing |
| `action_items` | CFO decision tracking | Action Items sidebar + panel |

**Important:** `src/lib/db.ts` creates the Turso client using environment variables from `.env.local`. Never edit this file — and never commit `.env.local` to git.

---

## Upstash Redis — the cache

**What it is:** A key-value store (like a fast, simple dictionary) hosted in the cloud. Redis stores data as `key → value` pairs and is much faster than a full database for simple reads.

**Why it's used here:** AI agent runs are expensive (~5–15 seconds each). Redis caches the output of each agent run so that if you reload the page, you get the last result instantly instead of re-running the agent.

**How it works:**
1. Agent runs → writes output to both Turso (persistent) and Redis (cache)
2. On page load → reads from Redis first (fast)
3. If Redis misses → falls back to Turso

**Important:** Redis is ephemeral — it can lose data. Turso is the source of truth. Redis just makes the UI faster.

---

## Vercel AI SDK — the AI interface

**What it is:** A TypeScript library that provides a unified interface to call multiple AI providers (OpenAI, Anthropic, Groq, Cerebras, etc.) with the same API.

**Why this matters:** Different AI providers have slightly different APIs. Without this SDK, calling Groq would look different from calling Cerebras. The SDK standardizes everything:

```typescript
// This works for any provider — Groq, Cerebras, SambaNova
const result = await generateText({
  model: AGENT_MODELS['cash-reporter'],  // configured in llm.ts
  prompt: `Analyze this cash data: ${JSON.stringify(rows)}`,
})
```

**`src/lib/llm.ts`** is the configuration file where each agent is mapped to its provider and model. This is where you'd switch models.

---

## The 7 AI agents

Each agent is a TypeScript function in `src/lib/agents/`. Here's what happens when you click **↻ Update**:

1. The browser calls `POST /api/agents/run-all`
2. The API route runs 6 specialist agents in **parallel** (all at the same time)
3. Each agent: reads specific Turso tables → calls its LLM → parses the output → saves to Turso
4. Once all 6 are done, the 7th agent (CFO Briefing) runs **sequentially** — it synthesizes the other 6's outputs
5. RED conclusions from all agents become new `action_items` rows
6. The browser polls/re-fetches each agent tab as they complete

**Why parallel?** Running 6 agents sequentially would take ~90 seconds. Running in parallel means the slowest agent determines the total time (usually ~30–45 seconds).

---

## TypeScript — the language

**What it is:** JavaScript with types. A "type" is a definition of what shape your data has.

**Why it matters in finance:** Without types, you can't tell the difference between:
```javascript
const amount = "48000"  // a string
const amount = 48000    // a number
```
If you add a string to a number in JavaScript, you get `"48000" + 500 = "48000500"` (concatenation, not addition). TypeScript catches this at compile time before it causes a financial calculation error.

The `SimDelta` type is a good example:
```typescript
interface SimDelta {
  cashDelta: number        // must be a number
  arOverdueDelta: number   // must be a number
  apRiskDelta: number      // must be a number
  monthlyBurnDelta: number // must be a number
  label: string            // must be a string
}
```
TypeScript ensures nothing accidentally passes a string where a number is expected.

---

## React & components — the UI

**What it is:** A JavaScript library for building UIs from reusable **components**. A component is a function that returns HTML (JSX).

**Key concept — props:** Components receive data as "props" (properties), like function arguments:
```typescript
function KPICard({ label, value, simBadge }) {
  return <div>{label}: {value} {simBadge && <span>⚗ {simBadge}</span>}</div>
}
```

**Key concept — state:** `useState` stores a value that, when changed, re-renders the component:
```typescript
const [platformMode, setPlatformMode] = useState<'live' | 'hypothetical'>('live')
// When setPlatformMode('hypothetical') is called, the whole UI re-renders
```

**Key concept — effects:** `useEffect` runs code when a component mounts or when a value changes:
```typescript
useEffect(() => {
  fetch('/api/cash-data').then(r => r.json()).then(setRows)
}, [])  // [] means: run once when the component first appears
```

---

## Tailwind CSS — the styling

**What it is:** A CSS framework where you write styles as class names directly in your HTML/JSX.

**Before Tailwind:**
```css
/* styles.css */
.card { background: #18181b; border: 1px solid #27272a; padding: 16px; }
```
```jsx
<div className="card">...</div>
```

**With Tailwind:**
```jsx
<div className="bg-zinc-900 border border-zinc-800 p-4">...</div>
```

The classes map directly to CSS properties. `p-4` = `padding: 1rem`. `text-xs` = `font-size: 0.75rem`. This project uses Tailwind v4 with a dark mode design system from shadcn/ui.

---

## Environment variables — secrets

**What they are:** Configuration values that shouldn't be in your code — API keys, database URLs, passwords.

All secrets live in `.env.local` at the project root. This file is in `.gitignore` so it's never committed to GitHub.

```bash
TURSO_DATABASE_URL=libsql://...
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=...
SAMBANOVA_API_KEY=...
UPSTASH_REDIS_REST_URL=...
```

**Why this matters:** If you accidentally commit an API key to a public GitHub repo, bots will find it within minutes and run up charges on your account.

---

## Try it

1. Open `src/lib/llm.ts` — read which model is assigned to which agent
2. Open `src/app/api/metrics/route.ts` — read how KPI data is computed from Turso
3. Open `src/lib/hypotheticals/scenarios.ts` — read `computeSimDelta` and understand each switch case
4. Run `npx tsc --noEmit` in the terminal — zero errors means TypeScript is happy
5. Run `npm test` — watch 8 unit tests pass for the SimDelta engine

---

## If they ask…

> **"Why not use a traditional SQL database like Postgres?"**

"For ~150 rows of financial data accessed by one user at a time, Postgres would be over-engineered. Turso's libSQL is SQLite in the cloud — zero connection pooling, deploys to Vercel's edge in milliseconds. The constraint of the project shaped the tool choice."

> **"What's the difference between a React component and an API route?"**

"A React component runs in the browser and renders HTML. An API route runs on the server and returns JSON. In Next.js, both live in the same project. The browser can't connect to a database directly (security risk), so the API route acts as a secure intermediary."

> **"What would you change if this needed to scale to 100 users?"**

"Replace Turso with Postgres with connection pooling (Neon or Supabase). Add authentication with Clerk or Auth0. Add per-user action item isolation. The agent architecture would stay the same — just add a user_id column to agent_outputs and action_items. Redis caching would become more important to avoid hammering the database."
