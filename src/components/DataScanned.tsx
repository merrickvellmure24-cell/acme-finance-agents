'use client'
import { useState } from 'react'

export default function DataScanned({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 transition text-left"
      >
        <span className={`text-muted-foreground/50 text-xs transition-transform duration-150 ${open ? 'rotate-0' : '-rotate-90'}`}>▼</span>
        <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Data Sources</span>
        {!open && (
          <span className="text-xs text-muted-foreground/40 ml-1">— {items.length} tables reviewed</span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground/50 mb-3">Financial data reviewed by this agent</p>
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.startsWith('•') ? item.slice(1).trim() : item}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
