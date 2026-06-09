'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Metrics { totalCash: number; monthlyBurn: number; runway: number; arOverdue: number }

function fmt(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

const AGENTS = [
  {
    icon: '🏦', name: 'CFO Briefing', tag: 'Start here',
    desc: 'Your first-hour morning briefing — synthesizes all specialist agents into executive pulse, charts, and priority issues.',
  },
  {
    icon: '🏛️', name: 'Treasury', tag: 'Cash & liquidity',
    desc: 'Operating vs reserve cash, weekly burn trend, runway, and inflow/outflow waterfall — your liquidity command center.',
  },
  {
    icon: '📈', name: 'Cash Forecast', tag: '9-month outlook',
    desc: 'Projects the cash balance 9 months forward across three scenarios: current trajectory, spending discipline, and revenue growth. Shows exactly when cash becomes critical.',
  },
  {
    icon: '📊', name: 'Budget', tag: 'Spend vs plan',
    desc: 'Compares what each of the 8 departments actually spent against their approved budgets, month by month. Identifies overspend, underspend, and projects year-end totals.',
  },
  {
    icon: '📥', name: 'Collections', tag: 'Money owed to us',
    desc: 'Tracks every open customer invoice — who owes money, how many days overdue, and which accounts need an urgent collection call. Calculates DSO (days to collect).',
  },
  {
    icon: '📤', name: 'Payables & Vendors', tag: 'Money we owe',
    desc: 'Reviews all open vendor invoices for duplicate charges, holds, and overdue payments. Runs an AI fraud audit before recommending which invoices are safe to pay.',
  },
  {
    icon: '📋', name: 'Contracts', tag: 'Vendor risk',
    desc: 'Scans all 26 vendor contracts for upcoming renewals, missing contract coverage, and high-spend unprotected relationships. Flags which vendors need renegotiation.',
  },
]

const DATA_SOURCES = [
  { name: 'Cash Balance', rows: '8 weeks', icon: '💰', desc: 'Weekly snapshots of total cash, operating account, reserve account, and weekly burn — going back 8 weeks.' },
  { name: 'Budget', rows: '48 entries', icon: '📊', desc: '8 departments × 6 months of planned vs. actual spend, used to calculate variances and project year-end totals.' },
  { name: 'Accounts Receivable', rows: '15 invoices', icon: '📥', desc: 'Every open customer invoice with exact overdue day count, aging bucket, and last contact date recorded.' },
  { name: 'Accounts Payable', rows: '20 invoices', icon: '📤', desc: 'Every open vendor invoice with overdue days, payment hold flags, and current processing status.' },
  { name: 'Vendors', rows: '26 vendors', icon: '🤝', desc: 'Full vendor master list: contract type, monthly spend, department owner, renewal notes, and risk flags.' },
  { name: 'Transactions', rows: '69 entries', icon: '🔍', desc: 'Every individual financial transaction — searchable by vendor, department, category, date, or amount.' },
]

const TERMS = [
  { term: 'Burn Rate', def: 'How much cash the company spends each month. The approved target is $850K–$1M/mo. Anything above that is a warning sign. Current actual burn is ~$1.34M/mo — 34–58% above target.' },
  { term: 'Runway', def: 'How many months until the company runs out of money at the current burn rate. Formula: Total Cash ÷ Monthly Burn. Target is 18+ months. Currently ~9.5 months — a concern.' },
  { term: 'AR (Accounts Receivable)', def: 'Money that customers owe Acme Robotics for services already delivered. These are outstanding invoices. "Overdue AR" means customers are late paying — this directly tightens cash flow.' },
  { term: 'AP (Accounts Payable)', def: 'Money that Acme Robotics owes to vendors. "AP at risk" means invoices that may be duplicates, unauthorized, or disputed — money that shouldn\'t be paid without review.' },
  { term: 'DSO (Days Sales Outstanding)', def: 'The average number of days it takes to collect payment after an invoice is sent. Lower is better. Healthy B2B range: 30–45 days. Above 60 days is a collections problem.' },
  { term: 'Budget Variance', def: 'Difference between planned budget and actual spending. "Over budget" means a department spent more than approved. Shown as both a dollar amount and a percentage.' },
]

const NAV_SECTIONS = [
  { icon: '🏦', label: 'Morning Briefing', desc: 'The first-hour executive view — charts, Executive Pulse, and domain health at a glance. Action items live in the right sidebar.' },
  { icon: '🏛️', label: 'Treasury', desc: 'Operating vs reserve liquidity, 8-week cash chart, burn vs guidance, and AR/AP waterfall.' },
  { icon: '📈', label: 'Cash Forecast', desc: '9-month forward projection across 3 scenarios. Answers: "When does cash become a problem if nothing changes?"' },
  { icon: '📊', label: 'Budget', desc: 'Grouped bar chart of planned vs. actual by department, plus a variance table showing which departments are over or under budget.' },
  { icon: '📥', label: 'Collections', desc: 'AR aging chart by bucket (current / 30 / 60 / 90 days), overdue invoice table, and Send Reminder action buttons.' },
  { icon: '📤', label: 'Payables', desc: 'AP invoice table sorted by overdue days. Includes AI fraud audit findings and Schedule Pay / Flag Dispute buttons.' },
  { icon: '📋', label: 'Contracts', desc: 'Vendor contract risk table sorted by exposure. Under Data in the icon rail.' },
  { icon: '🔍', label: 'Transactions', desc: 'Full searchable transaction log. Filter by vendor, department, category, or date range. Export to CSV.' },
  { icon: '✅', label: 'Action Items', desc: 'Persistent task sidebar on the dashboard. Approve opens AI brief + resolution email draft.' },
]

export default function WelcomePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    fetch('/api/metrics')
      .then(r => r.json())
      .then(d => { if (d?.totalCash) setMetrics(d) })
      .catch(() => {})
  }, [])

  const burnPct = metrics
    ? Math.round((metrics.monthlyBurn - 1_000_000) / 1_000_000 * 100)
    : 34

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Acme Robotics</span>
            <span className="text-border/60">·</span>
            <span className="text-sm font-medium">Finance Command Center</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition">
            Enter Dashboard →
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pb-24">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border bg-muted/30 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live financial data · 7 AI agents · Real-time analysis
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-4">Finance Command Center</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A prototype for the first hour of a CFO&apos;s morning at Acme Robotics. Seven AI agents monitor
            treasury, budget, collections, payables, and contracts — surfacing issues and decisions
            before they become crises.
          </p>

          {/* Live stat strip */}
          <div className="inline-flex rounded-xl border border-border overflow-hidden mb-10 text-left">
            <div className="px-6 py-4 border-r border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Cash on Hand</p>
              <p className="text-2xl font-semibold tabular-nums">{metrics ? fmt(metrics.totalCash) : '$12.68M'}</p>
            </div>
            <div className="px-6 py-4 border-r border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Runway</p>
              <p className="text-2xl font-semibold tabular-nums text-yellow-400">{metrics ? `~${metrics.runway}mo` : '~9.5mo'}</p>
            </div>
            <div className="px-6 py-4 border-r border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Burn</p>
              <p className="text-2xl font-semibold tabular-nums text-red-400">{metrics ? fmt(metrics.monthlyBurn) : '~$1.34M'}</p>
            </div>
            <div className="px-6 py-4 border-r border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">AR Overdue</p>
              <p className="text-2xl font-semibold tabular-nums text-orange-400">{metrics ? fmt(metrics.arOverdue) : '$184K'}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Employees</p>
              <p className="text-2xl font-semibold tabular-nums">47</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition">
              Enter Dashboard →
            </Link>
            <a href="#how-it-works" className="px-6 py-3 border border-border text-muted-foreground rounded-lg hover:text-foreground hover:border-foreground/40 transition text-sm">
              See how it works ↓
            </a>
          </div>
        </section>

        {/* ── The Company ─────────────────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">The Company</p>
          <div className="grid md:grid-cols-2 gap-10 items-start mt-4">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Acme Robotics</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Acme Robotics builds robotics and logistics automation systems for industrial clients.
                The company raised an <strong className="text-foreground">$18M Series B</strong> in March 2025
                from Bessemer Venture Partners and is currently in a pre-revenue scaling phase
                — investing heavily in engineering and go-to-market while ramping toward its first
                large enterprise contracts.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This dashboard gives any observer full CFO-level visibility into the company's
                financial health — the same view the finance team monitors every day.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-[11px] text-red-400 uppercase tracking-widest font-semibold mb-1">Critical Watch</p>
                <p className="text-sm text-foreground/90">Monthly burn is <strong className="text-white">{burnPct}%+ above guidance</strong> — target was $850K–$1M/mo, actual is ~$1.34M/mo. Runway is ~9.5 months.</p>
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                <p className="text-[11px] text-orange-400 uppercase tracking-widest font-semibold mb-1">Collections at Risk</p>
                <p className="text-sm text-foreground/90"><strong className="text-white">$184K</strong> in overdue receivables — MidWest Fulfillment is 92 days past due on a $48K invoice.</p>
              </div>
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                <p className="text-[11px] text-yellow-400 uppercase tracking-widest font-semibold mb-1">Vendor Risk</p>
                <p className="text-sm text-foreground/90"><strong className="text-white">$25.5K</strong> in potential duplicate Apex Logistics invoices flagged by the AP fraud audit.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────── */}
        <section id="how-it-works" className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">How It Works</p>
          <h2 className="text-2xl font-semibold mb-2">Three steps to full situational awareness</h2>
          <p className="text-muted-foreground mb-8">You don't need any financial background to use this platform. Follow these three steps.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                n: '01', title: 'Update',
                desc: 'Click "↻ Update" in the top bar. All 7 AI agents analyze the current data simultaneously — takes about 30–60 seconds.',
                note: 'Each agent uses a different AI model (Groq, Cerebras, SambaNova) chosen for speed and the type of analysis required.',
              },
              {
                n: '02', title: 'Read the Briefing',
                desc: 'Open the CFO Briefing tab. You\'ll see an executive summary with RED, YELLOW, and GREEN findings. Each one has a dollar amount and specific action recommendation.',
                note: 'The briefing is generated by DeepSeek-V3.2 running on SambaNova — the most capable free model available for synthesis tasks.',
              },
              {
                n: '03', title: 'Drill Into Any Section',
                desc: 'Click any agent tab for live charts, AI conclusions, and action buttons. Each page also has an AI chat interface — ask questions about the data in plain English.',
                note: 'Action items you create from findings appear in the Action Items tab for ongoing tracking and decision logging.',
              },
            ].map(s => (
              <div key={s.n} className="rounded-xl border border-border p-5">
                <p className="text-3xl font-bold text-muted-foreground/20 mb-4 font-mono">{s.n}</p>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
                <p className="text-xs text-muted-foreground/50 leading-relaxed border-t border-border pt-3">{s.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Understanding findings ──────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Understanding the Findings</p>
          <h2 className="text-2xl font-semibold mb-6">What RED, YELLOW, and GREEN mean</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span className="font-semibold text-red-400">RED — Act Immediately</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A financial issue that requires action today. Always tied to a specific dollar amount
                at risk, an overdue threshold crossed, or a metric in the danger zone.
                Expect 1–4 RED findings per analysis run.
              </p>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0" />
                <span className="font-semibold text-yellow-400">YELLOW — Monitor Closely</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A trend or metric moving in the wrong direction but not yet critical.
                These are watch-list items — check weekly and act if they continue to deteriorate.
                Proactive action here prevents RED findings later.
              </p>
            </div>
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <span className="font-semibold text-green-400">GREEN — No Action Needed</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Operating normally based on current data and historical patterns.
                The AI confirmed this area looks healthy. GREEN findings are included
                so you know exactly what was checked, not just what's broken.
              </p>
            </div>
          </div>
        </section>

        {/* ── The 7 Agents ────────────────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">The AI Agents</p>
          <h2 className="text-2xl font-semibold mb-2">7 specialized financial analysts</h2>
          <p className="text-muted-foreground mb-8">
            Each agent monitors a specific financial domain independently. They all run in parallel
            when you click "Run All Agents," and each has its own live chart view you can explore.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {AGENTS.map(a => (
              <div key={a.name} className="rounded-xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5 flex-shrink-0">{a.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-sm">{a.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">{a.tag}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Data Sources ────────────────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">The Data</p>
          <h2 className="text-2xl font-semibold mb-2">Where the numbers come from</h2>
          <p className="text-muted-foreground mb-8">
            All data lives in a Turso (SQLite) cloud database, loaded from Acme Robotics' actual
            financial spreadsheets. The AI agents query this database directly when they run.
            Nothing is made up — every number reflects a real record.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DATA_SOURCES.map(d => (
              <div key={d.name} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl">{d.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground/60 font-mono">{d.rows}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Key Terms ───────────────────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Key Terms</p>
          <h2 className="text-2xl font-semibold mb-6">Financial vocabulary used throughout this platform</h2>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {TERMS.map(t => (
              <div key={t.term} className="flex gap-4 px-5 py-4">
                <p className="text-sm font-semibold min-w-[200px] flex-shrink-0 text-foreground">{t.term}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.def}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Navigation Guide ────────────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Navigation Guide</p>
          <h2 className="text-2xl font-semibold mb-6">Every section of the dashboard, explained</h2>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {NAV_SECTIONS.map(s => (
              <div key={s.label} className="flex items-center gap-4 px-5 py-3.5">
                <span className="text-xl w-8 flex-shrink-0">{s.icon}</span>
                <p className="text-sm font-medium w-40 flex-shrink-0">{s.label}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/50 mt-3 px-1">
            The <strong className="text-muted-foreground">↻ Update</strong> button lives in the top bar. Click it first to populate the analysis. Action items appear in the right sidebar.
          </p>
        </section>

        {/* ── Feedback ask ────────────────────────────────────── */}
        <section className="py-10 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">For Reviewers</p>
          <h2 className="text-2xl font-semibold mb-4">What we're looking for feedback on</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { n: '1', q: 'Clarity', desc: 'Is it immediately obvious what each section shows? Could a finance-adjacent non-expert understand the findings without explanation?' },
              { n: '2', q: 'Actionability', desc: 'Do the AI findings feel specific and useful? Or are they too vague? Would a real CFO act on them, or would they need more detail?' },
              { n: '3', q: 'Navigation', desc: 'Is the flow intuitive? Can you find what you\'re looking for? Does the sidebar organization make sense?' },
              { n: '4', q: 'Missing features', desc: 'What would you want to see that isn\'t here? What would make this a platform you\'d actually open every morning?' },
            ].map(f => (
              <div key={f.n} className="rounded-lg border border-border p-4 flex gap-3">
                <span className="text-2xl font-bold text-muted-foreground/20 font-mono leading-none mt-0.5">{f.n}</span>
                <div>
                  <p className="font-medium text-sm mb-1">{f.q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA footer ──────────────────────────────────────── */}
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-2xl font-semibold mb-3">Ready to explore?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm leading-relaxed">
            Click <strong className="text-foreground">↻ Update</strong> first (top bar) to generate fresh analysis.
            Then review the <strong className="text-foreground">Morning Briefing</strong> with charts and Executive Pulse.
            Action items live in the right sidebar — approve opens an AI brief and resolution email draft.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition text-base">
            Enter Dashboard →
          </Link>
          <p className="text-xs text-muted-foreground/40 mt-4">You can always return to this page from the "Platform Guide" link in the sidebar.</p>
        </section>

      </div>
    </div>
  )
}
