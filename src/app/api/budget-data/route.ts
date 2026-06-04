import { NextResponse } from 'next/server'
import { getBudget } from '@/lib/db/queries'

export async function GET() {
  try {
    const rows = await getBudget()
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
