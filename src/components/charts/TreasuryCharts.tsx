'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import CashPositionCharts from './CashPositionCharts'

interface Props {
  arDelayDays?: number
  arOverdue?: number
}

export default function TreasuryCharts({ arDelayDays = 0, arOverdue = 186000 }: Props) {
  const [inflows, setInflows] = useState(0)
  const [outflows, setOutflows] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/ar-data').then(r => r.json()),
      fetch('/api/ap-data').then(r => r.json()),
    ]).then(([ar, ap]) => {
      const arTotal = Array.isArray(ar) ? ar.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0) : 0
      const apDue = Array.isArray(ap)
        ? ap.filter((r: { days_overdue: number }) => Number(r.days_overdue) >= 0).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0)
        : 0
      setInflows(arTotal)
      setOutflows(apDue)
    }).catch(() => {})
  }, [])

  return (
    <div className="border-b border-border">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Treasury</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Operating vs reserve liquidity, burn rate, and cash runway
        </p>
      </div>

      <div className="px-4 pb-3 grid grid-cols-3 gap-3">
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AR Inflows (open)</p>
          <p className="text-base font-semibold tabular-nums text-green-400">
            ${(inflows / 1e3).toFixed(0)}K
          </p>
          <p className="text-[10px] text-muted-foreground">Expected collections</p>
        </Card>
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AP Outflows (due)</p>
          <p className="text-base font-semibold tabular-nums text-red-400">
            ${(outflows / 1e3).toFixed(0)}K
          </p>
          <p className="text-[10px] text-muted-foreground">Payments scheduled</p>
        </Card>
        <Card className="border-border bg-card px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net Position</p>
          <p className={`text-base font-semibold tabular-nums ${inflows - outflows >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${((inflows - outflows) / 1e3).toFixed(0)}K
          </p>
          <p className="text-[10px] text-muted-foreground">Inflows minus outflows</p>
        </Card>
      </div>

      <CashPositionCharts arDelayDays={arDelayDays} arOverdue={arOverdue} />
    </div>
  )
}
