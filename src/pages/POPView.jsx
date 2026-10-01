import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Boxes, FileText, Wrench, Plus, MoreVertical,
  LayoutDashboard, ClipboardList, BarChart2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import {
  getPOP, getLinkedProject, equipmentWarrantyStatus,
} from '../data/popStore'
import {
  getWorkOrdersForEquipment, getWorkOrdersForPOP, subscribeWorkOrders,
  slaStatusOf, WORK_ORDER_CATEGORIES, WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES,
} from '../data/workOrderStore'
import { getAllTechnicians } from '../data/technicianHelpers'
import { getUsers } from '../data/userStore'

const STATUS_BADGE = {
  Planned: 'slate', 'Under Construction': 'yellow', Active: 'green', Inactive: 'gray', Decommissioned: 'red',
}
const POP_TYPE_BADGE = { FTTH: 'blue', OH: 'orange', Hybrid: 'purple' }
const ITEM_CATEGORY_BADGE = { 'Active Equipment': 'blue', 'Passive Equipment': 'purple', Consumable: 'gray' }
const CONDITION_BADGE = { Working: 'green', Faulty: 'red', 'Under Repair': 'orange', Replaced: 'slate' }
const WARRANTY_BADGE = { Active: 'green', 'Expiring Soon': 'yellow', Expired: 'red', 'N/A': 'gray' }
const WO_STATUS_BADGE = {
  Open: 'blue', Assigned: 'indigo', 'In-Progress': 'orange', 'On-Hold': 'yellow', Resolved: 'green', Closed: 'gray',
}
const PRIORITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'gray' }
const SLA_BADGE = { 'On Track': 'green', 'Due Soon': 'yellow', Breached: 'red', Met: 'gray' }

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'work-orders',  label: 'Work Orders',  icon: Wrench          },
  { id: 'inventory',    label: 'Inventory',    icon: Boxes           },
  { id: 'reports',      label: 'Reports',      icon: BarChart2       },
]

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children ?? <span className="text-gray-400">—</span>}</div>
    </div>
  )
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function POPView() {
  const { id, tab } = useParams()
  const navigate = useNavigate()
  const activeTab = tab ?? 'overview'

  const pop = getPOP(id)
  const [linkedFor, setLinkedFor] = useState(null)

  const [workOrders, setWorkOrders] = useState(() => pop ? getWorkOrdersForPOP(pop.id) : [])
  useEffect(() => {
    if (!pop) return
    setWorkOrders(getWorkOrdersForPOP(pop.id))
    return subscribeWorkOrders(() => setWorkOrders(getWorkOrdersForPOP(pop.id)))
  }, [pop?.id])

  const [woMenuId, setWoMenuId] = useState(null)
  const [woMenuPos, setWoMenuPos] = useState({ top: 0, right: 0 })
  const woMenuRef = useRef(null)

  useEffect(() => {
    if (!woMenuId) return
    function handleClick(e) {
      if (woMenuRef.current && !woMenuRef.current.contains(e.target)) setWoMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [woMenuId])

  function openWoMenu(e, woId) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setWoMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setWoMenuId(woId)
  }

  const users = getUsers()
  const technicianNames = ids => (ids ?? []).map(uid => users.find(u => u.id === uid)?.name ?? uid).join(', ') || '—'

  if (!pop) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">POP not found.</p>
        <button onClick={() => navigate('/network/pops')} className="mt-2 text-sm text-brand-blue hover:underline">
          Back to POP Management
        </button>
      </div>
    )
  }

  const technicians = getAllTechnicians()
  const defaultTech = pop.defaultTechnicianId
    ? technicians.find(t => t.id === pop.defaultTechnicianId)
    : null
  const linkedProject = getLinkedProject(pop.projectId)
  const equipment = pop.equipment ?? []
  const linkedWorkOrders = linkedFor ? getWorkOrdersForEquipment(pop.id, linkedFor.id) : []

  const loc = pop.locality
  const localityLabel = loc
    ? [loc.locality, loc.area, loc.district, loc.state].filter(Boolean).join(', ')
    : null

  const showsLandlordFields = ['Rented', 'Shared'].includes(pop.siteOwnership)

  function goTab(tabId) {
    navigate(`/network/pops/${pop.id}/${tabId}`)
  }

  // ── Reports stats ────────────────────────────────────────────────────────
  const reportStats = useMemo(() => {
    const total = workOrders.length
    const open = workOrders.filter(w => !['Resolved', 'Closed'].includes(w.status)).length
    const completed = workOrders.filter(w => ['Resolved', 'Closed'].includes(w.status)).length
    const breached = workOrders.filter(w => slaStatusOf(w) === 'Breached').length
    const completedWithTat = workOrders.filter(w => w.resolvedAt && w.createdAt && ['Resolved', 'Closed'].includes(w.status))
    const avgTat = completedWithTat.length > 0
      ? (completedWithTat.reduce((sum, w) => {
          const days = (new Date(w.resolvedAt) - new Date(w.createdAt)) / (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / completedWithTat.length).toFixed(1)
      : null
    const byStatus = WORK_ORDER_STATUSES.map(s => ({
      status: s,
      count: workOrders.filter(w => w.status === s).length,
    }))
    return { total, open, completed, breached, avgTat, byStatus }
  }, [workOrders])

  return (
    <div className="p-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/network/pops')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{pop.name}</h1>
              <Badge variant={STATUS_BADGE[pop.status] ?? 'gray'} dot size="sm">{pop.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-mono font-semibold text-brand-blue">{pop.id}</span>
              {pop.lastCleaningDate && (
                <span className="text-gray-400"> · Last cleaned {pop.lastCleaningDate}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Boxes size={14} />}
            onClick={() => goTab('inventory')}
          >
            View Inventory
          </Button>
          <Button
            size="sm"
            icon={<Edit2 size={14} />}
            onClick={() => navigate(`/network/pops/${pop.id}/edit`)}
          >
            Edit POP
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-surface-border">
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="w-full bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">

          {/* Basic Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="POP Name">{pop.name}</Field>
              <Field label="POP Type">
                <Badge variant={POP_TYPE_BADGE[pop.popType] ?? 'gray'} size="sm">{pop.popType ?? '—'}</Badge>
              </Field>
              <Field label="Category">{pop.category}</Field>
              <Field label="Status">
                <Badge variant={STATUS_BADGE[pop.status] ?? 'gray'} dot size="sm">{pop.status}</Badge>
              </Field>
            </div>
          </div>

          {/* Project Linkage */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Linkage</h3>
            <Field label="Linked Project">
              {linkedProject ? `${linkedProject.name} (${linkedProject.id})` : 'None'}
            </Field>
          </div>

          {/* Location */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Address">{pop.address || null}</Field>
              <Field label="Landmark">{pop.landmark || null}</Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude">{pop.latitude != null ? String(pop.latitude) : null}</Field>
              <Field label="Longitude">{pop.longitude != null ? String(pop.longitude) : null}</Field>
            </div>
            <Field label="Area Mapping Locality">{localityLabel}</Field>
          </div>

          {/* Capacity & Power */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity & Power</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Capacity">{pop.capacity || null}</Field>
              <Field label="Power Source">{pop.powerSource}</Field>
              <Field label="Power Backup Type">{pop.powerBackup}</Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Backup Power Present">{pop.hasBackupPower ? 'Yes' : 'No'}</Field>
              {pop.hasBackupPower && (
                <Field label="Backup Hours">
                  {pop.backupHours != null ? `${pop.backupHours} hrs` : null}
                </Field>
              )}
            </div>
          </div>

          {/* Site Ownership & Contacts */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Ownership & Contacts</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Site Ownership">{pop.siteOwnership}</Field>
              <Field label="Rent & Agreement Expiry">{pop.rentAgreementExpiry || null}</Field>
            </div>
            {showsLandlordFields && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50/60 rounded-lg border border-surface-border">
                <Field label="Owner / Landlord Name">{pop.ownerContactName || null}</Field>
                <Field label="Owner / Landlord Phone">{pop.ownerContactPhone || null}</Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Site Contact Person">{pop.siteContactName || null}</Field>
              <Field label="Site Contact Phone">{pop.siteContactPhone || null}</Field>
            </div>
            <Field label="Default In-charge Technician">
              {defaultTech
                ? `${defaultTech.name}${defaultTech.zone ? ` — ${defaultTech.zone}` : ''}`
                : 'Unassigned'}
            </Field>
          </div>

          {/* Site Photos / Documents */}
          {(pop.documents ?? []).length > 0 && (
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Photos / Documents</h3>
              <ul className="divide-y divide-surface-border border border-surface-border rounded-xl overflow-hidden">
                {pop.documents.map((doc, idx) => (
                  <li key={idx} className="flex items-center gap-2 px-3 py-2 bg-white">
                    <FileText size={14} className="text-gray-400 shrink-0" />
                    <a
                      href={doc.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-gray-700 hover:text-brand-blue truncate"
                    >
                      {doc.name}
                    </a>
                    {doc.uploadedAt && (
                      <span className="ml-auto text-xs text-gray-400 shrink-0">{doc.uploadedAt}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Equipment */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipment</h3>
            <div className="border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-surface-border">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">IP Address</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Model</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Ports</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Used</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Customers / VLAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {equipment.map(eq => (
                    <tr key={eq.id} className="hover:bg-gray-50/40">
                      <td className="px-3 py-2 text-xs font-medium text-gray-700">{eq.type}</td>
                      <td className="px-3 py-2 text-gray-800">
                        {eq.label || <span className="text-gray-300">Untitled</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{eq.ip || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{eq.model || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{eq.ports ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{eq.portsUsed ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{eq.status}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {eq.type === 'OLT' ? (eq.customers ?? '—') : (eq.vlan || '—')}
                      </td>
                    </tr>
                  ))}
                  {equipment.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-400">
                        No equipment on record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory Details */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Details</h3>
            <div className="border border-surface-border rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-surface-border">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Item</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[180px]">Serial Number</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">Install Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">Last Cleaning</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Last Maintenance</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[150px]">Warranty/AMC Expiry</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">Condition</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Linked WOs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {equipment.map(eq => {
                    const warranty = equipmentWarrantyStatus(eq)
                    const linkedCount = getWorkOrdersForEquipment(pop.id, eq.id).length
                    return (
                      <tr key={eq.id} className="hover:bg-gray-50/40">
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          <span className="font-medium">{eq.label || <span className="text-gray-300">Untitled</span>}</span>
                          {eq.type && <span className="block text-xs text-gray-400">{eq.type}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={ITEM_CATEGORY_BADGE[eq.itemCategory] ?? 'gray'} size="sm">
                            {eq.itemCategory ?? '—'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{eq.serialNumber || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 text-center">{eq.quantity ?? 1}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.installDate || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.lastCleaningDate ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.lastMaintenanceDate ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <p className="text-xs text-gray-500">{eq.warrantyAmcExpiry || '—'}</p>
                          <Badge variant={WARRANTY_BADGE[warranty]} size="sm" className="mt-0.5">{warranty}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={CONDITION_BADGE[eq.condition] ?? 'gray'} dot size="sm">
                            {eq.condition ?? '—'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setLinkedFor(eq)}
                            disabled={linkedCount === 0}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
                              linkedCount === 0
                                ? 'text-gray-300 cursor-default'
                                : 'text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 cursor-pointer'
                            }`}
                          >
                            <Wrench size={12} /> {linkedCount}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {equipment.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-xs text-gray-400">
                        No equipment on record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Work Orders ──────────────────────────────────────────── */}
      {activeTab === 'work-orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{workOrders.length} work order{workOrders.length === 1 ? '' : 's'} for this POP</p>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => navigate(`/network/pops/work-orders/new?popId=${pop.id}`)}
            >
              Add Work Order
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Technician(s)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA Due</th>
                    <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {workOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center text-sm text-gray-400">
                        <Wrench size={32} className="mx-auto mb-2 text-gray-200" />
                        No work orders for this POP yet.
                      </td>
                    </tr>
                  ) : workOrders.map(wo => {
                    const sla = slaStatusOf(wo)
                    return (
                      <tr
                        key={wo.id}
                        onClick={() => navigate(`/network/pops/work-orders/${wo.id}`)}
                        className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{wo.id}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{wo.category}</td>
                        <td className="px-4 py-3">
                          <Badge variant={PRIORITY_BADGE[wo.priority] ?? 'gray'} size="sm">{wo.priority}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{technicianNames(wo.assignedTechnicianIds)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={WO_STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-gray-500">{formatDateTime(wo.slaDate)}</p>
                          <Badge variant={SLA_BADGE[sla]} size="sm" className="mt-0.5">{sla}</Badge>
                        </td>
                        <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => openWoMenu(e, wo.id)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${woMenuId === wo.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                          >
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
        </div>
      )}

      {/* ── Tab: Inventory ────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{equipment.length} item{equipment.length === 1 ? '' : 's'}</p>
          <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">Item Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serial Number</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Install Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Last Cleaning</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Last Maintenance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Warranty/AMC Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Linked Work Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {equipment.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-14 text-center text-sm text-gray-400">
                        <Boxes size={32} className="mx-auto mb-2 text-gray-200" />
                        No equipment recorded for this POP yet.
                      </td>
                    </tr>
                  ) : equipment.map(item => {
                    const warranty = equipmentWarrantyStatus(item)
                    const linkedCount = getWorkOrdersForEquipment(pop.id, item.id).length
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{item.label}</span>
                          <span className="block text-xs text-gray-400">{item.type} · {item.model || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{item.itemCategory ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono">{item.serialNumber || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs text-center">{item.quantity ?? 1}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{item.installDate || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{item.lastCleaningDate || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{item.lastMaintenanceDate || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-gray-500">{item.warrantyAmcExpiry || '—'}</p>
                          <Badge variant={WARRANTY_BADGE[warranty]} size="sm" className="mt-0.5">{warranty}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={CONDITION_BADGE[item.condition] ?? 'gray'} dot size="sm">{item.condition ?? '—'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setLinkedFor(item)}
                            disabled={linkedCount === 0}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                              linkedCount === 0
                                ? 'text-gray-300 cursor-default'
                                : 'text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 cursor-pointer'
                            }`}
                          >
                            <Wrench size={12} /> {linkedCount}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Reports ──────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Work Orders',    value: reportStats.total,    color: 'text-gray-800'    },
              { label: 'Open Work Orders',      value: reportStats.open,     color: 'text-blue-600'    },
              { label: 'Completed',             value: reportStats.completed, color: 'text-green-600'  },
              { label: 'SLA Breached',          value: reportStats.breached, color: 'text-red-600'     },
              { label: 'Avg TAT (days)',        value: reportStats.avgTat != null ? reportStats.avgTat : '—', color: 'text-gray-700' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-surface-border shadow-card p-4">
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Work Order Status Breakdown</h3>
            <div className="space-y-3">
              {reportStats.byStatus.map(({ status, count }) => {
                const pct = reportStats.total > 0 ? Math.round((count / reportStats.total) * 100) : 0
                const variant = WO_STATUS_BADGE[status] ?? 'gray'
                const barColor = {
                  blue: 'bg-blue-500', indigo: 'bg-indigo-500', orange: 'bg-orange-500',
                  yellow: 'bg-yellow-400', green: 'bg-green-500', gray: 'bg-gray-300',
                }[variant] ?? 'bg-gray-300'
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-24 shrink-0">{status}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                )
              })}
              {reportStats.total === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No work orders yet.</p>
              )}
            </div>
          </div>

          {/* Work order list grouped by status */}
          {reportStats.total > 0 && (
            <div className="space-y-4">
              {WORK_ORDER_STATUSES.filter(s => workOrders.some(w => w.status === s)).map(status => (
                <div key={status} className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60 flex items-center gap-2">
                    <Badge variant={WO_STATUS_BADGE[status] ?? 'gray'} dot size="sm">{status}</Badge>
                    <span className="text-xs text-gray-500">{workOrders.filter(w => w.status === status).length} work order{workOrders.filter(w => w.status === status).length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-surface-border">
                        {workOrders.filter(w => w.status === status).map(wo => {
                          const sla = slaStatusOf(wo)
                          return (
                            <tr
                              key={wo.id}
                              onClick={() => navigate(`/network/pops/work-orders/${wo.id}`)}
                              className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap w-32">{wo.id}</td>
                              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{wo.category}</td>
                              <td className="px-4 py-3">
                                <Badge variant={PRIORITY_BADGE[wo.priority] ?? 'gray'} size="sm">{wo.priority}</Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                {formatDateTime(wo.slaDate)}
                                <Badge variant={SLA_BADGE[sla]} size="sm" className="ml-2">{sla}</Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-right">
            <Link to="/network/pops/reports" className="text-sm text-brand-blue hover:underline">
              View Full Reports →
            </Link>
          </div>
        </div>
      )}

      {/* ── Work Orders context menu ──────────────────────────────────── */}
      {woMenuId && (() => {
        const wo = workOrders.find(w => w.id === woMenuId)
        if (!wo) return null
        return (
          <div
            ref={woMenuRef}
            style={{ position: 'fixed', top: woMenuPos.top, right: woMenuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button
              onClick={() => { navigate(`/network/pops/work-orders/${wo.id}/edit`); setWoMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
          </div>
        )
      })()}

      {/* ── Linked equipment WOs modal ────────────────────────────────── */}
      <Modal
        isOpen={!!linkedFor}
        onClose={() => setLinkedFor(null)}
        title={`Work Orders — ${linkedFor?.label ?? ''}`}
        size="md"
      >
        {linkedWorkOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No Work Orders reference this equipment item yet.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border -mx-2">
            {linkedWorkOrders.map(wo => (
              <li key={wo.id}>
                <Link
                  to={`/network/pops/work-orders/${wo.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>
                    <span className="block text-sm font-medium text-gray-800 font-mono">{wo.id}</span>
                    <span className="block text-xs text-gray-500">
                      {wo.category} · {wo.scheduledDateTime?.slice(0, 10) ?? '—'}
                    </span>
                  </span>
                  <Badge variant={WO_STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
