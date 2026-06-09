'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { AgentState } from './AgentPanel'

export type DomainTab = 'briefing' | 'cash-reporter' | 'cash-forecast' | 'budget-analyst' | 'ar-collections' | 'ap-vendor'
export type PlatformMode = 'live' | 'hypothetical'

const DOMAIN_TABS: { key: DomainTab; label: string; icon: string }[] = [
  { key: 'cash-reporter', label: 'Treasury', icon: '🏛️' },
  { key: 'cash-forecast', label: 'Forecast', icon: '📈' },
  { key: 'budget-analyst', label: 'Budget', icon: '📊' },
  { key: 'ar-collections', label: 'Collections', icon: '📥' },
  { key: 'ap-vendor', label: 'Payables', icon: '📤' },
]

const DATA_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'transactions', label: 'Transactions', icon: '📄' },
  { key: 'contract-watchdog', label: 'Contracts', icon: '📋' },
  { key: 'actions', label: 'All Actions', icon: '✅' },
]

const RESOURCE_LINKS: { href: string; label: string; icon: string; sub: string }[] = [
  { href: '/about', label: 'Project Resources', icon: '📄', sub: 'README, tests, run commands' },
  { href: 'https://acme-finance-agents-xzqv.vercel.app', label: 'Finance Academy', icon: '🎓', sub: 'acme-finance-agents-xzqv.vercel.app' },
  { href: '/welcome', label: 'Platform Guide', icon: '🗺️', sub: 'Agents, capabilities, demo' },
]

const AGENT_TOTAL = 7

interface Props {
  activeTab: DomainTab | 'transactions' | 'contract-watchdog' | 'actions'
  onTabChange: (tab: DomainTab | 'briefing' | 'transactions' | 'contract-watchdog' | 'actions') => void
  platformMode: PlatformMode
  onPlatformModeChange: (mode: PlatformMode) => void
  isRunning: boolean
  onUpdate: () => void
  agentStates?: Record<string, AgentState>
  onOpenScenarios?: () => void
  scenariosOpen?: boolean
}

export default function TopNav({ activeTab, onTabChange, platformMode, onPlatformModeChange, isRunning, onUpdate, agentStates, onOpenScenarios, scenariosOpen }: Props) {
  const [dataOpen, setDataOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const resourcesRef = useRef<HTMLDivElement>(null)
  const isBriefing = activeTab === 'briefing'
  const isDataTab = ['transactions', 'contract-watchdog', 'actions'].includes(activeTab)

  const doneCount = agentStates
    ? Object.values(agentStates).filter(s => s.status === 'complete').length
    : 0

  useEffect(() => {
    if (!dataOpen && !resourcesOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDataOpen(false)
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dataOpen, resourcesOpen])

  return (
    <header className="flex-shrink-0 border-b border-border bg-background">
      <div className="flex items-center gap-4 px-4 py-2.5">
        {/* Brand */}
        <div className="flex-shrink-0 min-w-[140px]">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Acme Robotics</p>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground leading-tight">Finance Command Center</h1>
            {/* Resources dropdown */}
            <div className="relative" ref={resourcesRef}>
              <button
                onClick={() => setResourcesOpen(o => !o)}
                title="Resources — README, Finance Academy, Platform Guide"
                className="w-4 h-4 rounded-full border border-border text-[9px] text-muted-foreground/60 hover:text-foreground hover:border-primary flex items-center justify-center transition"
              >
                ?
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden w-56">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Resources</p>
                  </div>
                  {RESOURCE_LINKS.map(({ href, label, icon, sub }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted transition"
                    >
                      <span className="text-base shrink-0 mt-0.5">{icon}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{sub}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60">Morning briefing · First hour</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex items-center justify-center gap-1 flex-wrap">
          <button
            onClick={() => onTabChange('briefing')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              isBriefing
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            🏦 Briefing
          </button>
          <span className="text-border mx-1">|</span>
          {DOMAIN_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === key
                  ? 'bg-muted text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {icon} {label}
            </button>
          ))}
          <span className="text-border mx-1">|</span>

          {/* Data dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDataOpen(o => !o)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                isDataTab
                  ? 'bg-muted text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Data
              <span className={`text-[9px] transition-transform ${dataOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {dataOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden min-w-[160px]">
                {DATA_ITEMS.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => { onTabChange(key as 'transactions' | 'contract-watchdog' | 'actions'); setDataOpen(false) }}
                    className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs transition hover:bg-muted ${
                      activeTab === key ? 'text-foreground bg-muted/50' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              onClick={() => onPlatformModeChange('live')}
              className={`px-2.5 py-1.5 transition font-medium ${platformMode === 'live' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Live
            </button>
            <button
              onClick={() => onPlatformModeChange('hypothetical')}
              className={`px-2.5 py-1.5 transition font-medium border-l border-border ${platformMode === 'hypothetical' ? 'bg-yellow-500/20 text-yellow-300' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ⚗ Hypo
            </button>
          </div>
          {platformMode === 'hypothetical' && onOpenScenarios && (
            <button
              onClick={onOpenScenarios}
              title="Configure scenario assumptions"
              className={`h-8 px-2.5 rounded-md text-xs border transition flex items-center gap-1 ${
                scenariosOpen
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              ⚙ Scenarios
            </button>
          )}
          <Button size="sm" onClick={onUpdate} disabled={isRunning} className="h-8 text-xs gap-1.5 min-w-[90px]">
            {isRunning ? (
              <><span className="animate-spin inline-block">◌</span> {doneCount}/{AGENT_TOTAL}</>
            ) : (
              <>↻ Update</>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
