import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCached, setCache } from "@/lib/redis";

export async function GET() {
  const cached = await getCached("latest_briefing");
  if (cached) return NextResponse.json(cached);

  const result = await db.execute(
    "SELECT * FROM agent_briefings ORDER BY created_at DESC LIMIT 1"
  );

  if (!result.rows.length) {
    return NextResponse.json({ summary: "No briefings yet. Click 'Run Weekly' to generate one." });
  }

  const row = result.rows[0];
  const data = { created_at: row.created_at, summary: row.summary };
  await setCache("latest_briefing", data, 86400);
  return NextResponse.json(data);
}
