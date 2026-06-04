'use client'
import { useState } from 'react'
import AgentStatusBar from './AgentStatusBar'
import DataScanned from './DataScanned'
import ReasoningChain from './ReasoningChain'
import ConclusionCards from './ConclusionCards'
import AgentReport from './AgentReport'
import AgentChat from './AgentChat'
import CashPositionCharts from './charts/CashPositionCharts'
import ForecastCharts from './charts/ForecastCharts'
import BudgetCharts from './charts/BudgetCharts'
import CollectionsCharts from './charts/CollectionsCharts'
import PayablesCharts from './charts/PayablesCharts'
import ContractsTable from './charts/ContractsTable'

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
}

const DESCRIPTIONS: Record<string, string> = {
  'cash-reporter': 'Monitors current cash position, weekly burn trend, and runway — updated on every run.',
  'cash-forecast': 'Projects cash 9 months forward across 3 scenarios: current burn, burn discipline, and revenue acceleration.',
  'budget-analyst': 'Compares actual spend against budget for all 8 departments, explains variances, and projects year-end.',
  'ar-collections': 'Tracks all 15 customer invoices, calculates DSO, and prioritizes who to call first.',
  'ap-vendor': 'Audits all 20 AP invoices for duplicates and unauthorized spend, then schedules legitimate payments.',
  'contract-watchdog': 'Scans all 26 vendor contracts for upcoming renewals, stale reviews, and unprotected spend.',
  'cfo-briefing': 'Synthesizes all 6 agent reports into a prioritized executive briefing with action items.',
}

function AgentCharts({ agentKey }: { agentKey: string }) {
  switch (agentKey) {
    case 'cash-reporter':     return <CashPositionCharts />
    case 'cash-forecast':     return <ForecastCharts />
    case 'budget-analyst':    return <BudgetCharts />
    case 'ar-collections':    return <CollectionsCharts />
    case 'ap-vendor':         return <PayablesCharts />
    case 'contract-watchdog': return <ContractsTable />
    default: return null
  }
}

export default function AgentPanel({ agentKey, agentName, model, provider, state, onRerun }: Props) {
  const [auditOpen, setAuditOpen] = useState(false)

  if (state.status === 'idle') {
    return (
      <div className="flex flex-col">
        <AgentStatusBar agentKey={agentKey} agentName={agentName} model={model} provider={provider} lastRun={null} status="idle" onRerun={onRerun} />
        {/* Charts always show live data even before agent runs */}
        <AgentCharts agentKey={agentKey} />
        <div className="flex flex-col items-center justify-center text-center px-8 py-8">
          <p className="text-muted-foreground/50 text-sm max-w-md leading-relaxed">{DESCRIPTIONS[agentKey] ?? ''}</p>
          <p className="text-muted-foreground/30 text-sm mt-3">Click <span className="text-primary">▶ Run All</span> to get AI analysis.</p>
        </div>
        <div data-agent-chat={agentKey}><AgentChat agent={agentKey} /></div>
      </div>
    )
  }

  if (state.status === 'running') {
    return (
      <div className="flex flex-col">
        <AgentStatusBar agentKey={agentKey} agentName={agentName} model={model} provider={provider} lastRun={state.lastRun} status="running" />
        <AgentCharts agentKey={agentKey} />
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

      {/* Live data visualizations — always rendered */}
      <AgentCharts agentKey={agentKey} />

      {/* AI findings */}
      <ConclusionCards conclusions={state.conclusions} agentKey={agentKey} />

      {/* Audit Trail — collapsed by default */}
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
