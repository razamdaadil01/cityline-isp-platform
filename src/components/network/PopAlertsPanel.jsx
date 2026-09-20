import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, PackageX, CalendarClock } from 'lucide-react'
import Badge from '../ui/Badge'
import { syncPOPAlertsToNotifications } from '../../data/popAlertsStore'

const TYPE_ICON = {
  cleaning_due: CalendarClock, sla_breach: AlertTriangle, warranty_expiry: ShieldAlert,
  low_stock: PackageX, rent_expiry: CalendarClock,
}
const SEVERITY_BADGE = { high: 'red', medium: 'yellow' }

// Shared "POP Alerts" widget (PRD Phase 2) — mounted on both
// POPManagement.jsx and POPWorkOrders.jsx, the two main POP Management
// landing pages, satisfying the PRD's "computed on each relevant page
// load". Calling syncPOPAlertsToNotifications() on mount both computes the
// live list to render here AND pushes any genuinely new alert into the
// real shared notification bell (Header.jsx) — see that function's own
// file-level note in popAlertsStore.js for how it avoids re-pushing the
// same standing condition on every render.
export default function PopAlertsPanel() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [expanded, setExpanded] = useState(true)

  useEffect(() => { setAlerts(syncPOPAlertsToNotifications()) }, [])

  if (alerts.length === 0) return null

  const highCount = alerts.filter(a => a.severity === 'high').length

  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">POP Alerts</span>
          <Badge variant="gray" size="sm">{alerts.length}</Badge>
          {highCount > 0 && <Badge variant="red" size="sm">{highCount} urgent</Badge>}
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="divide-y divide-surface-border max-h-72 overflow-y-auto border-t border-surface-border">
          {alerts.map(a => {
            const Icon = TYPE_ICON[a.type] ?? AlertTriangle
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(a.link)}
                className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50/70 transition-colors"
              >
                <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                </div>
                <Badge variant={SEVERITY_BADGE[a.severity] ?? 'gray'} size="sm" className="shrink-0">{a.targetRoleLabel}</Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
