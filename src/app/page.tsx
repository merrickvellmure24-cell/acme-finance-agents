'use client'
import { useState, useEffect, useCallback } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/AppSidebar'
import KPIBar from '@/components/KPIBar'
import AgentPanel, { type AgentState } from '@/components/AgentPanel'
import CFOBriefing from '@/components/CFOBriefing'
import TransactionExplorer from '@/components/TransactionExplorer'
import ActionItemsPanel from '@/components/ActionItemsPanel'
import parseAgentOutput from '@/lib/utils/parseAgentOutput'

type AgentKey = 'briefing' | 'cash-reporter' | 'cash-forecast' | 'budget-analyst' | 'ar-collections' | 'ap-vendor' | 'contract-watchdog'
type Tab = AgentKey | 'transactions' | 'actions'

interface ActionItem { id: number; created_at: string; source_agent: string; description: string; amount: number; owner: string; due_date: string; status: string; notes: string }

const AGENT_CONFIG: Record<AgentKey, { label: string; model: string; provider: string; emoji: string }> = {
  'briefing':          { label: 'CFO Briefing',  model: 'DeepSeek-V3.2',          provider: 'SambaNova', emoji: '🏦' },
  'cash-reporter':     { label: 'Cash Position',  model: 'gpt-oss-120b',            provider: 'Cerebras',  emoji: '💵' },
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

  const reloadActions = useCallback(() => {
    fetch('/api/action-items').then(r => r.json()).then(setActionItems).catch(() => {})
  }, [])

  // Load on mount
  useEffect(() => {
    reloadActions()
    // Load latest agent outputs
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

  const openActionCount = actionItems.filter(i => i.status !== 'done').length
  const PAGE_TITLE: Record<Tab, string> = {
    briefing: 'CFO Briefing', 'cash-reporter': 'Cash Position', 'cash-forecast': 'Cash Forecast',
    'budget-analyst': 'Budget', 'ar-collections': 'Collections', 'ap-vendor': 'Payables',
    'contract-watchdog': 'Contracts', transactions: 'Transactions', actions: 'Action Items',
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeTab={activeTab as AgentKey}
        onTabChange={tab => setActiveTab(tab as Tab)}
        agentStates={Object.fromEntries(AGENT_KEYS.map(k => [k, agents[k]]))}
        openActionCount={openActionCount}
        isRunning={isRunning}
        onRunAll={handleRunAll}
      />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-2 border-b border-border px-4 py-3 flex-shrink-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 mx-1" />
          <h2 className="text-sm font-medium text-foreground">{PAGE_TITLE[activeTab]}</h2>
        </header>

        {/* KPI Bar */}
        <KPIBar runStatus={isRunning ? 'running' : 'idle'} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'briefing' && (
            <CFOBriefing
              state={agents['briefing']}
              agentStates={Object.fromEntries(AGENT_KEYS.filter(k => k !== 'briefing').map(k => [k, agents[k]]))}
              onJumpToTab={tab => setActiveTab(tab as Tab)}
              actionItems={actionItems}
              onReloadActions={reloadActions}
              onRerun={() => handleRerun('briefing')}
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
            />
          ))}
          {activeTab === 'transactions' && <TransactionExplorer />}
          {activeTab === 'actions' && <ActionItemsPanel items={actionItems} onUpdate={reloadActions} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
