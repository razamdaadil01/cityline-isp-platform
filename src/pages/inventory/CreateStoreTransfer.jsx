import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Store as StoreIcon,
  PackageOpen, CheckCircle2, AlertTriangle, Plus, X,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { FormField, Select } from '../../components/ui/FormInputs'
import StepProgress from '../../components/customer-type/StepProgress'
import { getStores } from '../../data/storeStore'
import { getProducts, getProduct } from '../../data/productStore'
import { getUnits, getProductAvailability } from '../../data/inventoryLedger'
import { saveStoreTransfer } from '../../data/storeTransferStore'

const STEPS = [
  { id: 1, label: 'Stores',   icon: StoreIcon },
  { id: 2, label: 'Products', icon: PackageOpen },
  { id: 3, label: 'Confirm',  icon: CheckCircle2 },
]

// A dual-tracked product (Serial + MAC both enabled) is treated here as
// serial-tracked — Store Transfer moves whole physical units by their
// serial identifier; a unit's paired MAC stays attached to the same ledger
// unit object regardless (see inventoryLedger.js), it's just not carried as
// a second explicit value on this transfer's own line record.
function liveTrackingType(productId) {
  const p = getProduct(productId)
  if (!p) return 'quantity'
  if (p.trackedBySerial) return 'serial'
  if (p.trackedByMac) return 'mac'
  return 'quantity'
}

// ── Step 2 line card — mirrors HardwareLineCard/HandoffLineCard's serial
// checkbox-grid / capped-qty-input split, scoped to whatever's still
// 'Available' at the chosen Store From. ──────────────────────────────────
function TransferLineCard({ line, storeFromId, otherLines, onChange, onRemove }) {
  const trackingType = liveTrackingType(line.productId)

  if (trackingType === 'serial' || trackingType === 'mac') {
    const kindLabel = trackingType === 'serial' ? 'Serial' : 'MAC'
    const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
    const units = getUnits({ productId: line.productId, storeId: storeFromId, status: 'Available' }).filter(u => !pickedElsewhere.has(u.value))
    const picked = trackingType === 'serial' ? line.serials : line.macs
    function toggle(value) {
      const isPicked = picked.includes(value)
      const next = isPicked ? picked.filter(v => v !== value) : [...picked, value]
      onChange(trackingType === 'serial' ? { serials: next } : { macs: next })
    }
    return (
      <div className="rounded-xl border border-surface-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">{picked.length} selected · {units.length + picked.filter(v => !units.some(u => u.value === v)).length} available</Badge>
            <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
          </div>
        </div>
        {units.length === 0 && picked.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No available {kindLabel.toLowerCase()}s for this product at this store.</p>
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

  // Quantity-only — capped at how much of this product Store From still has,
  // minus whatever other lines in this same transfer already claim.
  const available = getProductAvailability(line.productId, storeFromId)
  const usedElsewhere = otherLines.reduce((s, l) => l.productId === line.productId ? s + (Number(l.qty) || 0) : s, 0)
  const roomToGrow = Math.max(0, available - usedElsewhere)

  return (
    <div className="rounded-xl border border-surface-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">{available} available</Badge>
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
        </div>
      </div>
      <FormField label="Transfer Qty">
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

export default function CreateStoreTransfer() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const stores = getStores()
  const prefillStoreFrom = searchParams.get('storeFrom')
  const prefillProductId = searchParams.get('productId')
  const prefillUnit = searchParams.get('unit')

  const [storeFromId, setStoreFromId] = useState(prefillStoreFrom || '')
  const [storeToId, setStoreToId] = useState('')
  const [lines, setLines] = useState([])
  const [addProductId, setAddProductId] = useState('')
  const [attemptedAction, setAttemptedAction] = useState(null)
  const [saveError, setSaveError] = useState('')

  const storeFrom = stores.find(s => s.id === storeFromId) ?? null
  const storeTo = stores.find(s => s.id === storeToId) ?? null

  // Pre-fill: on first mount, if arriving from a Units-tab/quantity-row
  // "Transfer" click, seed Step 2 with that specific product (and unit,
  // when serial/MAC-tracked) already selected — the rest of the store's
  // stock stays browsable via "+ Add Product" below.
  useEffect(() => {
    if (!prefillProductId) return
    const product = getProduct(prefillProductId)
    if (!product) return
    const trackingType = liveTrackingType(product.id)
    setLines(prev => {
      if (prev.some(l => l.productId === prefillProductId)) return prev
      const line = { productId: prefillProductId, productName: product.name, trackingType, qty: 0, serials: [], macs: [] }
      if (prefillUnit && trackingType === 'serial') line.serials = [prefillUnit]
      else if (prefillUnit && trackingType === 'mac') line.macs = [prefillUnit]
      return [...prev, line]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableProducts = useMemo(() => {
    if (!storeFromId) return []
    return getProducts().filter(p => getProductAvailability(p.id, storeFromId) > 0 || getUnits({ productId: p.id, storeId: storeFromId, status: 'Available' }).length > 0)
  }, [storeFromId])

  const addableProducts = availableProducts.filter(p => !lines.some(l => l.productId === p.id))

  function addLine(productId) {
    const product = getProduct(productId)
    if (!product) return
    setLines(prev => [...prev, { productId, productName: product.name, trackingType: liveTrackingType(productId), qty: 0, serials: [], macs: [] }])
    setAddProductId('')
  }
  function updateLine(idx, patch) { setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }
  function removeLine(idx) { setLines(prev => prev.filter((_, i) => i !== idx)) }

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3].includes(stepParam) ? stepParam : 1

  function isStep1Valid() { return !!storeFromId && !!storeToId && storeFromId !== storeToId }
  function isStep2Valid() { return lines.some(l => l.trackingType === 'quantity' ? Number(l.qty) > 0 : (l.serials.length + l.macs.length) > 0) }

  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: true }
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
    if (step === 1) { navigate('/inventory/store-transfer'); return }
    patchSearchParams({ step: step - 1 })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    setAttemptedAction(null)
    patchSearchParams({ step: Math.min(step + 1, 3) })
  }

  const transferLines = lines.filter(l => l.trackingType === 'quantity' ? Number(l.qty) > 0 : (l.serials.length + l.macs.length) > 0)

  function handleConfirm() {
    if (!isStep2Valid()) { setAttemptedAction('step2'); return }
    setSaveError('')
    try {
      const transfer = saveStoreTransfer({
        storeFromId, storeFromName: storeFrom?.storeName ?? storeFromId,
        storeToId, storeToName: storeTo?.storeName ?? storeToId,
        items: transferLines.map(l => ({
          productId: l.productId, productName: l.productName,
          serials: l.serials, macs: l.macs, qty: l.qty,
        })),
      })
      navigate(`/inventory/store-transfer/${transfer.id}`)
    } catch (err) {
      setSaveError(err.message || 'Could not save this transfer.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/store-transfer')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Store Transfer</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {storeFrom ? <>From <span className="font-semibold text-gray-700">{storeFrom.storeName}</span>{storeTo ? <> to <span className="font-semibold text-gray-700">{storeTo.storeName}</span></> : null}</> : 'Select stores to begin'}
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
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a Store From and a different Store To to continue.
              </div>
            )}
            {attemptedAction === 'step2' && !isStep2Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select at least one item to transfer.
              </div>
            )}
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            {/* ── Step 1: Stores ── */}
            {step === 1 && (
              <div className="space-y-4">
                <FormField label="Store From" required hint="Stock will be pulled from this store">
                  <Select value={storeFromId} onChange={e => setStoreFromId(e.target.value)}>
                    <option value="">Select store…</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                  </Select>
                </FormField>
                <FormField label="Store To" required hint="Stock will be relocated to this store">
                  <Select value={storeToId} onChange={e => setStoreToId(e.target.value)}>
                    <option value="">Select store…</option>
                    {stores.map(s => <option key={s.id} value={s.id} disabled={s.id === storeFromId}>{s.storeName}</option>)}
                  </Select>
                </FormField>
                {storeFromId && storeToId && storeFromId === storeToId && (
                  <p className="text-xs text-red-500">Store From and Store To must be different stores.</p>
                )}
              </div>
            )}

            {/* ── Step 2: Products ── */}
            {step === 2 && (
              <div className="space-y-3">
                {lines.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No items selected yet — add a product below.</p>
                ) : (
                  lines.map((l, idx) => (
                    <TransferLineCard key={`${l.productId}-${idx}`} line={l} storeFromId={storeFromId}
                      otherLines={lines.filter((_, i) => i !== idx)}
                      onChange={patch => updateLine(idx, patch)}
                      onRemove={() => removeLine(idx)} />
                  ))
                )}

                {addableProducts.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Select value={addProductId} onChange={e => setAddProductId(e.target.value)} className="flex-1">
                      <option value="">Add a product from {storeFrom?.storeName}…</option>
                      {addableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />} disabled={!addProductId} onClick={() => addLine(addProductId)}>Add</Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-surface-border p-4 flex items-center justify-center gap-3">
                  <span className="text-sm font-semibold text-gray-800">{storeFrom?.storeName}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">{storeTo?.storeName}</span>
                </div>

                <div className="rounded-xl border border-surface-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Transferring</p>
                  </div>
                  <div className="divide-y divide-surface-border">
                    {transferLines.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Nothing selected yet — go back to Products.</p>
                    ) : transferLines.map((l, i) => (
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={14} />} onClick={goBack}>Back</Button>
        {step < 3 ? (
          <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Next</Button>
        ) : (
          <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>Transfer Stock</Button>
        )}
      </div>
    </div>
  )
}
