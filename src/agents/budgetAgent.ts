import { generateText } from "ai";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/llm";

export async function runBudgetAgent() {
  const rows = await db.execute(
    "SELECT * FROM budget ORDER BY month DESC LIMIT 50"
  );
  const data = rows.rows.map((r) => ({
    department: r.department,
    month: r.month,
    planned: r.planned,
    actual: r.actual,
    variance: Number(r.actual) - Number(r.planned),
    pct: r.planned ? (((Number(r.actual) - Number(r.planned)) / Number(r.planned)) * 100).toFixed(1) + "%" : "N/A",
  }));

  const { text } = await generateText({
    model: MODELS.budget.provider(MODELS.budget.model),
    system: `You are the Budget Variance Agent for Acme Robotics. Analyze budget vs actual spend by department.
Flag departments over budget by more than 5%. Identify root causes where possible (e.g. unplanned conferences, duplicate charges).`,
    prompt: `Budget vs Actual data: ${JSON.stringify(data, null, 2)}

Provide: 1) Summary table of variances 2) Top 3 concerns 3) Recommended actions`,
  });

  return { agent: "budget", summary: text, data };
}
