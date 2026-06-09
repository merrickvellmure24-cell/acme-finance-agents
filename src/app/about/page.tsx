// Server Component — runs on the server, can read files directly from disk
// This is what makes Next.js different from plain React:
// no API route needed, no client-side fetch — just fs.readFileSync at build/request time
import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { marked } from 'marked'

// Read the README.md file from disk at request time (server-side)
function getReadme(): string {
  const readmePath = path.join(process.cwd(), 'README.md')
  try {
    return fs.readFileSync(readmePath, 'utf-8')
  } catch {
    return '# README not found'
  }
}

// Read the test file from disk to show the source
function getTestFile(): string {
  const testPath = path.join(process.cwd(), 'src/lib/hypotheticals/scenarios.test.ts')
  try {
    return fs.readFileSync(testPath, 'utf-8')
  } catch {
    return '// test file not found'
  }
}

export default function AboutPage() {
  const readmeHtml = marked.parse(getReadme()) as string
  const testSource = getTestFile()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition">← Dashboard</Link>
            <span className="text-border">|</span>
            <h1 className="text-sm font-semibold">Project Resources</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <a href="#readme" className="hover:text-foreground transition">README</a>
            <a href="#tests" className="hover:text-foreground transition">Tests</a>
            <a href="#learn" className="hover:text-foreground transition">Learn App</a>
            <a href="#run" className="hover:text-foreground transition">Run Commands</a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">

        {/* Quick links */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="#readme" className="block p-5 rounded-xl border border-border bg-card hover:bg-muted/50 transition group">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-semibold text-sm text-foreground mb-1">README</div>
            <p className="text-xs text-muted-foreground">Architecture, tech decisions, agent table — everything an interviewer needs to see</p>
            <div className="text-xs text-primary mt-2 group-hover:underline">Read below ↓</div>
          </a>
          <a href="#tests" className="block p-5 rounded-xl border border-border bg-card hover:bg-muted/50 transition group">
            <div className="text-2xl mb-2">🧪</div>
            <div className="font-semibold text-sm text-foreground mb-1">Unit Tests</div>
            <p className="text-xs text-muted-foreground">8 tests verifying the financial math in the SimDelta engine — run with <code className="bg-muted px-1 rounded">npm test</code></p>
            <div className="text-xs text-primary mt-2 group-hover:underline">View source ↓</div>
          </a>
          <a href="#learn" className="block p-5 rounded-xl border border-border bg-card hover:bg-muted/50 transition group">
            <div className="text-2xl mb-2">🎓</div>
            <div className="font-semibold text-sm text-foreground mb-1">Finance Academy</div>
            <p className="text-xs text-muted-foreground">9-lesson companion app explaining finance terms, agent architecture, and interview prep</p>
            <div className="text-xs text-primary mt-2 group-hover:underline">Start it ↓</div>
          </a>
        </section>

        {/* Run Commands */}
        <section id="run">
          <h2 className="text-lg font-semibold mb-4">Run commands</h2>
          <div className="space-y-3">
            {[
              {
                cmd: 'npm run dev',
                what: 'Main dashboard (this app)',
                where: 'acme-finance-agents/',
                result: 'Opens at localhost:3000',
                color: 'border-blue-500/30 bg-blue-500/5',
              },
              {
                cmd: 'cd learn && npm run dev',
                what: 'Finance Academy (learn app)',
                where: 'acme-finance-agents/',
                result: 'Opens at localhost:3002 (or next available port)',
                color: 'border-green-500/30 bg-green-500/5',
              },
              {
                cmd: 'npm test',
                what: 'Unit tests for financial calculations',
                where: 'acme-finance-agents/',
                result: '8 tests — should all pass in ~150ms',
                color: 'border-purple-500/30 bg-purple-500/5',
              },
              {
                cmd: 'npx tsc --noEmit',
                what: 'TypeScript type check',
                where: 'acme-finance-agents/',
                result: 'Zero errors means all types are correct',
                color: 'border-yellow-500/30 bg-yellow-500/5',
              },
              {
                cmd: 'npm run ingest',
                what: 'Reload xlsx data into Turso',
                where: 'acme-finance-agents/',
                result: 'Run after schema changes to the database',
                color: 'border-orange-500/30 bg-orange-500/5',
              },
            ].map(({ cmd, what, where, result, color }) => (
              <div key={cmd} className={`rounded-lg border p-4 ${color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <code className="text-sm font-mono text-foreground bg-muted/60 px-2 py-1 rounded">{cmd}</code>
                    <p className="text-xs text-foreground/80 mt-1.5 font-medium">{what}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{result}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 mt-1">run in: {where}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Learn App */}
        <section id="learn" className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🎓</span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Finance Academy — <code className="text-base font-mono text-green-400">localhost:3002</code></h2>
              <p className="text-sm text-muted-foreground mb-4">
                A separate companion app with 9 lessons explaining the finance behind this dashboard,
                the app architecture, and interview prep for each concept. Built to help you explain
                what you built to anyone — a recruiter, a quant, or a CTO.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {[
                  ["1", "The CFO's Monday", "What this platform solves and how to read it"],
                  ["2", "Cash, Burn & Runway", "Operating cash, spend rate, and months until zero"],
                  ["3", "Forecasting Scenarios", "Three futures and when cash gets critical"],
                  ["4", "Budget & Variance", "Planned vs actual and department accountability"],
                  ["5", "AR & Collections", "Money customers owe and how to collect it"],
                  ["6", "AP, Vendors & Fraud", "Money you owe, duplicates, and payment risk"],
                  ["7", "From AI Insight to Action", "Agents, conclusions, and the action queue"],
                  ["8", "Simulation Mode", "The SimDelta engine — preview impact before committing"],
                  ["9", "How the App is Built", "Next.js, Turso, Redis, TypeScript, AI SDK — explained"],
                ].map(([n, title, sub]) => (
                  <div key={n} className="flex gap-2.5 p-2.5 rounded-lg bg-card/50 border border-border/50">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center shrink-0 font-mono">{n}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-1">
                <div className="rounded-lg border border-green-500/40 bg-card p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">🚀 Deployed (if available)</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    If the Academy has been deployed to Vercel, open it directly — no terminal needed.
                  </p>
                  <p className="text-[11px] text-muted-foreground/50">
                    Deploy from <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-green-400 hover:underline">vercel.com/new</a> →
                    Import this GitHub repo → set Root Directory to <code className="bg-muted px-1 rounded">learn</code>
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">💻 Run locally</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal ml-4">
                    <li>Open a new terminal</li>
                    <li><code className="bg-muted px-1 rounded font-mono text-[10px]">cd ~/Desktop/acme-finance-agents/learn</code></li>
                    <li><code className="bg-muted px-1 rounded font-mono text-[10px]">npm run dev</code></li>
                    <li>Open <a href="http://localhost:3002" target="_blank" rel="noreferrer" className="text-green-400 hover:underline">localhost:3002</a></li>
                  </ol>
                </div>
              </div>

              <a
                href="http://localhost:3002"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg border border-green-500/40 bg-green-500/10 text-green-300 text-sm hover:bg-green-500/20 transition"
              >
                Open Finance Academy ↗
                <span className="text-[10px] text-green-400/60">(local) or your deployed URL</span>
              </a>
            </div>
          </div>
        </section>

        {/* Unit Tests */}
        <section id="tests">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Unit Tests</h2>
            <span className="text-xs text-muted-foreground font-mono">src/lib/hypotheticals/scenarios.test.ts</span>
          </div>

          <div className="mb-4 p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
            <p className="text-sm text-foreground font-medium mb-1">Why tests exist for financial calculations</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The SimDelta engine is doing real math — if <code className="bg-muted px-1 rounded">computeSimDelta</code> has a bug where it adds instead of
              subtracts AR overdue, the CFO sees wrong numbers and makes a wrong decision. At a firm like Vanguard,
              incorrect calculations in financial software can mean regulatory violations. These 8 tests verify the
              math before any UI is involved. Run them with <code className="bg-muted px-1 rounded">npm test</code>.
            </p>
          </div>

          <pre className="rounded-xl border border-border bg-card p-5 overflow-x-auto text-[11px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {testSource}
          </pre>
        </section>

        {/* README */}
        <section id="readme">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">README.md</h2>
            <span className="text-xs text-muted-foreground font-mono">acme-finance-agents/README.md</span>
          </div>
          <div
            className="prose prose-invert prose-sm max-w-none rounded-xl border border-border bg-card p-8
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-4
              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:pt-4 [&_h2]:border-t [&_h2]:border-border
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2
              [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:text-sm
              [&_code]:bg-muted [&_code]:text-foreground [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
              [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:border [&_pre]:border-border
              [&_pre_code]:bg-transparent [&_pre_code]:p-0
              [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
              [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-muted-foreground
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-sm [&_ul]:text-muted-foreground
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:text-sm [&_ol]:text-muted-foreground
              [&_li]:text-muted-foreground [&_li]:leading-relaxed
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic
              [&_hr]:border-border [&_hr]:my-6
              [&_a]:text-primary [&_a]:hover:underline"
            dangerouslySetInnerHTML={{ __html: readmeHtml }}
          />
        </section>

      </div>
    </div>
  )
}
