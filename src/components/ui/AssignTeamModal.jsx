import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { AGENTS, OFFICE_TEAMS } from '../../data/ticketsStore'

// Individual/Team multi-select "Assign Team" modal — shared by Ticket List's row
// Actions menu and Ticket Detail's header Actions menu so both flows stay in sync.
export default function AssignTeamModal({ open, onClose, ticket, onApply }) {
  const [tab, setTab] = useState('individual') // 'individual' | 'team'
  const [agents, setAgents] = useState([])
  const [teams, setTeams] = useState([])
  const [agentSearch, setAgentSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setTab('individual')
    setAgents(ticket?.assignedAgents?.length ? [...ticket.assignedAgents] : (ticket?.assignedAgent ? [ticket.assignedAgent] : []))
    setTeams(ticket?.assignedTeams?.length ? [...ticket.assignedTeams] : (ticket?.officeTeam ? [ticket.officeTeam] : []))
    setAgentSearch(''); setTeamSearch('')
  }, [open, ticket])

  function toggleAgent(name) { setAgents(a => a.includes(name) ? a.filter(x => x !== name) : [...a, name]) }
  function toggleTeam(name) { setTeams(a => a.includes(name) ? a.filter(x => x !== name) : [...a, name]) }

  const filteredAgents = AGENTS.filter(a => a.toLowerCase().includes(agentSearch.toLowerCase()))
  const filteredTeams = OFFICE_TEAMS.filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()))
  const totalSelected = agents.length + teams.length

  return (
    <Modal isOpen={open} onClose={onClose} title={`Assign Team — ${ticket?.id ?? ''}`} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(agents, teams)} disabled={totalSelected === 0}>Assign</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { key: 'individual', label: 'Individual', count: agents.length },
            { key: 'team', label: 'Team', count: teams.length },
          ].map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === t.key ? 'bg-brand-blue text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {/* Individual tab */}
        {tab === 'individual' && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Individual Agents {agents.length > 0 && <span className="text-gray-400 font-normal">· {agents.length} selected</span>}
            </p>

            {agents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {agents.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                    {name}
                    <button type="button" onClick={() => toggleAgent(name)}
                      className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={agentSearch}
                onChange={e => setAgentSearch(e.target.value)}
                placeholder="Search agent..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
              />
            </div>

            <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
              {filteredAgents.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No agents found</p>
              ) : filteredAgents.map(name => {
                const selected = agents.includes(name)
                return (
                  <label key={name}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox"
                      checked={selected}
                      onChange={() => toggleAgent(name)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                    />
                    <span className="text-sm text-gray-700">{name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Team tab */}
        {tab === 'team' && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Teams {teams.length > 0 && <span className="text-gray-400 font-normal">· {teams.length} selected</span>}
            </p>

            {teams.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {teams.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium">
                    {name}
                    <button type="button" onClick={() => toggleTeam(name)}
                      className="text-cyan-700/60 hover:text-cyan-700 transition-colors leading-none">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="Search team..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
              />
            </div>

            <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
              {filteredTeams.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No teams found</p>
              ) : filteredTeams.map(name => {
                const selected = teams.includes(name)
                return (
                  <label key={name}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox"
                      checked={selected}
                      onChange={() => toggleTeam(name)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                    />
                    <span className="text-sm text-gray-700">{name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
