import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Server, ClipboardList, CalendarClock, PackageX, ChevronDown, Eye, MapPinned } from 'lucide-react'
import { getPOPs, subscribePOPs, POP_STATUSES, POP_TYPES } from '../data/popStore'
import { getWorkOrders, subscribeWorkOrders, CLOSED_WORK_ORDER_STATUSES } from '../data/workOrderStore'
import { getPOPAlerts } from '../data/popAlertsStore'
import { getHDDProjects, getSiteProjects } from '../data/projectStore'

// Same react-leaflet + leaflet.markercluster setup as TechnicianDashboard.jsx's
// own Map tab — reused exactly, including the marker-icon-URL fix (a
// well-known react-leaflet + Vite bundler gotcha, see that file's own
// comment) even though every POP marker below uses its own colored
// L.divIcon rather than the Leaflet default pin; harmless to keep and
// avoids silently depending on TechnicianDashboard.jsx happening to run
// first in whatever page loads.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Mumbai, not TechnicianDashboard.jsx's own MAP_DEFAULT_CENTER (Delhi/Noida,
// technicianLocations.js's mock data) — every seeded POP sits in Mumbai, so
// a Mumbai-area fallback is the sensible default when there's no POP data
// to average a center from at all.
const FALLBACK_CENTER = { lat: 19.09, lng: 72.87 }
const DEFAULT_ZOOM = 11

// Base status color, before the Fault/Under Maintenance overrides below —
// 'Planned'/'Under Construction' share the same grey (neither is live yet),
// 'Inactive' also grey (not currently in service), 'Decommissioned' a
// darker grey (kept visually distinct from "not live yet" while still
// reading as "off"). Decommissioned POPs are additionally hidden from the
// map by default (see the showDecommissioned toggle below) rather than
// just recolored — "hidden by default" per the PRD's own wording — but
// still get a real color here for when the toggle reveals them.
const STATUS_COLOR = {
  Active: '#10b981',
  Planned: '#9ca3af',
  'Under Construction': '#9ca3af',
  Inactive: '#9ca3af',
  Decommissioned: '#4b5563',
}
const FAULT_COLOR = '#ef4444'
const MAINTENANCE_COLOR = '#f59e0b'

function popDotIcon(hexColor) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${hexColor};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.45);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}

// Fault (red) outranks Under Maintenance (yellow), which outranks the
// POP's own base lifecycle status color — cross-references workOrderStore.js
// directly (open, non-closed Work Orders for this POP) rather than any
// stored field on the POP record itself, so the map always reflects
// current Work Order state with no separate sync step.
function popMarkerInfo(pop, openWorkOrdersByPOP) {
  const openWOs = openWorkOrdersByPOP.get(pop.id) ?? []
  const hasFault = openWOs.some(wo => wo.priority === 'Critical' || wo.priority === 'High')
  if (hasFault) return { color: FAULT_COLOR, statusLabel: 'Fault' }
  if (openWOs.length > 0) return { color: MAINTENANCE_COLOR, statusLabel: 'Under Maintenance' }
  return { color: STATUS_COLOR[pop.status] ?? '#9ca3af', statusLabel: pop.status }
}

export default function POPDashboard() {
  const [pops, setPops] = useState(getPOPs)
  useEffect(() => subscribePOPs(setPops), [])
  const [workOrders, setWorkOrders] = useState(getWorkOrders)
  useEffect(() => subscribeWorkOrders(setWorkOrders), [])

  // Real Projects (both HDD and Site) — used only to populate the Project
  // filter's option list and to resolve a POP's own projectId to a name;
  // neither store publishes a subscribe hook a page like this typically
  // needs to react to (Projects aren't edited from here), so a plain read
  // on mount is consistent with how POPDetail.jsx's own Project Linkage
  // dropdown already reads them.
  const projects = useMemo(() => [
    ...getHDDProjects().map(p => ({ id: p.id, name: p.title })),
    ...getSiteProjects().map(p => ({ id: p.id, name: p.name })),
  ], [])

  const [fRegion, setFRegion] = useState('')
  const [fProject, setFProject] = useState('')
  const [fType, setFType] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [showDecommissioned, setShowDecommissioned] = useState(false)

  const regions = useMemo(
    () => [...new Set(pops.map(p => p.locality?.area).filter(Boolean))].sort(),
    [pops]
  )

  const openWorkOrdersByPOP = useMemo(() => {
    const map = new Map()
    workOrders.forEach(wo => {
      if (CLOSED_WORK_ORDER_STATUSES.includes(wo.status)) return
      if (!map.has(wo.popId)) map.set(wo.popId, [])
      map.get(wo.popId).push(wo)
    })
    return map
  }, [workOrders])

  const filteredPops = useMemo(() => pops.filter(pop => {
    if (!showDecommissioned && pop.status === 'Decommissioned') return false
    if (fRegion && pop.locality?.area !== fRegion) return false
    if (fProject && pop.projectId !== fProject) return false
    if (fType && pop.popType !== fType) return false
    if (fStatus && pop.status !== fStatus) return false
    return true
  }), [pops, fRegion, fProject, fType, fStatus, showDecommissioned])

  const mappablePops = useMemo(() => filteredPops.filter(p => p.latitude != null && p.longitude != null), [filteredPops])
  const missingCoordsCount = filteredPops.length - mappablePops.length

  const mapCenter = useMemo(() => {
    if (mappablePops.length === 0) return FALLBACK_CENTER
    const lat = mappablePops.reduce((s, p) => s + p.latitude, 0) / mappablePops.length
    const lng = mappablePops.reduce((s, p) => s + p.longitude, 0) / mappablePops.length
    return { lat, lng }
  }, [mappablePops])

  // Quick Stats — deliberately computed from the FULL unfiltered data set,
  // not `filteredPops`/`mappablePops` — an at-a-glance KPI strip that stays
  // stable while the Region/Project/Type/Status filters only scope which
  // pins the map itself shows below it, same "stats are global, filters
  // just scope the view" split TicketList.jsx's own stat cards + filters
  // already use.
  const popAlerts = useMemo(() => getPOPAlerts(), [pops, workOrders])
  const stats = useMemo(() => {
    const openWorkOrders = workOrders.filter(wo => !CLOSED_WORK_ORDER_STATUSES.includes(wo.status)).length
    const overdueCleaningPOPs = new Set(popAlerts.filter(a => a.type === 'cleaning_due').map(a => a.popId)).size
    const lowStockAlerts = popAlerts.filter(a => a.type === 'low_stock').length
    return { totalPOPs: pops.length, openWorkOrders, overdueCleaningPOPs, lowStockAlerts }
  }, [pops, workOrders, popAlerts])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">POP Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live map and health overview across every Point of Presence</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total POPs', value: stats.totalPOPs, icon: Server, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
          { label: 'Open Work Orders', value: stats.openWorkOrders, icon: ClipboardList, color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
          { label: 'Overdue Cleanings', value: stats.overdueCleaningPOPs, icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Low Stock Alerts', value: stats.lowStockAlerts, icon: PackageX, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex flex-wrap items-center gap-3">
        {[
          ['Region', fRegion, setFRegion, regions, 'All Regions'],
          ['Project', fProject, setFProject, projects.map(p => p.id), 'All Projects'],
          ['POP Type', fType, setFType, POP_TYPES, 'All Types'],
          ['Status', fStatus, setFStatus, POP_STATUSES, 'All Statuses'],
        ].map(([label, value, setter, options, placeholder]) => (
          <div key={label} className="relative">
            <select
              value={value}
              onChange={e => setter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            >
              <option value="">{placeholder}</option>
              {options.map(o => (
                <option key={o} value={o}>{label === 'Project' ? (projects.find(p => p.id === o)?.name ?? o) : o}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ))}

        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showDecommissioned}
            onChange={e => setShowDecommissioned(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
          />
          Show Decommissioned
        </label>

        <span className="ml-auto text-xs text-gray-400">{mappablePops.length} of {pops.length} POPs shown</span>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPinned size={15} className="text-brand-blue" />
            <h3 className="text-sm font-semibold text-gray-900">POP Map</h3>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto text-[11px] text-gray-500">
            {[
              ['Active', STATUS_COLOR.Active],
              ['Planned / Under Construction', STATUS_COLOR.Planned],
              ['Decommissioned', STATUS_COLOR.Decommissioned],
              ['Under Maintenance', MAINTENANCE_COLOR],
              ['Fault', FAULT_COLOR],
            ].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[560px] w-full">
          <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={DEFAULT_ZOOM} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup chunkedLoading>
              {mappablePops.map(pop => {
                const { color, statusLabel } = popMarkerInfo(pop, openWorkOrdersByPOP)
                const openCount = (openWorkOrdersByPOP.get(pop.id) ?? []).length
                return (
                  <Marker key={pop.id} position={[pop.latitude, pop.longitude]} icon={popDotIcon(color)}>
                    <Popup>
                      <div className="space-y-1 min-w-[180px]">
                        <p className="font-semibold text-sm text-gray-900">{pop.name}</p>
                        <p className="text-xs">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white"
                            style={{ background: color }}
                          >
                            {statusLabel}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">Last cleaned: {pop.lastCleaningDate ?? 'Never'}</p>
                        <p className="text-xs text-gray-500">{openCount} open Work Order{openCount !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500">{pop.equipment?.length ?? 0} equipment item{(pop.equipment?.length ?? 0) !== 1 ? 's' : ''}</p>
                        <Link
                          to={`/network/pops/${pop.id}`}
                          className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                        >
                          <Eye size={12} /> View POP
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
        <div className="px-5 py-2 border-t border-surface-border bg-gray-50/60">
          <p className="text-[11px] text-gray-400">
            {missingCoordsCount > 0
              ? `${missingCoordsCount} matching POP${missingCoordsCount !== 1 ? 's have' : ' has'} no latitude/longitude on record and ${missingCoordsCount !== 1 ? "aren't" : "isn't"} shown on the map.`
              : "Pin color reflects live status — Fault and Under Maintenance are derived from each POP's open Work Orders."}
          </p>
        </div>
      </div>
    </div>
  )
}
