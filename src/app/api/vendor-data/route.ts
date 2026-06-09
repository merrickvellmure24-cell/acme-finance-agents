export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getVendors } from '@/lib/db/queries'

export async function GET() {
  try {
    const rows = await getVendors()
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
