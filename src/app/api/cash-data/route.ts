import { NextResponse } from 'next/server'
import { getCashBalance } from '@/lib/db/queries'

export async function GET() {
  try {
    const rows = await getCashBalance()
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
