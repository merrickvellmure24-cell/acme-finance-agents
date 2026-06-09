'use client'
import { useState, useEffect, useCallback } from 'react'
import TopNav, { type PlatformMode } from '@/components/TopNav'
import KPIBar from '@/components/KPIBar'
import AgentPanel, { type AgentState } from '@/components/AgentPanel'
import CFOBriefing from '@/components/CFOBriefing'
import TransactionExplorer from '@/components/TransactionExplorer'
import ActionItemsPanel from '@/components/ActionItemsPanel'
import ActionItemsSidebar from '@/components/ActionItemsSidebar'
import ActionItemDetail from '@/components/ActionItemDetail'
import HypotheticalPanel, { DEFAULT_HYPOTHETICAL_INPUTS } from '@/components/HypotheticalPanel'
import {
  computeSimDelta,
  aggregateSimDeltas,
  type HypotheticalInputs,
  type AggregateSimDelta,
} from '@/lib/hypotheticals/scenarios'

type AgentKey = 'briefing' | 'cash-reporter' | 'cash-forecast' | 'budget-analyst' | 'ar-collections' | 'ap-vendor' | 'contract-watchdog'
type Tab = AgentKey | 'transactions' | 'actions'

interface ActionItem { id: number; created_at: string; source_agent: string; description: string; amount: number; owner: string; due_date: string; status: string; notes: string }

const AGENT_CONFIG: Record<AgentKey, { label: string; model: string; provider: string; emoji: string }> = {
  'briefing':          { label: 'CFO Briefing',  model: 'DeepSeek-V3.2',          provider: 'SambaNova', emoji: '🏦' },
  'cash-reporter':     { label: 'Treasury',       model: 'gpt-oss-120b',            provider: 'Cerebras',  emoji: '🏛️' },
  'cash-forecast':     { label: 'Cash Forecast',  model: 'llama-3.3-70b-versatile', provider: 'Groq',      emoji: '📈' },
  'budget-analyst':    { label: 'Budget',          model: 'llama-3.3-70b-versatile', provider: 'Groq',      emoji: '📊' },
  'ar-collections':    { label: 'Collections',    model: 'llama-3.3-70b-versatile', provider: 'Groq',      emoji: '📥' },
  'ap-vendor':         { label: 'Payables',        model: 'DeepSeek-V3.2',           provider: 'SambaNova', emoji: '📤' },
  'contract-watchdog': { label: 'Contracts',       model: 'llama-3.3-70b-versatile', provider: 'Groq',      emoji: '📋' },
}

const AGENT_KEYS: AgentKey[] = ['briefing','cash-reporter','cash-forecast','budget-analyst','ar-collections','ap-vendor','contract-watchdog']

function emptyState(): AgentState {
  return { status: 'idle', lastRun: null, dataScanned: [], reasoningSteps: [], conclusions: [], report: '', isStreaming: false }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('briefing')
  const [agents, setAgents] = useState<Record<AgentKey, AgentState>>(
    () => Object.fromEntries(AGENT_KEYS.map(k => [k, emptyState()])) as Record<AgentKey, AgentState>
  )
  const [isRunning, setIsRunning] = useState(false)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [platformMode, setPlatformMode] = useState<PlatformMode>('live')
  const [hypoInputs, setHypoInputs] = useState<HypotheticalInputs>(DEFAULT_HYPOTHETICAL_INPUTS)
  const [simApprovedItems, setSimApprovedItems] = useState<ActionItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)
  const [initialDecision, setInitialDecision] = useState<'approved' | 'delegated' | 'dismissed' | undefined>()
  const [scenariosOpen, setScenariosOpen] = useState(false)

  const isHypothetical = platformMode === 'hypothetical'

  const reloadActions = useCallback(() => {
    fetch('/api/action-items').then(r => r.json()).then(setActionItems).catch(() => {})
  }, [])

  useEffect(() => {
    reloadActions()
    AGENT_KEYS.forEach(key => {
      const route = key === 'briefing' ? 'cfo-briefing' : key
      fetch(`/api/agents/${route}`).then(r => r.json()).then(row => {
        if (!row?.raw_json) return
        try {
          const { parsed } = JSON.parse(String(row.raw_json))
          if (parsed) {
            setAgents(prev => ({
              ...prev,
              [key]: { ...emptyState(), status: 'complete', lastRun: new Date(row.run_at), ...parsed },
            }))
          }
        } catch {}
      }).catch(() => {})
    })
  }, [reloadActions])

  async function handleRunAll() {
    setIsRunning(true)
    setAgents(prev => {
      const next = { ...prev }
      AGENT_KEYS.forEach(k => { next[k] = { ...emptyState(), status: 'running' } })
      return next
    })
    try {
      const res = await fetch('/api/agents/run-all', { method: 'POST' })
      const data = await res.json()
      const keyMap: Record<string, AgentKey> = {
        cashReporter: 'cash-reporter', cashForecast: 'cash-forecast',
        budgetAnalyst: 'budget-analyst', arCollections: 'ar-collections',
        apVendor: 'ap-vendor', contractWatchdog: 'contract-watchdog', cfoBriefing: 'briefing',
      }
      setAgents(prev => {
        const next = { ...prev }
        for (const [dataKey, agentKey] of Object.entries(keyMap)) {
          const result = data[dataKey]
          next[agentKey] = result?.parsed ? {
            status: result.error ? 'error' : 'complete',
            lastRun: new Date(),
            dataScanned: result.parsed.dataScanned ?? [],
            reasoningSteps: result.parsed.reasoningSteps ?? [],
            conclusions: result.parsed.conclusions ?? [],
            report: result.parsed.report ?? '',
            isStreaming: false,
          } : { ...emptyState(), status: 'error', lastRun: new Date() }
        }
        return next
      })
      reloadActions()
    } catch (err) {
      console.error(err)
      setAgents(prev => {
        const next = { ...prev }
        AGENT_KEYS.forEach(k => { if (next[k].status === 'running') next[k] = { ...next[k], status: 'error' } })
        return next
      })
    } finally {
      setIsRunning(false)
    }
  }

  async function handleRerun(key: AgentKey) {
    const route = key === 'briefing' ? 'cfo-briefing' : key
    setAgents(prev => ({ ...prev, [key]: { ...prev[key], status: 'running' } }))
    try {
      const res = await fetch(`/api/agents/${route}`, { method: 'POST' })
      const data = await res.json()
      if (data.parsed) {
        setAgents(prev => ({
          ...prev,
          [key]: { status: 'complete', lastRun: new Date(), dataScanned: data.parsed.dataScanned ?? [], reasoningSteps: data.parsed.reasoningSteps ?? [], conclusions: data.parsed.conclusions ?? [], report: data.parsed.report ?? '', isStreaming: false },
        }))
      }
    } catch {
      setAgents(prev => ({ ...prev, [key]: { ...prev[key], status: 'error' } }))
    }
    reloadActions()
  }

  function handleSelectActionItem(item: ActionItem, decision?: 'approved' | 'delegated') {
    setSelectedItem(item)
    setInitialDecision(decision)
  }

  function handleCloseDrawer() {
    setSelectedItem(null)
    setInitialDecision(undefined)
  }

  function handleSimApprove(item: ActionItem) {
    setSimApprovedItems(prev =>
      prev.some(i => i.id === item.id) ? prev : [...prev, item]
    )
  }

  function handleResetSim() {
    setSimApprovedItems([])
  }

  // When switching away from hypothetical mode, clear sim approvals and close panel
  function handlePlatformModeChange(mode: PlatformMode) {
    if (mode === 'live') { setSimApprovedItems([]); setScenariosOpen(false) }
    setPlatformMode(mode)
  }

  const simDeltas: AggregateSimDelta | null = isHypothetical && simApprovedItems.length > 0
    ? aggregateSimDeltas(simApprovedItems.map(computeSimDelta))
    : null

  const showSidebar = activeTab !== 'actions' && activeTab !== 'transactions'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopNav
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab as Tab)}
        platformMode={platformMode}
        onPlatformModeChange={handlePlatformModeChange}
        isRunning={isRunning}
        onUpdate={handleRunAll}
        agentStates={Object.fromEntries(AGENT_KEYS.map(k => [k, agents[k]]))}
        onOpenScenarios={() => setScenariosOpen(o => !o)}
        scenariosOpen={scenariosOpen}
      />

      {isHypothetical && (
        <div className="px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/30 text-xs text-yellow-300 text-center flex-shrink-0">
          ⚗ Scenario mode — changes are simulated only
          {simApprovedItems.length > 0 && (
            <span className="ml-2 font-semibold">· {simApprovedItems.length} item{simApprovedItems.length > 1 ? 's' : ''} sim-approved</span>
          )}
          <span className="ml-2 text-yellow-400/50">· Click ⚙ Scenarios in the nav to adjust assumptions</span>
        </div>
      )}

      {/* Floating scenario panel — fixed overlay, no layout impact */}
      {isHypothetical && scenariosOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setScenariosOpen(false)}
          />
          <div className="fixed top-[52px] right-4 z-50 w-[480px] max-w-[calc(100vw-2rem)] shadow-2xl rounded-xl border border-yellow-500/40 overflow-hidden">
            <HypotheticalPanel inputs={hypoInputs} onChange={setHypoInputs} onClose={() => setScenariosOpen(false)} />
          </div>
        </>
      )}

      <KPIBar runStatus={isRunning ? 'running' : 'idle'} simDeltas={simDeltas} />

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-y-auto min-w-0">
          {activeTab === 'briefing' && (
            <CFOBriefing
              state={agents['briefing']}
              agentStates={Object.fromEntries(AGENT_KEYS.filter(k => k !== 'briefing').map(k => [k, agents[k]]))}
              onJumpToTab={tab => setActiveTab(tab as Tab)}
              onRerun={() => handleRerun('briefing')}
              simDeltas={simDeltas}
            />
          )}
          {(AGENT_KEYS.filter(k => k !== 'briefing') as AgentKey[]).map(key => activeTab === key && (
            <AgentPanel
              key={key}
              agentKey={key}
              agentName={`${AGENT_CONFIG[key].emoji} ${AGENT_CONFIG[key].label}`}
              model={AGENT_CONFIG[key].model}
              provider={AGENT_CONFIG[key].provider}
              state={agents[key]}
              onRerun={() => handleRerun(key)}
              hypoInputs={isHypothetical ? hypoInputs : undefined}
            />
          ))}
          {activeTab === 'transactions' && <TransactionExplorer />}
          {activeTab === 'actions' && <ActionItemsPanel items={actionItems} onUpdate={reloadActions} />}
        </main>

        {showSidebar && (
          <ActionItemsSidebar
            items={actionItems}
            onSelectItem={handleSelectActionItem}
            onViewAll={() => setActiveTab('actions')}
            isHypothetical={isHypothetical}
            simApprovedItems={simApprovedItems}
            simDeltas={simDeltas}
            onResetSim={handleResetSim}
            onSimApprove={handleSimApprove}
          />
        )}
      </div>

      <ActionItemDetail
        item={selectedItem}
        initialDecision={initialDecision}
        simulationMode={isHypothetical}
        onClose={handleCloseDrawer}
        onUpdate={reloadActions}
        onSimApprove={handleSimApprove}
      />
    </div>
  )
}
