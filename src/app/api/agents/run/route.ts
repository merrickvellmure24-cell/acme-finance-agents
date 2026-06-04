import { NextResponse } from "next/server";
import { runCashAgent } from "@/agents/cashAgent";
import { runBudgetAgent } from "@/agents/budgetAgent";
import { runVendorAgent } from "@/agents/vendorAgent";
import { runApArAgent } from "@/agents/apArAgent";
import { runEscalationAgent } from "@/agents/escalationAgent";

export async function POST() {
  const results: Record<string, unknown> = {};

  const run = async (name: string, fn: () => Promise<unknown>) => {
    try {
      results[name] = await fn();
    } catch (err) {
      console.error(`[${name} agent error]`, err);
      results[name] = { error: String(err) };
    }
  };

  await Promise.all([
    run("cash", runCashAgent),
    run("budget", runBudgetAgent),
    run("vendor", runVendorAgent),
    run("ap_ar", runApArAgent),
  ]);

  await run("escalation", () =>
    runEscalationAgent({
      cash: results.cash as { summary: string },
      budget: results.budget as { summary: string },
      vendor: results.vendor as { summary: string },
      ap_ar: results.ap_ar as { summary: string },
    })
  );

  return NextResponse.json(results);
}
