import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Search, AlertTriangle } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getWorkOrder, saveWorkOrder, previewWorkOrderId, technicianOpenWorkOrderCount,
  WORK_ORDER_CATEGORIES, WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES,
  FAULT_TYPES, CLEANING_CHECKLIST_ITEMS,
} from '../data/workOrderStore'
import { getPOPs, getPOP } from '../data/popStore'
import { getProducts } from '../data/productStore'
import { getProductAvailability } from '../data/inventoryLedger'
import { getAllTechnicians } from '../data/technicianHelpers'

function emptyChecklist() {
  return Object.fromEntries(CLEANING_CHECKLIST_ITEMS.map(c => [c.key, false]))
}
function emptyHardwareRow() {
  return { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: '', quantity: '', reason: '' }
}

// Searchable POP picker — same text-input-plus-floating-list interaction as
// components/inventory/ProductPicker.jsx (fixed positioning so it isn't
// clipped by a scrolling ancestor), reimplemented locally rather than reused
// directly since ProductPicker is Inventory-specific (its hint/labelling is
// product-shaped) and this is the form's only POP-picking use, not worth
// generalizing into a shared component for one caller.
function POPPicker({ pops, value, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 280 })
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) })
    setOpen(true)
  }

  const selected = pops.find(p => p.id === value)
  const filtered = pops.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.id.toLowerCase().includes(query.toLowerCase()) ||
    (p.address || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={open ? query : (selected ? `${selected.name} (${selected.id})` : '')}
          onChange={e => { setQuery(e.target.value); openDropdown() }}
          onFocus={() => { setQuery(''); openDropdown() }}
          placeholder="Search POP by name, id or address…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </div>
      {open && (
        <div
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, zIndex: 9999 }}
          className="max-h-56 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching POPs</p>
          ) : filtered.map(p => (
            <button
              key={p.id} type="button"
              onClick={() => { onSelect(p.id); setOpen(false); setQuery('') }}
              className="flex flex-col w-full text-left px-3 py-2 gap-0.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{p.name} <span className="text-gray-400">· {p.id}</span></span>
              <span className="text-gray-400">{p.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function POPWorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const existing = isEditing ? getWorkOrder(id) : null

  const pops = getPOPs()
  const products = getProducts().filter(p => p.status === 'active')
  const technicians = getAllTechnicians()

  const [popId, setPopId] = useState(existing?.popId ?? '')
  const [category, setCategory] = useState(existing?.category ?? WORK_ORDER_CATEGORIES[0])
  const [priority, setPriority] = useState(existing?.priority ?? WORK_ORDER_PRIORITIES[0])
  const [assignedTechnicianIds, setAssignedTechnicianIds] = useState(existing?.assignedTechnicianIds ?? [])
  const [scheduledDateTime, setScheduledDateTime] = useState(existing?.scheduledDateTime ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [status, setStatus] = useState(existing?.status ?? WORK_ORDER_STATUSES[0])

  const [cleaningChecklist, setCleaningChecklist] = useState(existing?.cleaningChecklist ?? emptyChecklist())
  const [equipmentInvolved, setEquipmentInvolved] = useState(existing?.equipmentInvolved ?? '')
  const [faultType, setFaultType] = useState(existing?.faultType ?? '')

  const [hardwareNeed, setHardwareNeed] = useState(() =>
    existing?.hardwareNeed?.length
      ? existing.hardwareNeed.map(r => ({ id: `${r.productId}-${Math.random().toString(36).slice(2, 7)}`, productId: r.productId, quantity: String(r.quantity), reason: r.reason ?? '' }))
      : []
  )

  const [requireSupervisorApproval, setRequireSupervisorApproval] = useState(existing?.requireSupervisorApproval ?? false)
  const [supervisorApproval, setSupervisorApproval] = useState(existing?.supervisorApproval ?? false)
  const [resolutionNotes, setResolutionNotes] = useState(existing?.resolutionNotes ?? '')
  const [rootCause, setRootCause] = useState(existing?.rootCause ?? '')
  const [technicianSignOff, setTechnicianSignOff] = useState(existing?.technicianSignOff ?? false)
  const [hardwareUsedQty, setHardwareUsedQty] = useState(() => {
    const map = {}
    ;(existing?.hardwareUsed ?? []).forEach(u => { map[u.productId] = String(u.quantity) })
    return map
  })

  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')

  const selectedPop = popId ? getPOP(popId) : null
  const popEquipment = selectedPop?.equipment ?? []
  const isMaintenance = category === 'Preventive Maintenance' || category === 'Breakdown-Fault'
  const isResolving = status === 'Resolved' || status === 'Closed'

  function toggleTechnician(userId) {
    setAssignedTechnicianIds(list => list.includes(userId) ? list.filter(i => i !== userId) : [...list, userId])
    setErrors(er => ({ ...er, assignedTechnicianIds: undefined }))
  }

  function updateHardwareRow(rowId, patch) {
    setHardwareNeed(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
    setErrors(er => ({ ...er, hardwareNeed: undefined }))
  }
  function addHardwareRow() { setHardwareNeed(rows => [...rows, emptyHardwareRow()]) }
  function removeHardwareRow(rowId) { setHardwareNeed(rows => rows.filter(r => r.id !== rowId)) }

  function validate() {
    const errs = {}
    if (!popId) errs.popId = 'Select a POP.'
    if (!scheduledDateTime) errs.scheduledDateTime = 'Scheduled date/time is required.'
    if (!description.trim()) errs.description = 'Description is required.'
    if (status !== 'Open' && assignedTechnicianIds.length === 0) errs.assignedTechnicianIds = 'Assign at least one technician.'
    if (isMaintenance && !faultType) errs.faultType = 'Select a fault type.'
    const namedHardwareRows = hardwareNeed.filter(r => r.productId)
    if (namedHardwareRows.some(r => r.quantity === '' || Number.isNaN(Number(r.quantity)) || Number(r.quantity) <= 0)) {
      errs.hardwareNeed = 'Every Hardware Need row needs a valid quantity.'
    }
    if (isResolving) {
      if (!resolutionNotes.trim()) errs.resolutionNotes = 'Resolution notes are required.'
      if (!rootCause.trim()) errs.rootCause = 'Root cause is required.'
      if (!technicianSignOff) errs.technicianSignOff = 'Technician sign-off is required to resolve.'
    }
    if (status === 'Closed' && requireSupervisorApproval && !supervisorApproval) {
      errs.supervisorApproval = 'Supervisor approval is required before closing.'
    }
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); setSaveError(''); return }

    const cleanedHardwareNeed = hardwareNeed
      .filter(r => r.productId)
      .map(r => ({ productId: r.productId, quantity: Number(r.quantity) || 0, reason: r.reason.trim() }))

    const hardwareUsed = isResolving
      ? cleanedHardwareNeed.map(r => ({ productId: r.productId, quantity: Number(hardwareUsedQty[r.productId] ?? r.quantity) || 0 }))
      : (existing?.hardwareUsed ?? [])

    const saved = saveWorkOrder({
      id: existing?.id,
      popId,
      category,
      priority,
      assignedTechnicianIds,
      scheduledDateTime,
      description: description.trim(),
      status,
      cleaningChecklist: category === 'Cleaning' ? cleaningChecklist : null,
      equipmentInvolved: isMaintenance ? (equipmentInvolved || null) : null,
      faultType: isMaintenance ? faultType : null,
      hardwareNeed: cleanedHardwareNeed,
      requireSupervisorApproval,
      supervisorApproval: isResolving ? supervisorApproval : false,
      resolutionNotes: isResolving ? resolutionNotes.trim() : (existing?.resolutionNotes ?? ''),
      rootCause: isResolving ? rootCause.trim() : (existing?.rootCause ?? ''),
      technicianSignOff: isResolving ? technicianSignOff : (existing?.technicianSignOff ?? false),
      hardwareUsed,
    })

    if (!saved) {
      setSaveError('Could not close this Work Order — supervisor approval is required first.')
      return
    }
    navigate('/network/pops/work-orders')
  }

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/network/pops/work-orders')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Work Order' : 'Add Work Order'}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Work Order ID: <span className="font-mono font-semibold text-brand-blue">{isEditing ? existing?.id : previewWorkOrderId()}</span>
            {!isEditing && <span className="text-gray-400"> (assigned on save)</span>}
          </p>
        </div>
      </div>

      <div className="w-full bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Details</h3>
          <FormField label="POP" required error={errors.popId}>
            <POPPicker pops={pops} value={popId} onSelect={v => { setPopId(v); setErrors(er => ({ ...er, popId: undefined })) }} />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Category" required>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {WORK_ORDER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority" required>
              <Select value={priority} onChange={e => setPriority(e.target.value)}>
                {WORK_ORDER_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                {WORK_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Category-specific fields */}
        {category === 'Cleaning' ? (
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cleaning Checklist</h3>
            {selectedPop && (
              <p className="text-xs text-gray-500">
                Last Cleaning Date: <span className="font-medium text-gray-700">{selectedPop.lastCleaningDate ?? 'Never recorded'}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {CLEANING_CHECKLIST_ITEMS.map(item => (
                <label key={item.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-surface-border cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={cleaningChecklist[item.key] ?? false}
                    onChange={e => setCleaningChecklist(c => ({ ...c, [item.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Maintenance Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Equipment Involved" hint={!popId ? 'Select a POP first.' : (popEquipment.length === 0 ? 'This POP has no equipment on record.' : undefined)}>
                <Select value={equipmentInvolved} onChange={e => setEquipmentInvolved(e.target.value)} disabled={popEquipment.length === 0}>
                  <option value="">Not specified</option>
                  {popEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.type} — {eq.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Fault Type" required error={errors.faultType}>
                <Select value={faultType} onChange={e => { setFaultType(e.target.value); setErrors(er => ({ ...er, faultType: undefined })) }}>
                  <option value="">Select…</option>
                  {FAULT_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {/* Scheduling & Assignment */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduling & Assignment</h3>
          <FormField label="Scheduled Date/Time" required error={errors.scheduledDateTime}>
            <Input type="datetime-local" value={scheduledDateTime} onChange={e => { setScheduledDateTime(e.target.value); setErrors(er => ({ ...er, scheduledDateTime: undefined })) }} className="max-w-xs" />
          </FormField>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Technician Assignment {status !== 'Open' && <span className="text-red-500">*</span>}</p>
            {errors.assignedTechnicianIds && <p className="text-xs text-red-500 mb-1.5">{errors.assignedTechnicianIds}</p>}
            <div className="border border-surface-border rounded-lg divide-y divide-surface-border max-h-56 overflow-y-auto">
              {technicians.map(t => {
                const selected = assignedTechnicianIds.includes(t.id)
                const openCount = technicianOpenWorkOrderCount(t.id)
                return (
                  <label key={t.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTechnician(t.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{t.name}{t.zone ? ` — ${t.zone}` : ''}</span>
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${openCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {openCount === 0 ? 'Available' : `${openCount} active WO${openCount > 1 ? 's' : ''}`}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <FormField label="Description" required error={errors.description}>
            <Textarea rows={3} placeholder="Describe the work to be done…" value={description} onChange={e => { setDescription(e.target.value); setErrors(er => ({ ...er, description: undefined })) }} />
          </FormField>
        </div>

        {/* Hardware Need */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hardware Need</h3>
          {errors.hardwareNeed && <p className="text-xs text-red-500">{errors.hardwareNeed}</p>}
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Quantity</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {hardwareNeed.map(row => {
                  const available = row.productId ? getProductAvailability(row.productId) : null
                  const requested = Number(row.quantity) || 0
                  const insufficient = row.productId && requested > 0 && requested > available
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <Select value={row.productId} onChange={e => updateHardwareRow(row.id, { productId: e.target.value })}>
                          <option value="">Select product…</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="0" placeholder="0" value={row.quantity} onChange={e => updateHardwareRow(row.id, { quantity: e.target.value })} />
                        {row.productId && (
                          <p className="text-[11px] text-gray-400 mt-1">{available} available</p>
                        )}
                        {insufficient && (
                          <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1">
                            <AlertTriangle size={11} /> Insufficient stock — {available} available
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input placeholder="e.g. Splitter replacement" value={row.reason} onChange={e => updateHardwareRow(row.id, { reason: e.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => removeHardwareRow(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {hardwareNeed.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-xs text-gray-400">No hardware requested yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addHardwareRow} className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors">
            <Plus size={13} /> Add Hardware
          </button>
        </div>

        {/* Approval requirement toggle */}
        <div className="pt-4 border-t border-surface-border">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={requireSupervisorApproval}
              onChange={e => setRequireSupervisorApproval(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
            />
            <span className="text-sm text-gray-700">Require supervisor approval before this Work Order can be Closed</span>
          </label>
        </div>

        {/* Resolution — only once status is Resolved/Closed */}
        {isResolving && (
          <div className="space-y-4 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolution</h3>
            <FormField label="Resolution Notes" required error={errors.resolutionNotes}>
              <Textarea rows={3} placeholder="What was done to resolve this?" value={resolutionNotes} onChange={e => { setResolutionNotes(e.target.value); setErrors(er => ({ ...er, resolutionNotes: undefined })) }} />
            </FormField>
            <FormField label="Root Cause" required error={errors.rootCause}>
              <Textarea rows={2} placeholder="What caused this issue?" value={rootCause} onChange={e => { setRootCause(e.target.value); setErrors(er => ({ ...er, rootCause: undefined })) }} />
            </FormField>

            {hardwareNeed.some(r => r.productId) && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1.5">Hardware Used</p>
                <div className="border border-surface-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/60 border-b border-surface-border">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Requested</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Actual Qty Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {hardwareNeed.filter(r => r.productId).map(row => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 text-gray-700">{products.find(p => p.id === row.productId)?.name ?? row.productId}</td>
                          <td className="px-3 py-2 text-gray-500">{row.quantity}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number" min="0"
                              value={hardwareUsedQty[row.productId] ?? row.quantity}
                              onChange={e => setHardwareUsedQty(m => ({ ...m, [row.productId]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Time Taken: <span className="font-medium text-gray-700">{existing?.timeTaken != null ? `${existing.timeTaken} hrs` : 'Calculated automatically once resolved'}</span>
            </p>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={technicianSignOff}
                onChange={e => { setTechnicianSignOff(e.target.checked); setErrors(er => ({ ...er, technicianSignOff: undefined })) }}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <span className="text-sm text-gray-700">Technician confirms work completed (sign-off)</span>
            </label>
            {errors.technicianSignOff && <p className="text-xs text-red-500">{errors.technicianSignOff}</p>}

            {requireSupervisorApproval && (
              <>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supervisorApproval}
                    onChange={e => { setSupervisorApproval(e.target.checked); setErrors(er => ({ ...er, supervisorApproval: undefined })) }}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">Supervisor approved</span>
                </label>
                {errors.supervisorApproval && <p className="text-xs text-red-500">{errors.supervisorApproval}</p>}
              </>
            )}
          </div>
        )}

        {saveError && <p className="text-xs text-red-500 text-right">{saveError}</p>}
        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Save Work Order</Button>
        </div>
      </div>
    </div>
  )
}
