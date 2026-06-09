'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import screensData from '@/content/screens.json'

type Screen = (typeof screensData)[number]

export default function ScreensPage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return screensData as Screen[]
    return (screensData as Screen[]).filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.whatYouSee.toLowerCase().includes(q) ||
        s.whatItMeans.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Screen Guide</h1>
        <p className="text-sm text-muted-foreground">
          What every part of the dashboard shows, what it means, and what to do about it.
        </p>
      </header>

      <input
        type="search"
        placeholder="Search screens..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 mb-6"
      />

      <div className="space-y-8">
        {filtered.map(s => (
          <article key={s.id} id={s.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-4 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex items-center justify-center min-h-[160px]">
                <Image
                  src={s.screenshot}
                  alt={s.title}
                  width={400}
                  height={200}
                  className="w-full max-w-sm"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span>{s.icon}</span>
                  <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{s.location}</p>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">What you see</p>
                    <p className="text-muted-foreground">{s.whatYouSee}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">What it means</p>
                    <p className="text-foreground">{s.whatItMeans}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/40 border border-border">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">What to do</p>
                    <p className="text-foreground">{s.whatToDo}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href={`/lessons/${s.lesson}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Related lesson →
                  </Link>
                  {s.terms.slice(0, 3).map(term => (
                    <span key={term} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
