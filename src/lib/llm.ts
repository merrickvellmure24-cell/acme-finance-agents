import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const cerebras = createOpenAICompatible({
  name: "cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY,
});

export const sambanova = createOpenAICompatible({
  name: "sambanova",
  baseURL: "https://api.sambanova.ai/v1",
  apiKey: process.env.SAMBANOVA_API_KEY,
});

export const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Provider + model per agent. Spread across providers to avoid parallel rate limits.
// 6 agents run in parallel: Cerebras(1) + Groq(4) + SambaNova(1) → no provider conflict
// CFO briefing runs after all 6 → SambaNova DeepSeek-V3.2 (largest free model)
export const AGENT_MODELS = {
  'cash-reporter':     { provider: cerebras,  model: 'gpt-oss-120b',                  providerName: 'Cerebras' },
  'cash-forecast':     { provider: groq,      model: 'llama-3.3-70b-versatile',        providerName: 'Groq' },
  'budget-analyst':    { provider: groq,      model: 'llama-3.3-70b-versatile',        providerName: 'Groq' },
  'ar-collections':    { provider: groq,      model: 'llama-3.3-70b-versatile',        providerName: 'Groq' },
  'ap-vendor':         { provider: sambanova, model: 'DeepSeek-V3.2',                  providerName: 'SambaNova' },
  'contract-watchdog': { provider: groq,      model: 'llama-3.3-70b-versatile',        providerName: 'Groq' },
  'cfo-briefing':      { provider: sambanova, model: 'DeepSeek-V3.2',                  providerName: 'SambaNova' },
  'chat':              { provider: groq,      model: 'llama-3.3-70b-versatile',        providerName: 'Groq' },
} as const;

// Legacy alias for existing agent files
export const MODELS = {
  cash:       { provider: groq,      model: 'llama-3.3-70b-versatile' },
  budget:     { provider: groq,      model: 'llama-3.3-70b-versatile' },
  vendor:     { provider: sambanova, model: 'DeepSeek-V3.2' },
  ap_ar:      { provider: groq,      model: 'llama-3.3-70b-versatile' },
  escalation: { provider: sambanova, model: 'DeepSeek-V3.2' },
  chat:       { provider: groq,      model: 'llama-3.3-70b-versatile' },
};
