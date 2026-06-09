export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getActionItems, saveActionItem, updateActionItem } from '@/lib/db/queries'

export async function GET() {
  const items = await getActionItems()
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { sourceAgent, description, amount, owner } = await req.json()
  await saveActionItem(sourceAgent, description, amount ?? 0, owner ?? '')
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const { id, owner, dueDate, status, notes } = await req.json()
  await updateActionItem(Number(id), { owner, dueDate, status, notes })
  return NextResponse.json({ ok: true })
}
