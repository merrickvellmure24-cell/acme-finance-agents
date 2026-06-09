'use client'
import { useEffect, useState } from 'react'

export interface CashRow {
  week_ending: string
  total_cash: number
  operating: number
  reserve: number
  weekly_burn: number
}

export function useCashData() {
  const [rows, setRows] = useState<CashRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cash-data')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { rows, loading }
}

export function fmtCash(n: number) {
  if (!n) return '$0'
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`
}

export function fmtCashK(n: number) {
  return `$${(n / 1e3).toFixed(0)}K`
}
