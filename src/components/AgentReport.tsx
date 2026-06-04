'use client'
import { useState } from 'react'
import { marked } from 'marked'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props { report: string; agentName: string }

export default function AgentReport({ report, agentName }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!report) return null

  const html = marked.parse(report) as string
  const date = new Date().toISOString().slice(0, 10)

  function handleCopy() {
    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([report], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${agentName}-report-${date}.md`
    a.click()
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left group"
      >
        <span className={`text-muted-foreground text-xs transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}>▼</span>
        <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground group-hover:text-foreground transition">Full Report</span>
        {!open && <span className="text-xs text-muted-foreground/60 italic ml-1">— click to expand</span>}
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground italic">AI-generated — verify before distributing externally</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleDownload}>Download</Button>
            </div>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div
                className="prose prose-invert prose-sm max-w-none text-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-5 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:bg-muted [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
