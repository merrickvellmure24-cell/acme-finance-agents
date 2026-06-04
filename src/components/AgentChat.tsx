'use client'
import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message { role: 'user' | 'assistant'; content: string; id: string }

const AGENT_LABELS: Record<string, string> = {
  cash: 'Cash Reporter', cashForecast: 'Cash Forecast', budget: 'Budget Analyst',
  ar: 'AR Collections', ap: 'AP & Vendor', contracts: 'Contract Watchdog', briefing: 'CFO Briefing',
}

interface Props { agent: string; initialMessage?: string }

export default function AgentChat({ agent, initialMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sentInit = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll within the chat container only — never touch the page scroll
  useEffect(() => {
    if (messages.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (initialMessage && !sentInit.current) {
      sentInit.current = true
      setInput(initialMessage)
    }
  }, [initialMessage])

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input, id: Date.now().toString() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId }])
    try {
      const res = await fetch(`/api/chat?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs.map(({ role, content }) => ({ role, content })) }),
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m))
      }
      // If nothing came back, show a fallback
      if (!full.trim()) {
        setMessages(prev => prev.map(m => m.id === assistantId
          ? { ...m, content: 'I couldn\'t get a response right now. The AI provider may be rate-limited. Try again in a moment.' }
          : m))
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === assistantId
        ? { ...m, content: `Connection error: ${String(err)}. Please try again.` }
        : m))
    } finally {
      setLoading(false)
    }
  }

  const label = AGENT_LABELS[agent] ?? 'Finance Assistant'

  return (
    <div className="flex flex-col border-t border-gray-800">
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-gray-600 italic">This assistant has access to the same data the agent analyzed above</p>
      </div>
      <div ref={containerRef} className="overflow-y-auto max-h-64 px-4 py-2 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.role === 'user' ? 'bg-indigo-700 text-white' : 'bg-gray-900 border border-gray-800 text-gray-200'}`}>
              {m.role === 'assistant' && !m.content && loading
                ? <span className="animate-pulse text-gray-500">Thinking...</span>
                : <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              }
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 px-4 py-3 border-t border-gray-800">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask ${label} a follow-up question...`}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
        <button type="submit" disabled={loading || !input.trim()} className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm rounded-lg">Send</button>
      </form>
    </div>
  )
}
