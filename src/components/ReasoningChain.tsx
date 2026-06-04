'use client'
import { useState, useEffect, useRef } from 'react'

interface Props { steps: string[]; isStreaming: boolean }

export default function ReasoningChain({ steps, isStreaming }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll within the container only — never scroll the page
  useEffect(() => {
    if (isStreaming && open && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [steps, isStreaming, open])

  if (!steps.length && !isStreaming) return null

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 transition text-left"
      >
        <span className={`text-muted-foreground/50 text-xs transition-transform duration-150 ${open ? 'rotate-0' : '-rotate-90'}`}>▼</span>
        <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">AI Analysis</span>
        {!open && steps.length > 0 && (
          <span className="text-xs text-muted-foreground/40 ml-1">— {steps.length} steps</span>
        )}
        {isStreaming && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Analyzing
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div ref={containerRef} className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {steps.length === 0 && isStreaming && (
              <p className="text-sm text-muted-foreground/60 animate-pulse">Starting analysis...</p>
            )}
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {i === steps.length - 1 && isStreaming ? (
                    <>{step}<span className="inline-block w-1 h-3.5 bg-primary/60 ml-0.5 animate-pulse rounded-sm" /></>
                  ) : step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
