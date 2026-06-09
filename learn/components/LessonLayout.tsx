'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DASHBOARD_URL, type LessonMeta } from '@/lib/lessons'
import { isLessonComplete, setLessonComplete } from '@/lib/progress'
import { renderMarkdown } from '@/lib/markdown'

interface Props {
  lesson: LessonMeta
  content: string
  prev?: LessonMeta
  next?: LessonMeta
}

export function LessonLayout({ lesson, content, prev, next }: Props) {
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    setComplete(isLessonComplete(lesson.slug))
  }, [lesson.slug])

  function toggleComplete() {
    const nextVal = !complete
    setComplete(nextVal)
    setLessonComplete(lesson.slug, nextVal)
    window.dispatchEvent(new Event('academy-progress'))
  }

  const html = renderMarkdown(content)

  return (
    <article className="max-w-3xl">
      <header className="mb-8 pb-6 border-b border-border">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          Lesson {lesson.number} · {lesson.duration}
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-1">{lesson.title}</h1>
        <p className="text-sm text-muted-foreground">{lesson.subtitle}</p>
      </header>

      <div className="prose-lesson" dangerouslySetInnerHTML={{ __html: html }} />

      {lesson.dashboardTab && (
        <div className="my-8 p-4 rounded-lg border border-border bg-card">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Open the dashboard</p>
          <p className="text-sm text-muted-foreground mb-3">
            Click <strong>{lesson.dashboardTab}</strong> in the top nav on the dashboard.
          </p>
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-foreground hover:underline"
          >
            Open Finance Command Center →
          </a>
        </div>
      )}

      <label className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30 cursor-pointer mb-8">
        <input
          type="checkbox"
          checked={complete}
          onChange={toggleComplete}
          className="rounded border-border"
        />
        <span className="text-sm text-foreground">Mark lesson {lesson.number} complete</span>
      </label>

      <nav className="flex justify-between gap-4 pt-6 border-t border-border">
        {prev ? (
          <Link href={`/lessons/${prev.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Lesson {prev.number}: {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/lessons/${next.slug}`} className="text-sm text-foreground hover:underline text-right">
            Lesson {next.number}: {next.title} →
          </Link>
        ) : (
          <Link href="/interview" className="text-sm text-foreground hover:underline text-right">
            Interview Prep →
          </Link>
        )}
      </nav>
    </article>
  )
}
