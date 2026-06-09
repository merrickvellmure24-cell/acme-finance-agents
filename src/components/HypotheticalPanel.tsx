'use client'
import { useEffect, useState } from 'react'
import {
  DEFAULT_HYPOTHETICAL_INPUTS,
  computeHypotheticalOutcome,
  type HypotheticalInputs,
  type HypotheticalMetrics,
} from '@/lib/hypotheticals/scenarios'

interface Props {
  inputs: HypotheticalInputs
  onChange: (inputs: HypotheticalInputs) => void
  onClose?: () => void
}

export default function HypotheticalPanel({ inputs, onChange, onClose }: Props) {
  const [metrics, setMetrics] = useState<HypotheticalMetrics | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/metrics').then(r => r.json()),
      fetch('/api/ap-data').then(r => r.json()),
    ]).then(([m, ap]) => {
      const apDueSoon = Array.isArray(ap)
        ? ap.filter((r: { days_overdue: number; amount: number }) => Number(r.days_overdue) <= 14).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0)
        : 0
      if (m?.totalCash) {
        setMetrics({
          totalCash: m.totalCash,
          monthlyBurn: m.monthlyBurn,
          arOverdue: m.arOverdue ?? 0,
          apDueSoon,
        })
      }
    }).catch(() => {})
  }, [])

  const outcome = metrics ? computeHypotheticalOutcome(metrics, inputs) : null
  const baseBurn = metrics?.monthlyBurn ?? 1190000
  const baseAR = metrics?.arOverdue ?? 186000

  function update(partial: Partial<HypotheticalInputs>) {
    onChange({ ...inputs, ...partial })
  }

  return (
    <div className="bg-card border-yellow-500/30 px-4 py-3 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-yellow-300 uppercase tracking-widest">⚗ Scenario Controls</span>
          <span className="text-[10px] text-yellow-400/70 italic">Modeling only — not saved</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground text-sm leading-none transition">✕</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Burn Rate Reduction</label>
              <span className="text-xs font-semibold text-yellow-300">{inputs.burnCutPct}%</span>
            </div>
            <input
              type="range" min={0} max={40} value={inputs.burnCutPct}
              onChange={e => update({ burnCutPct: Number(e.target.value) })}
              className="w-full accent-yellow-400 h-1.5"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              New burn: ${((baseBurn * (1 - inputs.burnCutPct / 100)) / 1e6).toFixed(2)}M/mo
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Additional Monthly Revenue</label>
              <span className="text-xs font-semibold text-yellow-300">${(inputs.additionalRevenue / 1e3).toFixed(0)}K/mo</span>
            </div>
            <input
              type="range" min={0} max={500000} step={25000} value={inputs.additionalRevenue}
              onChange={e => update({ additionalRevenue: Number(e.target.value) })}
              className="w-full accent-yellow-400 h-1.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">AR Collection Delay</label>
              <span className="text-xs font-semibold text-yellow-300">{inputs.arDelayDays} days</span>
            </div>
            <input
              type="range" min={0} max={90} step={15} value={inputs.arDelayDays}
              onChange={e => update({ arDelayDays: Number(e.target.value) })}
              className="w-full accent-yellow-400 h-1.5"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              If AR doesn&apos;t come in, operating cash is tapped (${(baseAR / 1e3).toFixed(0)}K overdue)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Defer AP Payments</label>
              <span className="text-xs font-semibold text-yellow-300">{inputs.deferAPDays} days</span>
            </div>
            <input
              type="range" min={0} max={30} step={5} value={inputs.deferAPDays}
              onChange={e => update({ deferAPDays: Number(e.target.value) })}
              className="w-full accent-yellow-400 h-1.5"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox" checked={inputs.collectAR}
              onChange={e => update({ collectAR: e.target.checked })}
              className="rounded accent-yellow-400"
            />
            <span className="text-xs text-muted-foreground">
              Collect overdue AR — add ${(baseAR / 1e3).toFixed(0)}K to cash
            </span>
          </label>
        </div>

        {outcome && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 grid grid-cols-2 gap-3 content-start">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Adjusted Cash</p>
              <p className="text-sm font-bold text-yellow-300">${(outcome.adjustedCash / 1e6).toFixed(2)}M</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">New Monthly Burn</p>
              <p className="text-sm font-bold text-yellow-300">${(outcome.adjustedBurn / 1e6).toFixed(2)}M</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hypothetical Runway</p>
              <p className="text-sm font-bold text-yellow-300">{outcome.runwayMonths.toFixed(1)} mo</p>
              <p className={`text-[10px] ${outcome.runwayGainMonths > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {outcome.runwayGainMonths > 0 ? '+' : ''}{outcome.runwayGainMonths.toFixed(1)} mo vs now
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cash in 6 Mo</p>
              <p className="text-sm font-bold text-yellow-300">${(outcome.cashIn6Mo / 1e6).toFixed(2)}M</p>
              <p className="text-[10px] text-muted-foreground/60">vs ${(outcome.baseCashIn6Mo / 1e6).toFixed(2)}M base</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { DEFAULT_HYPOTHETICAL_INPUTS }
