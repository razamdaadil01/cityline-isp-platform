import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, FileText, Package, Calculator,
  Plus, Trash2, X, AlertTriangle, PackagePlus, Save, Send,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import StepProgress from '../../components/customer-type/StepProgress'
import {
  ASSET_CATEGORIES, getAssetCategory, getAssetType, getFieldsForType, KIT_COMPONENT_TYPES, ASSET_CONDITIONS,
} from '../../data/assetTaxonomy'
import { createAssetsBulk, updateAsset, assetDisplayName } from '../../data/assetStore'
import { savePurchaseOrder, computeLineAmount, computePoSummary } from '../../data/purchaseOrderStore'
import { getInventorySettings } from '../../data/inventorySettingsStore'
import { getVendors } from '../../data/vendorStore'
import { getActiveCompanyEntities } from '../../data/companyEntities'
import { getStores } from '../../data/storeStore'
import { FIELD_ENGINEERS } from '../../data/installationsStore'

const STEPS = [
  { id: 1, label: 'Basic Details', icon: FileText },
  { id: 2, label: 'Products',      icon: Package },
  { id: 3, label: 'Summary',       icon: Calculator },
]

const GST_SLABS = [0, 5, 12, 18, 28]

// ── Kit Components — Splicing Machine's own repeatable sub-table ────────
// Two variants share this one table: 'instance' (the default) carries
// Serial Number + Condition per row. 'template' omits both entirely — kept
// around for shape documentation even though nothing currently constructs
// one (Asset Master, its only caller, has been removed).
function emptyKitComponent() {
  return {
    id: `kc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    componentType: '', componentName: '', serialNumber: '', quantity: 1, condition: '',
  }
}

function emptyKitComponentTemplate() {
  return {
    id: `kc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    componentType: '', componentName: '', quantity: 1,
  }
}

function KitComponentsTable({ value, onChange, variant = 'instance' }) {
  const rows = value || []
  const isTemplate = variant === 'template'

  function addRow() {
    onChange([...rows, isTemplate ? emptyKitComponentTemplate() : emptyKitComponent()])
  }
  function updateRow(id, patch) { onChange(rows.map(r => r.id === id ? { ...r, ...patch } : r)) }
  function removeRow(id) { onChange(rows.filter(r => r.id !== id)) }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 py-7 px-4 border-2 border-dashed border-surface-border rounded-lg bg-gray-50/60">
        <PackagePlus size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No kit components added</p>
        <button
          type="button" onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
        >
          <Plus size={12} /> Add Component
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-surface-border rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th className="text-left px-3 py-2 font-semibold">Component Type</th>
              <th className="text-left px-3 py-2 font-semibold">Component Name</th>
              {!isTemplate && <th className="text-left px-3 py-2 font-semibold">Serial Number</th>}
              <th className="text-left px-3 py-2 font-semibold w-20">{isTemplate ? 'Qty' : 'Quantity'}</th>
              {!isTemplate && <th className="text-left px-3 py-2 font-semibold w-28">Condition</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-2 py-1.5">
                  <select
                    value={row.componentType} onChange={e => updateRow(row.id, { componentType: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  >
                    <option value="">Select…</option>
                    {KIT_COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text" value={row.componentName} onChange={e => updateRow(row.id, { componentName: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </td>
                {!isTemplate && (
                  <td className="px-2 py-1.5">
                    <input
                      type="text" value={row.serialNumber} onChange={e => updateRow(row.id, { serialNumber: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                    />
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <input
                    type="number" min="1" value={row.quantity}
                    onChange={e => updateRow(row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </td>
                {!isTemplate && (
                  <td className="px-2 py-1.5">
                    <select
                      value={row.condition} onChange={e => updateRow(row.id, { condition: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                    >
                      <option value="">Select…</option>
                      {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                )}
                <td className="px-2 py-1.5 text-right">
                  <button type="button" onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline">
        <Plus size={12} /> Add Component
      </button>
    </div>
  )
}

// One taxonomy field, rendered per its own `type` — text/number/date share
// a plain input, vendor-select/engineer-select are dropdowns sourced from
// their respective stores. A `readOnly` field (Ladder's "Type", Authority/
// Access's "Card/Asset Type", Generic Tools' "Category" — see
// assetTaxonomy.js's own note) is disabled rather than hidden, so the
// auto-filled value it already carries stays visible. Every non-required
// field carries a small "Recommended"/"Optional" hint so that labeling is
// consistent across all 5 category forms without each one needing its own
// copy.
function AssetField({ field, fields, onChange, showErrors, vendors, kitVariant = 'instance' }) {
  const value = fields[field.key]
  const isEmpty = value === undefined || value === null || String(value).trim() === ''
  const showError = showErrors && field.required && field.type !== 'kit-components' && isEmpty

  if (field.type === 'kit-components') {
    return (
      <div className="col-span-2">
        <KitComponentsTable value={value} onChange={v => onChange(field.key, v)} variant={kitVariant} />
      </div>
    )
  }

  return (
    <FormField
      label={field.label} required={field.required}
      hint={field.required ? undefined : (field.recommended ? 'Recommended' : 'Optional')}
      error={showError ? 'This field is required.' : undefined}
    >
      {field.type === 'vendor-select' ? (
        <Select value={value ?? ''} onChange={e => onChange(field.key, e.target.value)} error={showError}>
          <option value="">Select vendor…</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
        </Select>
      ) : field.type === 'engineer-select' ? (
        <Select value={value ?? ''} onChange={e => onChange(field.key, e.target.value)} error={showError}>
          <option value="">Select…</option>
          {FIELD_ENGINEERS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      ) : (
        <input
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          disabled={field.readOnly}
          onChange={e => onChange(field.key, e.target.value)}
          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white placeholder-gray-400 text-gray-800
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
            disabled:bg-gray-50 disabled:text-gray-500
            ${showError ? 'border-red-400' : 'border-surface-border'}`}
        />
      )}
    </FormField>
  )
}

// One visually-separated section of the dynamic form — a small uppercase
// label + divider, then the existing 2-column field grid inside. Purely a
// presentational grouping (Basic Details/Purchase & Warranty/Vendor),
// derived from each field's own `type` rather than a new taxonomy
// property, so assetTaxonomy.js's field shape stays exactly as-is.
function FormSection({ label, defs, fields, onChange, showErrors, vendors }) {
  if (defs.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">{label}</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {defs.map(f => (
          <AssetField key={f.key} field={f} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
        ))}
      </div>
    </div>
  )
}

// The dynamic Category/Type field template (assetTaxonomy.js's own
// getFieldsForType()) rendered as Basic Details/Purchase & Warranty/
// Vendor/Kit Components sections — extracted out of AddAsset's own render
// body so CreatePurchase.jsx's Asset PO receipt step (which reuses these
// same fields as a shipment-correction step) doesn't need a second copy of
// this rendering.
//
// includeKitComponents={false} lets a caller that already has its own Kit
// Components UI (this file's own Products-step card, and
// CreatePurchase.jsx's GRN-time confirmation section) skip rendering it a
// second time here.
//
// excludeKeys lets a caller drop specific fields by key — used by this
// file's own Products-step card to hold back the fields that only make
// sense once a real physical unit exists (Serial Number, every date field,
// Vendor — captured later, at GRN receipt), and by CreatePurchase.jsx's own
// AssetUnitDetailsSection to avoid rendering Serial Number a second time
// next to its own dedicated Serial Number field. Defaults to an empty array
// so no other caller is affected.
export function AssetDetailFields({ categoryId, typeId, fields, onChange, showErrors, vendors, includeKitComponents = true, excludeKeys = [] }) {
  let fieldDefs = categoryId && typeId ? getFieldsForType(categoryId, typeId) : []
  if (excludeKeys.length > 0) fieldDefs = fieldDefs.filter(f => !excludeKeys.includes(f.key))
  const basicDefs = fieldDefs.filter(f => f.type !== 'date' && f.type !== 'vendor-select' && f.type !== 'kit-components')
  const dateDefs = fieldDefs.filter(f => f.type === 'date')
  const vendorDefs = fieldDefs.filter(f => f.type === 'vendor-select')
  const kitDefs = includeKitComponents ? fieldDefs.filter(f => f.type === 'kit-components') : []

  return (
    <div className="space-y-5">
      {/* Deliberately NOT labeled "Basic Details" — that text is also the
          Asset PO wizard's own Step 1 label (this file's own STEPS array),
          and this section renders nested inside a "Product Receipt"/"Asset
          Details" context on CreatePurchase.jsx's GRN page. Sharing the
          exact same wording between an outer wizard step and this inner
          per-field-group heading reads, at a glance, as if the wizard's own
          step indicator were showing the wrong label there — it never was,
          but the identical text made that easy to mistake. */}
      <FormSection label="Identification & Specifications" defs={basicDefs} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
      <FormSection label="Purchase & Warranty" defs={dateDefs} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
      <FormSection label="Vendor" defs={vendorDefs} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
      {kitDefs.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">Kit Components</p>
          {kitDefs.map(f => (
            <AssetField key={f.key} field={f} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} kitVariant="instance" />
          ))}
        </div>
      )}
    </div>
  )
}

function emptyLineItem(defaultGst) {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoryId: '', typeId: '',
    qty: 1, price: '', gstPercent: String(defaultGst ?? 18),
    // Category-specific Asset Details (Asset Name, Brand, Model, SSD/RAM/
    // Processor, etc.) captured once per PO line at Products-step time —
    // see AssetLineCard below. Serial Number/Purchase & Warranty dates/
    // Vendor stay GRN-only (GRN_ONLY_FIELD_KEYS), since those are only
    // meaningful once a real physical unit exists.
    fields: {}, kitComponents: [],
  }
}

// Fields still captured only at GRN receipt, per physical unit, rather than
// once per PO line here — Serial Number, every date field, and Vendor.
// Deliberately NOT the same list as assetTaxonomy.js's own `scope:
// 'instance'` fields: that taxonomy marks Asset Name as instance-scoped too
// (a per-unit nickname), but the client's spec explicitly wants Asset Name
// captured once at PO-creation time instead, so it's excluded from this
// list on purpose.
const GRN_ONLY_FIELD_KEYS = ['serialNumber', 'purchaseDate', 'warrantyStartDate', 'warrantyEndDate', 'warrantyDate', 'validFrom', 'validTo', 'vendorId']

// A Splicing Machine (or any future type whose taxonomy entry defines a
// kit-components field) gets its own repeatable Kit Components sub-table
// below its Asset Details — every other type doesn't.
function isKitEligibleType(categoryId, typeId) {
  return getFieldsForType(categoryId, typeId).some(f => f.type === 'kit-components')
}

// One expandable "Assets N" card in the Products step — Category/Type/Qty/
// Price/GST %/Amount up top (unchanged from the earlier compact-table
// phase), then that Category/Type's own Asset Details fields (Asset Name/
// Brand/Model/spec fields — GRN-only fields excluded, see
// GRN_ONLY_FIELD_KEYS), then a Kit Components sub-table for a kit-eligible
// type (Splicing Machine). Serial Number, Purchase & Warranty dates and
// Vendor are captured later, per physical unit, at GRN receipt
// (CreatePurchase.jsx's AssetUnitDetailsSection) — pre-filled there from
// this card's own captured Asset Details.
//
// Qty is fixed at 1 and non-editable (emptyLineItem() below, no updater
// function) — each row describes exactly one physical asset, matching one
// set of Asset Details/Kit Components; ordering more than one of the same
// asset means adding another "Add Asset Row," not raising this row's Qty.
// This is deliberately different from CreatePO.jsx's own Products step,
// where a Product PO line's Qty stays freely editable.
function AssetLineCard({ index, item, vendors, onUpdate, onRemove, showRemove, showErrors }) {
  const category = item.categoryId ? getAssetCategory(item.categoryId) : null
  const amount = computeLineAmount(item.qty, item.price, item.gstPercent)
  const kitEligible = isKitEligibleType(item.categoryId, item.typeId)

  // Picking a new Category/Type clears whatever Asset Details/Kit
  // Components were already entered — they described the previous
  // Category/Type's own field template, which no longer applies.
  function selectCategory(e) {
    onUpdate({ categoryId: e.target.value, typeId: '', fields: {}, kitComponents: [] })
  }
  function selectType(e) {
    onUpdate({ typeId: e.target.value, fields: {}, kitComponents: [] })
  }
  function updatePrice(value) { onUpdate({ price: value }) }
  function updateGst(value) { onUpdate({ gstPercent: value }) }
  function updateField(key, value) { onUpdate({ fields: { ...item.fields, [key]: value } }) }

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/60 border-b border-surface-border">
        <p className="text-sm font-semibold text-gray-800">Assets {index + 1}</p>
        {showRemove && (
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="Category" required error={showErrors && !item.categoryId ? 'Required.' : undefined}>
            <Select value={item.categoryId} onChange={selectCategory}>
              <option value="">Select…</option>
              {ASSET_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Asset Type" required error={showErrors && !item.typeId ? 'Required.' : undefined}>
            <Select value={item.typeId} onChange={selectType} disabled={!category}>
              <option value="">{category ? 'Select…' : '—'}</option>
              {category?.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Qty" hint="Always 1 — add another Assets row for more">
            <Input type="number" value={item.qty} disabled />
          </FormField>
          <FormField label="Price">
            <Input type="number" min="0" step="0.01" value={item.price} onChange={e => updatePrice(e.target.value)} placeholder="0.00" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="GST %">
            <Input type="number" min="0" max="100" value={item.gstPercent} onChange={e => updateGst(e.target.value)} placeholder="18" />
          </FormField>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
            <p className="text-sm font-semibold text-gray-800 py-2">₹{amount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {category && item.typeId && (
          <div className="pt-3 border-t border-surface-border space-y-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Asset Details</p>
            <AssetDetailFields
              categoryId={item.categoryId} typeId={item.typeId}
              fields={item.fields} onChange={updateField}
              vendors={vendors} includeKitComponents={false} showErrors={false}
              excludeKeys={GRN_ONLY_FIELD_KEYS}
            />
            {kitEligible && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">Kit Components</p>
                <KitComponentsTable value={item.kitComponents} onChange={v => onUpdate({ kitComponents: v })} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// returnTo lets this same wizard be mounted under different route
// namespaces (currently only Purchase Orders' "Add Purchase Order → Asset"
// flow at /inventory/purchase-orders/new/asset) without hardcoding where
// Back/Cancel/Save should land — App.jsx's <Route> element supplies this
// per mount point.
export default function AddAsset({ returnTo = '/assets' }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Merge-safe searchParams update — same pattern CreatePO.jsx's own
  // `?step=`/`?productTab=` navigation uses.
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

  const vendors = useMemo(() => getVendors().filter(v => v.status === 'active'), [])
  const entities = useMemo(() => getActiveCompanyEntities(), [])
  const stores = useMemo(() => getStores().filter(s => s.status === 'active'), [])

  const [companyEntityId, setCompanyEntityId] = useState(() => entities[0]?.id ?? null)
  const [orderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('')
  const [gstPercent, setGstPercent] = useState('18')
  const [vendorId, setVendorId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [discount, setDiscount] = useState('0')
  const [otherCharges, setOtherCharges] = useState('0')

  // Company/Entity drives defaults (GST %, Terms) — same as CreatePO.jsx's
  // own entity-sync effect; this wizard never edits an existing PO, so
  // there's no "existing" branch to skip.
  useEffect(() => {
    if (companyEntityId == null) return
    const settings = getInventorySettings(companyEntityId)
    setGstPercent(String(settings.defaultGstPercent))
    setTerms(settings.poTerms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyEntityId])

  const [lineItems, setLineItems] = useState(() => [emptyLineItem(gstPercent)])
  // Tracks which bottom-bar action the user last tried so the validation
  // banner shows the right message — Next (steps 1-2) and Save Draft/Send PO
  // (step 3) each have different requirements.
  const [attemptedAction, setAttemptedAction] = useState(null) // null | 'step1' | 'step2' | 'draft' | 'send'
  const [saveError, setSaveError] = useState('')

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3].includes(stepParam) ? stepParam : 1

  function updateLineItem(id, patch) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, ...patch } : li))
  }
  function addLineItem() { setLineItems(prev => [...prev, emptyLineItem(gstPercent)]) }
  function removeLineItem(id) { setLineItems(prev => prev.filter(li => li.id !== id)) }

  const gstOptions = useMemo(() => {
    const set = new Set(GST_SLABS)
    if (gstPercent !== '') set.add(Number(gstPercent))
    return [...set].sort((a, b) => a - b)
  }, [gstPercent])

  const filledItems = lineItems.filter(li => !!li.categoryId && !!li.typeId)
  const numericItems = filledItems.map(li => ({ ...li, qty: Number(li.qty) || 0, price: Number(li.price) || 0, gstPercent: Number(li.gstPercent) || 0 }))
  const summary = computePoSummary(numericItems, { discount: Number(discount) || 0, otherCharges: Number(otherCharges) || 0 })

  function isStep1Valid() {
    return companyEntityId != null && !!estimatedDeliveryDate && !!vendorId && !!storeId
  }
  function isStep2Valid() {
    return lineItems.length > 0 && lineItems.every(li => !!li.categoryId && !!li.typeId && Number(li.qty) >= 1)
  }
  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: true }
  // Every created asset comes straight from this wizard's own line items
  // (unlike CreatePO.jsx's Draft PO, which can hold incomplete/blank
  // rows) — an incomplete Category/Type would crash createAssetsBulk()
  // trying to read a category/type label that doesn't exist, so Save Draft
  // requires full Step 1 + Step 2 validity too, not just a Company/Entity
  // pick.
  const allValid = isStep1Valid() && isStep2Valid()

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
    if (step === 1) { navigate(returnTo); return }
    patchSearchParams({ step: step - 1 })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    setAttemptedAction(null)
    patchSearchParams({ step: Math.min(step + 1, 3) })
  }

  // Save as Draft → every created asset status 'Draft', no PO. Send PO →
  // status 'PO Raised', then raises one real Purchase Order carrying one
  // line per item above, through the same savePurchaseOrder()/approval
  // pipeline the Inventory module's own Create PO wizard uses (poType:
  // 'Asset Purchase' is the only thing that marks it as asset-originated —
  // everything else, including approval routing, is identical). Assets are
  // created first so the PO's own lines can describe them, then each is
  // patched with the resulting po.id/poItemId once the PO exists — a PO can
  // never be created before the assets it's for. Each created asset's own
  // `fields` now carries whatever Asset Details (Asset Name, Brand, Model,
  // spec fields) and Kit Components were captured on its line's card above
  // — Serial Number, Purchase & Warranty dates and Vendor are still entered
  // later, per physical unit, at GRN receipt (CreatePurchase.jsx's
  // AssetUnitDetailsSection), pre-filled there from these same captured
  // Asset Details.
  function handleSave(status) {
    if (!allValid) { setAttemptedAction(status === 'Draft' ? 'draft' : 'send'); return }
    setSaveError('')
    try {
      const createdByLine = lineItems.map(li => {
        const category = getAssetCategory(li.categoryId)
        const type = getAssetType(li.categoryId, li.typeId)
        const qty = Math.max(1, Number(li.qty) || 1)
        const price = Math.max(0, Number(li.price) || 0)
        const gstPct = Math.max(0, Number(li.gstPercent) || 0)
        const kitEligible = isKitEligibleType(li.categoryId, li.typeId)
        const payload = { categoryId: li.categoryId, categoryLabel: category.label, typeId: li.typeId, typeLabel: type.label }
        const assets = createAssetsBulk(
          Array.from({ length: qty }, () => ({
            ...payload,
            fields: {
              ...li.fields,
              ...(kitEligible ? { kitComponents: li.kitComponents.map(c => ({ ...c })) } : {}),
            },
          })),
          status,
        )
        return { qty, price, gstPercent: gstPct, assets }
      })
      if (status === 'PO Raised') {
        raisePurchaseOrderForAssets(createdByLine)
      }
      navigate(returnTo)
    } catch (err) {
      setSaveError(err.message || 'Could not save these assets.')
    }
  }

  // Builds and saves one Asset Purchase PO carrying one line per item above
  // (each line's `qty` matching how many assets were just created for it),
  // then links every created asset back onto its own line via
  // poId/poItemId. Follows savePurchaseOrder's 'send' action exactly as
  // Inventory's own Create PO wizard does — if
  // getInventorySettings(companyEntityId).poApprovalRequired is on, this
  // routes to 'Approval Request' with a linked Approvals record; otherwise
  // it goes straight to 'Sent'. No new approval logic here at all.
  function raisePurchaseOrderForAssets(createdByLine) {
    const items = createdByLine.map(({ qty, price, gstPercent: gstPct, assets }) => {
      const sample = assets[0]
      const sampleName = assetDisplayName(sample)
      return {
        id: `POI-asset-${sample.id}`,
        type: 'hardware',
        productId: '',
        productName: `${sample.categoryLabel} — ${sample.typeLabel}${sampleName !== sample.typeLabel ? ` (${sampleName})` : ''}${qty > 1 ? ` × ${qty}` : ''}`,
        sku: '', unit: 'Piece', qty, price, gstPercent: gstPct,
        amount: computeLineAmount(qty, price, gstPct),
      }
    })
    const po = savePurchaseOrder({
      poType: 'Asset Purchase',
      companyEntityId,
      storeId,
      vendorId,
      orderDate,
      estimatedDeliveryDate,
      gstPercent: Number(gstPercent) || 0,
      items,
      notes,
      terms,
      discount: Number(discount) || 0,
      otherCharges: Number(otherCharges) || 0,
    }, { action: 'send' })

    createdByLine.forEach(({ assets }, i) => {
      const poItemId = items[i].id
      assets.forEach(a => updateAsset(a.id, { poId: po.id, poItemId }))
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header — same StepProgress/back-arrow treatment as Inventory's
          Create PO wizard (CreatePO.jsx). */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(returnTo)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Add Asset</h1>
            </div>
          </div>
          <StepProgress steps={STEPS} current={step} isReachable={isReachable} onSelect={goTo} />
        </div>
      </div>

      {/* Body — same scroll area / max-width / card container as CreatePO.jsx */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-28">
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
              </div>
            )}
            {attemptedAction === 'step1' && !isStep1Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Company / Entity, Estimated Delivery Date, Vendor and Delivery Store are required to continue.
              </div>
            )}
            {attemptedAction === 'step2' && !isStep2Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Add at least one asset row with a Category, Type and quantity before continuing.
              </div>
            )}
            {(attemptedAction === 'draft' || attemptedAction === 'send') && !allValid && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Company / Entity, Estimated Delivery Date, Vendor, Delivery Store, and a Category/Type/quantity for every asset row are required before saving.
              </div>
            )}

            {/* ── Step 1: Basic Details ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Company / Entity" required>
                    <Select value={companyEntityId ?? ''} onChange={e => setCompanyEntityId(Number(e.target.value))}>
                      <option value="">Select company/entity…</option>
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

            {/* ── Step 2: Products (Assets) ── */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assets</p>
                <div className="space-y-3">
                  {lineItems.map((li, i) => (
                    <AssetLineCard
                      key={li.id} index={i} item={li} vendors={vendors}
                      onUpdate={patch => updateLineItem(li.id, patch)}
                      onRemove={() => removeLineItem(li.id)}
                      showRemove={lineItems.length > 1}
                      showErrors={attemptedAction === 'step2'}
                    />
                  ))}
                </div>
                <button type="button" onClick={addLineItem}
                  className="flex items-center gap-1.5 text-brand-blue text-sm font-medium hover:text-brand-blue-dark">
                  <Plus size={14} /> Add Asset Row
                </button>
                <div className="flex justify-end pt-3 border-t border-surface-border">
                  <p className="text-sm text-gray-600">
                    Subtotal ({filledItems.length} item{filledItems.length === 1 ? '' : 's'}):{' '}
                    <span className="font-bold text-gray-900">₹{summary.subtotal.toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 3: Summary ── */}
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

      {/* ── Bottom Bar — same fixed placement/sizing as CreatePO.jsx's
          Back/Save Draft/Send PO bar. ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={14} />} onClick={goBack}>Back</Button>
        <div className="flex items-center gap-3">
          {step < 3 ? (
            <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Next</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon={<Save size={14} />} onClick={() => handleSave('Draft')}>Save Draft</Button>
              <Button size="sm" icon={<Send size={14} />} onClick={() => handleSave('PO Raised')}>Send PO</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
