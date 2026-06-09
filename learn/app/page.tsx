import Link from 'next/link'
import { LESSONS } from '@/lib/lessons'

export default function HomePage() {
  return (
    <div>
      <header className="mb-10">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Acme Finance Academy</p>
        <h1 className="text-3xl font-semibold text-foreground mb-3">Learn the Command Center</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          A guided course to understand the finance behind Acme Robotics — burn rate, runway, AR/AP,
          budget variance — and how the AI agents turn data into decisions. Built for your own learning
          and for explaining the platform in interviews.
        </p>
      </header>

      <section className="mb-10 p-5 rounded-lg border border-border bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-3">How to use this course</h2>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal ml-5">
          <li>Open the <strong className="text-foreground">dashboard</strong> at <a href="https://acme-finance-agents.vercel.app" target="_blank" rel="noreferrer" className="text-primary hover:underline">acme-finance-agents.vercel.app</a></li>
          <li>Read each lesson here and complete the <strong className="text-foreground">Try it</strong> step in the dashboard after each one</li>
          <li>Use <strong className="text-foreground">Glossary</strong> and <strong className="text-foreground">Screen Guide</strong> as reference while exploring</li>
          <li>Before an interview, rehearse <strong className="text-foreground">Interview Prep</strong></li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-4">Acme at a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Cash on hand', value: '$12.68M' },
            { label: 'Monthly burn', value: '~$1.34M' },
            { label: 'Runway', value: '~9.5 mo' },
            { label: 'Employees', value: '47' },
          ].map(c => (
            <div key={c.label} className="p-4 rounded-lg border border-border bg-card">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{c.label}</p>
              <p className="text-lg font-semibold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Series B ($18M, March 2025). Burn guidance: $850K–$1.0M/mo. Current burn is 34–58% above target.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-4">Lesson path</h2>
        <div className="space-y-2">
          {LESSONS.map(l => (
            <Link
              key={l.slug}
              href={`/lessons/${l.slug}`}
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-mono text-muted-foreground shrink-0">
                {l.number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{l.title}</p>
                <p className="text-xs text-muted-foreground truncate">{l.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{l.duration}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href="/glossary" className="p-5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
          <p className="text-lg mb-1">📖</p>
          <p className="text-sm font-medium text-foreground">Glossary</p>
          <p className="text-xs text-muted-foreground mt-1">30 finance &amp; platform terms, searchable</p>
        </Link>
        <Link href="/screens" className="p-5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
          <p className="text-lg mb-1">🖥️</p>
          <p className="text-sm font-medium text-foreground">Screen Guide</p>
          <p className="text-xs text-muted-foreground mt-1">What every dashboard tab means and what to do</p>
        </Link>
        <Link href="/interview" className="p-5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
          <p className="text-lg mb-1">🎯</p>
          <p className="text-sm font-medium text-foreground">Interview Prep</p>
          <p className="text-xs text-muted-foreground mt-1">30-second pitch, demo script, Q&amp;A by audience</p>
        </Link>
      </section>
    </div>
  )
}
