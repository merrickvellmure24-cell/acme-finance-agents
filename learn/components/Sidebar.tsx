'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LESSONS } from '@/lib/lessons'
import { getCompletedLessons } from '@/lib/progress'

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-sidebar-accent text-foreground font-medium'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    setCompleted(getCompletedLessons())
    const onStorage = () => setCompleted(getCompletedLessons())
    window.addEventListener('storage', onStorage)
    window.addEventListener('academy-progress', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('academy-progress', onStorage)
    }
  }, [pathname])

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0 flex flex-col overflow-y-auto">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Acme Robotics</p>
        <h1 className="text-sm font-semibold text-foreground">Finance Academy</h1>
        <p className="text-xs text-muted-foreground mt-1">Learn the dashboard &amp; the finance behind it</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Start</p>
          <NavLink href="/" active={pathname === '/'}>Course Home</NavLink>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Lessons</p>
          <div className="space-y-0.5">
            {LESSONS.map(l => (
              <NavLink key={l.slug} href={`/lessons/${l.slug}`} active={pathname === `/lessons/${l.slug}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-4 text-center text-xs ${completed.includes(l.slug) ? 'text-green' : 'text-muted-foreground/50'}`}>
                    {completed.includes(l.slug) ? '✓' : l.number}
                  </span>
                  <span className="truncate">{l.title}</span>
                </span>
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Reference</p>
          <div className="space-y-0.5">
            <NavLink href="/glossary" active={pathname === '/glossary'}>Glossary</NavLink>
            <NavLink href="/screens" active={pathname === '/screens'}>Screen Guide</NavLink>
            <NavLink href="/interview" active={pathname === '/interview'}>Interview Prep</NavLink>
          </div>
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open Dashboard →
        </a>
      </div>
    </aside>
  )
}
