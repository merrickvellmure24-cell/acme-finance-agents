'use client'
import { useEffect, useState } from 'react'

interface Metrics { totalCash: number; monthlyBurn: number; runway: number; arOverdue: number; apRisk: number; lastRun: string | null }

function fmt(n: number) { return n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}` }
function timeAgo(iso: string | null) {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
  return `${Math.floor(diff/86400000)}d ago`
}

export default function MetricBar({ runStatus }: { runStatus: 'idle' | 'running' }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    const load = () => fetch('/api/metrics').then(r => r.json()).then(setMetrics).catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  const runwayColor = !metrics ? 'text-gray-400' : metrics.runway < 12 ? 'text-red-400' : metrics.runway < 18 ? 'text-yellow-400' : 'text-green-400'
  const arColor = !metrics ? 'text-gray-400' : metrics.arOverdue > 50000 ? 'text-red-400' : 'text-gray-300'
  const dotColor = runStatus === 'running' ? 'bg-yellow-400 animate-pulse' : metrics?.lastRun ? 'bg-green-500' : 'bg-gray-500'

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
      <span className="font-mono text-gray-500 tracking-widest uppercase text-[10px]">Acme Robotics</span>
      <div className="flex items-center gap-4 font-mono text-gray-300">
        {metrics ? (
          <>
            <span>Cash: <span className="text-white">{fmt(metrics.totalCash)}</span></span>
            <span>·</span>
            <span>Runway: <span className={runwayColor}>~{metrics.runway}mo</span></span>
            <span>·</span>
            <span>AP Risk: <span className="text-yellow-400">{fmt(metrics.apRisk)}</span></span>
            <span>·</span>
            <span>AR Overdue: <span className={arColor}>{fmt(metrics.arOverdue)}</span></span>
          </>
        ) : (
          <span className="text-gray-600">Loading metrics...</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <span>Last run: {timeAgo(metrics?.lastRun ?? null)}</span>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      </div>
    </div>
  )
}
