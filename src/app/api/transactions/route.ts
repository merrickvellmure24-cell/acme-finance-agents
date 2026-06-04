import { NextResponse } from 'next/server'
import { getTransactions } from '@/lib/db/queries'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rows = await getTransactions({
    search: searchParams.get('search') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    minAmount: searchParams.get('minAmount') ? Number(searchParams.get('minAmount')) : undefined,
    maxAmount: searchParams.get('maxAmount') ? Number(searchParams.get('maxAmount')) : undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
  })
  return NextResponse.json({ rows, total: rows.length })
}
