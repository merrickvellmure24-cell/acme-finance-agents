export interface LessonMeta {
  slug: string
  number: number
  title: string
  subtitle: string
  duration: string
  dashboardTab?: string
}

export const LESSONS: LessonMeta[] = [
  {
    slug: '1-cfo-monday',
    number: 1,
    title: "The CFO's Monday",
    subtitle: 'What this platform solves and how to read it',
    duration: '15 min',
    dashboardTab: 'CFO Briefing',
  },
  {
    slug: '2-cash-burn-runway',
    number: 2,
    title: 'Cash, Burn & Runway',
    subtitle: 'Operating cash, spend rate, and months until zero',
    duration: '18 min',
    dashboardTab: 'Treasury',
  },
  {
    slug: '3-forecasting',
    number: 3,
    title: 'Forecasting Scenarios',
    subtitle: 'Three futures and when cash gets critical',
    duration: '15 min',
    dashboardTab: 'Cash Forecast',
  },
  {
    slug: '4-budget-variance',
    number: 4,
    title: 'Budget & Variance',
    subtitle: 'Planned vs actual and department accountability',
    duration: '18 min',
    dashboardTab: 'Budget',
  },
  {
    slug: '5-ar-collections',
    number: 5,
    title: 'AR & Collections',
    subtitle: 'Money customers owe you and how to collect it',
    duration: '18 min',
    dashboardTab: 'Collections',
  },
  {
    slug: '6-ap-vendors',
    number: 6,
    title: 'AP, Vendors & Fraud',
    subtitle: 'Money you owe, duplicates, and payment risk',
    duration: '18 min',
    dashboardTab: 'Payables',
  },
  {
    slug: '7-ai-to-action',
    number: 7,
    title: 'From AI Insight to Action',
    subtitle: 'Agents, conclusions, and the action queue',
    duration: '20 min',
    dashboardTab: 'Action Items',
  },
  {
    slug: '8-simulation-mode',
    number: 8,
    title: 'Simulation Mode',
    subtitle: 'Preview financial impact before committing — the SimDelta engine',
    duration: '15 min',
    dashboardTab: 'Hypo mode',
  },
  {
    slug: '9-infrastructure',
    number: 9,
    title: 'How the App is Built',
    subtitle: 'Next.js, Turso, Redis, TypeScript, and the AI SDK — explained',
    duration: '25 min',
  },
]

export const DASHBOARD_URL = 'https://acme-finance-agents.vercel.app'

export function lessonHref(slug: string) {
  return `/lessons/${slug}`
}

export function getLessonNeighbors(slug: string) {
  const idx = LESSONS.findIndex(l => l.slug === slug)
  if (idx === -1) return { lesson: undefined, prev: undefined, next: undefined }
  return {
    lesson: LESSONS[idx],
    prev: idx > 0 ? LESSONS[idx - 1] : undefined,
    next: idx < LESSONS.length - 1 ? LESSONS[idx + 1] : undefined,
  }
}
