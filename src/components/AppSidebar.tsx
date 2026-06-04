'use client'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import type { AgentState } from './AgentPanel'

type Tab = 'briefing' | 'cash-reporter' | 'cash-forecast' | 'budget-analyst' | 'ar-collections' | 'ap-vendor' | 'contract-watchdog' | 'transactions' | 'actions'

const HEALTH_DOT: Record<string, string> = {
  idle: 'bg-muted-foreground/40',
  running: 'bg-yellow-400 animate-pulse',
  complete: 'bg-green-500',
  error: 'bg-destructive',
}

function agentDot(state: AgentState) {
  if (state.status === 'idle') return HEALTH_DOT.idle
  if (state.status === 'running') return HEALTH_DOT.running
  if (state.status === 'error') return HEALTH_DOT.error
  if (state.conclusions.some(c => c.level === 'RED')) return 'bg-destructive'
  if (state.conclusions.some(c => c.level === 'YELLOW')) return 'bg-yellow-400'
  return 'bg-green-500'
}

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  agentStates: Record<string, AgentState>
  openActionCount: number
  isRunning: boolean
  onRunAll: () => void
}

const AGENTS = [
  { key: 'cash-reporter' as Tab,     label: 'Cash Position',    icon: '💵' },
  { key: 'cash-forecast' as Tab,     label: 'Cash Forecast',    icon: '📈' },
  { key: 'budget-analyst' as Tab,    label: 'Budget',           icon: '📊' },
  { key: 'ar-collections' as Tab,    label: 'Collections',      icon: '📥' },
  { key: 'ap-vendor' as Tab,         label: 'Payables',         icon: '📤' },
  { key: 'contract-watchdog' as Tab, label: 'Contracts',        icon: '📋' },
]

export function AppSidebar({ activeTab, onTabChange, agentStates, openActionCount, isRunning, onRunAll }: Props) {
  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="px-4 py-3 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Acme Robotics</p>
          <h1 className="text-sm font-semibold text-foreground leading-tight">Finance Command Center</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === 'briefing'}
                onClick={() => onTabChange('briefing')}
                className="font-medium"
              >
                <span>🏦</span>
                <span>CFO Briefing</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Agent tabs */}
        <SidebarGroup>
          <SidebarGroupLabel>AI Agents</SidebarGroupLabel>
          <SidebarMenu>
            {AGENTS.map(({ key, label, icon }) => {
              const state = agentStates[key]
              const dot = state ? agentDot(state) : HEALTH_DOT.idle
              return (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton isActive={activeTab === key} onClick={() => onTabChange(key)}>
                    <span>{icon}</span>
                    <span>{label}</span>
                    <span className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Data tabs */}
        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activeTab === 'transactions'} onClick={() => onTabChange('transactions')}>
                <span>🔍</span>
                <span>Transactions</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activeTab === 'actions'} onClick={() => onTabChange('actions')}>
                <span>✅</span>
                <span>Action Items</span>
                {openActionCount > 0 && (
                  <SidebarMenuBadge>
                    <Badge variant="destructive" className="h-4 text-[10px] px-1">{openActionCount}</Badge>
                  </SidebarMenuBadge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <button
          onClick={onRunAll}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {isRunning ? (
            <><span className="animate-spin">◌</span> Running agents...</>
          ) : (
            <><span>▶</span> Run All Agents</>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}
