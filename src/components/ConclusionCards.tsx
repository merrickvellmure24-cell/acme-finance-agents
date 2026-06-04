'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Conclusion { level: 'RED' | 'YELLOW' | 'GREEN'; text: string }
interface Props {
  conclusions: Conclusion[]
  agentKey?: string
  onClickConclusion?: (text: string) => void
}

function extractTitle(text: string): { title: string; body: string } {
  const cleaned = text
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/^\*\*?\s*/g, '')
    .replace(/^(CRITICAL|WARNING|ALERT|FLAG|ISSUE|ACTION REQUIRED):\s*/i, '')

  const dashIdx = cleaned.indexOf(' — ')
  if (dashIdx > 0 && dashIdx < 90) {
    return { title: cleaned.slice(0, dashIdx), body: cleaned.slice(dashIdx + 3) }
  }
  const colonIdx = cleaned.indexOf(': ')
  if (colonIdx > 0 && colonIdx < 55 && cleaned.slice(0, colonIdx).split(' ').length <= 7) {
    return { title: cleaned.slice(0, colonIdx), body: cleaned.slice(colonIdx + 2) }
  }
  const dotIdx = cleaned.search(/\.\s+[A-Z]/)
  if (dotIdx > 20 && dotIdx < 110) {
    return { title: cleaned.slice(0, dotIdx + 1), body: cleaned.slice(dotIdx + 2).trim() }
  }
  return { title: cleaned, body: '' }
}

function extractAmount(text: string): number {
  const m = text.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*([KMB]?)/i)
  if (!m) return 0
  const n = parseFloat(m[1].replace(/,/g, ''))
  const mul = { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] ?? 1
  return n * mul
}

export default function ConclusionCards({ conclusions, agentKey, onClickConclusion }: Props) {
  const [queued, setQueued] = useState<Set<number>>(new Set())
  const [queueing, setQueueing] = useState<number | null>(null)

  if (!conclusions.length) return null

  const reds = conclusions.filter(c => c.level === 'RED')
  const yellows = conclusions.filter(c => c.level === 'YELLOW')
  const greens = conclusions.filter(c => c.level === 'GREEN')

  async function addToQueue(idx: number, text: string) {
    setQueueing(idx)
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAgent: agentKey ?? 'manual',
        description: text.replace(/\*\*?/g, '').trim().slice(0, 250),
        amount: extractAmount(text),
        owner: '',
      }),
    }).catch(() => {})
    setQueueing(null)
    setQueued(prev => new Set([...prev, idx]))
  }

  return (
    <div className="px-4 py-5 border-b border-border space-y-5">

      {reds.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 rounded-full bg-red-500" />
            <h3 className="text-xs uppercase tracking-widest font-semibold text-red-400">Requires Immediate Action</h3>
          </div>
          {reds.map((c, i) => {
            const { title, body } = extractTitle(c.text)
            const isQueued = queued.has(i)
            return (
              <Card
                key={i}
                onClick={() => onClickConclusion?.(c.text)}
                className={`border-red-500/40 bg-red-500/5 ${onClickConclusion ? 'cursor-pointer hover:bg-red-500/10 transition' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="text-sm font-semibold text-red-300 leading-snug">{title}</p>
                    <Badge variant="destructive" className="flex-shrink-0 text-[10px] h-5">Critical</Badge>
                  </div>
                  {body && body !== title && (
                    <p className="text-xs text-red-200/65 leading-relaxed mb-3">{body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                    {isQueued ? (
                      <span className="text-[11px] text-green-400">✓ Added to Action Queue</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                        disabled={queueing === i}
                        onClick={() => addToQueue(i, c.text)}
                      >
                        {queueing === i ? '...' : '+ Add to Action Queue'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {yellows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 rounded-full bg-yellow-400" />
            <h3 className="text-xs uppercase tracking-widest font-semibold text-yellow-400/80">Monitor</h3>
          </div>
          {yellows.map((c, i) => {
            const { title, body } = extractTitle(c.text)
            const idx = reds.length + i
            const isQueued = queued.has(idx)
            return (
              <Card
                key={i}
                onClick={() => onClickConclusion?.(c.text)}
                className={`border-yellow-500/30 bg-yellow-500/5 ${onClickConclusion ? 'cursor-pointer hover:bg-yellow-500/10 transition' : ''}`}
              >
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-300">{title}</p>
                      {body && body !== title && (
                        <p className="text-xs text-yellow-200/60 leading-relaxed mt-1">{body}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-[10px] h-5">Watch</Badge>
                  </div>
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    {isQueued ? (
                      <span className="text-[11px] text-green-400">✓ Added to Action Queue</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-yellow-300/70 border border-yellow-500/20 hover:bg-yellow-500/10"
                        disabled={queueing === idx}
                        onClick={() => addToQueue(idx, c.text)}
                      >
                        {queueing === idx ? '...' : '+ Add to Action Queue'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {greens.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 rounded-full bg-green-500" />
            <h3 className="text-xs uppercase tracking-widest font-semibold text-green-500/70">On Track</h3>
          </div>
          {greens.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border border-green-500/25 rounded-lg bg-green-500/5 px-3 py-2.5"
            >
              <p className="text-xs text-green-300 flex-1 leading-relaxed">
                {c.text.replace(/\*\*?/g, '')}
              </p>
              <Badge variant="default" className="flex-shrink-0 text-[10px] h-5 bg-green-600/30 text-green-300 border-green-500/30">OK</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
