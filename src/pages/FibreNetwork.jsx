import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Popup, Polyline, CircleMarker, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  GitBranch, CheckCircle, AlertTriangle, MapPin, Plus, Search, X,
  ChevronDown, MoreVertical, Edit2, Trash2, Eye, Filter,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import {
  getFibreRoutes, subscribeFibreRoutes, saveFibreRoute, deleteFibreRoute,
  FIBRE_ROUTE_STATUSES, CABLE_TYPES, CORE_COUNTS,
  getInfraPoints, subscribeInfraPoints, saveInfraPoint, deleteInfraPoint,
  INFRA_TYPES, INFRA_STATUSES,
  getFibreFaults, subscribeFibreFaults, saveFibreFault, updateFibreFault,
  FAULT_TYPES, FAULT_SEVERITIES,
} from '../data/fibreStore'
import { getActiveUsers } from '../data/userStore'

// Same react-leaflet + Vite bundler icon-URL fix as POPDashboard.jsx —
// every marker below uses L.divIcon or CircleMarker so the default pin
// never actually renders, but keeping the fix avoids a silent console
// warning if leaflet tries to resolve the URL before our markers load.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MAP_CENTER = [19.09, 72.87]
const MAP_ZOOM = 12

const ROUTE_COLOR = {
  Active: '#10B981',
  Damaged: '#EF4444',
  'Under Repair': '#F59E0B',
  Inactive: '#9CA3AF',
}
const ROUTE_DASH = { Damaged: '8 4', 'Under Repair': '4 4' }
const ROUTE_WEIGHT = { Inactive: 3 }

const INFRA_COLOR = {
  'Splice Point': '#3B82F6',
  Splitter: '#8B5CF6',
  Manhole: '#6B7280',
  Handhole: '#B45309',
}

const ROUTE_STATUS_BADGE = { Active: 'green', Damaged: 'red', 'Under Repair': 'yellow', Inactive: 'gray' }
const INFRA_TYPE_BADGE = { 'Splice Point': 'blue', Splitter: 'purple', Manhole: 'gray', Handhole: 'orange' }
const INFRA_STATUS_BADGE = { Active: 'green', Damaged: 'red', 'Under Maintenance': 'yellow' }
const SEVERITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'blue' }
const FAULT_STATUS_BADGE = { Open: 'red', 'In Progress': 'yellow', Resolved: 'green' }

function formatLength(m) {
  if (!m) return '—'
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function faultDivIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:22px;height:22px;">
      <div style="width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:19px solid #EF4444;position:absolute;top:3px;left:0;"></div>
      <span style="position:absolute;bottom:2px;left:0;width:22px;text-align:center;font-size:9px;font-weight:bold;color:white;line-height:1;">!</span>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  })
}

// ── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ stats, routes, infraPoints, faults }) {
  const activeFaults = faults.filter(f => f.status !== 'Resolved')
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Routes', value: stats.totalRoutes, icon: GitBranch, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
          { label: 'Active Routes', value: stats.activeRoutes, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Open Faults', value: stats.openFaults, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Infrastructure Points', value: stats.infraCount, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
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

      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-900">Network Map</h3>
          <p className="text-xs text-gray-400 mt-0.5">Fibre routes, infrastructure points and active faults</p>
        </div>
        <div className="relative h-[500px]">
          <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routes.filter(r => r.coordinates?.length > 1).map(route => (
              <Polyline
                key={route.id}
                positions={route.coordinates.map(c => [c.lat, c.lng])}
                pathOptions={{
                  color: ROUTE_COLOR[route.status] ?? '#9CA3AF',
                  weight: ROUTE_WEIGHT[route.status] ?? 4,
                  dashArray: ROUTE_DASH[route.status],
                }}
              >
                <Popup>
                  <div className="space-y-1 min-w-[180px]">
                    <p className="font-semibold text-sm text-gray-900">{route.name}</p>
                    <p className="text-xs text-gray-600">{route.cableType} · {route.coreCount} cores</p>
                    <p className="text-xs text-gray-500">Length: {formatLength(route.lengthMeters)}</p>
                    <p className="text-xs text-gray-500">Status: {route.status}</p>
                  </div>
                </Popup>
              </Polyline>
            ))}
            {infraPoints.filter(p => p.latitude && p.longitude).map(pt => (
              <CircleMarker
                key={pt.id}
                center={[pt.latitude, pt.longitude]}
                radius={8}
                pathOptions={{
                  color: INFRA_COLOR[pt.type] ?? '#6B7280',
                  fillColor: INFRA_COLOR[pt.type] ?? '#6B7280',
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 min-w-[160px]">
                    <p className="font-semibold text-sm text-gray-900">{pt.name}</p>
                    <p className="text-xs text-gray-600">{pt.type}</p>
                    <p className="text-xs text-gray-500">Status: {pt.status}</p>
                    {pt.description && <p className="text-xs text-gray-400">{pt.description}</p>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            {activeFaults.filter(f => f.latitude && f.longitude).map(fault => (
              <Marker key={fault.id} position={[fault.latitude, fault.longitude]} icon={faultDivIcon()}>
                <Popup>
                  <div className="space-y-1 min-w-[180px]">
                    <p className="font-semibold text-sm text-red-700">{fault.faultType}</p>
                    <p className="text-xs text-gray-600">Route: {fault.routeName}</p>
                    <p className="text-xs text-gray-600">Severity: {fault.severity}</p>
                    <p className="text-xs text-gray-500">Reported: {formatDate(fault.reportedAt)}</p>
                    {fault.assignedTo && <p className="text-xs text-gray-500">Assigned: {fault.assignedTo}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-xl border border-gray-200 shadow-lg p-3 text-xs space-y-1 min-w-[160px] pointer-events-none">
            <p className="font-semibold text-gray-700 text-[11px] mb-1.5">Legend</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold">Routes</p>
            {[['Active', '#10B981'], ['Damaged', '#EF4444'], ['Under Repair', '#F59E0B'], ['Inactive', '#9CA3AF']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold pt-1">Infrastructure</p>
            {[['Splice Point', '#3B82F6'], ['Splitter', '#8B5CF6'], ['Manhole', '#6B7280']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5">
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '9px solid #EF4444' }} />
              <span className="text-gray-600">Open Fault</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Routes Tab ──────────────────────────────────────────────────────────────

const EMPTY_ROUTE_FORM = {
  name: '', cableType: CABLE_TYPES[0], coreCount: 24, lengthMeters: '',
  startPoint: '', endPoint: '', linkedOltId: '', status: FIBRE_ROUTE_STATUSES[0],
  installedOn: '', notes: '',
}

function RoutesTab({ routes, setTab }) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fCableType, setFCableType] = useState('')
  const [fCoreCount, setFCoreCount] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_ROUTE_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!menuId) return
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return routes.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) &&
          !r.startPoint.toLowerCase().includes(q) &&
          !r.endPoint.toLowerCase().includes(q)) return false
      if (fCableType && r.cableType !== fCableType) return false
      if (fCoreCount && r.coreCount !== Number(fCoreCount)) return false
      if (fStatus && r.status !== fStatus) return false
      return true
    })
  }, [routes, search, fCableType, fCoreCount, fStatus])

  function openAdd() { setEditTarget(null); setForm(EMPTY_ROUTE_FORM); setErrors({}); setEditOpen(true) }

  function openEdit(route) {
    setEditTarget(route)
    setForm({
      name: route.name, cableType: route.cableType, coreCount: route.coreCount,
      lengthMeters: route.lengthMeters, startPoint: route.startPoint, endPoint: route.endPoint,
      linkedOltId: route.linkedOltId ?? '', status: route.status,
      installedOn: route.installedOn ?? '', notes: route.notes ?? '',
    })
    setErrors({})
    setEditOpen(true)
    setMenuId(null)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.startPoint.trim()) e.startPoint = 'Required'
    if (!form.endPoint.trim()) e.endPoint = 'Required'
    if (!form.lengthMeters || isNaN(Number(form.lengthMeters))) e.lengthMeters = 'Valid number required'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    saveFibreRoute({
      ...(editTarget ? { id: editTarget.id, coordinates: editTarget.coordinates } : {}),
      ...form,
      coreCount: Number(form.coreCount),
      lengthMeters: Number(form.lengthMeters),
    })
    setEditOpen(false)
  }

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, start/end point…"
              className="pl-9 pr-8 py-1.5 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showFilters ? 'border-brand-blue text-brand-blue bg-brand-blue/5' : 'border-surface-border text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={13} /> Filters
          </button>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Route</Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-surface-border shadow-card px-4 py-3">
          {[
            ['Cable Type', fCableType, setFCableType, CABLE_TYPES, 'All Types'],
            ['Core Count', fCoreCount, setFCoreCount, CORE_COUNTS.map(String), 'All Counts'],
            ['Status', fStatus, setFStatus, FIBRE_ROUTE_STATUSES, 'All Statuses'],
          ].map(([label, value, setter, options, placeholder]) => (
            <div key={label} className="relative">
              <select value={value} onChange={e => setter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white">
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ))}
          <button onClick={() => { setFCableType(''); setFCoreCount(''); setFStatus('') }} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Route ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">Route Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Cable Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Length</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[220px]">Start → End</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">
                  <GitBranch size={32} className="mx-auto mb-2 text-gray-200" />No routes found
                </td></tr>
              ) : filtered.map(route => (
                <tr key={route.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue">{route.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{route.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{route.cableType}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{route.coreCount}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{formatLength(route.lengthMeters)}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {route.startPoint}<span className="text-gray-400 mx-1">→</span>{route.endPoint}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROUTE_STATUS_BADGE[route.status] ?? 'gray'} dot size="sm">{route.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-12 text-center">
                    <button onClick={e => openMenu(e, route.id)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === route.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const route = routes.find(r => r.id === menuId)
        if (!route) return null
        return (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }} className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44">
            <button onClick={() => openEdit(route)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button onClick={() => { setTab('overview'); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <MapPin size={13} className="text-gray-400 shrink-0" /> View on Map
            </button>
            <button onClick={() => { setDeleteTarget(route); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={13} className="text-red-400 shrink-0" /> Delete
            </button>
          </div>
        )
      })()}

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={editTarget ? 'Edit Route' : 'Add Fibre Route'} size="lg"
        footer={<><Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave}>{editTarget ? 'Save Changes' : 'Add Route'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Route Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Andheri West Backbone"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.name ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cable Type <span className="text-red-500">*</span></label>
            <select value={form.cableType} onChange={e => f('cableType', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {CABLE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Core Count <span className="text-red-500">*</span></label>
            <select value={form.coreCount} onChange={e => f('coreCount', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {CORE_COUNTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Length (meters) <span className="text-red-500">*</span></label>
            <input type="number" min={1} value={form.lengthMeters} onChange={e => f('lengthMeters', e.target.value)} placeholder="e.g. 2400"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.lengthMeters ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.lengthMeters && <p className="text-red-500 text-xs mt-0.5">{errors.lengthMeters}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
            <select value={form.status} onChange={e => f('status', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {FIBRE_ROUTE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Point <span className="text-red-500">*</span></label>
            <input value={form.startPoint} onChange={e => f('startPoint', e.target.value)} placeholder="e.g. Core POP - HQ"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.startPoint ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.startPoint && <p className="text-red-500 text-xs mt-0.5">{errors.startPoint}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Point <span className="text-red-500">*</span></label>
            <input value={form.endPoint} onChange={e => f('endPoint', e.target.value)} placeholder="e.g. OLT-AW-01 - Versova"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.endPoint ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.endPoint && <p className="text-red-500 text-xs mt-0.5">{errors.endPoint}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Linked OLT</label>
            <input value={form.linkedOltId} onChange={e => f('linkedOltId', e.target.value)} placeholder="e.g. OLT-01"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Installed On</label>
            <input type="date" value={form.installedOn} onChange={e => f('installedOn', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none" />
          </div>
          <div className="col-span-2 bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-700">Route path coordinates will be set via map editor in a future release.</p>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Route?" size="sm"
        footer={<><Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button size="sm" variant="danger" onClick={() => { deleteFibreRoute(deleteTarget.id); setDeleteTarget(null) }}>Delete</Button></>}>
        <p className="text-sm text-gray-600">Delete route <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}

// ── Infrastructure Tab ──────────────────────────────────────────────────────

const EMPTY_INFRA_FORM = {
  name: '', type: INFRA_TYPES[0], routeId: '', latitude: '', longitude: '',
  description: '', status: INFRA_STATUSES[0], installedOn: '', lastInspected: '',
}

function InfraTab({ infraPoints, routes }) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fType, setFType] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_INFRA_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!menuId) return
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return infraPoints.filter(pt => {
      if (q && !pt.name.toLowerCase().includes(q) &&
          !pt.type.toLowerCase().includes(q) &&
          !(routes.find(r => r.id === pt.routeId)?.name ?? '').toLowerCase().includes(q)) return false
      if (fType && pt.type !== fType) return false
      if (fStatus && pt.status !== fStatus) return false
      return true
    })
  }, [infraPoints, routes, search, fType, fStatus])

  function openAdd() { setEditTarget(null); setForm(EMPTY_INFRA_FORM); setErrors({}); setEditOpen(true) }

  function openEdit(pt) {
    setEditTarget(pt)
    setForm({
      name: pt.name, type: pt.type, routeId: pt.routeId,
      latitude: pt.latitude, longitude: pt.longitude,
      description: pt.description ?? '', status: pt.status,
      installedOn: pt.installedOn ?? '', lastInspected: pt.lastInspected ?? '',
    })
    setErrors({})
    setEditOpen(true)
    setMenuId(null)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.routeId) e.routeId = 'Required'
    if (!form.latitude || isNaN(Number(form.latitude))) e.latitude = 'Valid number required'
    if (!form.longitude || isNaN(Number(form.longitude))) e.longitude = 'Valid number required'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    saveInfraPoint({
      ...(editTarget ? { id: editTarget.id } : {}),
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    })
    setEditOpen(false)
  }

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, type, route…"
              className="pl-9 pr-8 py-1.5 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showFilters ? 'border-brand-blue text-brand-blue bg-brand-blue/5' : 'border-surface-border text-gray-600 hover:bg-gray-50'}`}>
            <Filter size={13} /> Filters
          </button>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Point</Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-surface-border shadow-card px-4 py-3">
          {[
            ['Type', fType, setFType, INFRA_TYPES, 'All Types'],
            ['Status', fStatus, setFStatus, INFRA_STATUSES, 'All Statuses'],
          ].map(([label, value, setter, options, placeholder]) => (
            <div key={label} className="relative">
              <select value={value} onChange={e => setter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white">
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ))}
          <button onClick={() => { setFType(''); setFStatus('') }} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Point ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Route</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Last Inspected</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-gray-400">
                  <MapPin size={32} className="mx-auto mb-2 text-gray-200" />No infrastructure points found
                </td></tr>
              ) : filtered.map(pt => {
                const routeName = routes.find(r => r.id === pt.routeId)?.name ?? pt.routeId
                return (
                  <tr key={pt.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-brand-blue">{pt.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{pt.name}</td>
                    <td className="px-4 py-3"><Badge variant={INFRA_TYPE_BADGE[pt.type] ?? 'gray'} size="sm">{pt.type}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{routeName}</td>
                    <td className="px-4 py-3"><Badge variant={INFRA_STATUS_BADGE[pt.status] ?? 'gray'} dot size="sm">{pt.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(pt.lastInspected)}</td>
                    <td className="px-4 py-3 w-12 text-center">
                      <button onClick={e => openMenu(e, pt.id)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === pt.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const pt = infraPoints.find(p => p.id === menuId)
        if (!pt) return null
        return (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }} className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-40">
            <button onClick={() => openEdit(pt)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button onClick={() => { setDeleteTarget(pt); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={13} className="text-red-400 shrink-0" /> Delete
            </button>
          </div>
        )
      })()}

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={editTarget ? 'Edit Infrastructure Point' : 'Add Infrastructure Point'} size="lg"
        footer={<><Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave}>{editTarget ? 'Save Changes' : 'Add Point'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. SP-AW-01"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.name ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
            <select value={form.type} onChange={e => f('type', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {INFRA_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Linked Route <span className="text-red-500">*</span></label>
            <select value={form.routeId} onChange={e => f('routeId', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.routeId ? 'border-red-400' : 'border-gray-300'}`}>
              <option value="">Select route…</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {errors.routeId && <p className="text-red-500 text-xs mt-0.5">{errors.routeId}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
            <select value={form.status} onChange={e => f('status', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {INFRA_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Latitude <span className="text-red-500">*</span></label>
            <input type="number" step="any" value={form.latitude} onChange={e => f('latitude', e.target.value)} placeholder="e.g. 19.1364"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.latitude ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.latitude && <p className="text-red-500 text-xs mt-0.5">{errors.latitude}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Longitude <span className="text-red-500">*</span></label>
            <input type="number" step="any" value={form.longitude} onChange={e => f('longitude', e.target.value)} placeholder="e.g. 72.8296"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${errors.longitude ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.longitude && <p className="text-red-500 text-xs mt-0.5">{errors.longitude}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Installed On</label>
            <input type="date" value={form.installedOn} onChange={e => f('installedOn', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Inspected</label>
            <input type="date" value={form.lastInspected} onChange={e => f('lastInspected', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Infrastructure Point?" size="sm"
        footer={<><Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button size="sm" variant="danger" onClick={() => { deleteInfraPoint(deleteTarget.id); setDeleteTarget(null) }}>Delete</Button></>}>
        <p className="text-sm text-gray-600">Delete point <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}

// ── Faults Tab ──────────────────────────────────────────────────────────────

const EMPTY_FAULT_FORM = {
  routeId: '', faultType: FAULT_TYPES[0], severity: FAULT_SEVERITIES[0],
  location: '', latitude: '', longitude: '', assignedTo: '', notes: '',
}

function FaultsTab({ faults, routes, engineers }) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fSeverity, setFSeverity] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportForm, setReportForm] = useState(EMPTY_FAULT_FORM)
  const [reportErrors, setReportErrors] = useState({})
  const [viewTarget, setViewTarget] = useState(null)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [updateForm, setUpdateForm] = useState({ status: '', resolvedAt: '', notes: '', assignedTo: '' })
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignEngineer, setAssignEngineer] = useState('')

  useEffect(() => {
    if (!menuId) return
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const faultStats = useMemo(() => ({
    open: faults.filter(f => f.status === 'Open').length,
    inProgress: faults.filter(f => f.status === 'In Progress').length,
    resolved: faults.filter(f => f.status === 'Resolved').length,
  }), [faults])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return faults.filter(f => {
      if (q && !f.routeName.toLowerCase().includes(q) &&
          !f.faultType.toLowerCase().includes(q) &&
          !(f.assignedTo ?? '').toLowerCase().includes(q)) return false
      if (fSeverity && f.severity !== fSeverity) return false
      if (fStatus && f.status !== fStatus) return false
      if (fDateFrom && f.reportedAt < fDateFrom) return false
      if (fDateTo && f.reportedAt.slice(0, 10) > fDateTo) return false
      return true
    })
  }, [faults, search, fSeverity, fStatus, fDateFrom, fDateTo])

  function handleReport() {
    const e = {}
    if (!reportForm.routeId) e.routeId = 'Required'
    if (!reportForm.location.trim()) e.location = 'Required'
    if (Object.keys(e).length) { setReportErrors(e); return }
    const route = routes.find(r => r.id === reportForm.routeId)
    saveFibreFault({
      ...reportForm,
      routeName: route?.name ?? reportForm.routeId,
      latitude: reportForm.latitude ? Number(reportForm.latitude) : null,
      longitude: reportForm.longitude ? Number(reportForm.longitude) : null,
      reportedBy: 'Admin User',
    })
    setReportOpen(false)
  }

  function openUpdate(fault) {
    setUpdateTarget(fault)
    setUpdateForm({
      status: fault.status,
      resolvedAt: fault.resolvedAt || new Date().toISOString().slice(0, 10),
      notes: fault.notes ?? '',
      assignedTo: fault.assignedTo ?? '',
    })
    setMenuId(null)
  }

  function handleUpdate() {
    if (!updateTarget) return
    const fields = { status: updateForm.status, notes: updateForm.notes, assignedTo: updateForm.assignedTo }
    if (updateForm.status === 'Resolved') fields.resolvedAt = updateForm.resolvedAt || new Date().toISOString()
    updateFibreFault(updateTarget.id, fields)
    setUpdateTarget(null)
  }

  const rf = (k, v) => setReportForm(prev => ({ ...prev, [k]: v }))
  const uf = (k, v) => setUpdateForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Mini stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open', value: faultStats.open, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'In Progress', value: faultStats.inProgress, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Resolved', value: faultStats.resolved, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search route, fault type, engineer…"
              className="pl-9 pr-8 py-1.5 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showFilters ? 'border-brand-blue text-brand-blue bg-brand-blue/5' : 'border-surface-border text-gray-600 hover:bg-gray-50'}`}>
            <Filter size={13} /> Filters
          </button>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setReportForm(EMPTY_FAULT_FORM); setReportErrors({}); setReportOpen(true) }}>
          Report Fault
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-surface-border shadow-card px-4 py-3">
          {[
            ['Severity', fSeverity, setFSeverity, FAULT_SEVERITIES, 'All Severities'],
            ['Status', fStatus, setFStatus, ['Open', 'In Progress', 'Resolved'], 'All Statuses'],
          ].map(([label, value, setter, options, placeholder]) => (
            <div key={label} className="relative">
              <select value={value} onChange={e => setter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white">
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">From</label>
            <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className="px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            <label className="text-xs text-gray-600">To</label>
            <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className="px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <button onClick={() => { setFSeverity(''); setFStatus(''); setFDateFrom(''); setFDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Fault ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[130px]">Route</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Fault Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reported</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                  <AlertTriangle size={32} className="mx-auto mb-2 text-gray-200" />No faults found
                </td></tr>
              ) : filtered.map(fault => (
                <tr key={fault.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue">{fault.id}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{fault.routeName}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{fault.faultType}</td>
                  <td className="px-4 py-3"><Badge variant={SEVERITY_BADGE[fault.severity] ?? 'gray'} size="sm">{fault.severity}</Badge></td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate" title={fault.location}>{fault.location}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(fault.reportedAt)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fault.assignedTo || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3"><Badge variant={FAULT_STATUS_BADGE[fault.status] ?? 'gray'} dot size="sm">{fault.status}</Badge></td>
                  <td className="px-4 py-3 w-12 text-center">
                    <button onClick={e => openMenu(e, fault.id)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === fault.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const fault = faults.find(f => f.id === menuId)
        if (!fault) return null
        return (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }} className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-48">
            <button onClick={() => { setViewTarget(fault); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye size={13} className="text-gray-400 shrink-0" /> View Details
            </button>
            <button onClick={() => openUpdate(fault)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Update Status
            </button>
            <button onClick={() => { setAssignTarget(fault); setAssignEngineer(fault.assignedTo ?? ''); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <MapPin size={13} className="text-gray-400 shrink-0" /> Assign Engineer
            </button>
            {fault.status !== 'Resolved' && (
              <button onClick={() => { updateFibreFault(fault.id, { status: 'Resolved', resolvedAt: new Date().toISOString() }); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" /> Mark Resolved
              </button>
            )}
          </div>
        )
      })()}

      {/* Report Fault modal */}
      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Report Fault" size="lg"
        footer={<><Button variant="secondary" size="sm" onClick={() => setReportOpen(false)}>Cancel</Button><Button size="sm" onClick={handleReport}>Report Fault</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Linked Route <span className="text-red-500">*</span></label>
            <select value={reportForm.routeId} onChange={e => rf('routeId', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${reportErrors.routeId ? 'border-red-400' : 'border-gray-300'}`}>
              <option value="">Select route…</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {reportErrors.routeId && <p className="text-red-500 text-xs mt-0.5">{reportErrors.routeId}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fault Type <span className="text-red-500">*</span></label>
            <select value={reportForm.faultType} onChange={e => rf('faultType', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {FAULT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Severity <span className="text-red-500">*</span></label>
            <select value={reportForm.severity} onChange={e => rf('severity', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {FAULT_SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assign To</label>
            <select value={reportForm.assignedTo} onChange={e => rf('assignedTo', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              <option value="">Unassigned</option>
              {engineers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Location Description <span className="text-red-500">*</span></label>
            <input value={reportForm.location} onChange={e => rf('location', e.target.value)} placeholder="Describe the fault location…"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${reportErrors.location ? 'border-red-400' : 'border-gray-300'}`} />
            {reportErrors.location && <p className="text-red-500 text-xs mt-0.5">{reportErrors.location}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
            <input type="number" step="any" value={reportForm.latitude} onChange={e => rf('latitude', e.target.value)} placeholder="e.g. 19.0790"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
            <input type="number" step="any" value={reportForm.longitude} onChange={e => rf('longitude', e.target.value)} placeholder="e.g. 72.8475"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={reportForm.notes} onChange={e => rf('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none" />
          </div>
        </div>
      </Modal>

      {/* View Details modal */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Fault Details" size="md"
        footer={<Button variant="secondary" size="sm" onClick={() => setViewTarget(null)}>Close</Button>}>
        {viewTarget && (
          <div className="space-y-3">
            {[
              ['Fault ID', viewTarget.id],
              ['Route', viewTarget.routeName],
              ['Fault Type', viewTarget.faultType],
              ['Severity', viewTarget.severity],
              ['Location', viewTarget.location],
              ['Reported By', viewTarget.reportedBy],
              ['Reported At', formatDate(viewTarget.reportedAt)],
              ['Assigned To', viewTarget.assignedTo || '—'],
              ['Status', viewTarget.status],
              ['Resolved At', viewTarget.resolvedAt ? formatDate(viewTarget.resolvedAt) : '—'],
              ['Notes', viewTarget.notes || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-xs font-medium text-gray-500 w-28 shrink-0">{label}</span>
                <span className="text-xs text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Update Status modal */}
      <Modal isOpen={!!updateTarget} onClose={() => setUpdateTarget(null)} title="Update Fault" size="md"
        footer={<><Button variant="secondary" size="sm" onClick={() => setUpdateTarget(null)}>Cancel</Button><Button size="sm" onClick={handleUpdate}>Save</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
            <select value={updateForm.status} onChange={e => uf('status', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {['Open', 'In Progress', 'Resolved'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
            <select value={updateForm.assignedTo} onChange={e => uf('assignedTo', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              <option value="">Unassigned</option>
              {engineers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          {updateForm.status === 'Resolved' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Resolved At</label>
              <input type="date" value={updateForm.resolvedAt} onChange={e => uf('resolvedAt', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={updateForm.notes} onChange={e => uf('notes', e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none" />
          </div>
        </div>
      </Modal>

      {/* Assign Engineer modal */}
      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign Engineer" size="sm"
        footer={<><Button variant="secondary" size="sm" onClick={() => setAssignTarget(null)}>Cancel</Button><Button size="sm" onClick={() => { updateFibreFault(assignTarget.id, { assignedTo: assignEngineer }); setAssignTarget(null) }}>Assign</Button></>}>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Engineer</label>
          <select value={assignEngineer} onChange={e => setAssignEngineer(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
            <option value="">Unassigned</option>
            {engineers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  )
}

// ── Page root ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'routes', label: 'Routes' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'faults', label: 'Faults' },
]

export default function FibreNetwork() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const [routes, setRoutes] = useState(getFibreRoutes)
  useEffect(() => subscribeFibreRoutes(setRoutes), [])
  const [infraPoints, setInfraPoints] = useState(getInfraPoints)
  useEffect(() => subscribeInfraPoints(setInfraPoints), [])
  const [faults, setFaults] = useState(getFibreFaults)
  useEffect(() => subscribeFibreFaults(setFaults), [])

  const engineers = useMemo(() => getActiveUsers().filter(u => u.role === 'engineer'), [])

  function setTab(t) { setSearchParams({ tab: t }) }

  const stats = useMemo(() => ({
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => r.status === 'Active').length,
    openFaults: faults.filter(f => f.status !== 'Resolved').length,
    infraCount: infraPoints.length,
  }), [routes, faults, infraPoints])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fibre Network</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage fibre routes, infrastructure and fault reporting</p>
      </div>

      <div className="flex items-center gap-0 border-b border-gray-200 -mb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab stats={stats} routes={routes} infraPoints={infraPoints} faults={faults} />}
      {activeTab === 'routes' && <RoutesTab routes={routes} setTab={setTab} />}
      {activeTab === 'infrastructure' && <InfraTab infraPoints={infraPoints} routes={routes} />}
      {activeTab === 'faults' && <FaultsTab faults={faults} routes={routes} engineers={engineers} />}
    </div>
  )
}
