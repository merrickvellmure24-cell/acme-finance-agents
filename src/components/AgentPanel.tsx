'use client'
import { useState } from 'react'
import AgentStatusBar from './AgentStatusBar'
import DataScanned from './DataScanned'
import ReasoningChain from './ReasoningChain'
import ConclusionCards from './ConclusionCards'
import AgentReport from './AgentReport'
import AgentChat from './AgentChat'
import TreasuryCharts from './charts/TreasuryCharts'
import ForecastCharts from './charts/ForecastCharts'
import BudgetCharts from './charts/BudgetCharts'
import CollectionsCharts from './charts/CollectionsCharts'
import PayablesCharts from './charts/PayablesCharts'
import ContractsTable from './charts/ContractsTable'
import type { HypotheticalInputs } from '@/lib/hypotheticals/scenarios'

export interface AgentState {
  status: 'idle' | 'running' | 'complete' | 'error'
  lastRun: Date | null
  dataScanned: string[]
  reasoningSteps: string[]
  conclusions: { level: 'RED' | 'YELLOW' | 'GREEN'; text: string }[]
  report: string
  isStreaming: boolean
  chatInitialMessage?: string
}

interface Props {
  agentKey: string
  agentName: string
  model: string
  provider: string
  state: AgentState
  onRerun: () => void
  hypoInputs?: HypotheticalInputs
}

const DESCRIPTIONS: Record<string, string> = {
  'cash-reporter': 'Treasury liquidity — operating vs reserve cash, weekly burn trend, and runway.',
  'cash-forecast': 'Projects cash 9 months forward across 3 scenarios: current burn, burn discipline, and revenue acceleration.',
  'budget-analyst': 'Compares actual spend against budget for all 8 departments, explains variances, and projects year-end.',
  'ar-collections': 'Tracks all 15 customer invoices, calculates weighted AR age, and prioritizes who to call first.',
  'ap-vendor': 'Audits all 20 AP invoices for duplicates and unauthorized spend, then schedules legitimate payments.',
  'contract-watchdog': 'Scans all 26 vendor contracts for upcoming renewals, stale reviews, and unprotected spend.',
  'cfo-briefing': 'Synthesizes all 6 agent reports into a prioritized executive briefing with action items.',
}

function AgentCharts({ agentKey, hypoInputs }: { agentKey: string; hypoInputs?: HypotheticalInputs }) {
  const arDelayDays = hypoInputs?.arDelayDays ?? 0
  switch (agentKey) {
    case 'cash-reporter':
      return <TreasuryCharts arDelayDays={arDelayDays} />
    case 'cash-forecast':
      return <ForecastCharts />
    case 'budget-analyst':
      return <BudgetCharts />
    case 'ar-collections':
      return <CollectionsCharts />
    case 'ap-vendor':
      return <PayablesCharts />
    case 'contract-watchdog':
      return <ContractsTable />
    default:
      return null
  }
}

export default function AgentPanel({ agentKey, agentName, model, provider, state, onRerun, hypoInputs }: Props) {
  const [auditOpen, setAuditOpen] = useState(false)

  if (state.status === 'idle') {
    return (
      <div className="flex flex-col">
        <AgentStatusBar agentKey={agentKey} agentName={agentName} model={model} provider={provider} lastRun={null} status="idle" onRerun={onRerun} />
        {DESCRIPTIONS[agentKey] && (
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <p className="text-xs text-muted-foreground leading-relaxed">{DESCRIPTIONS[agentKey]}</p>
          </div>
        )}
        <AgentCharts agentKey={agentKey} hypoInputs={hypoInputs} />
        <div className="flex flex-col items-center justify-center text-center px-8 py-8">
          <p className="text-muted-foreground/30 text-sm">Click <span className="text-primary">↻ Update</span> in the top bar to get AI analysis of this data.</p>
        </div>
        <div data-agent-chat={agentKey}><AgentChat agent={agentKey} /></div>
      </div>
    )
  }

  if (state.status === 'running') {
    return (
      <div className="flex flex-col">
        <AgentStatusBar agentKey={agentKey} agentName={agentName} model={model} provider={provider} lastRun={state.lastRun} status="running" />
        <AgentCharts agentKey={agentKey} hypoInputs={hypoInputs} />
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">Analyzing financial data...</p>
          <ReasoningChain steps={state.reasoningSteps} isStreaming={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      <AgentStatusBar agentKey={agentKey} agentName={agentName} model={model} provider={provider} lastRun={state.lastRun} status={state.status} onRerun={onRerun} />
      {DESCRIPTIONS[agentKey] && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground leading-relaxed">{DESCRIPTIONS[agentKey]}</p>
        </div>
      )}

      <AgentCharts agentKey={agentKey} hypoInputs={hypoInputs} />
      <ConclusionCards conclusions={state.conclusions} agentKey={agentKey} />

      <div className="border-b border-border">
        <button
          onClick={() => setAuditOpen(o => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 transition text-left"
        >
          <span className={`text-muted-foreground/50 text-xs transition-transform duration-150 ${auditOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
          <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Audit Trail</span>
          <span className="text-xs text-muted-foreground/40 ml-1">— Verify the AI&apos;s work</span>
        </button>
        {auditOpen && (
          <div className="pb-2">
            <DataScanned items={state.dataScanned} />
            <ReasoningChain steps={state.reasoningSteps} isStreaming={false} />
            <AgentReport report={state.report} agentName={agentKey} />
          </div>
        )}
      </div>

      <div data-agent-chat={agentKey}><AgentChat agent={agentKey} initialMessage={state.chatInitialMessage} /></div>
    </div>
  )
}
