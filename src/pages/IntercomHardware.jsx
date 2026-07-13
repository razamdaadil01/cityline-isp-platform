import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, HardDrive, Link2, PackageCheck,
  AlertTriangle, Eye, Repeat, XOctagon, Search as SearchIcon, MoreVertical,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

// ── Mock data ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  assigned:  { variant: 'blue',   label: 'Assigned' },
  available: { variant: 'green',  label: 'Available' },
  damaged:   { variant: 'orange', label: 'Damaged' },
  lost:      { variant: 'red',    label: 'Lost' },
}

const DEVICE_TYPES = ['Intercom Panel Unit', 'Handset Unit', 'Power Adapter', 'Cable']
const ZONES = ['Andheri West', 'Bandra East']

const CUSTOMERS = [
  { id: 'IC-CUST-2026-000001', name: 'Mohan Das',    circuitId: 'IC-2026-0001' },
  { id: 'IC-CUST-2026-000002', name: 'Priya Nair',   circuitId: 'IC-2026-0002' },
  { id: 'IC-CUST-2026-000003', name: 'Suresh Patil', circuitId: 'IC-2026-0003' },
  { id: 'IC-CUST-2026-000004', name: 'Anita Desai',  circuitId: 'IC-2026-0004' },
  { id: 'IC-CUST-2026-000005', name: 'Rajesh Kumar', circuitId: 'IC-2026-0005' },
]

const INIT_HARDWARE = [
  { id: 'IHW-2026-0001', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0001', assignedTo: 'Mohan Das',  customerId: 'IC-CUST-2026-000001', zone: 'Andheri West', assignedDate: '19-06-2026', status: 'assigned'  },
  { id: 'IHW-2026-0002', deviceType: 'Handset Unit',        serial: 'ICH-2026-0001', assignedTo: 'Mohan Das',  customerId: 'IC-CUST-2026-000001', zone: 'Andheri West', assignedDate: '19-06-2026', status: 'assigned'  },
  { id: 'IHW-2026-0003', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0002', assignedTo: 'Priya Nair', customerId: 'IC-CUST-2026-000002', zone: 'Bandra East',  assignedDate: '22-06-2026', status: 'assigned'  },
  { id: 'IHW-2026-0004', deviceType: 'Handset Unit',        serial: 'ICH-2026-0002', assignedTo: null,         customerId: null,           zone: null,            assignedDate: null,          status: 'available' },
  { id: 'IHW-2026-0005', deviceType: 'Power Adapter',       serial: 'IPA-2026-0001', assignedTo: null,         customerId: null,           zone: null,            assignedDate: null,          status: 'damaged'   },
]

function toISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('-')
  return `${y}-${m}-${d}`
}

function todayDDMMYYYY() {
  const now = new Date()
  return now.toLocaleDateString('en-GB').split('/').join('-')
}

function nextHardwareId(list) {
  const year = list[0]?.id.match(/^IHW-(\d{4})-/)?.[1] ?? new Date().getFullYear()
  const nums = list.map(h => h.id.match(/^IHW-\d{4}-(\d+)$/)).filter(Boolean).map(m => Number(m[1]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `IHW-${year}-${String(next).padStart(4, '0')}`
}

// ── Actions Menu ───────────────────────────────────────────────────────────────

function ActionsMenu({ device, pos, onView, onReassign, onMarkDamaged, onMarkLost }) {
  return (
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
    >
      <button onClick={() => onView(device)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Eye size={13} className="text-brand-blue shrink-0" /> View
      </button>
      <button onClick={() => onReassign(device)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Repeat size={13} className="text-gray-400 shrink-0" /> Reassign
      </button>
      <div className="my-1 border-t border-surface-border" />
      <button onClick={() => onMarkDamaged(device)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 transition-colors">
        <AlertTriangle size={13} className="shrink-0" /> Mark Damaged
      </button>
      <button onClick={() => onMarkLost(device)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
        <XOctagon size={13} className="shrink-0" /> Mark Lost
      </button>
    </div>
  )
}

// ── Add Hardware Modal ───────────────────────────────────────────────────────

const EMPTY_ADD_FORM = {
  deviceType: DEVICE_TYPES[0], serial: '', brandModel: '', purchaseDate: '',
  warrantyUntil: '', zone: ZONES[0], status: 'available', customerId: '', remarks: '',
}

function AddHardwareModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_ADD_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm(EMPTY_ADD_FORM); setErrors({}) }
  }, [isOpen])

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }))
    setErrors(p => ({ ...p, [f]: '' }))
  }

  const selectedCustomer = CUSTOMERS.find(c => c.id === form.customerId) ?? null

  function handleSubmit() {
    const e = {}
    if (!form.deviceType) e.deviceType = 'Select a device type'
    if (!form.serial.trim()) e.serial = 'Serial number is required'
    if (!form.zone) e.zone = 'Select a zone'
    if (!form.status) e.status = 'Select a status'
    if (form.status === 'assigned' && !form.customerId) e.customerId = 'Select a customer to assign to'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form, selectedCustomer)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Hardware" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<Plus size={14} />} onClick={handleSubmit}>Add Hardware</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FormField label="Device Type" required error={errors.deviceType}>
          <Select value={form.deviceType} onChange={e => set('deviceType', e.target.value)}>
            {DEVICE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Serial No" required error={errors.serial}>
          <Input value={form.serial} onChange={e => set('serial', e.target.value)} placeholder="e.g. ICP-2026-0006" />
        </FormField>

        <FormField label="Brand/Model">
          <Input value={form.brandModel} onChange={e => set('brandModel', e.target.value)} placeholder="Optional" />
        </FormField>
        <FormField label="Purchase Date">
          <Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        </FormField>

        <FormField label="Warranty Until">
          <Input type="date" value={form.warrantyUntil} onChange={e => set('warrantyUntil', e.target.value)} />
        </FormField>
        <FormField label="Zone" required error={errors.zone}>
          <Select value={form.zone} onChange={e => set('zone', e.target.value)}>
            {ZONES.map(z => <option key={z}>{z}</option>)}
          </Select>
        </FormField>

        <FormField label="Status" required error={errors.status}>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
          </Select>
        </FormField>
        {form.status === 'assigned' && (
          <FormField label="Assign To Customer" error={errors.customerId}>
            <Select value={form.customerId} onChange={e => set('customerId', e.target.value)}>
              <option value="">Select customer…</option>
              {CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </Select>
          </FormField>
        )}

        {form.status === 'assigned' && selectedCustomer && (
          <FormField label="Select Circuit">
            <Select value={selectedCustomer.circuitId} disabled>
              <option value={selectedCustomer.circuitId}>{selectedCustomer.circuitId}</option>
            </Select>
          </FormField>
        )}

        <div className="col-span-2">
          <FormField label="Remarks">
            <Textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={3} placeholder="Any additional notes…" />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomHardware() {
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const [hardware, setHardware] = useState(INIT_HARDWARE)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterDeviceType, setFilterDeviceType] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const EMPTY_DRAFT = { status: '', deviceType: '', zone: '', dateFrom: '', dateTo: '' }
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  function openDrawer() {
    setDraft({
      status: filterStatus, deviceType: filterDeviceType, zone: filterZone,
      dateFrom: filterDateFrom, dateTo: filterDateTo,
    })
    setDrawerOpen(true)
  }

  function applyDrawer() {
    setFilterStatus(draft.status)
    setFilterDeviceType(draft.deviceType)
    setFilterZone(draft.zone)
    setFilterDateFrom(draft.dateFrom)
    setFilterDateTo(draft.dateTo)
    setPage(1)
    setDrawerOpen(false)
  }

  function clearAllFilters() {
    setFilterStatus(''); setFilterDeviceType(''); setFilterZone('')
    setFilterDateFrom(''); setFilterDateTo('')
    setDraft(EMPTY_DRAFT)
    setPage(1)
  }

  const filterCount = [filterStatus, filterDeviceType, filterZone, filterDateFrom || filterDateTo].filter(Boolean).length
  const hasActiveFilters = filterCount > 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return hardware.filter(d => {
      if (q &&
        !d.id.toLowerCase().includes(q) &&
        !d.serial.toLowerCase().includes(q) &&
        !(d.assignedTo ?? '').toLowerCase().includes(q) &&
        !(d.customerId ?? '').toLowerCase().includes(q)
      ) return false
      if (filterStatus && d.status !== filterStatus.toLowerCase()) return false
      if (filterDeviceType && d.deviceType !== filterDeviceType) return false
      if (filterZone && d.zone !== filterZone) return false
      if (filterDateFrom && (!d.assignedDate || toISO(d.assignedDate) < filterDateFrom)) return false
      if (filterDateTo && (!d.assignedDate || toISO(d.assignedDate) > filterDateTo)) return false
      return true
    })
  }, [hardware, search, filterStatus, filterDeviceType, filterZone, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const stats = useMemo(() => ({
    total:     hardware.length,
    assigned:  hardware.filter(d => d.status === 'assigned').length,
    available: hardware.filter(d => d.status === 'available').length,
    damagedLost: hardware.filter(d => d.status === 'damaged' || d.status === 'lost').length,
  }), [hardware])

  const menuDevice = hardware.find(d => d.id === menuId) ?? null

  function handleView(d) { navigate(`/intercom/hardware/${d.id}`); setMenuId(null) }
  function handleReassign(d) { setMenuId(null) }
  function handleMarkDamaged(d) { setMenuId(null) }
  function handleMarkLost(d) { setMenuId(null) }

  function handleAddHardware(form, selectedCustomer) {
    const newDevice = {
      id: nextHardwareId(hardware),
      deviceType: form.deviceType,
      serial: form.serial.trim(),
      brandModel: form.brandModel.trim() || null,
      purchaseDate: form.purchaseDate || null,
      warrantyUntil: form.warrantyUntil || null,
      assignedTo: form.status === 'assigned' ? selectedCustomer?.name ?? null : null,
      customerId: form.status === 'assigned' ? selectedCustomer?.id ?? null : null,
      zone: form.zone,
      assignedDate: form.status === 'assigned' ? todayDDMMYYYY() : null,
      status: form.status,
      remarks: form.remarks || null,
    }
    setHardware(h => [newDevice, ...h])
    setAddModalOpen(false)
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Intercom Hardware</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage intercom hardware inventory and assignments</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddModalOpen(true)}>Add Hardware</Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Devices', value: stats.total,      icon: HardDrive,     color: 'text-brand-blue',  bg: 'bg-brand-blue/10'   },
          { label: 'Assigned',      value: stats.assigned,   icon: Link2,         color: 'text-blue-600',    bg: 'bg-blue-100'        },
          { label: 'Available',     value: stats.available,  icon: PackageCheck,  color: 'text-emerald-700', bg: 'bg-emerald-100'     },
          { label: 'Damaged/Lost',  value: stats.damagedLost,icon: AlertTriangle, color: 'text-brand-orange',bg: 'bg-brand-orange/10' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Search + Filter ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by device, serial no, customer…"
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={openDrawer}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shrink-0 ${
              hasActiveFilters
                ? 'border-purple-500 bg-purple-50 text-purple-600 hover:bg-purple-100'
                : 'border-surface-border bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'
            }`}
            title="Open filters"
          >
            <Filter size={15} />
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {(hasActiveFilters || search.trim()) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={11} className="text-purple-400 shrink-0" />
            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-gray-900 ml-0.5"><X size={10} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterStatus}
                <button onClick={() => setFilterStatus('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterDeviceType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterDeviceType}
                <button onClick={() => setFilterDeviceType('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterZone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterZone}
                <button onClick={() => setFilterZone('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Date: {filterDateFrom || '…'} → {filterDateTo || '…'}
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            <button onClick={() => { clearAllFilters(); setSearch('') }}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-0.5">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {['Device ID', 'Device Type', 'Serial No', 'Assigned To', 'Customer ID', 'Zone', 'Assigned Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-gray-400 text-sm">
                    <HardDrive size={32} className="mx-auto mb-2 text-gray-200" />
                    No hardware devices found
                  </td>
                </tr>
              ) : (
                paged.map(d => {
                  const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.available
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/intercom/hardware/${d.id}`)}
                          className="font-mono text-xs text-brand-blue font-semibold hover:underline"
                        >
                          {d.id}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{d.deviceType}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{d.serial}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{d.assignedTo ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{d.customerId ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{d.zone ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{d.assignedDate ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => openMenu(e, d.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            menuId === d.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Records per page</span>
            <select value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages} &nbsp;|&nbsp; Total {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  p === currentPage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                }`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-dot dropdown portal ──────────────────────────────────────────── */}
      {menuDevice && (
        <div ref={menuRef}>
          <ActionsMenu
            device={menuDevice}
            pos={menuPos}
            onView={handleView}
            onReassign={handleReassign}
            onMarkDamaged={handleMarkDamaged}
            onMarkLost={handleMarkLost}
          />
        </div>
      )}

      {/* ── Filter Drawer ────────────────────────────────────────────────────── */}
      <div className={`fixed top-14 left-0 right-0 bottom-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Available">Available</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Device Type</label>
              <div className="relative">
                <select value={draft.deviceType} onChange={e => setDraft(d => ({ ...d, deviceType: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Zone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zone</label>
              <div className="relative">
                <select value={draft.zone} onChange={e => setDraft(d => ({ ...d, zone: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Zones</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

          </div>

          {/* Drawer footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={applyDrawer}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>

        </div>
      </div>

      {/* ── Add Hardware Modal ─────────────────────────────────────────────── */}
      <AddHardwareModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddHardware}
      />

    </div>
  )
}
