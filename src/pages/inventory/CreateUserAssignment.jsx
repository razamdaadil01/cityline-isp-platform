import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, UserCog, ClipboardList,
  PackageOpen, CheckCircle2, Search, AlertTriangle,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { FormField, Select, Textarea } from '../../components/ui/FormInputs'
import StepProgress from '../../components/customer-type/StepProgress'
import { FIELD_ENGINEERS } from '../../data/installationsStore'
import { getProducts, getProduct } from '../../data/productStore'
import { getUnits, getEngineerHeldQty } from '../../data/inventoryLedger'
import { WORK_ORDER_TYPES } from '../../data/assignmentStore'
import { getWorkOrderTypeRecords, saveUserAssignment } from '../../data/userAssignmentStore'

const STEPS = [
  { id: 1, label: 'Engineer',     icon: UserCog },
  { id: 2, label: 'Reference',    icon: ClipboardList },
  { id: 3, label: 'Hand Off',     icon: PackageOpen },
  { id: 4, label: 'Confirm',      icon: CheckCircle2 },
]

// A dual-tracked product (Serial + MAC both enabled) is treated here as
// serial-tracked — Hand Off moves whole physical units by their serial
// identifier; a unit's paired MAC stays attached to the same ledger unit
// object regardless (see inventoryLedger.js), it's just not carried as a
// second explicit value on this handoff's own line record.
function liveTrackingType(productId) {
  const p = getProduct(productId)
  if (!p) return 'quantity'
  if (p.trackedBySerial) return 'serial'
  if (p.trackedByMac) return 'mac'
  return 'quantity'
}

// ── Step 2 reference picker ─────────────────────────────────────────────
// Searchable combobox against getWorkOrderTypeRecords(type) — same
// floating-dropdown pattern as CreatePurchase.jsx's POPicker. Selection is
// always a real record object, never free text.
function ReferencePicker({ records, value, onSelect, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.toLowerCase().trim()
  const filtered = (q ? records.filter(r => r.searchText.includes(q)) : records).slice(0, 30)

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={open ? query : (value ? `${value.label}${value.customerName ? ` · ${value.customerName}` : ''}` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching records</p>
          ) : filtered.map(r => (
            <button key={r.id} type="button"
              onClick={() => { onSelect(r); setOpen(false); setQuery('') }}
              className="flex flex-col w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors border-b border-surface-border last:border-0">
              <span className="font-mono font-semibold text-brand-blue">{r.id}</span>
              {r.customerName && <span className="text-gray-500 truncate">{r.customerName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 3 line cards ────────────────────────────────────────────────────

function HandoffLineCard({ line, engineerId, otherLines, onChange }) {
  const trackingType = liveTrackingType(line.productId)
  const usedElsewhere = otherLines.reduce((s, l) => l.productId === line.productId ? s + (l.trackingType === 'quantity' ? Number(l.qty) || 0 : l.serials.length + l.macs.length) : s, 0)

  if (trackingType === 'serial' || trackingType === 'mac') {
    const kindLabel = trackingType === 'serial' ? 'Serial' : 'MAC'
    const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
    const units = getUnits({ productId: line.productId, status: 'Assigned to Engineer', engineerId }).filter(u => !pickedElsewhere.has(u.value))
    const picked = trackingType === 'serial' ? line.serials : line.macs
    function toggle(value) {
      const isPicked = picked.includes(value)
      const next = isPicked ? picked.filter(v => v !== value) : [...picked, value]
      onChange(trackingType === 'serial' ? { serials: next } : { macs: next })
    }
    return (
      <div className="rounded-xl border border-surface-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
          <Badge variant="purple" size="sm">{picked.length} selected · {units.length} held</Badge>
        </div>
        {units.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No available {kindLabel.toLowerCase()}s held by this engineer.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {units.map(u => {
              const isPicked = picked.includes(u.value)
              return (
                <label key={u.value} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                  isPicked ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border text-gray-600 hover:bg-gray-50'
                }`}>
                  <input type="checkbox" checked={isPicked} onChange={() => toggle(u.value)} className="accent-brand-blue" />
                  {u.value}
                </label>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Quantity-only — capped at how much of this product the engineer still holds
  const held = getEngineerHeldQty(engineerId, line.productId)
  const roomToGrow = Math.max(0, held - usedElsewhere)

  return (
    <div className="rounded-xl border border-surface-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
        <Badge variant="purple" size="sm">{held} held</Badge>
      </div>
      <FormField label="Hand Off Qty">
        <input
          type="number" min="0" max={roomToGrow}
          value={line.qty}
          onChange={e => {
            const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
            onChange({ qty: v })
          }}
          className="w-32 px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </FormField>
    </div>
  )
}

export default function CreateUserAssignment() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [engineer, setEngineer] = useState(null)
  const [engineerSearch, setEngineerSearch] = useState('')
  const [workOrderType, setWorkOrderType] = useState('Installation')
  const [reference, setReference] = useState(null)
  const [handoffLines, setHandoffLines] = useState([])
  const [remarks, setRemarks] = useState('')
  const [attemptedAction, setAttemptedAction] = useState(null)
  const [saveError, setSaveError] = useState('')

  const filteredEngineers = useMemo(() => {
    const q = engineerSearch.toLowerCase().trim()
    if (!q) return FIELD_ENGINEERS
    return FIELD_ENGINEERS.filter(e => e.name.toLowerCase().includes(q))
  }, [engineerSearch])

  const records = useMemo(() => getWorkOrderTypeRecords(workOrderType), [workOrderType])

  // Rebuild Step 3's editable line state whenever the selected engineer
  // changes — one line per product they currently hold ANY of (serial/MAC
  // units with status 'Assigned to Engineer', or a positive net quantity
  // via getEngineerHeldQty()). Unlike Assign to Engineer there's no
  // "requirement" driving this list — it's simply everything this engineer
  // is currently holding, since a user handoff can cover any of it.
  useEffect(() => {
    if (!engineer) { setHandoffLines([]); return }
    const heldUnits = getUnits({ status: 'Assigned to Engineer', engineerId: engineer.id })
    const productIdsWithUnits = new Set(heldUnits.map(u => u.productId))
    const unitLines = [...productIdsWithUnits].map(productId => ({
      productId, productName: getProduct(productId)?.name ?? productId,
      trackingType: liveTrackingType(productId), qty: 0, serials: [], macs: [],
    }))
    const qtyLines = getProducts()
      .filter(p => !productIdsWithUnits.has(p.id) && getEngineerHeldQty(engineer.id, p.id) > 0)
      .map(p => ({ productId: p.id, productName: p.name, trackingType: 'quantity', qty: 0, serials: [], macs: [] }))
    setHandoffLines([...unitLines, ...qtyLines])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineer?.id])

  function updateLine(idx, patch) { setHandoffLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3, 4].includes(stepParam) ? stepParam : 1

  function isStep1Valid() { return !!engineer }
  function isStep2Valid() { return !!engineer && !!reference }
  function isStep3Valid() {
    return handoffLines.some(l => l.trackingType === 'quantity' ? Number(l.qty) > 0 : (l.serials.length + l.macs.length) > 0)
  }

  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: isStep3Valid(), 4: true }
  function isReachable(id) {
    if (id === 1) return true
    for (let i = 1; i < id; i++) if (!stepValid[i]) return false
    return true
  }

  function patchSearchParams(patch, options) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        if (value == null) next.delete(key)
        else next.set(key, String(value))
      })
      return next
    }, options)
  }

  function goTo(id) {
    if (!isReachable(id)) return
    setAttemptedAction(null)
    patchSearchParams({ step: id })
  }
  function goBack() {
    setAttemptedAction(null)
    if (step === 1) { navigate('/inventory/assign-to-user'); return }
    patchSearchParams({ step: step - 1 })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    if (step === 3 && !isStep3Valid()) { setAttemptedAction('step3'); return }
    setAttemptedAction(null)
    patchSearchParams({ step: Math.min(step + 1, 4) })
  }

  const issuedLines = handoffLines.filter(l => l.trackingType === 'quantity' ? Number(l.qty) > 0 : (l.serials.length + l.macs.length) > 0)

  function handleConfirm() {
    if (!isStep3Valid()) { setAttemptedAction('step3'); return }
    setSaveError('')
    try {
      const assignment = saveUserAssignment({
        engineerId: engineer.id, engineerName: engineer.name,
        workOrderType, workOrderId: reference.id, workOrderLabel: reference.label,
        customerName: reference.customerName,
        items: issuedLines.map(l => ({
          productId: l.productId, productName: l.productName,
          serials: l.serials, macs: l.macs, qty: l.qty,
        })),
        remarks,
      })
      navigate(`/inventory/assign-to-user/${assignment.id}`)
    } catch (err) {
      setSaveError(err.message || 'Could not save this assignment.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/assign-to-user')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Assign to User</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {engineer ? <>From <span className="font-semibold text-gray-700">{engineer.name}</span>{reference ? <> to <span className="font-mono">{reference.customerName ?? reference.label}</span></> : null}</> : 'Select an engineer to begin'}
              </p>
            </div>
          </div>
          <StepProgress steps={STEPS} current={step} isReachable={isReachable} onSelect={goTo} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-28">
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            {attemptedAction === 'step1' && !isStep1Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select an engineer to continue.
              </div>
            )}
            {attemptedAction === 'step2' && !isStep2Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a Work Order Type and a matching reference record to continue.
              </div>
            )}
            {attemptedAction === 'step3' && !isStep3Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select at least one item to hand off.
              </div>
            )}
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            {/* ── Step 1: Engineer ── */}
            {step === 1 && (
              <div className="space-y-4">
                <FormField label="Engineer" required hint="Who currently holds the hardware being handed off">
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={engineerSearch} onChange={e => setEngineerSearch(e.target.value)} placeholder="Search engineer name…"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
                  </div>
                  {filteredEngineers.length === 0 ? (
                    <p className="text-xs text-gray-400">No engineers match "{engineerSearch}".</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredEngineers.map(e => (
                        <button key={e.id} type="button" onClick={() => setEngineer(e)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                            engineer?.id === e.id ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:bg-gray-50'
                          }`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${e.color}`}>{e.initials}</span>
                          <span className={`text-sm font-medium ${engineer?.id === e.id ? 'text-brand-blue' : 'text-gray-700'}`}>{e.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </FormField>
              </div>
            )}

            {/* ── Step 2: Work Order Type + Reference ── */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField label="Work Order Type" required>
                  <Select value={workOrderType} onChange={e => { setWorkOrderType(e.target.value); setReference(null) }}>
                    {WORK_ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>

                <FormField label="Reference" required hint={`Search ${workOrderType} records`}>
                  {records.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No {workOrderType} records are available to reference yet.</p>
                  ) : (
                    <ReferencePicker records={records} value={reference} onSelect={setReference} placeholder={`Search ${workOrderType.toLowerCase()} ID or customer…`} />
                  )}
                </FormField>

                {reference && (
                  <div className="rounded-xl border border-surface-border bg-surface p-4 space-y-2">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Reference Record</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{workOrderType} ID</span>
                      <span className="font-mono font-semibold text-gray-800">{reference.id}</span>
                    </div>
                    {reference.customerName && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-medium text-gray-800">{reference.customerName}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Hand Off ── */}
            {step === 3 && (
              <div className="space-y-3">
                {handoffLines.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">{engineer?.name ?? 'This engineer'} has no hardware currently assigned to hand off.</p>
                ) : (
                  handoffLines.map((l, idx) => (
                    <HandoffLineCard key={`${l.productId}-${idx}`} line={l} engineerId={engineer.id}
                      otherLines={handoffLines.filter((_, i) => i !== idx)}
                      onChange={patch => updateLine(idx, patch)} />
                  ))
                )}
                <FormField label="Remarks" hint="Optional notes about this handoff">
                  <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes…" />
                </FormField>
              </div>
            )}

            {/* ── Step 4: Confirm ── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-surface-border p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Engineer</span>
                    <span className="font-semibold text-gray-800">{engineer.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Work Order</span>
                    <span className="font-mono font-semibold text-gray-800">{reference.id} <span className="text-gray-400 font-sans">({workOrderType})</span></span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium text-gray-800">{reference.customerName ?? '—'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Handing Off</p>
                  </div>
                  <div className="divide-y divide-surface-border">
                    {issuedLines.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Nothing selected yet — go back to Hand Off.</p>
                    ) : issuedLines.map((l, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{l.productName}</span>
                          {(l.serials.length || l.macs.length) ? (
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{[...l.serials, ...l.macs].join(', ')}</p>
                          ) : null}
                        </div>
                        <span className="font-semibold text-gray-700">
                          {l.trackingType === 'quantity' ? l.qty : l.serials.length + l.macs.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {remarks && (
                  <div className="rounded-xl border border-surface-border p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Remarks</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{remarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={14} />} onClick={goBack}>Back</Button>
        {step < 4 ? (
          <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Next</Button>
        ) : (
          <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>Assign to User</Button>
        )}
      </div>
    </div>
  )
}
