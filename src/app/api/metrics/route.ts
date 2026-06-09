export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getMetrics } from '@/lib/db/queries'

export async function GET() {
  try {
    const metrics = await getMetrics()
    return NextResponse.json(metrics)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
