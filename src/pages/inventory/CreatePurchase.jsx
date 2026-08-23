import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, PackageOpen, Calculator,
  AlertTriangle, Save, CheckCircle2, Trash2, Plus, X,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import Badge from '../../components/ui/Badge'
import StepProgress from '../../components/customer-type/StepProgress'
import ProductPicker from '../../components/inventory/ProductPicker'
import { getActiveCompanyEntities, getCompanyEntity } from '../../data/companyEntities'
import { getVendors, getVendor } from '../../data/vendorStore'
import { getStores, getStore } from '../../data/storeStore'
import { getProducts, getProduct } from '../../data/productStore'
import { getPurchaseOrders, getPurchaseOrder } from '../../data/purchaseOrderStore'
import { getPurchase, savePurchase, computeItemFields, computePurchaseSummary } from '../../data/purchaseStore'
import { usePermission } from '../../data/rolesStore'

const STEPS = [
  { id: 1, label: 'Select PO',        icon: ClipboardList },
  { id: 2, label: 'Product Receipt',  icon: PackageOpen },
  { id: 3, label: 'Calculation',      icon: Calculator },
]

const RECEIVABLE_PO_STATUSES = ['Sent', 'Approved', 'Partially Received']
const MAC_RE = /^[0-9A-Fa-f]{2}([:-]?[0-9A-Fa-f]{2}){5}$/

function itemFromPOLine(it, i) {
  return {
    id: `tmp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
    source: 'po', type: it.type, productId: it.productId, productName: it.productName,
    sku: it.sku, unit: it.unit, poQty: it.qty, receivedQty: '',
    price: it.price, gstPercent: it.gstPercent,
    serials: [], macs: [], drumNumber: '', reason: '',
  }
}

function resizeArray(arr, len) {
  const next = arr.slice(0, len)
  while (next.length < len) next.push('')
  return next
}

// Searchable PO select for Step 1 — same floating-dropdown pattern as
// ProductPicker (position: fixed, computed from the input's own rect).
function POPicker({ pos, value, onSelect, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 320 })
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 320) })
    setOpen(true)
  }

  const filtered = pos.filter(po => po.poNumber.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={inputRef}
        value={open ? query : (value || '')}
        onChange={e => { setQuery(e.target.value); openDropdown() }}
        onFocus={() => { setQuery(''); openDropdown() }}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
      {open && (
        <div
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, zIndex: 9999 }}
          className="max-h-56 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching purchase orders</p>
          ) : filtered.map(po => {
            const vendor = getVendor(po.vendorId)
            return (
              <button
                key={po.id} type="button"
                onClick={() => { onSelect(po); setOpen(false); setQuery('') }}
                className="flex items-center justify-between w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors border-b border-surface-border last:border-0"
              >
                <span>
                  <span className="font-mono font-semibold text-brand-blue">{po.poNumber}</span>
                  <span className="text-gray-400"> · {vendor?.companyName ?? '—'}</span>
                </span>
                <Badge variant={po.status === 'Partially Received' ? 'orange' : 'indigo'} size="sm">{po.status}</Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TrackedInputs({ label, values, onChange, validate }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
      {values.map((v, i) => (
        <div key={i}>
          <label className="block text-[11px] text-gray-500 mb-1">{label} {i + 1}</label>
          <input
            value={v}
            onChange={e => onChange(i, e.target.value)}
            placeholder={`${label} ${i + 1}`}
            className={`w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
              v.trim() && validate && !validate(v) ? 'border-red-300' : 'border-surface-border'
            }`}
          />
        </div>
      ))}
    </div>
  )
}

function ReceiptItemCard({ item, onUpdate, onRemove }) {
  const product = getProduct(item.productId)
  const isWire = item.type === 'wire'
  const trackingType = product?.trackingType

  function setReceivedQty(qtyStr) {
    const qty = Math.max(0, Number(qtyStr) || 0)
    const patch = { receivedQty: qtyStr }
    if (trackingType === 'serial') patch.serials = resizeArray(item.serials, qty)
    if (trackingType === 'mac') patch.macs = resizeArray(item.macs, qty)
    onUpdate(patch)
  }

  const derived = computeItemFields({ ...item, receivedQty: Number(item.receivedQty) || 0 })

  return (
    <div className="rounded-xl border border-surface-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            {item.productName}
            {item.source === 'outside' && <Badge variant="purple" size="sm">Outside PO</Badge>}
            <Badge variant={isWire ? 'orange' : 'blue'} size="sm" className="capitalize">{item.type}</Badge>
          </p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{item.sku || '—'}</p>
        </div>
        {item.source === 'outside' && (
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">{isWire ? 'PO Qty (m)' : 'PO Qty'}</label>
          <p className="text-sm font-medium text-gray-700 py-1.5">{item.poQty || 0}</p>
        </div>
        <FormField label={isWire ? 'Received (m)' : 'Received Qty'}>
          <Input type="number" min="0" value={item.receivedQty} onChange={e => setReceivedQty(e.target.value)} placeholder="0" />
        </FormField>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Short</label>
          <p className={`text-sm font-medium py-1.5 ${derived.shortQty > 0 ? 'text-red-600' : 'text-gray-400'}`}>{derived.shortQty}</p>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Extra</label>
          <p className={`text-sm font-medium py-1.5 ${derived.extraQty > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{derived.extraQty}</p>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Amount</label>
          <p className="text-sm font-semibold text-gray-900 py-1.5">₹{derived.amount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {isWire ? (
        <FormField label="Drum Number" required hint="Required whenever a quantity is received">
          <Input value={item.drumNumber} onChange={e => onUpdate({ drumNumber: e.target.value })} placeholder="e.g. DRUM-0142" />
        </FormField>
      ) : trackingType === 'serial' && Number(item.receivedQty) > 0 ? (
        <TrackedInputs
          label="Serial" values={item.serials}
          onChange={(i, v) => onUpdate({ serials: item.serials.map((s, idx) => idx === i ? v : s) })}
        />
      ) : trackingType === 'mac' && Number(item.receivedQty) > 0 ? (
        <TrackedInputs
          label="MAC" values={item.macs}
          onChange={(i, v) => onUpdate({ macs: item.macs.map((m, idx) => idx === i ? v : m) })}
          validate={v => MAC_RE.test(v.trim())}
        />
      ) : null}

      {item.source === 'outside' && (
        <FormField label="Reason" hint="Why this was bought outside a PO">
          <Input value={item.reason} onChange={e => onUpdate({ reason: e.target.value })} placeholder="e.g. Urgent field requirement" />
        </FormField>
      )}
    </div>
  )
}

function AddOutsideItemForm({ products, onAdd, onCancel }) {
  const [type, setType] = useState('hardware')
  const [product, setProduct] = useState(null)
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [gstPercent, setGstPercent] = useState('18')
  const [reason, setReason] = useState('')
  const [itemRemarks, setItemRemarks] = useState('')
  const [error, setError] = useState('')

  const typeProducts = products.filter(p => p.productType === type)

  function handleAdd() {
    if (!product) { setError('Select a product.'); return }
    if (!qty || Number(qty) <= 0) { setError('Enter a valid quantity.'); return }
    const receivedQty = Number(qty)
    onAdd({
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      source: 'outside', type: product.productType, productId: product.id, productName: product.name,
      sku: product.sku || '', unit: product.unitType, poQty: 0, receivedQty,
      price: Number(price) || product.sellingPrice || 0, gstPercent: Number(gstPercent) || 0,
      serials: product.trackingType === 'serial' ? resizeArray([], receivedQty) : [],
      macs: product.trackingType === 'mac' ? resizeArray([], receivedQty) : [],
      drumNumber: '', reason: reason.trim(),
    }, itemRemarks.trim())
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-blue/40 bg-brand-blue/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Add Item Outside PO</p>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-1">
        {['hardware', 'wire'].map(t => (
          <button key={t} type="button" onClick={() => { setType(t); setProduct(null) }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${type === t ? 'bg-brand-blue text-white' : 'bg-white text-gray-500 border border-surface-border'}`}>
            {t}
          </button>
        ))}
      </div>
      <FormField label="Product" required>
        <ProductPicker
          products={typeProducts}
          value={product?.name ?? ''}
          placeholder="Search product…"
          onSelect={p => { setProduct(p); setPrice(String(p.sellingPrice ?? '')) }}
        />
      </FormField>
      <div className="grid grid-cols-4 gap-3">
        <FormField label="Quantity" required>
          <Input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Unit" hint="From product">
          <Input value={product?.unitType ?? '—'} disabled />
        </FormField>
        <FormField label="Price">
          <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="GST %">
          <Input type="number" min="0" max="100" value={gstPercent} onChange={e => setGstPercent(e.target.value)} placeholder="18" />
        </FormField>
      </div>
      <FormField label="Reason" required hint="Why this was bought outside a PO">
        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Urgent field requirement" />
      </FormField>
      <FormField label="Remarks" hint="Optional — added to this purchase's overall Remarks">
        <Input value={itemRemarks} onChange={e => setItemRemarks(e.target.value)} placeholder="Optional note" />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleAdd}>Add Item</Button>
      </div>
    </div>
  )
}

export default function CreatePurchase() {
  const navigate = useNavigate()
  const { id: editingId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditing = !!editingId
  const canCreate = usePermission('Inventory', 'Create')

  const entities = getActiveCompanyEntities()
  const vendors = getVendors().filter(v => v.status === 'active')
  const stores = getStores().filter(s => s.status === 'active')
  const products = getProducts().filter(p => p.status === 'active')
  const receivablePOs = getPurchaseOrders().filter(po => RECEIVABLE_PO_STATUSES.includes(po.status))

  const existing = isEditing ? getPurchase(editingId) : null

  const [outsidePoMode, setOutsidePoMode] = useState(() => existing ? !existing.poId : false)
  const [poId, setPoId] = useState(existing?.poId ?? null)
  const [companyEntityId, setCompanyEntityId] = useState(existing?.companyEntityId ?? entities[0]?.id ?? null)
  const [vendorId, setVendorId] = useState(existing?.vendorId ?? '')
  const [storeId, setStoreId] = useState(existing?.storeId ?? '')
  const [purchaseDate, setPurchaseDate] = useState(existing?.purchaseDate ?? new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState(() => existing?.items.map(it => ({ ...it, receivedQty: String(it.receivedQty) })) ?? [])
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')
  const [showAddOutside, setShowAddOutside] = useState(false)
  const [attemptedAction, setAttemptedAction] = useState(null) // null | 'step1' | 'step2' | 'draft' | 'confirm'

  const selectedPO = poId ? getPurchaseOrder(poId) : null

  function selectPO(po) {
    setPoId(po.id)
    setCompanyEntityId(po.companyEntityId)
    setVendorId(po.vendorId)
    setStoreId(po.storeId)
    // Re-selecting a PO replaces only the PO-sourced lines — any items
    // already added via "Add Hardware Outside PO" carry over.
    setItems(prev => [...po.items.map(itemFromPOLine), ...prev.filter(it => it.source === 'outside')])
  }

  function switchToOutsidePo() {
    setOutsidePoMode(true)
    setPoId(null)
    setItems(prev => prev.filter(it => it.source === 'outside'))
  }
  function switchToPoMode() {
    setOutsidePoMode(false)
    setItems(prev => prev.filter(it => it.source === 'outside'))
  }

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3].includes(stepParam) ? stepParam : 1

  function updateItem(itemId, patch) {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...patch } : it))
  }
  function removeItem(itemId) {
    setItems(prev => prev.filter(it => it.id !== itemId))
  }
  function addOutsideItem(item, itemRemarks) {
    setItems(prev => [...prev, item])
    if (itemRemarks) {
      setRemarks(prev => prev ? `${prev}\n${item.productName}: ${itemRemarks}` : `${item.productName}: ${itemRemarks}`)
    }
    setShowAddOutside(false)
  }

  const numericItems = items.map(it => computeItemFields({ ...it, receivedQty: Number(it.receivedQty) || 0 }))
  const summary = computePurchaseSummary(numericItems)

  function isStep1Valid() {
    if (!purchaseDate) return false
    if (outsidePoMode) return !!companyEntityId && !!vendorId && !!storeId
    return !!poId && !!companyEntityId && !!vendorId && !!storeId
  }

  function isStep2Valid() {
    const receivedItems = numericItems.filter(it => it.receivedQty > 0)
    if (receivedItems.length === 0) return false
    return receivedItems.every(it => {
      if (it.type === 'wire') return !!it.drumNumber?.trim()
      const product = getProduct(it.productId)
      if (product?.trackingType === 'serial') return it.serials.length === it.receivedQty && it.serials.every(s => s.trim())
      if (product?.trackingType === 'mac') return it.macs.length === it.receivedQty && it.macs.every(m => MAC_RE.test(m.trim()))
      return true
    })
  }

  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: true }
  function isReachable(id) {
    if (id === 1) return true
    for (let i = 1; i < id; i++) if (!stepValid[i]) return false
    return true
  }

  function goTo(id) {
    if (!isReachable(id)) return
    setAttemptedAction(null)
    setSearchParams({ step: String(id) })
  }
  function goBack() {
    setAttemptedAction(null)
    if (step === 1) { navigate('/inventory/purchases'); return }
    setSearchParams({ step: String(step - 1) })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    setAttemptedAction(null)
    setSearchParams({ step: String(Math.min(step + 1, 3)) })
  }

  function buildPayload() {
    const vendor = getVendor(vendorId)
    const store = getStore(storeId)
    return {
      poId, poNumber: selectedPO?.poNumber ?? null,
      vendorId, vendorName: vendor?.companyName ?? '',
      storeId, storeName: store?.storeName ?? '',
      companyEntityId, purchaseDate,
      items: numericItems.map(it => ({
        id: it.id, source: it.source, type: it.type, productId: it.productId, productName: it.productName,
        sku: it.sku, unit: it.unit, poQty: it.poQty, receivedQty: it.receivedQty,
        price: it.price, gstPercent: it.gstPercent,
        serials: it.serials, macs: it.macs, drumNumber: it.drumNumber, reason: it.reason,
      })),
      remarks,
    }
  }

  const canSaveDraft = !!companyEntityId && !!vendorId && !!storeId && !!purchaseDate
  const canConfirm = isStep1Valid() && isStep2Valid()

  function handleSaveDraft() {
    if (!canSaveDraft) { setAttemptedAction('draft'); return }
    const purchase = savePurchase(buildPayload(), { editingId, action: 'draft' })
    navigate(`/inventory/purchases/${purchase.id}`)
  }
  function handleConfirm() {
    if (!canConfirm) { setAttemptedAction('confirm'); return }
    const purchase = savePurchase(buildPayload(), { editingId, action: 'confirm' })
    navigate(`/inventory/purchases/${purchase.id}`)
  }

  if (isEditing && !existing) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/purchases')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Purchases
        </button>
        <p className="text-sm text-gray-400 mt-4">Purchase {editingId} was not found.</p>
      </div>
    )
  }
  if (isEditing && existing && existing.status !== 'Draft') {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-10 text-center">
          <p className="text-sm text-gray-500 mb-3">"{existing.purchaseNumber}" is {existing.status} and can no longer be edited.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/inventory/purchases/${existing.id}`)}>View Purchase</Button>
        </div>
      </div>
    )
  }

  const entity = companyEntityId != null ? getCompanyEntity(companyEntityId) : null

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/purchases')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Purchase' : 'New Purchase'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {selectedPO ? (
                  <>Against <span className="font-mono font-semibold text-brand-blue">{selectedPO.poNumber}</span></>
                ) : outsidePoMode ? 'Receiving without a Purchase Order' : 'Select a Purchase Order to begin'}
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
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {outsidePoMode
                  ? 'Company / Entity, Vendor, Delivery Store and Purchase Date are required to continue.'
                  : 'Select a Purchase Order (or switch to "Receive without a PO") and a Purchase Date to continue.'}
              </div>
            )}
            {attemptedAction === 'step2' && !isStep2Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Enter at least one Received Qty above 0, and fill in Drum Number / Serial / MAC fields for every line with a quantity received.
              </div>
            )}
            {attemptedAction === 'draft' && !canSaveDraft && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Company / Entity, Vendor, Delivery Store and Purchase Date are required before saving.
              </div>
            )}
            {attemptedAction === 'confirm' && !canConfirm && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Complete Steps 1 and 2 — basic details plus at least one fully-tracked received line — before confirming.
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {!outsidePoMode ? (
                  <>
                    <FormField label="Purchase Order" required hint="Only POs with status Sent, Approved or Partially Received can be received">
                      <POPicker pos={receivablePOs} value={selectedPO?.poNumber ?? ''} placeholder="Search PO number…" onSelect={selectPO} />
                    </FormField>
                    {selectedPO && (
                      <div className="grid grid-cols-3 gap-4">
                        <FormField label="Vendor" hint="From selected PO"><Input value={getVendor(vendorId)?.companyName ?? ''} disabled /></FormField>
                        <FormField label="Delivery Store" hint="From selected PO"><Input value={getStore(storeId)?.storeName ?? ''} disabled /></FormField>
                        <FormField label="Company / Entity" hint="From selected PO"><Input value={entity?.name ?? ''} disabled /></FormField>
                      </div>
                    )}
                    <button type="button" onClick={switchToOutsidePo} className="text-xs font-medium text-brand-blue hover:underline">
                      Receive without a PO
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Receiving without a Purchase Order</p>
                      <button type="button" onClick={switchToPoMode} className="text-xs font-medium text-brand-blue hover:underline">
                        Select a PO instead
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField label="Company / Entity" required>
                        <Select value={companyEntityId ?? ''} onChange={e => setCompanyEntityId(Number(e.target.value))}>
                          {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                        </Select>
                      </FormField>
                      <FormField label="Vendor" required>
                        <Select value={vendorId} onChange={e => setVendorId(e.target.value)}>
                          <option value="">Select vendor…</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                        </Select>
                      </FormField>
                      <FormField label="Delivery Store" required>
                        <Select value={storeId} onChange={e => setStoreId(e.target.value)}>
                          <option value="">Select store…</option>
                          {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </Select>
                      </FormField>
                    </div>
                  </>
                )}
                <FormField label="Purchase Date" required>
                  <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </FormField>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {outsidePoMode ? 'Add an item below to get started.' : 'No line items on this PO yet.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map(item => (
                      <ReceiptItemCard
                        key={item.id} item={item}
                        onUpdate={patch => updateItem(item.id, patch)}
                        onRemove={() => removeItem(item.id)}
                      />
                    ))}
                  </div>
                )}

                {showAddOutside ? (
                  <AddOutsideItemForm products={products} onAdd={addOutsideItem} onCancel={() => setShowAddOutside(false)} />
                ) : canCreate ? (
                  <button type="button" onClick={() => setShowAddOutside(true)}
                    className="flex items-center gap-1.5 text-brand-blue text-sm font-medium hover:text-brand-blue-dark">
                    <Plus size={14} /> Add Hardware Outside PO
                  </button>
                ) : null}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <FormField label="Remarks" hint={'e.g. "2 routers received extra due to supplier replacement"'}>
                  <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes about this receipt…" />
                </FormField>

                <div className="rounded-xl border border-surface-border p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">PO Subtotal (excl. GST)</span>
                    <span className="font-medium text-gray-800">₹{summary.poAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Received Value</span>
                    <span className="font-medium text-gray-800">₹{summary.receivedValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Extra Item Value</span>
                    <span className="font-medium text-gray-800">₹{summary.extraItemValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">GST</span>
                    <span className="font-medium text-gray-800">₹{summary.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                    <span className="text-sm font-bold text-gray-900">Total Purchase Value</span>
                    <span className="text-xl font-extrabold text-brand-blue">₹{summary.totalPurchaseValue.toLocaleString('en-IN')}</span>
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
        <div className="flex items-center gap-3">
          {step < 3 ? (
            <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Next</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon={<Save size={14} />} onClick={handleSaveDraft}>Save Draft</Button>
              <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>Confirm Purchase</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
