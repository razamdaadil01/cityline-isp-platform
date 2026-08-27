import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, FileText, Package, Calculator,
  Plus, Trash2, AlertTriangle, Save, Send, Building2, CheckCircle2, Eye,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import StepProgress from '../../components/customer-type/StepProgress'
import ProductPicker from '../../components/inventory/ProductPicker'
import { getActiveCompanyEntities, getCompanyEntity } from '../../data/companyEntities'
import { getVendors } from '../../data/vendorStore'
import { getStores } from '../../data/storeStore'
import { getProducts } from '../../data/productStore'
import { getInventorySettings } from '../../data/inventorySettingsStore'
import {
  getPurchaseOrder, savePurchaseOrder, previewNextPoNumber, computePoSummary, computeLineAmount, getPoStatusLabel,
} from '../../data/purchaseOrderStore'
import { getLastPurchasePrice } from '../../data/purchaseStore'

const STATUS_BADGE = {
  Draft: 'gray',
  'Approval Request': 'yellow',
  'Correction Required': 'red',
  Sent: 'indigo',
  'Partially Received': 'orange',
  'Fully Received': 'green',
  Closed: 'slate',
  Cancelled: 'red',
}

const STEPS = [
  { id: 1, label: 'Basic Details', icon: FileText },
  { id: 2, label: 'Products',      icon: Package },
  { id: 3, label: 'Summary',       icon: Calculator },
]

const GST_SLABS = [0, 5, 12, 18, 28]

function emptyItem(type, defaultGst) {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, productId: '', productName: '', sku: '', unit: '',
    qty: '', price: '', gstPercent: String(defaultGst ?? 18),
  }
}

const cellInput = "w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"

function ItemRow({ item, products, onUpdate, onRemove }) {
  const amount = computeLineAmount(item.qty, item.price, item.gstPercent)
  return (
    <tr>
      <td className="px-2 py-2 min-w-[220px]">
        <ProductPicker
          products={products}
          value={item.productName}
          placeholder={item.type === 'wire' ? 'Search wire…' : 'Search product…'}
          onSelect={p => onUpdate({ productId: p.id, productName: p.name, sku: p.sku || '', unit: p.unitType, price: String(p.sellingPrice ?? '') })}
          // Reference-only — the most recent price this product was
          // actually received at (any vendor), shown inline in its
          // suggestion row. Never auto-filled into the Price input below;
          // the user still types a price themselves. null (no Confirmed
          // purchase history yet) omits the hint for that row entirely.
          getHint={p => {
            const lastPrice = getLastPurchasePrice(p.id)
            return lastPrice != null ? `Last: ₹${lastPrice.toLocaleString('en-IN')}` : null
          }}
        />
      </td>
      <td className="px-2 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">{item.sku || '—'}</td>
      {/* Unit is a fixed label either way — Drum Number isn't captured at PO
          stage at all (the physical drum isn't known/assigned until goods
          actually arrive); it's still captured later, at Purchase/Goods
          Receipt, unaffected by this. */}
      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{item.unit || '—'}</td>
      <td className="px-2 py-2 w-20">
        <input type="number" min="0" className={cellInput} value={item.qty} onChange={e => onUpdate({ qty: e.target.value })} placeholder="0" />
      </td>
      <td className="px-2 py-2 w-24">
        <input type="number" min="0" className={cellInput} value={item.price} onChange={e => onUpdate({ price: e.target.value })} placeholder="0.00" />
      </td>
      <td className="px-2 py-2 w-20">
        <input type="number" min="0" max="100" className={cellInput} value={item.gstPercent} onChange={e => onUpdate({ gstPercent: e.target.value })} placeholder="18" />
      </td>
      <td className="px-2 py-2 text-right text-xs font-semibold text-gray-800 whitespace-nowrap">₹{amount.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2">
        <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

export default function CreatePO() {
  const navigate = useNavigate()
  const { id: editingId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditing = !!editingId

  // Merge-safe searchParams update — same pattern as CreatePurchase.jsx's
  // `?po=` selection + `?step=` navigation and CreateAssignment.jsx's
  // `?wo=` selection, reused here rather than a new one-off (a plain
  // setSearchParams({step}) call replaces the whole query string, which
  // would silently drop `productTab` every time step changes, and vice
  // versa).
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

  const entities = getActiveCompanyEntities()
  const vendors = getVendors().filter(v => v.status === 'active')
  const stores = getStores().filter(s => s.status === 'active')
  const products = getProducts().filter(p => p.status === 'active')
  const hardwareProducts = products.filter(p => p.productType === 'hardware')
  const wireProducts = products.filter(p => p.productType === 'wire')

  const existing = isEditing ? getPurchaseOrder(editingId) : null

  const [companyEntityId, setCompanyEntityId] = useState(() => existing?.companyEntityId ?? entities[0]?.id ?? null)
  const [orderDate] = useState(() => existing?.orderDate ?? new Date().toISOString().slice(0, 10))
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(existing?.estimatedDeliveryDate ?? '')
  const [gstPercent, setGstPercent] = useState(String(existing?.gstPercent ?? 18))
  const [vendorId, setVendorId] = useState(existing?.vendorId ?? '')
  const [storeId, setStoreId] = useState(existing?.storeId ?? '')
  const [items, setItems] = useState(() => {
    const base = existing?.items.map(it => ({ ...it, qty: String(it.qty), price: String(it.price), gstPercent: String(it.gstPercent) })) ?? []
    // Seed a blank row per type up front so the first render never shows
    // the "No … lines yet" empty state — the effect below keeps this true
    // afterwards too (e.g. once the last row of a type is removed).
    return [
      ...base,
      ...(base.some(it => it.type === 'hardware') ? [] : [emptyItem('hardware', gstPercent)]),
      ...(base.some(it => it.type === 'wire') ? [] : [emptyItem('wire', gstPercent)]),
    ]
  })
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [terms, setTerms] = useState(existing?.terms ?? '')
  const [discount, setDiscount] = useState(String(existing?.discount ?? 0))
  const [otherCharges, setOtherCharges] = useState(String(existing?.otherCharges ?? 0))
  // Tracks which bottom-bar action the user last tried so the validation
  // banner shows the right message — Next (steps 1-2) and Save Draft/Send PO
  // (step 3) each have different requirements.
  const [attemptedAction, setAttemptedAction] = useState(null) // null | 'step1' | 'step2' | 'draft' | 'send'
  // Set once a multi-company split actually creates its POs — swaps the
  // wizard body for a summary linking to all of them, since there's no
  // longer a single PO to send the user to.
  const [createdPOs, setCreatedPOs] = useState(null)

  // Company/Entity drives defaults (GST %, Terms) — only auto-fill on
  // change while creating; an existing PO's saved values are the source of
  // truth once it exists, and its entity is locked (poNumber/settings were
  // already resolved against it at creation).
  useEffect(() => {
    if (isEditing || companyEntityId == null) return
    const settings = getInventorySettings(companyEntityId)
    setGstPercent(String(settings.defaultGstPercent))
    setTerms(settings.poTerms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyEntityId])

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3].includes(stepParam) ? stepParam : 1

  // Products step's Hardware/Wire tab — URL-driven (?productTab=), same
  // "derive from the URL rather than local state kept in sync with it"
  // approach as `step` above, so reloading or sharing a link with
  // &productTab=wire lands on that tab directly. Defaults to 'hardware'
  // when the param is missing or holds anything else.
  const productTabParam = searchParams.get('productTab')
  const itemTab = ['hardware', 'wire'].includes(productTabParam) ? productTabParam : 'hardware'
  function setItemTab(tab) {
    patchSearchParams({ productTab: tab })
  }

  function updateItem(itemId, patch) {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...patch } : it))
  }
  function addItem(type) {
    setItems(prev => [...prev, emptyItem(type, gstPercent)])
  }
  function removeItem(itemId) {
    setItems(prev => prev.filter(it => it.id !== itemId))
  }

  // Keeps each tab from ever rendering its "No … lines yet" empty state —
  // whenever a type has zero rows (on mount, after loading an existing PO
  // that only has rows of the other type, or after removing the last row
  // of a type), silently top it back up with one blank row identical to
  // what "+ Add Product Row" creates. Blank rows have no productId, so
  // filledItems/buildPayload() already ignore them until the user actually
  // picks a product — this just keeps one always present to edit.
  useEffect(() => {
    setItems(prev => {
      const hasHardware = prev.some(it => it.type === 'hardware')
      const hasWire = prev.some(it => it.type === 'wire')
      if (hasHardware && hasWire) return prev
      const next = [...prev]
      if (!hasHardware) next.push(emptyItem('hardware', gstPercent))
      if (!hasWire) next.push(emptyItem('wire', gstPercent))
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const poNumber = existing?.poNumber ?? (companyEntityId != null ? previewNextPoNumber(companyEntityId) : '')

  const gstOptions = useMemo(() => {
    const set = new Set(GST_SLABS)
    if (gstPercent !== '') set.add(Number(gstPercent))
    return [...set].sort((a, b) => a - b)
  }, [gstPercent])

  const filledItems = items.filter(it => it.productId)
  const numericItems = filledItems.map(it => ({ ...it, qty: Number(it.qty) || 0, price: Number(it.price) || 0, gstPercent: Number(it.gstPercent) || 0 }))
  const summary = computePoSummary(numericItems, { discount: Number(discount) || 0, otherCharges: Number(otherCharges) || 0 })

  // ── Multi-company auto-split ────────────────────────────────────────────
  // Products are sourced from different companies (Product Management's
  // "Purchased Company" field, productStore.js's purchasedCompanyId) — that
  // field already stores the same id companyEntities.js uses, no translation
  // needed. A product with none set (e.g. wire products don't carry this
  // field at all) falls back to the entity picked in Step 1, matching the
  // pre-split single-PO behavior for anything not explicitly sourced
  // elsewhere. Only applies to new POs — an existing PO being edited already
  // has a fixed id/number/companyEntityId, so it stays a single-PO update.
  function productCompanyId(productId) {
    return products.find(p => p.id === productId)?.purchasedCompanyId ?? companyEntityId
  }
  const companyGroups = new Map()
  numericItems.forEach(it => {
    const cid = productCompanyId(it.productId)
    if (!companyGroups.has(cid)) companyGroups.set(cid, [])
    companyGroups.get(cid).push(it)
  })
  const isMultiCompanySplit = !isEditing && companyGroups.size > 1
  const totalSubtotal = numericItems.reduce((sum, it) => sum + it.qty * it.price, 0)

  // Drum Number is deliberately not part of a PO line — the physical drum
  // isn't known/assigned until goods actually arrive; it's captured later,
  // at Purchase/Goods Receipt (purchaseStore.js's own `drumNumber` field on
  // a received item), unrelated to and unaffected by this.
  function itemsPayload(groupItems) {
    return groupItems.map(it => ({
      id: it.id, type: it.type, productId: it.productId, productName: it.productName,
      sku: it.sku, unit: it.unit, qty: it.qty, price: it.price, gstPercent: it.gstPercent,
      amount: computeLineAmount(it.qty, it.price, it.gstPercent),
    }))
  }

  function buildPayload() {
    return {
      companyEntityId, vendorId, storeId, orderDate,
      estimatedDeliveryDate, gstPercent: Number(gstPercent) || 0,
      items: itemsPayload(numericItems),
      notes, terms,
      discount: Number(discount) || 0,
      otherCharges: Number(otherCharges) || 0,
    }
  }

  // One payload per company group when the PO is being split. GST% falls
  // back to that company's own configured default when it differs from what
  // was entered (per-line GST% is untouched either way — each line already
  // carries its own rate from Step 2). Discount/otherCharges are split
  // proportionally by each group's share of the combined subtotal, so the
  // total discount/other-charges across all resulting POs still adds up to
  // what was actually entered instead of being duplicated onto every PO.
  function buildPayloadForGroup(groupCompanyId, groupItems) {
    const groupSettings = getInventorySettings(groupCompanyId)
    const enteredGst = Number(gstPercent) || 0
    const effectiveGstPercent = groupSettings.defaultGstPercent !== enteredGst ? groupSettings.defaultGstPercent : enteredGst
    const shareRatio = totalSubtotal > 0 ? groupItems.reduce((s, it) => s + it.qty * it.price, 0) / totalSubtotal : 0
    return {
      companyEntityId: groupCompanyId, vendorId, storeId, orderDate,
      estimatedDeliveryDate, gstPercent: effectiveGstPercent,
      items: itemsPayload(groupItems),
      notes, terms,
      discount: Math.round((Number(discount) || 0) * shareRatio),
      otherCharges: Math.round((Number(otherCharges) || 0) * shareRatio),
    }
  }

  const canSaveDraft = !!companyEntityId
  const canSend = !!companyEntityId && !!vendorId && !!storeId && !!estimatedDeliveryDate &&
    filledItems.length > 0 && numericItems.every(it => it.qty > 0 && it.price >= 0)

  // Step 1/2 gates — Step 1's required fields are a subset of canSend's;
  // Step 2 additionally requires at least one valid product line. Step 3
  // has no gate of its own (Save Draft/Send PO have their own checks above).
  function isStep1Valid() {
    return !!companyEntityId && !!estimatedDeliveryDate && !!vendorId && !!storeId
  }
  function isStep2Valid() {
    return filledItems.length > 0 && numericItems.every(it => it.qty > 0 && it.price >= 0)
  }
  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: true }

  // Header step icons — backward is always reachable; a forward jump is
  // only reachable once every step before it is valid.
  function isReachable(id) {
    if (id === 1) return true
    for (let i = 1; i < id; i++) if (!stepValid[i]) return false
    return true
  }

  function goTo(id) {
    if (!isReachable(id)) return
    setAttemptedAction(null)
    patchSearchParams({ step: id })
  }
  function goBack() {
    setAttemptedAction(null)
    if (step === 1) { navigate('/inventory/purchase-orders'); return }
    patchSearchParams({ step: step - 1 })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    setAttemptedAction(null)
    patchSearchParams({ step: Math.min(step + 1, 3) })
  }

  function handleSaveDraft() {
    if (!canSaveDraft) { setAttemptedAction('draft'); return }
    if (isMultiCompanySplit) {
      const pos = [...companyGroups.entries()].map(([cid, groupItems]) => savePurchaseOrder(buildPayloadForGroup(cid, groupItems), { action: 'draft' }))
      setCreatedPOs(pos)
      return
    }
    const po = savePurchaseOrder(buildPayload(), { editingId, action: 'draft' })
    navigate(`/inventory/purchase-orders/${po.id}`)
  }
  function handleSendPO() {
    if (!canSend) { setAttemptedAction('send'); return }
    if (isMultiCompanySplit) {
      const pos = [...companyGroups.entries()].map(([cid, groupItems]) => savePurchaseOrder(buildPayloadForGroup(cid, groupItems), { action: 'send' }))
      setCreatedPOs(pos)
      return
    }
    const po = savePurchaseOrder(buildPayload(), { editingId, action: 'send' })
    navigate(`/inventory/purchase-orders/${po.id}`)
  }

  if (isEditing && !existing) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/purchase-orders')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Purchase Orders
        </button>
        <p className="text-sm text-gray-400 mt-4">Purchase order {editingId} was not found.</p>
      </div>
    )
  }
  if (isEditing && existing && !['Draft', 'Correction Required'].includes(existing.status)) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-10 text-center">
          <p className="text-sm text-gray-500 mb-3">"{existing.poNumber}" is {getPoStatusLabel(existing.status)} and can no longer be edited.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/inventory/purchase-orders/${existing.id}`)}>View Purchase Order</Button>
        </div>
      </div>
    )
  }

  // Multi-company split just created its POs — show links to all of them
  // instead of navigating straight to a single PO Detail page.
  if (createdPOs) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto bg-white rounded-xl border border-surface-border shadow-card p-8 text-center space-y-5">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Split into {createdPOs.length} separate Purchase Orders
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Products spanned more than one sourcing company, so a separate PO was created for each.
            </p>
          </div>
          <div className="space-y-2.5 text-left">
            {createdPOs.map(po => (
              <div key={po.id} className="flex items-center justify-between gap-3 rounded-xl border border-surface-border px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-brand-blue truncate">{po.poNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <Building2 size={11} className="shrink-0" /> {getCompanyEntity(po.companyEntityId)?.name ?? '—'}
                    <span className="text-gray-300">·</span> ₹{po.grandTotal.toLocaleString('en-IN')}
                    <span className="text-gray-300">·</span>
                    <Badge variant={STATUS_BADGE[po.status] ?? 'gray'} size="sm" dot>{getPoStatusLabel(po.status)}</Badge>
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon={<Eye size={13} />} onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}>
                  View
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => navigate('/inventory/purchase-orders')}>Back to Purchase Orders</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/purchase-orders')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                PO Number: <span className="font-mono font-semibold text-brand-blue">{poNumber || '—'}</span>
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
                Company / Entity, Estimated Delivery Date, Vendor and Delivery Store are required to continue.
              </div>
            )}
            {attemptedAction === 'step2' && !isStep2Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Add at least one product line with a quantity and price before continuing.
              </div>
            )}
            {attemptedAction === 'draft' && !canSaveDraft && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Select a Company / Entity before saving.
              </div>
            )}
            {attemptedAction === 'send' && !canSend && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Vendor, Delivery Store, Estimated Delivery Date and at least one product line (with quantity and price) are required to send a PO.
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Company / Entity" required>
                    <Select disabled={isEditing} value={companyEntityId ?? ''} onChange={e => setCompanyEntityId(Number(e.target.value))}>
                      {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Order Date" hint="Auto — today">
                    <Input value={orderDate} disabled />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Estimated Delivery Date" required>
                    <Input type="date" value={estimatedDeliveryDate} onChange={e => setEstimatedDeliveryDate(e.target.value)} />
                  </FormField>
                  <FormField label="GST %" required>
                    <Select value={gstPercent} onChange={e => setGstPercent(e.target.value)}>
                      {gstOptions.map(g => <option key={g} value={g}>{g}%</option>)}
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex gap-1 border-b border-surface-border -mt-1">
                  {['hardware', 'wire'].map(t => (
                    <button
                      key={t} type="button" onClick={() => setItemTab(t)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize
                        ${itemTab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {['hardware', 'wire'].map(type => {
                  const rows = items.filter(it => it.type === type)
                  const rowProducts = type === 'hardware' ? hardwareProducts : wireProducts
                  if (itemTab !== type) return null
                  return (
                    <div key={type} className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              {(type === 'wire'
                                ? ['Wire', 'SKU', 'Unit', 'Qty (m)', 'Price/m', 'GST %', 'Amount', '']
                                : ['Product', 'SKU', 'Unit', 'Qty', 'Price', 'GST %', 'Amount', '']
                              ).map((h, i) => (
                                <th key={i} className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {rows.length === 0 ? (
                              <tr><td colSpan={8} className="px-2 py-6 text-center text-xs text-gray-400">No {type} lines yet</td></tr>
                            ) : rows.map(item => (
                              <ItemRow
                                key={item.id} item={item} products={rowProducts}
                                onUpdate={patch => updateItem(item.id, patch)}
                                onRemove={() => removeItem(item.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button type="button" onClick={() => addItem(type)}
                        className="flex items-center gap-1.5 text-brand-blue text-sm font-medium hover:text-brand-blue-dark">
                        <Plus size={14} /> Add {type === 'wire' ? 'Wire' : 'Product'} Row
                      </button>
                    </div>
                  )
                })}

                <div className="flex justify-end pt-3 border-t border-surface-border">
                  <p className="text-sm text-gray-600">
                    Subtotal ({filledItems.length} item{filledItems.length === 1 ? '' : 's'}):{' '}
                    <span className="font-bold text-gray-900">₹{summary.subtotal.toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {isMultiCompanySplit && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-amber-800">
                        These products will be split into {companyGroups.size} separate Purchase Orders based on sourcing company.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {[...companyGroups.entries()].map(([cid, groupItems]) => {
                        const groupSubtotal = groupItems.reduce((s, it) => s + it.qty * it.price, 0)
                        return (
                          <div key={cid} className="bg-white rounded-lg border border-amber-100 px-3.5 py-2.5">
                            <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                              <Building2 size={12} className="text-amber-500 shrink-0" /> {getCompanyEntity(cid)?.name ?? `Entity ${cid}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{groupItems.map(it => it.productName).join(', ')}</p>
                            <p className="text-xs font-semibold text-gray-700 mt-1">Subtotal: ₹{groupSubtotal.toLocaleString('en-IN')}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <FormField label="Notes">
                  <Textarea rows={3} placeholder="Any special instructions for this order…" value={notes} onChange={e => setNotes(e.target.value)} />
                </FormField>
                <FormField label="Terms & Conditions">
                  <Textarea rows={3} value={terms} onChange={e => setTerms(e.target.value)} />
                </FormField>

                <div className="rounded-xl border border-surface-border p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-gray-800">₹{summary.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <input type="number" min="0" className="w-28 text-right text-sm border border-surface-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                      value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Taxable Amount</span>
                    <span className="font-medium text-gray-800">₹{summary.taxableAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">GST</span>
                    <span className="font-medium text-gray-800">₹{summary.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Other Charges</span>
                    <input type="number" min="0" className="w-28 text-right text-sm border border-surface-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                      value={otherCharges} onChange={e => setOtherCharges(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                    <span className="text-sm font-bold text-gray-900">Grand Total</span>
                    <span className="text-xl font-extrabold text-brand-blue">₹{summary.grandTotal.toLocaleString('en-IN')}</span>
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
              <Button size="sm" icon={<Send size={14} />} onClick={handleSendPO}>Send PO</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
