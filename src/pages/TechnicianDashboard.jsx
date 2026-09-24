import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  Search, ChevronDown, Users, ClipboardList, HeadphonesIcon, Package, Wrench,
  Eye, Lock, MapPin, AlertTriangle, X, Route,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useMicroPermission } from '../data/rolesStore'
import { getAllTechnicians } from '../data/technicianHelpers'
import { subscribeUsers } from '../data/userStore'
import { getInstallations, subscribeInstallations, FIELD_ENGINEERS } from '../data/installationsStore'
import { getRecoveries, subscribeRecoveries, RECOVERY_STATUS_CFG } from '../data/customerRecoveryStore'
import { getTickets, subscribeTickets, technicianWorkload, CLOSED_STATUSES } from '../data/ticketsStore'
import { getAssignments, subscribeAssignments } from '../data/assignmentStore'
import { getAssets, subscribeAssets } from '../data/assetStore'
import { getAssetRepairs, subscribeAssetRepairs } from '../data/assetRepairStore'
import { getTechnicianLocation, getTechnicianDayRoute, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../data/technicianLocations'

// Leaflet's default marker icon URLs are computed relative to its own
// bundled CSS in a way Vite's asset pipeline doesn't resolve on its own —
// a well-known react-leaflet + bundler gotcha that otherwise renders
// broken/invisible marker pins. Re-pointing them at the actual built asset
// URLs these imports resolve to fixes it. Runs once at module load, before
// any <Marker> below ever renders.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Every number on this page is derived from real, existing stores — see
// each store's own subscribe call below. Nothing here is fabricated or
// estimated, with one explicit exception: Live Location renders real
// technicians on a real map, but at mock coordinates (technicianLocations.js)
// since no GPS/location-reporting data source exists anywhere in the app —
// that file's own top-of-file comment says exactly what swaps in later.
// Attendance/shift status and performance ratings or resolution-time
// metrics have no equivalent reasonable basis to mock (no shift schedule,
// no rating, no resolvedAt field exists anywhere to stand in for one), so
// they stay as locked "coming later" placeholders rather than faked
// numbers — confirmed absent by the audit this dashboard was scoped from.

const ACTIVE_INSTALL_STATUSES = [
  'Scheduled', 'Assigned', 'Hardware Collection Pending', 'Dispatched', 'In Progress', 'Rescheduled',
]
const ACTIVE_RECOVERY_STATUSES = ['pending', 'inprogress']

const INSTALL_BADGE = {
  Scheduled: 'blue', Assigned: 'purple', 'Hardware Collection Pending': 'yellow',
  Dispatched: 'cyan', 'In Progress': 'blue', Rescheduled: 'orange',
  Completed: 'green', Cancelled: 'gray',
}

function toISO(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  const [d, m, y] = ddmmyyyy.split('-')
  return `${y}-${m}-${d}`
}

// ── Stat card (matches UserManagement.jsx's own local StatCard pattern) ──

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Detail drill-down ─────────────────────────────────────────────────────

function DetailSection({ title, icon: Icon, count, empty, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-brand-blue" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Badge variant="gray" size="sm">{count}</Badge>
      </div>
      {count > 0 ? <div className="space-y-1.5">{children}</div> : <p className="text-xs text-gray-400 pl-5">{empty}</p>}
    </div>
  )
}

function DetailRow({ left, sub, right }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{left}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  )
}

function TechnicianDetailModal({ isOpen, onClose, row }) {
  if (!row) return null
  const { tech, activeInstalls, activeRecoveries, openTickets, assignmentHoldings, assetHoldings, repairs } = row

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${tech.name} — Details`}
      size="lg"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
          <div className={`w-11 h-11 ${tech.color ?? 'bg-gray-400'} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
            {tech.initials ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{tech.name}</p>
            <p className="text-xs text-gray-500">{tech.email} · {tech.phone}</p>
            <p className="text-xs text-gray-400">{tech.zone ?? '—'} · {tech.branch ?? '—'}</p>
          </div>
        </div>

        <DetailSection
          title="Active Jobs" icon={ClipboardList}
          count={activeInstalls.length + activeRecoveries.length}
          empty="No active installation or recovery jobs."
        >
          {activeInstalls.map(inst => (
            <DetailRow
              key={inst.id}
              left={`${inst.id} — ${inst.customerName}`}
              sub={`${inst.area}, ${inst.city} · ${inst.slotDate}`}
              right={<Badge variant={INSTALL_BADGE[inst.status] ?? 'gray'} size="sm">{inst.status}</Badge>}
            />
          ))}
          {activeRecoveries.map(r => (
            <DetailRow
              key={r.id}
              left={`${r.id} — ${r.customer}`}
              sub={`Hardware recovery visit · ${r.scheduledDate}`}
              right={<Badge variant={RECOVERY_STATUS_CFG[r.status]?.variant ?? 'gray'} size="sm">{RECOVERY_STATUS_CFG[r.status]?.label ?? r.status}</Badge>}
            />
          ))}
        </DetailSection>

        <DetailSection title="Open Tickets" icon={HeadphonesIcon} count={openTickets.length} empty="No open tickets assigned.">
          {openTickets.map(t => (
            <DetailRow
              key={t.id}
              left={`${t.id} — ${t.subject}`}
              sub={`${t.customerName} · ${t.priority}`}
              right={<Badge variant="orange" size="sm">{t.status}</Badge>}
            />
          ))}
        </DetailSection>

        <DetailSection
          title="Current Holdings" icon={Package}
          count={assignmentHoldings.length + assetHoldings.length}
          empty="No hardware or assets currently held."
        >
          {assignmentHoldings.map(a => (
            <DetailRow
              key={a.id}
              left={`${a.assignmentNumber} — ${a.workOrderLabel}`}
              sub={a.storeName}
              right={<span className="text-[11px] text-gray-400">{a.hardwareLines.length + a.wireLines.length} line{a.hardwareLines.length + a.wireLines.length !== 1 ? 's' : ''}</span>}
            />
          ))}
          {assetHoldings.map(a => (
            <DetailRow
              key={a.id}
              left={a.fields?.assetName ?? a.id}
              sub={a.categoryLabel}
              right={<Badge variant="blue" size="sm">Asset</Badge>}
            />
          ))}
        </DetailSection>

        <DetailSection title="Repairs" icon={Wrench} count={repairs.length} empty="No repair records (in-house repairs only — vendor repairs have no technician assigned).">
          {repairs.map(r => (
            <DetailRow
              key={r.id}
              left={`${r.repairId} — ${r.faultDescription}`}
              sub={r.reportedDate}
              right={<Badge variant={r.status === 'Resolved' ? 'green' : 'orange'} size="sm">{r.status}</Badge>}
            />
          ))}
        </DetailSection>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function TechnicianDashboard() {
  const canView = useMicroPermission('Technicians', 'viewTechnicianMonitoringDashboard')

  const [technicians, setTechnicians] = useState(getAllTechnicians)
  const [installations, setInstallations] = useState(getInstallations)
  const [recoveries, setRecoveries] = useState(getRecoveries)
  const [assignments, setAssignments] = useState(getAssignments)
  const [assets, setAssets] = useState(getAssets)
  const [repairs, setRepairs] = useState(getAssetRepairs)
  // Bumped on every tickets change so techStats' useMemo below (which
  // reads getTickets()/technicianWorkload() fresh, not from a subscribed
  // tickets array) knows to recompute — ticketsVersion itself is unused
  // beyond being a dependency.
  const [ticketsVersion, setTicketsVersion] = useState(0)

  useEffect(() => subscribeUsers(() => setTechnicians(getAllTechnicians())), [])
  useEffect(() => subscribeInstallations(setInstallations), [])
  useEffect(() => subscribeRecoveries(setRecoveries), [])
  useEffect(() => subscribeAssignments(setAssignments), [])
  useEffect(() => subscribeAssets(setAssets), [])
  useEffect(() => subscribeAssetRepairs(setRepairs), [])
  useEffect(() => subscribeTickets(() => setTicketsVersion(n => n + 1)), [])

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [detailRow, setDetailRow] = useState(null)
  const [activeTab, setActiveTab] = useState('Table')
  // Map tab's "day route" overlay — at most one technician's route shown at
  // a time, so a second selection replaces rather than stacks with the
  // first; picking the same technician again (or the X below) clears it.
  const [routeTechId, setRouteTechId] = useState(null)

  const techStats = useMemo(() => {
    const allTickets = getTickets()
    return technicians.map(tech => {
      const fe = FIELD_ENGINEERS.find(e => e.userId === tech.id)

      // Matches on name appearing anywhere in a job's comma-joined
      // engineerName list (mirrors assignmentStore.js's own
      // getEngineersForBranch() convention) so a secondary team member on a
      // multi-engineer install counts too, not just the primary engineerId.
      const activeInstalls = installations.filter(inst => {
        const names = (inst.engineerName || '').split(',').map(s => s.trim())
        return names.includes(tech.name) && ACTIVE_INSTALL_STATUSES.includes(inst.status)
      })
      const activeRecoveries = recoveries.filter(r => r.technician === tech.name && ACTIVE_RECOVERY_STATUSES.includes(r.status))

      const openTickets = allTickets.filter(t => t.assignedTechnician === tech.name && !CLOSED_STATUSES.includes(t.status))
      const openTicketCount = technicianWorkload(tech.name)

      const assignmentHoldings = assignments.filter(a => a.status !== 'Returned' && (a.engineerId === fe?.id || a.engineerName === tech.name))
      const assetHoldings = assets.filter(a => a.assignedTo?.engineerName === tech.name)

      const techRepairs = repairs.filter(r => r.technicianId === tech.id)

      return {
        tech, fe,
        activeInstalls, activeRecoveries,
        activeJobCount: activeInstalls.length + activeRecoveries.length,
        openTickets, openTicketCount,
        assignmentHoldings, assetHoldings,
        holdingsCount: assignmentHoldings.length + assetHoldings.length,
        repairs: techRepairs,
      }
    })
  }, [technicians, installations, recoveries, assignments, assets, repairs, ticketsVersion])

  const totalTechnicians = techStats.length
  const onJobCount = techStats.filter(t => t.activeJobCount > 0).length
  const availableCount = totalTechnicians - onJobCount
  const totalOpenTickets = techStats.reduce((s, t) => s + t.openTicketCount, 0)

  const todayISO = new Date().toISOString().slice(0, 10)
  const overdueRecoveries = recoveries.filter(
    r => ACTIVE_RECOVERY_STATUSES.includes(r.status) && toISO(r.scheduledDate) < todayISO
  ).length

  const zones = useMemo(
    () => [...new Set(technicians.map(t => t.zone).filter(Boolean))].sort(),
    [technicians]
  )

  const routeTech = routeTechId ? technicians.find(t => t.id === routeTechId) : null
  const dayRoute = useMemo(
    () => (routeTechId ? getTechnicianDayRoute(routeTechId) : null),
    [routeTechId]
  )

  const filtered = techStats.filter(({ tech }) => {
    if (search && !tech.name.toLowerCase().includes(search.toLowerCase())) return false
    if (zoneFilter && tech.zone !== zoneFilter) return false
    return true
  })

  if (!canView) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-20">
          <Lock size={32} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-900">Access restricted</h2>
          <p className="text-sm text-gray-500 mt-1">
            You don't have permission to view the Technician Monitoring Dashboard. Contact an admin if you need access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technician Monitoring</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Live workload across every technician — built entirely from real installation, ticket, hardware, and repair data
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Technicians" value={totalTechnicians} icon={Users} color="text-brand-blue" bg="bg-brand-blue/10" />
        <StatCard label="Currently On a Job" value={onJobCount} sub={`${availableCount} available`} icon={ClipboardList} color="text-brand-orange" bg="bg-brand-orange/10" />
        <StatCard label="Open Tickets (All Technicians)" value={totalOpenTickets} icon={HeadphonesIcon} color="text-purple-700" bg="bg-purple-100" />
        <StatCard label="Overdue Recovery Visits" value={overdueRecoveries} icon={AlertTriangle} color="text-red-600" bg="bg-red-100" />
      </div>

      {/* Table / Map tabs — mirrors CustomerDetail.jsx's own tab nav
          pattern (border-bottom active indicator, local useState). Stats
          above stay visible regardless of tab; Attendance/Performance below
          are neither "table" nor "map" content, so they stay outside the
          tabs too, as their own persistent section. */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="flex border-b border-surface-border">
          {['Table', 'Map'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px
                ${activeTab === tab
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Table' && (
          <div>
            {/* Filters */}
            <div className="p-4 border-b border-surface-border">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>

                <div className="relative">
                  <select
                    value={zoneFilter}
                    onChange={e => setZoneFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                  >
                    <option value="">All Radius</option>
                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <span className="ml-auto text-xs text-gray-400">{filtered.length} technician{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    {['Technician', 'Branch / Radius', 'Active Jobs', 'Open Tickets', 'Holdings', 'Repairs', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                        No technicians match your filters.
                      </td>
                    </tr>
                  ) : filtered.map(row => (
                    <tr key={row.tech.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 ${row.tech.color ?? 'bg-gray-400'} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {row.tech.initials ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{row.tech.name}</p>
                            <p className="text-xs text-gray-400 truncate">{row.tech.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-400 shrink-0" />
                          <span>{row.tech.zone ?? '—'}</span>
                          <span className="text-gray-400">· {row.tech.branch ?? '—'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant={row.activeJobCount > 0 ? 'blue' : 'gray'} size="sm">{row.activeJobCount} active</Badge>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant={row.openTicketCount > 0 ? 'orange' : 'gray'} size="sm">{row.openTicketCount} open</Badge>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-gray-600">{row.holdingsCount}</td>

                      <td className="px-5 py-3.5 text-sm text-gray-600">{row.repairs.length}</td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setDetailRow(row)}
                          className="p-1.5 rounded-lg hover:bg-brand-blue/10 text-gray-400 hover:text-brand-blue transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Map' && (
          <div>
            {/* Live Location — now mocked (see technicianLocations.js's own
                top-of-file comment for exactly what "mocked" means and how
                this swaps to real data later). Shows every technician, not
                just those matching the Table tab's search/zone filters —
                this tab has no filter controls of its own, so filtering it
                invisibly would be surprising. */}
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-2">
              <MapPin size={15} className="text-brand-blue" />
              <h3 className="text-sm font-semibold text-gray-900">Live Location</h3>
              {routeTech && (
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="yellow" size="sm">Simulated route — for demo purposes</Badge>
                  <span className="text-xs text-gray-500">{routeTech.name}'s day route</span>
                  <button
                    onClick={() => setRouteTechId(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hide route"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="h-[640px] w-full">
              <MapContainer
                center={[MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng]}
                zoom={MAP_DEFAULT_ZOOM}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Clustered so technicians whose mock coordinates sit close
                    together (e.g. several in the same zone) show a count badge
                    instead of silently stacking into one visible marker —
                    clicking a badge zooms in / spiderfies to reveal each real
                    marker underneath. */}
                <MarkerClusterGroup chunkedLoading>
                  {techStats.map(row => {
                    const loc = getTechnicianLocation(row.tech.id)
                    if (!loc) return null
                    return (
                      <Marker key={row.tech.id} position={[loc.lat, loc.lng]}>
                        <Popup>
                          <p className="font-semibold text-sm">{row.tech.name}</p>
                          <p className="text-xs text-gray-500">{row.tech.zone ?? '—'} · {row.tech.branch ?? '—'}</p>
                          <p className="text-xs mt-1">{row.activeJobCount} active job{row.activeJobCount !== 1 ? 's' : ''}</p>
                          <button
                            onClick={() => setRouteTechId(id => id === row.tech.id ? null : row.tech.id)}
                            className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                          >
                            <Route size={12} />
                            {routeTechId === row.tech.id ? 'Hide Day Route' : 'Show Day Route'}
                          </button>
                        </Popup>
                      </Marker>
                    )
                  })}
                </MarkerClusterGroup>

                {/* Simulated "day route" overlay for one technician at a
                    time — kept outside MarkerClusterGroup so these waypoint
                    pins and the connecting line never get folded into the
                    cluster count above. Purely mock data (see
                    getTechnicianDayRoute's own comment) — not derived from
                    any real installation/ticket record. */}
                {dayRoute && (
                  <>
                    <Polyline
                      positions={dayRoute.map(stop => [stop.lat, stop.lng])}
                      pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '6 6' }}
                    />
                    {dayRoute.map((stop, i) => (
                      <CircleMarker
                        key={i}
                        center={[stop.lat, stop.lng]}
                        radius={7}
                        pathOptions={{ color: '#f59e0b', weight: 2, fillColor: '#fff', fillOpacity: 1 }}
                      >
                        <Popup>
                          <p className="text-xs font-semibold text-gray-800">{stop.label}</p>
                          <p className="text-[11px] text-gray-500">{stop.time}{routeTech ? ` · ${routeTech.name}` : ''}</p>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </>
                )}
              </MapContainer>
            </div>
            <div className="px-5 py-2 border-t border-surface-border bg-gray-50/60">
              <p className="text-[11px] text-gray-400">Showing simulated positions — live GPS tracking requires backend integration.</p>
            </div>
          </div>
        )}
      </div>

      <TechnicianDetailModal isOpen={!!detailRow} onClose={() => setDetailRow(null)} row={detailRow} />
    </div>
  )
}
