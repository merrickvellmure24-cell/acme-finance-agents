'use client'

import { useState } from 'react'

const AUDIENCES = ['Finance', 'Executive', 'Technical'] as const

const QA = {
  Finance: [
    {
      q: 'How is this different from our existing reports?',
      a: 'Traditional reports are point-in-time and manually assembled. This platform runs continuously against live data, prioritizes findings by dollar impact, and turns critical issues into trackable action items with owners and deadlines. It\'s monitoring plus decision support, not just reporting.',
    },
    {
      q: 'Can we trust the AI numbers?',
      a: 'Every conclusion links to an audit trail showing exactly which data was scanned and the step-by-step reasoning. The AI recommends; humans approve, delegate, or dismiss. For finance, that human-in-the-loop design is non-negotiable.',
    },
    {
      q: 'What finance domains does it cover?',
      a: 'Cash position and burn, 9-month cash forecasting, departmental budget variance, accounts receivable collections with DSO tracking, accounts payable with fraud audit, and vendor contract risk. A seventh agent synthesizes everything into a CFO briefing.',
    },
    {
      q: 'How would this fit at a firm like Vanguard?',
      a: 'Vanguard\'s core business isn\'t AR/AP for a robotics startup — but the underlying skills are universal: cash management, risk prioritization, variance analysis, and turning data into actionable decisions. I built this to demonstrate FP&A thinking with modern AI tooling.',
    },
  ],
  Executive: [
    {
      q: 'What should I do Monday morning?',
      a: 'Open the CFO Briefing, read the 30-second Executive Pulse, then work the Action Queue top to bottom. Each RED item has a dollar impact and a recommended decision. That\'s your prioritized to-do list — not a 40-page report.',
    },
    {
      q: 'What\'s the single biggest risk right now?',
      a: 'At Acme Robotics: 9.5 months runway at burn 34–58% above guidance. The platform surfaces this immediately in the KPI bar and connects it to specific drivers — conference overages, overdue AR, duplicate AP invoices.',
    },
    {
      q: 'How much does this cost to run?',
      a: 'The AI agents use free-tier API providers (Groq, Cerebras, SambaNova) — pennies per run. The infrastructure is a Turso database and a Next.js app deployable on Vercel. The cost model scales with usage, not headcount.',
    },
  ],
  Technical: [
    {
      q: 'How does the AI architecture work?',
      a: 'Six specialist agents run in parallel against a Turso (libSQL) database — each with a focused prompt and domain-specific data query. Outputs use structured section markers (DATA_SCANNED, REASONING, CONCLUSIONS, REPORT) parsed by a custom utility. A seventh CFO agent synthesizes sequentially. RED conclusions auto-create action items.',
    },
    {
      q: 'Why different models per agent?',
      a: 'Model routing based on task type: Cerebras for fastest live metrics, Groq for pattern-matching (budget, AR), SambaNova/DeepSeek for deep reasoning (fraud audit, executive synthesis). It\'s the same principle as using the right tool for the job.',
    },
    {
      q: 'How do you prevent hallucinated financial data?',
      a: 'Agents don\'t generate numbers from memory — they query the database and include a Data Scanned section listing exact tables and rows. The UI renders conclusions from parsed structured output, not raw LLM text. Users can expand the audit trail on any finding.',
    },
    {
      q: 'What\'s the tech stack?',
      a: 'Next.js 16 (App Router, Turbopack), TypeScript, Turso/libSQL, Upstash Redis, AI SDK v6 with multi-provider routing, Recharts for visualization, shadcn/ui dark mode. Seven agent modules in src/lib/agents/, API routes for run-all orchestration.',
    },
  ],
}

export default function InterviewPage() {
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>('Finance')
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Interview Prep</h1>
        <p className="text-sm text-muted-foreground">
          Rehearse explaining the platform to finance professionals, executives, or technical interviewers.
        </p>
      </header>

      {/* 30-second pitch */}
      <section className="mb-8 p-5 rounded-lg border border-border bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-3">30-second pitch</h2>
        <blockquote className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
          &ldquo;I built an AI-powered Finance Command Center for a Series B robotics company. Seven specialist
          agents analyze live financial data — cash, budget, receivables, payables, contracts — and produce
          prioritized RED/YELLOW/GREEN findings with dollar impacts. A CFO briefing synthesizes everything
          into a Monday morning action queue. It&apos;s human-in-the-loop: AI recommends, humans decide.
          I built it with Next.js, Turso, and multi-provider AI routing to demonstrate FP&A thinking
          with modern tooling.&rdquo;
        </blockquote>
      </section>

      {/* 2-minute demo script */}
      <section className="mb-8 p-5 rounded-lg border border-border bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-3">2-minute demo script</h2>
        <ol className="text-sm text-muted-foreground space-y-3 list-decimal ml-5">
          <li>
            <strong className="text-foreground">KPI Bar (10 sec):</strong> &ldquo;Four vital signs — $12.68M cash,
            9.5 months runway, $186K overdue AR, $78K AP at risk. Runway is critical.&rdquo;
          </li>
          <li>
            <strong className="text-foreground">Run All (5 sec):</strong> &ldquo;Click Run All — six agents analyze
            in parallel, CFO briefing synthesizes.&rdquo;
          </li>
          <li>
            <strong className="text-foreground">CFO Briefing (30 sec):</strong> &ldquo;Executive Pulse gives the
            headline. Action Queue shows RED items ranked by impact — each with a dollar amount and
            recommended decision.&rdquo;
          </li>
          <li>
            <strong className="text-foreground">Drill down (30 sec):</strong> &ldquo;Click into Payables — the
            fraud audit caught duplicate Apex Logistics invoices for $14.5K. Expand the audit trail
            to show exactly what data was scanned.&rdquo;
          </li>
          <li>
            <strong className="text-foreground">Action item (30 sec):</strong> &ldquo;Open the action item,
            preview the consequence of approving, then Approve or Delegate. The human always decides.&rdquo;
          </li>
          <li>
            <strong className="text-foreground">Close (15 sec):</strong> &ldquo;This turns a 2-hour Monday
            spreadsheet review into a 10-minute prioritized decision session.&rdquo;
          </li>
        </ol>
      </section>

      {/* Audience Q&A */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Q&amp;A by audience</h2>

        <div className="flex gap-2 mb-4">
          {AUDIENCES.map(a => (
            <button
              key={a}
              onClick={() => { setAudience(a); setOpenIdx(0) }}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                audience === a
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {QA[audience].map((item, i) => (
            <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors flex justify-between items-center"
              >
                {item.q}
                <span className="text-muted-foreground text-xs">{openIdx === i ? '−' : '+'}</span>
              </button>
              {openIdx === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
