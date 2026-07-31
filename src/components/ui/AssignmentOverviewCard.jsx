import { UserCog } from 'lucide-react'
import Button from './Button'
import Badge from './Badge'

// Individual Agent / Office Team / Branch summary card — shared by Ticket Detail
// and Outage Detail so both assignment flows look and behave identically.
// `entity` needs assignedAgents/assignedAgent + assignedTeams/officeTeam fields;
// `branch` is passed explicitly (falls back to entity.branch) since outages derive
// their branch from affected NAS Ports rather than storing it directly.
export default function AssignmentOverviewCard({ entity, branch, onAssign }) {
  const agents = entity.assignedAgents?.length ? entity.assignedAgents : (entity.assignedAgent ? [entity.assignedAgent] : [])
  const teams = entity.assignedTeams?.length ? entity.assignedTeams : (entity.officeTeam ? [entity.officeTeam] : [])
  const branchLabel = branch ?? entity.branch
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-800">Assignment Overview</p>
        <Button size="sm" variant="secondary" icon={<UserCog size={13} />} onClick={onAssign}>Assign</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Individual Agent{agents.length > 1 ? 's' : ''}</p>
          {agents.length ? (
            <div className="flex flex-wrap gap-1">
              {agents.map(a => <Badge key={a} variant="navy" size="sm">{a}</Badge>)}
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Office Team{teams.length > 1 ? 's' : ''}</p>
          {teams.length ? (
            <div className="flex flex-wrap gap-1">
              {teams.map(tm => <Badge key={tm} variant="cyan" size="sm">{tm}</Badge>)}
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Branch</p>
          {branchLabel ? <Badge variant="purple" size="sm">{branchLabel}</Badge> : <span className="text-xs text-gray-300">—</span>}
        </div>
      </div>
    </div>
  )
}
