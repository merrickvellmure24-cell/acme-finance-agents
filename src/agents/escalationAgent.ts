import { generateText } from "ai";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/llm";
import { setCache } from "@/lib/redis";

export async function runEscalationAgent(agentResults: {
  cash?: { summary: string };
  budget?: { summary: string };
  vendor?: { summary: string };
  ap_ar?: { summary: string };
}) {
  const { text } = await generateText({
    model: MODELS.escalation.provider(MODELS.escalation.model),
    system: `You are the Escalation Router and CFO Briefing Agent for Acme Robotics.
Your job: synthesize findings from 4 finance agents into a weekly executive briefing.
Classify each issue as: CRITICAL (needs CEO/board attention today), HIGH (CFO action this week), MEDIUM (monitor), LOW (routine).
Write in the style of a CFO memo — concise, quantitative, action-oriented.`,
    prompt: `Agent findings this week:

CASH AGENT: ${agentResults.cash?.summary ?? "No data"}

BUDGET AGENT: ${agentResults.budget?.summary ?? "No data"}

VENDOR AGENT: ${agentResults.vendor?.summary ?? "No data"}

AP/AR AGENT: ${agentResults.ap_ar?.summary ?? "No data"}

Write the weekly CFO briefing with: 1) Executive Summary (3 sentences) 2) Critical Issues requiring immediate action 3) This week's action items with owners 4) Key metrics dashboard`,
  });

  // Save briefing to DB and cache
  const now = new Date().toISOString();
  await db.execute({
    sql: "INSERT INTO agent_briefings (created_at, agent, summary, findings, severity) VALUES (?, ?, ?, ?, ?)",
    args: [now, "escalation", text, JSON.stringify(agentResults), "weekly"],
  });

  await setCache("latest_briefing", { created_at: now, summary: text }, 86400);

  return { agent: "escalation", summary: text };
}
