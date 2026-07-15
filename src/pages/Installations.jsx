import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays, Clock, UserCheck, Loader2, CheckCircle2, RefreshCw, XCircle,
  Search, Wrench, ChevronDown, MoreVertical, Users, Package, Truck, Eye, List,
  ArrowRight, AlertTriangle, X, Plus, Trash2, Edit2, UserCog,
} from 'lucide-react'
import {
  getInstallations as getInternetInstallations,
  subscribeInstallations as subscribeInternetInstallations,
  updateInstallationStatus, FIELD_ENGINEERS,
} from '../data/installationsStore'
import { getFeasibilityRequest } from '../data/feasibilityStore'
import {
  getInstallations as getIntercomInstallations,
  subscribeInstallations as subscribeIntercomInstallations,
  updateInstallation as updateIntercomInstallation, INSTALLATION_ENGINEERS,
} from '../data/intercomInstallationsStore'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'

/* ── Type badge — follows the "Internet + Intercom" / "Intercom Only" pattern ── */
const TYPE_BADGE = {
  Internet: 'blue',
  Intercom: 'cyan',
}

/* ── Literal status → badge variant (covers both source vocabularies, nothing is renamed) ── */
const STATUS_BADGE = {
  'Scheduled':                   'blue',
  'Assigned':                    'purple',
  'Hardware Collection Pending': 'yellow',
  'Dispatched':                  'orange',
  'Completed':                   'green',
  'Rescheduled':                 'cyan',
  'Cancelled':                   'red',
  'Pending':                     'orange',
  'In Progress':                 'navy',
}

/* ── Normalized status buckets — used only for the summary cards + status filter,
   the table always shows the original literal status so no data is lost ── */
const NORMALIZED_BUCKETS = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Rescheduled', 'Cancelled']

function normalizeInternetStatus(status) {
  if (status === 'Hardware Collection Pending' || status === 'Dispatched') return 'In Progress'
  return status
}

function normalizeIntercomStatus(status) {
  switch (status) {
    case 'pending':    return 'Scheduled'
    case 'inprogress': return 'In Progress'
    case 'completed':  return 'Completed'
    case 'cancelled':  return 'Cancelled'
    default:            return status
  }
}

const INTERCOM_STATUS_LABEL = {
  pending:    'Pending',
  inprogress: 'In Progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
}

/* dd-mm-yyyy or yyyy-mm-dd -> "05 Jun 2026" for a consistent display across both sources */
function formatDate(raw, format) {
  if (!raw) return '—'
  const parts = raw.split('-')
  if (parts.length !== 3) return raw
  const [a, b, c] = parts
  const [y, m, d] = format === 'iso' ? [a, b, c] : [c, b, a]
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(dt.getTime())) return raw
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Merge both stores into one unified row shape ─────────────────────────── */
function buildUnifiedRows(internet, intercom) {
  const internetRows = internet.map(inst => ({
    key:              `net-${inst.id}`,
    type:             'Internet',
    workOrderId:      inst.id,
    leadId:           inst.leadId ?? null,
    leadHref:         inst.leadId ? `/sales/leads/${inst.leadId}/overview` : null,
    detailHref:       `/installations/${inst.id}`,
    customerName:     inst.customerName,
    mobile:           inst.mobile || inst.customerPhone || '—',
    areaLocality:     [inst.area, inst.locality].filter(Boolean).join(' — ') || '—',
    assignedEngineer: inst.engineerName || '—',
    installationDate: formatDate(inst.slotDate, 'iso'),
    status:           inst.status,
    normalizedStatus: normalizeInternetStatus(inst.status),
  }))

  const intercomRows = intercom.map(o => ({
    key:              `ic-${o.id}`,
    type:             'Intercom',
    workOrderId:      o.id,
    leadId:           o.leadId ?? null,
    leadHref:         o.leadId ? `/intercom/leads/${o.leadId}` : null,
    detailHref:       `/intercom/installations/${o.id}`,
    customerName:     o.customer,
    mobile:           o.phone || '—',
    areaLocality:     o.zone || '—',
    assignedEngineer: o.engineer || '—',
    installationDate: formatDate(o.installDate, 'dmy'),
    status:           INTERCOM_STATUS_LABEL[o.status] ?? o.status,
    normalizedStatus: normalizeIntercomStatus(o.status),
  }))

  return [...internetRows, ...intercomRows]
}

/* ── Internet (Sales & Leads) action helpers ──────────────────────────────── */
const RESCHEDULE_REASONS = [
  'Customer Not Available',
  'Engineer Unavailable',
  'Hardware Not Ready',
  'Weather Conditions',
  'Other',
]
const NET_HW_ITEM_SUGGESTIONS   = ['ONT Device', 'Drop Wire', 'Splitter', 'ONU', 'Patch Cord', 'Other']
const NET_WIRE_ITEM_SUGGESTIONS = ['Ethernet Cat6', 'Fiber Cable', 'Drop Wire', 'Other']
function netNewHwRow(name = '', qty = '', unit = 'pcs') { return { id: Date.now() + Math.random(), name, qty, unit } }
function netNewWireRow(name = '', qty = '', unit = 'm')  { return { id: Date.now() + Math.random(), name, qty, unit } }

/* ── Intercom action helpers ───────────────────────────────────────────────── */
const IC_HW_ITEM_SUGGESTIONS   = ['Intercom Panel Unit', 'Handset Unit', 'Power Adapter', 'Other']
const IC_WIRE_ITEM_SUGGESTIONS = ['Drop Wire (m)', 'Cable', 'Other']
function icNewHwRow(name = '', qty = '', unit = 'pcs')   { return { id: Date.now() + Math.random(), name, qty, unit } }
function icNewWireRow(name = '', qty = '', unit = 'pcs') { return { id: Date.now() + Math.random(), name, qty, unit } }

/* ── Toast ──────────────────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      {msg}
    </div>
  )
}

/* ── Intercom Actions Menu (ported as-is from the original Intercom Installations page) ── */
function IntercomActionsMenu({ order, pos, onView, onAssign, onEdit, onCancel }) {
  return (
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
    >
      <button onClick={() => onView(order)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Eye size={13} className="text-brand-blue shrink-0" /> View
      </button>
      <button onClick={() => onAssign(order)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <UserCog size={13} className="text-emerald-500 shrink-0" /> Assign Engineer
      </button>
      <button onClick={() => onEdit(order)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
      </button>
      <div className="my-1 border-t border-surface-border" />
      <button onClick={() => onCancel(order)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
        <XCircle size={13} className="shrink-0" /> Cancel
      </button>
    </div>
  )
}

/* ── Intercom Assign Engineer Modal (ported as-is) ─────────────────────────── */
function IntercomAssignEngineerModal({ isOpen, onClose, order, onSubmit }) {
  const [engineers, setEngineers] = useState([])
  const [engSearch, setEngSearch] = useState('')
  const [errors, setErrors] = useState({})
  const [hwToggle, setHwToggle] = useState(true)
  const [hwItems, setHwItems] = useState([])
  const [wireItems, setWireItems] = useState([])

  useEffect(() => {
    if (isOpen && order) {
      setEngineers((order.engineer ?? '').split(',').map(n => n.trim()).filter(Boolean))
      setEngSearch('')
      setErrors({})
      setHwToggle(true)
      setHwItems(order.hwItems?.length ? order.hwItems : [icNewHwRow('Intercom Panel Unit', '1', 'pcs')])
      setWireItems(order.wireItems?.length ? order.wireItems : [icNewWireRow('Drop Wire (m)', '50', 'pcs')])
    }
  }, [isOpen, order])

  function toggleEngineer(name) {
    setEngineers(list => list.includes(name) ? list.filter(n => n !== name) : [...list, name])
    setErrors(p => ({ ...p, engineers: '' }))
  }

  function addHwItem()   { setHwItems(r => [...r, icNewHwRow()]) }
  function removeHwItem(id) { setHwItems(r => r.filter(x => x.id !== id)) }
  function updateHwItem(id, field, val) { setHwItems(r => r.map(x => x.id === id ? { ...x, [field]: val } : x)) }

  function addWireItem()   { setWireItems(r => [...r, icNewWireRow()]) }
  function removeWireItem(id) { setWireItems(r => r.filter(x => x.id !== id)) }
  function updateWireItem(id, field, val) { setWireItems(r => r.map(x => x.id === id ? { ...x, [field]: val } : x)) }

  function handleSubmit() {
    const e = {}
    if (engineers.length === 0) e.engineers = 'Select at least one engineer'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({
      engineers,
      hwItems: hwToggle ? hwItems : [],
      wireItems: hwToggle ? wireItems : [],
    })
  }

  const filtered = INSTALLATION_ENGINEERS.filter(e => e.name.toLowerCase().includes(engSearch.toLowerCase()))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Engineer — ${order?.id ?? ''}`} className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}>Assign</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Engineer <span className="text-red-500">*</span></p>

          {engineers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {engineers.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                  {name}
                  <button type="button" onClick={() => toggleEngineer(name)}
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
              value={engSearch}
              onChange={e => setEngSearch(e.target.value)}
              placeholder="Search engineer..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
            />
          </div>

          <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No engineers found</p>
            ) : filtered.map(eng => {
              const selected = engineers.includes(eng.name)
              return (
                <label key={eng.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox"
                    checked={selected}
                    onChange={() => toggleEngineer(eng.name)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                    {eng.initials}
                  </div>
                  <span className="text-sm text-gray-700">{eng.name}</span>
                </label>
              )
            })}
          </div>
          {errors.engineers && <p className="text-xs text-red-500 mt-1">{errors.engineers}</p>}
        </div>

        {/* Hardware Requirements toggle */}
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <button type="button"
            onClick={() => setHwToggle(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-gray-500" />
              Add Hardware Requirements
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors relative ${hwToggle ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${hwToggle ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          {hwToggle && (
            <div className="px-4 pb-4 pt-1 border-t border-surface-border space-y-5">

              {/* Hardware Items */}
              <div>
                <div className="flex items-center justify-between mb-2 pt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hardware Items</p>
                  <button type="button" onClick={addHwItem}
                    className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_64px_64px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                    <span>Item Name</span><span>QTY</span><span>Unit</span><span />
                  </div>
                  {hwItems.map(row => (
                    <div key={row.id} className="grid grid-cols-[1fr_64px_64px_28px] gap-2 items-center">
                      <input value={row.name} onChange={e => updateHwItem(row.id, 'name', e.target.value)}
                        placeholder="e.g. Intercom Panel Unit" list="intercom-hw-suggestions"
                        className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                      <input type="number" min="0" value={row.qty} onChange={e => updateHwItem(row.id, 'qty', e.target.value)}
                        placeholder="0"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <input value={row.unit} onChange={e => updateHwItem(row.id, 'unit', e.target.value)}
                        placeholder="pcs"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <button type="button" onClick={() => removeHwItem(row.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {hwItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2 border-2 border-dashed border-gray-200 rounded-lg">No items added</p>
                  )}
                </div>
                <datalist id="intercom-hw-suggestions">
                  {IC_HW_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              {/* Wire / Cable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wire / Cable</p>
                  <button type="button" onClick={addWireItem}
                    className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                    <Plus size={12} /> Add Wire
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_64px_64px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                    <span>Cable Name</span><span>QTY</span><span>Unit</span><span />
                  </div>
                  {wireItems.map(row => (
                    <div key={row.id} className="grid grid-cols-[1fr_64px_64px_28px] gap-2 items-center">
                      <input value={row.name} onChange={e => updateWireItem(row.id, 'name', e.target.value)}
                        placeholder="e.g. Drop Wire (m)" list="intercom-wire-suggestions"
                        className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                      <input type="number" min="0" value={row.qty} onChange={e => updateWireItem(row.id, 'qty', e.target.value)}
                        placeholder="0"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <input value={row.unit} onChange={e => updateWireItem(row.id, 'unit', e.target.value)}
                        placeholder="pcs"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <button type="button" onClick={() => removeWireItem(row.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {wireItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2 border-2 border-dashed border-gray-200 rounded-lg">No wires added</p>
                  )}
                </div>
                <datalist id="intercom-wire-suggestions">
                  {IC_WIRE_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function Installations() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [internet, setInternet] = useState(getInternetInstallations)
  const [intercom, setIntercom] = useState(getIntercomInstallations)
  useEffect(() => subscribeInternetInstallations(setInternet), [])
  useEffect(() => subscribeIntercomInstallations(setIntercom), [])

  const initialType = ['Internet', 'Intercom'].includes(searchParams.get('type')) ? searchParams.get('type') : 'All'

  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState(initialType)
  const [filterStatus, setFilterStatus] = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  const [toast, setToast] = useState('')

  /* ── Internet (Sales & Leads) row actions ──────────────────────────────── */
  const netMenuRef = useRef(null)
  const [netMenuId,  setNetMenuId]  = useState(null)
  const [netMenuPos, setNetMenuPos] = useState({ top: 0, right: 0 })

  const [netAssignInst,     setNetAssignInst]     = useState(null)
  const [netRescheduleInst, setNetRescheduleInst] = useState(null)
  const [netHwCollectInst,  setNetHwCollectInst]  = useState(null)
  const [netDispatchInst,   setNetDispatchInst]   = useState(null)
  const [netCancelInst,     setNetCancelInst]     = useState(null)
  const [netCompleteInst,   setNetCompleteInst]   = useState(null)

  const [netAssignForm, setNetAssignForm] = useState({ engineers: [], notes: '' })
  const [netEngSearch,  setNetEngSearch]  = useState('')
  const [netHwToggle,   setNetHwToggle]   = useState(false)
  const [netHwItems,    setNetHwItems]    = useState([])
  const [netWireItems,  setNetWireItems]  = useState([])
  const [netRescheduleForm, setNetRescheduleForm] = useState({
    date: '', slot: 'Morning', reason: '', remarks: '',
  })

  useEffect(() => {
    if (!netMenuId) return
    function onDown(e) { if (netMenuRef.current && !netMenuRef.current.contains(e.target)) setNetMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [netMenuId])

  function openNetMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const top = window.innerHeight - rect.bottom < 240 ? rect.top - 244 : rect.bottom + 4
    setNetMenuPos({ top, right: window.innerWidth - rect.right })
    setIcMenuId(null)
    setNetMenuId(id)
  }

  const netMenuInst = internet.find(i => i.id === netMenuId) ?? null

  function startAssign(inst) {
    const existing = inst.engineerName ? inst.engineerName.split(', ').filter(Boolean) : []
    setNetAssignForm({ engineers: existing, notes: '' })
    setNetEngSearch('')

    const fr = inst.feasibilityId ? getFeasibilityRequest(inst.feasibilityId) : null
    const preHw   = fr?.hwItems?.length   ? fr.hwItems   : inst.hardware?.map(h => netNewHwRow(h.name, String(h.qty), 'pcs')) ?? []
    const preWire = fr?.wireItems?.length ? fr.wireItems : inst.wires?.map(w => netNewWireRow(w.name, String(w.qty), 'm')) ?? []
    setNetHwItems(preHw)
    setNetWireItems(preWire)
    setNetHwToggle(preHw.length > 0 || preWire.length > 0)

    setNetAssignInst(inst)
    setNetMenuId(null)
  }

  function handleNetAssign() {
    const extra = {
      engineerName: netAssignForm.engineers.join(', '),
      _note: `Assigned to ${netAssignForm.engineers.join(', ')}`,
    }
    if (netHwToggle) {
      extra.hwItems   = netHwItems
      extra.wireItems = netWireItems
    }
    updateInstallationStatus(netAssignInst.id, 'Assigned', extra)
    setNetAssignInst(null)
    setToast('Team assigned successfully')
  }

  function toggleNetEngineer(name) {
    setNetAssignForm(f => ({
      ...f,
      engineers: f.engineers.includes(name) ? f.engineers.filter(e => e !== name) : [...f.engineers, name],
    }))
  }

  function addNetHwItem()   { setNetHwItems(r   => [...r, netNewHwRow()])   }
  function addNetWireItem() { setNetWireItems(r => [...r, netNewWireRow()]) }
  function removeNetHwItem(id)   { setNetHwItems(r   => r.filter(x => x.id !== id)) }
  function removeNetWireItem(id) { setNetWireItems(r => r.filter(x => x.id !== id)) }
  function updateNetHwItem(id, field, val)   { setNetHwItems(r   => r.map(x => x.id === id ? { ...x, [field]: val } : x)) }
  function updateNetWireItem(id, field, val) { setNetWireItems(r => r.map(x => x.id === id ? { ...x, [field]: val } : x)) }

  function startReschedule(inst) {
    setNetRescheduleForm({ date: inst.slotDate || '', slot: inst.slot || 'Morning', reason: '', remarks: '' })
    setNetRescheduleInst(inst)
    setNetMenuId(null)
  }

  function handleReschedule() {
    updateInstallationStatus(netRescheduleInst.id, 'Rescheduled', {
      slotDate:          netRescheduleForm.date,
      slot:              netRescheduleForm.slot,
      rescheduleReason:  netRescheduleForm.reason,
      rescheduleRemarks: netRescheduleForm.remarks,
      _note: `Rescheduled to ${netRescheduleForm.date} (${netRescheduleForm.slot}) — ${netRescheduleForm.reason}`,
    })
    setNetRescheduleInst(null)
    setToast('Installation rescheduled')
  }

  function handleHwCollect() {
    updateInstallationStatus(netHwCollectInst.id, 'Hardware Collection Pending', {
      _note: 'Moved to hardware collection',
    })
    setNetHwCollectInst(null)
    setToast('Moved to Hardware Collection')
  }

  function handleDispatch() {
    updateInstallationStatus(netDispatchInst.id, 'Dispatched', {
      _note: 'Hardware collected — team dispatched',
    })
    setNetDispatchInst(null)
    setToast('Marked as Dispatched')
  }

  function handleNetComplete() {
    updateInstallationStatus(netCompleteInst.id, 'Completed', { _note: 'Installation completed' })
    setNetCompleteInst(null)
    setToast('Installation marked as Completed')
  }

  function handleNetCancel() {
    updateInstallationStatus(netCancelInst.id, 'Cancelled', { _note: 'Installation cancelled' })
    setNetCancelInst(null)
    setToast('Installation cancelled')
  }

  /* ── Intercom row actions ──────────────────────────────────────────────── */
  const icMenuRef = useRef(null)
  const [icMenuId,  setIcMenuId]  = useState(null)
  const [icMenuPos, setIcMenuPos] = useState({ top: 0, right: 0 })
  const [icAssignOrder, setIcAssignOrder] = useState(null)

  useEffect(() => {
    if (!icMenuId) return
    function onDown(e) { if (icMenuRef.current && !icMenuRef.current.contains(e.target)) setIcMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [icMenuId])

  function openIcMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setIcMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setNetMenuId(null)
    setIcMenuId(id)
  }

  const icMenuOrder = intercom.find(o => o.id === icMenuId) ?? null

  function handleIcView(o)   { navigate(`/intercom/installations/${o.id}`); setIcMenuId(null) }
  function handleIcAssign(o) { setIcAssignOrder(o); setIcMenuId(null) }
  function handleIcEdit()    { setIcMenuId(null) }
  function handleIcCancel()  { setIcMenuId(null) }

  function handleIcAssignSubmit({ engineers, hwItems, wireItems }) {
    updateIntercomInstallation(icAssignOrder.id, {
      engineer: engineers.join(', '),
      hwItems,
      wireItems,
      status: icAssignOrder.status === 'pending' ? 'inprogress' : icAssignOrder.status,
    })
    setIcAssignOrder(null)
    setToast('Engineer assigned successfully')
  }

  /* ── Table data ─────────────────────────────────────────────────────────── */

  function changeType(next) {
    setFilterType(next)
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (next === 'All') params.delete('type')
    else params.set('type', next)
    setSearchParams(params, { replace: true })
  }

  const rows = useMemo(() => buildUnifiedRows(internet, intercom), [internet, intercom])

  const counts = useMemo(() => {
    const c = {
      total: rows.length,
      internet: rows.filter(r => r.type === 'Internet').length,
      intercom: rows.filter(r => r.type === 'Intercom').length,
    }
    NORMALIZED_BUCKETS.forEach(b => { c[b] = rows.filter(r => r.normalizedStatus === b).length })
    return c
  }, [rows])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filterType !== 'All' && r.type !== filterType) return false
      if (filterStatus && r.normalizedStatus !== filterStatus) return false
      if (q &&
          !r.customerName.toLowerCase().includes(q) &&
          !r.workOrderId.toLowerCase().includes(q) &&
          !(r.leadId || '').toLowerCase().includes(q) &&
          !r.mobile.toLowerCase().includes(q) &&
          !r.areaLocality.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paged      = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

  function goToDetail(row) { navigate(row.detailHref) }

  const STAT_CARDS = [
    { key: 'total',       label: 'Total Visits', value: counts.total,       color: 'text-gray-700',    bg: 'bg-gray-100',    icon: CalendarDays },
    { key: 'Scheduled',   label: 'Scheduled',    value: counts.Scheduled,   color: 'text-brand-blue',  bg: 'bg-blue-50',     icon: Clock         },
    { key: 'Assigned',    label: 'Assigned',     value: counts.Assigned,    color: 'text-purple-600',  bg: 'bg-purple-50',   icon: UserCheck     },
    { key: 'In Progress', label: 'In Progress',  value: counts['In Progress'], color: 'text-orange-600', bg: 'bg-orange-50', icon: Loader2       },
    { key: 'Completed',   label: 'Completed',    value: counts.Completed,   color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: CheckCircle2  },
    { key: 'Rescheduled', label: 'Rescheduled',  value: counts.Rescheduled, color: 'text-yellow-600',  bg: 'bg-yellow-50',   icon: RefreshCw     },
    { key: 'Cancelled',   label: 'Cancelled',    value: counts.Cancelled,   color: 'text-red-500',     bg: 'bg-red-50',      icon: XCircle       },
  ]

  const netMenuDisabledHw   = netMenuInst && ['Completed', 'Cancelled', 'Hardware Collection Pending', 'Dispatched'].includes(netMenuInst.status)
  const netMenuDisabledDone = netMenuInst && ['Completed', 'Cancelled'].includes(netMenuInst.status)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 shrink-0 bg-white border-b border-surface-border">
        <h1 className="text-xl font-bold text-gray-900">Installations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Unified list of Internet and Intercom installation work orders</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {STAT_CARDS.map(({ key, label, value, color, bg, icon: Icon }) => (
            <div key={key} className="bg-white rounded-xl border border-surface-border p-4 flex items-center gap-3 shadow-card">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={14} className={color} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">{label}</p>
                {key === 'total' && (
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-tight truncate">
                    {counts.internet} Internet / {counts.intercom} Intercom
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Filters + table card */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">

          {/* Search + Type filter + Status filter */}
          <div className="px-4 py-3 border-b border-surface-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by customer name, work order ID, mobile, area..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={filterType}
                onChange={e => changeType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue cursor-pointer">
                <option value="All">All Types</option>
                <option value="Internet">Internet</option>
                <option value="Intercom">Intercom</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue cursor-pointer">
                <option value="">All Statuses</option>
                {NORMALIZED_BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <span className="text-xs text-gray-400 shrink-0">
              {visible.length} work order{visible.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          {visible.length === 0 ? (
            <div className="py-16 text-center">
              <Wrench size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No installations found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different type/status filter or clear the search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 1400 }}>
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {['Work Order ID', 'Type', 'Lead ID', 'Customer Name', 'Mobile', 'Area / Locality',
                      'Assigned Engineer', 'Installation Date', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-6' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {paged.map(row => (
                    <tr key={row.key} onClick={() => goToDetail(row)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer">

                      {/* WORK ORDER ID */}
                      <td className="pl-6 pr-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-brand-blue hover:underline">
                          {row.workOrderId}
                        </span>
                      </td>

                      {/* TYPE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={TYPE_BADGE[row.type] ?? 'gray'} size="sm">{row.type}</Badge>
                      </td>

                      {/* LEAD ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.leadId
                          ? <button onClick={e => { e.stopPropagation(); navigate(row.leadHref) }}
                              className="font-mono text-xs font-semibold text-gray-600 hover:text-brand-blue hover:underline">
                              {row.leadId}
                            </button>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* CUSTOMER NAME */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-900">{row.customerName}</span>
                      </td>

                      {/* MOBILE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-600">{row.mobile}</span>
                      </td>

                      {/* AREA / LOCALITY */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{row.areaLocality}</span>
                      </td>

                      {/* ASSIGNED ENGINEER */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{row.assignedEngineer}</span>
                      </td>

                      {/* INSTALLATION DATE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700 font-medium">{row.installationDate}</span>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={STATUS_BADGE[row.status] ?? 'gray'} size="sm">{row.status}</Badge>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.type === 'Internet' ? (
                          <button
                            onClick={e => openNetMenu(e, row.workOrderId)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                              netMenuId === row.workOrderId ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}>
                            <MoreVertical size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={e => openIcMenu(e, row.workOrderId)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                              icMenuId === row.workOrderId ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                            }`}>
                            <MoreVertical size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination footer */}
          {visible.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <span className="text-xs text-gray-500">
                Showing {visible.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visible.length)} of {visible.length} work order{visible.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                      p === safePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Internet (Sales & Leads) ⋮ dropdown ─────────────────────────────── */}
      {netMenuInst && (
        <div
          ref={netMenuRef}
          style={{ position: 'fixed', top: netMenuPos.top, right: netMenuPos.right, zIndex: 9999 }}
          className="bg-white rounded-lg border border-gray-100 shadow-lg py-1 min-w-[220px]"
        >
          <button onClick={() => { navigate(`/installations/${netMenuInst.id}`); setNetMenuId(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">View Details</span>
          </button>

          <button
            onClick={() => { if (netMenuInst.leadId) navigate(`/sales/leads/${netMenuInst.leadId}/overview`); setNetMenuId(null) }}
            disabled={!netMenuInst.leadId}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 ${netMenuInst.leadId ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
            <List className={`w-4 h-4 flex-shrink-0 ${netMenuInst.leadId ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${netMenuInst.leadId ? 'text-gray-700' : 'text-gray-400'}`}>View Lead</span>
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button onClick={() => startAssign(netMenuInst)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <Users className="w-4 h-4 text-brand-blue flex-shrink-0" />
            <span className="text-sm text-gray-700">Assign Team</span>
          </button>

          <button onClick={() => startReschedule(netMenuInst)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <RefreshCw className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Edit Slot / Reschedule</span>
          </button>

          <button
            onClick={() => { setNetHwCollectInst(netMenuInst); setNetMenuId(null) }}
            disabled={netMenuDisabledHw}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 ${netMenuDisabledHw ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <Package className={`w-4 h-4 flex-shrink-0 ${netMenuDisabledHw ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${netMenuDisabledHw ? 'text-gray-400' : 'text-gray-700'}`}>
              Move to Hardware Collection
            </span>
          </button>

          <button
            onClick={() => { setNetDispatchInst(netMenuInst); setNetMenuId(null) }}
            disabled={netMenuInst.status !== 'Hardware Collection Pending'}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 ${
              netMenuInst.status !== 'Hardware Collection Pending' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <Truck className={`w-4 h-4 flex-shrink-0 ${
              netMenuInst.status !== 'Hardware Collection Pending' ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${
              netMenuInst.status !== 'Hardware Collection Pending' ? 'text-gray-400' : 'text-gray-700'}`}>
              Move to Dispatch
            </span>
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            onClick={() => { setNetCompleteInst(netMenuInst); setNetMenuId(null) }}
            disabled={netMenuDisabledDone}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 ${netMenuDisabledDone ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${netMenuDisabledDone ? 'text-gray-400' : 'text-emerald-500'}`} />
            <span className={`text-sm ${netMenuDisabledDone ? 'text-gray-400' : 'text-gray-700'}`}>
              Mark Completed
            </span>
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            onClick={() => { setNetCancelInst(netMenuInst); setNetMenuId(null) }}
            disabled={netMenuDisabledDone}
            className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 ${netMenuDisabledDone ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <XCircle className={`w-4 h-4 flex-shrink-0 ${netMenuDisabledDone ? 'text-gray-400' : 'text-red-500'}`} />
            <span className={`text-sm ${netMenuDisabledDone ? 'text-gray-400' : 'text-gray-700'}`}>
              Mark Cancelled
            </span>
          </button>
        </div>
      )}

      {/* ── Internet Assign Team Modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!netAssignInst}
        onClose={() => setNetAssignInst(null)}
        title={`Assign Team — ${netAssignInst?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setNetAssignInst(null)}>Cancel</Button>
          <Button size="sm" onClick={handleNetAssign} disabled={netAssignForm.engineers.length === 0}>
            {netHwToggle ? 'Move to Hardware Collection' : 'Assign Team'}
          </Button>
        </>}
      >
        <div className="space-y-4">

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Engineers <span className="text-red-500">*</span></p>

            {netAssignForm.engineers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {netAssignForm.engineers.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                    {name}
                    <button type="button" onClick={() => toggleNetEngineer(name)}
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
                value={netEngSearch}
                onChange={e => setNetEngSearch(e.target.value)}
                placeholder="Search engineer..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
              />
            </div>

            {(() => {
              const filtered = FIELD_ENGINEERS.filter(e =>
                e.name.toLowerCase().includes(netEngSearch.toLowerCase())
              )
              return (
                <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No engineers found</p>
                  ) : filtered.map(eng => {
                    const selected = netAssignForm.engineers.includes(eng.name)
                    return (
                      <label key={eng.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <input type="checkbox"
                          checked={selected}
                          onChange={() => toggleNetEngineer(eng.name)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                        />
                        <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                          {eng.initials}
                        </div>
                        <span className="text-sm text-gray-700">{eng.name}</span>
                      </label>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <div className="border border-surface-border rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setNetHwToggle(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-gray-500" />
                Add Hardware Requirements
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${netHwToggle ? 'bg-brand-blue' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${netHwToggle ? 'left-4' : 'left-0.5'}`} />
              </div>
            </button>

            {netHwToggle && (
              <div className="px-4 pb-4 pt-1 border-t border-surface-border space-y-5">

                <div>
                  <div className="flex items-center justify-between mb-2 pt-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hardware Items</p>
                    <button type="button" onClick={addNetHwItem}
                      className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                      <Plus size={12} /> Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_64px_64px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                      <span>Item Name</span><span>QTY</span><span>Unit</span><span />
                    </div>
                    {netHwItems.map(row => (
                      <div key={row.id} className="grid grid-cols-[1fr_64px_64px_28px] gap-2 items-center">
                        <input value={row.name} onChange={e => updateNetHwItem(row.id, 'name', e.target.value)}
                          placeholder="e.g. ONT Device" list="net-inst-hw-suggestions"
                          className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                        <input type="number" min="0" value={row.qty} onChange={e => updateNetHwItem(row.id, 'qty', e.target.value)}
                          placeholder="0"
                          className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                        <input value={row.unit} onChange={e => updateNetHwItem(row.id, 'unit', e.target.value)}
                          placeholder="pcs"
                          className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                        <button type="button" onClick={() => removeNetHwItem(row.id)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {netHwItems.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2 border-2 border-dashed border-gray-200 rounded-lg">No items added</p>
                    )}
                  </div>
                  <datalist id="net-inst-hw-suggestions">
                    {NET_HW_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wire / Cable</p>
                    <button type="button" onClick={addNetWireItem}
                      className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                      <Plus size={12} /> Add Wire
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_64px_64px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                      <span>Cable Name</span><span>QTY</span><span>Unit</span><span />
                    </div>
                    {netWireItems.map(row => (
                      <div key={row.id} className="grid grid-cols-[1fr_64px_64px_28px] gap-2 items-center">
                        <input value={row.name} onChange={e => updateNetWireItem(row.id, 'name', e.target.value)}
                          placeholder="e.g. Ethernet Cat6" list="net-inst-wire-suggestions"
                          className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                        <input type="number" min="0" value={row.qty} onChange={e => updateNetWireItem(row.id, 'qty', e.target.value)}
                          placeholder="0"
                          className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                        <input value={row.unit} onChange={e => updateNetWireItem(row.id, 'unit', e.target.value)}
                          placeholder="m"
                          className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                        <button type="button" onClick={() => removeNetWireItem(row.id)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {netWireItems.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2 border-2 border-dashed border-gray-200 rounded-lg">No wires added</p>
                    )}
                  </div>
                  <datalist id="net-inst-wire-suggestions">
                    {NET_WIRE_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

              </div>
            )}
          </div>

        </div>
      </Modal>

      {/* ── Internet Reschedule Modal ────────────────────────────────────── */}
      <Modal
        isOpen={!!netRescheduleInst}
        onClose={() => setNetRescheduleInst(null)}
        title={`Reschedule — ${netRescheduleInst?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setNetRescheduleInst(null)}>Cancel</Button>
          <Button size="sm" onClick={handleReschedule}
            disabled={!netRescheduleForm.date || !netRescheduleForm.reason}>
            Reschedule
          </Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="New Installation Date" required>
            <Input type="date" value={netRescheduleForm.date}
              onChange={e => setNetRescheduleForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">New Slot</p>
            <div className="flex gap-3">
              {['Morning','Afternoon','Evening'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="resched-slot" value={s}
                    checked={netRescheduleForm.slot === s}
                    onChange={() => setNetRescheduleForm(f => ({ ...f, slot: s }))}
                    className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Reschedule Reason" required>
            <Select value={netRescheduleForm.reason}
              onChange={e => setNetRescheduleForm(f => ({ ...f, reason: e.target.value }))}>
              <option value="">Select reason…</option>
              {RESCHEDULE_REASONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>

          <FormField label="Remarks">
            <Textarea rows={3} placeholder="Additional remarks…"
              value={netRescheduleForm.remarks}
              onChange={e => setNetRescheduleForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Internet Hardware Collection Confirmation ───────────────────── */}
      <Modal
        isOpen={!!netHwCollectInst}
        onClose={() => setNetHwCollectInst(null)}
        title="Move to Hardware Collection"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setNetHwCollectInst(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleHwCollect}>
            Confirm
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Move <span className="font-semibold">{netHwCollectInst?.id}</span> to Hardware Collection?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 font-medium">{netHwCollectInst?.customerName}</p>
            <p className="text-xs text-amber-600 mt-0.5">{netHwCollectInst?.area} · {netHwCollectInst?.slot} Slot · {netHwCollectInst?.slotDate}</p>
          </div>
          <p className="text-xs text-gray-400">Status will be updated to "Hardware Collection Pending".</p>
        </div>
      </Modal>

      {/* ── Internet Dispatch Confirmation ───────────────────────────────── */}
      <Modal
        isOpen={!!netDispatchInst}
        onClose={() => setNetDispatchInst(null)}
        title="Confirm Dispatch"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setNetDispatchInst(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleDispatch}>
            <ArrowRight size={13} className="mr-1" /> Confirm — Dispatch
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Mark hardware collected and dispatch team for{' '}
            <span className="font-semibold">{netDispatchInst?.id}</span>?
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-700 font-medium">{netDispatchInst?.customerName}</p>
            <p className="text-xs text-orange-600 mt-0.5">{netDispatchInst?.area} · {netDispatchInst?.assignedTeam}</p>
          </div>
          <p className="text-xs text-gray-400">Status will be updated to "Dispatched".</p>
        </div>
      </Modal>

      {/* ── Internet Mark Completed Confirmation ─────────────────────────── */}
      <Modal
        isOpen={!!netCompleteInst}
        onClose={() => setNetCompleteInst(null)}
        title="Mark as Completed"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setNetCompleteInst(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleNetComplete}>
            <CheckCircle2 size={13} className="mr-1" /> Mark Completed
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Mark <span className="font-semibold">{netCompleteInst?.id}</span> as completed?
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs text-emerald-700 font-medium">{netCompleteInst?.customerName}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{netCompleteInst?.area} · {netCompleteInst?.plan}</p>
          </div>
        </div>
      </Modal>

      {/* ── Internet Mark Cancelled Confirmation ─────────────────────────── */}
      <Modal
        isOpen={!!netCancelInst}
        onClose={() => setNetCancelInst(null)}
        title="Mark as Cancelled"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setNetCancelInst(null)}>Keep Installation</Button>
          <Button size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleNetCancel}>
            Confirm Cancellation
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Cancel the installation for{' '}
            <span className="font-semibold">{netCancelInst?.customerName}</span>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-700 font-medium">{netCancelInst?.id} · {netCancelInst?.area}</p>
            <p className="text-xs text-red-600 mt-0.5">Slot: {netCancelInst?.slotDate} — {netCancelInst?.slot}</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
            This action cannot be undone.
          </div>
        </div>
      </Modal>

      {/* ── Intercom ⋮ dropdown ──────────────────────────────────────────── */}
      {icMenuOrder && (
        <div ref={icMenuRef}>
          <IntercomActionsMenu
            order={icMenuOrder}
            pos={icMenuPos}
            onView={handleIcView}
            onAssign={handleIcAssign}
            onEdit={handleIcEdit}
            onCancel={handleIcCancel}
          />
        </div>
      )}

      <IntercomAssignEngineerModal
        isOpen={!!icAssignOrder}
        onClose={() => setIcAssignOrder(null)}
        order={icAssignOrder}
        onSubmit={handleIcAssignSubmit}
      />

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}
