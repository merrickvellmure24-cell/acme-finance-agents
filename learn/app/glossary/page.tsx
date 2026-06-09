'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import termsData from '@/content/terms.json'

type Term = (typeof termsData)[number]

const CATEGORIES = [...new Set(termsData.map(t => t.category))].sort()

export default function GlossaryPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return (termsData as Term[]).filter(t => {
      const matchCat = category === 'All' || t.category === category
      const matchQ =
        !q ||
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        t.implication.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [query, category])

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Glossary</h1>
        <p className="text-sm text-muted-foreground">
          {termsData.length} finance and platform terms with real-world implications.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Search terms..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-border bg-card text-foreground"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Showing {filtered.length} of {termsData.length} terms
      </p>

      <div className="space-y-4">
        {filtered.map(t => (
          <article key={t.term} className="p-5 rounded-lg border border-border bg-card">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-sm font-semibold text-foreground">{t.term}</h2>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">
                {t.category}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t.definition}</p>
            <div className="p-3 rounded-md bg-muted/40 border border-border">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">So what?</p>
              <p className="text-sm text-foreground">{t.implication}</p>
            </div>
            <div className="flex gap-3 mt-3 text-xs">
              <Link href={`/lessons/${t.lesson}`} className="text-muted-foreground hover:text-foreground">
                Lesson →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">No terms match your search.</p>
      )}
    </div>
  )
}
