import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, FileText, Package, Calculator,
  Plus, Trash2, AlertTriangle, Save, Send,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import StepProgress from '../../components/customer-type/StepProgress'
import ProductPicker from '../../components/inventory/ProductPicker'
import { getActiveCompanyEntities } from '../../data/companyEntities'
import { getVendors } from '../../data/vendorStore'
import { getStores } from '../../data/storeStore'
import { getProducts } from '../../data/productStore'
import { getInventorySettings } from '../../data/inventorySettingsStore'
import {
  getPurchaseOrder, savePurchaseOrder, previewNextPoNumber, computePoSummary, computeLineAmount,
} from '../../data/purchaseOrderStore'

const STEPS = [
  { id: 1, label: 'Basic Details', icon: FileText },
  { id: 2, label: 'Products',      icon: Package },
  { id: 3, label: 'Summary',       icon: Calculator },
]

const GST_SLABS = [0, 5, 12, 18, 28]

function emptyItem(type, defaultGst) {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, productId: '', productName: '', sku: '', unit: '', drum: '',
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
        />
      </td>
      <td className="px-2 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">{item.sku || '—'}</td>
      {item.type === 'wire' ? (
        <td className="px-2 py-2">
          <input className={cellInput} placeholder="Drum #" value={item.drum} onChange={e => onUpdate({ drum: e.target.value })} />
        </td>
      ) : (
        <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{item.unit || '—'}</td>
      )}
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
    const base = existing?.items.map(it => ({ ...it, qty: String(it.qty), price: String(it.price), gstPercent: String(it.gstPercent), drum: it.drum ?? '' })) ?? []
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
  const [itemTab, setItemTab] = useState('hardware')
  // Tracks which bottom-bar action the user last tried so the validation
  // banner shows the right message — Next (steps 1-2) and Save Draft/Send PO
  // (step 3) each have different requirements.
  const [attemptedAction, setAttemptedAction] = useState(null) // null | 'step1' | 'step2' | 'draft' | 'send'

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

  function buildPayload() {
    return {
      companyEntityId, vendorId, storeId, orderDate,
      estimatedDeliveryDate, gstPercent: Number(gstPercent) || 0,
      items: numericItems.map(it => ({
        id: it.id, type: it.type, productId: it.productId, productName: it.productName,
        sku: it.sku, unit: it.unit, qty: it.qty, price: it.price, gstPercent: it.gstPercent,
        amount: computeLineAmount(it.qty, it.price, it.gstPercent),
        ...(it.type === 'wire' ? { drum: it.drum || '' } : {}),
      })),
      notes, terms,
      discount: Number(discount) || 0,
      otherCharges: Number(otherCharges) || 0,
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
    setSearchParams({ step: String(id) })
  }
  function goBack() {
    setAttemptedAction(null)
    if (step === 1) { navigate('/inventory/purchase-orders'); return }
    setSearchParams({ step: String(step - 1) })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    setAttemptedAction(null)
    setSearchParams({ step: String(Math.min(step + 1, 3)) })
  }

  function handleSaveDraft() {
    if (!canSaveDraft) { setAttemptedAction('draft'); return }
    const po = savePurchaseOrder(buildPayload(), { editingId, action: 'draft' })
    navigate(`/inventory/purchase-orders/${po.id}`)
  }
  function handleSendPO() {
    if (!canSend) { setAttemptedAction('send'); return }
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
          <p className="text-sm text-gray-500 mb-3">"{existing.poNumber}" is {existing.status} and can no longer be edited.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/inventory/purchase-orders/${existing.id}`)}>View Purchase Order</Button>
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
                                ? ['Wire', 'SKU', 'Drum', 'Qty (m)', 'Price/m', 'GST %', 'Amount', '']
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
