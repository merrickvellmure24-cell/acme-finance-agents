import { generateText } from "ai";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/llm";

export async function runCashAgent() {
  const rows = await db.execute("SELECT * FROM cash_balance ORDER BY week_ending DESC LIMIT 8");
  const data = rows.rows.map((r) => ({
    week: r.week_ending,
    total_cash: r.total_cash,
    operating: r.operating,
    reserve: r.reserve,
    weekly_burn: r.weekly_burn,
  }));

  const { text } = await generateText({
    model: MODELS.cash.provider(MODELS.cash.model),
    system: `You are the Cash Position Agent for Acme Robotics. Analyze weekly cash data and provide a concise report.
Flag if burn is accelerating, estimate runway, and note any anomalies. Be direct and quantitative.`,
    prompt: `Cash balance data (most recent first): ${JSON.stringify(data, null, 2)}

Provide: 1) Current balance 2) Burn trend 3) Estimated runway 4) Any red flags`,
  });

  return { agent: "cash", summary: text, data };
}
