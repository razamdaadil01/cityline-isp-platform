import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, Plus, Trash2, X, AlertTriangle, ClipboardList, PackagePlus, Save } from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Select } from '../../components/ui/FormInputs'
import {
  ASSET_CATEGORIES, getAssetCategory, getAssetType, getFieldsForType, KIT_COMPONENT_TYPES, ASSET_CONDITIONS,
} from '../../data/assetTaxonomy'
import { createAssetsBulk, updateAsset, assetDisplayName } from '../../data/assetStore'
import { savePurchaseOrder, computeLineAmount } from '../../data/purchaseOrderStore'
import { getInventorySettings } from '../../data/inventorySettingsStore'
import { getVendors } from '../../data/vendorStore'
import { getActiveCompanyEntities } from '../../data/companyEntities'
import { getStores } from '../../data/storeStore'
import { FIELD_ENGINEERS } from '../../data/installationsStore'
import { getAssetModels } from '../../data/assetModelStore'
import AssetModelPicker from '../../components/inventory/AssetModelPicker'

// ── Kit Components — Splicing Machine's own repeatable sub-table ────────
function emptyKitComponent() {
  return {
    id: `kc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    componentType: '', componentName: '', serialNumber: '', quantity: 1, condition: '',
  }
}

function KitComponentsTable({ value, onChange }) {
  const rows = value || []

  function addRow() {
    onChange([...rows, emptyKitComponent()])
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
              <th className="text-left px-3 py-2 font-semibold">Serial Number</th>
              <th className="text-left px-3 py-2 font-semibold w-20">Quantity</th>
              <th className="text-left px-3 py-2 font-semibold w-28">Condition</th>
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
                <td className="px-2 py-1.5">
                  <input
                    type="text" value={row.serialNumber} onChange={e => updateRow(row.id, { serialNumber: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number" min="1" value={row.quantity}
                    onChange={e => updateRow(row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.condition} onChange={e => updateRow(row.id, { condition: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  >
                    <option value="">Select…</option>
                    {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
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
function AssetField({ field, fields, onChange, showErrors, vendors }) {
  const value = fields[field.key]
  const isEmpty = value === undefined || value === null || String(value).trim() === ''
  const showError = showErrors && field.required && field.type !== 'kit-components' && isEmpty

  if (field.type === 'kit-components') {
    return (
      <div className="col-span-2">
        <KitComponentsTable value={value} onChange={v => onChange(field.key, v)} />
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
// body so CreatePurchase.jsx's Asset PO receipt step (added later, to let
// the receiving person review/correct these same fields per unit) can
// reuse the exact same rendering instead of a second copy of it.
// includeKitComponents={false} lets a caller that already has its own Kit
// Components UI (CreatePurchase.jsx's own GRN-time confirmation section)
// skip rendering it a second time here.
//
// onlyTemplateFields={true} additionally drops every field whose taxonomy
// entry is scope: 'instance' (Serial Number, every date field — see
// assetTaxonomy.js's own note on `scope`) before rendering anything below —
// used by Asset Master's Add/Edit Asset Model modal, which asks for a
// model-wide *default* value per field and can't sensibly default a value
// that's inherently unique per physical unit or per purchase (a serial
// number, a warranty date). Defaults to false so AddAsset.jsx's own wizard
// and CreatePurchase.jsx's GRN per-unit step keep rendering every field,
// unchanged.
//
// excludeKeys lets a caller drop specific fields by key regardless of
// scope — used by the same Asset Master modal to hide 'brandName'/
// 'modelName'/'brand' (IT Asset/Field & Splicing Tools/Ladder/Generic
// Tools' own dynamic Brand/Model fields), which duplicate that modal's own
// fixed top-level Brand/Model inputs. Defaults to an empty array so no
// other caller is affected.
export function AssetDetailFields({ categoryId, typeId, fields, onChange, showErrors, vendors, includeKitComponents = true, onlyTemplateFields = false, excludeKeys = [] }) {
  let fieldDefs = categoryId && typeId ? getFieldsForType(categoryId, typeId) : []
  if (onlyTemplateFields) fieldDefs = fieldDefs.filter(f => (f.scope ?? 'template') === 'template')
  if (excludeKeys.length > 0) fieldDefs = fieldDefs.filter(f => !excludeKeys.includes(f.key))
  const basicDefs = fieldDefs.filter(f => f.type !== 'date' && f.type !== 'vendor-select' && f.type !== 'kit-components')
  const dateDefs = fieldDefs.filter(f => f.type === 'date')
  const vendorDefs = fieldDefs.filter(f => f.type === 'vendor-select')
  const kitDefs = includeKitComponents ? fieldDefs.filter(f => f.type === 'kit-components') : []

  return (
    <div className="space-y-5">
      <FormSection label="Basic Details" defs={basicDefs} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
      <FormSection label="Purchase & Warranty" defs={dateDefs} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
      <FormSection label="Vendor" defs={vendorDefs} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
      {kitDefs.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">Kit Components</p>
          {kitDefs.map(f => (
            <AssetField key={f.key} field={f} fields={fields} onChange={onChange} showErrors={showErrors} vendors={vendors} />
          ))}
        </div>
      )}
    </div>
  )
}

function emptyLineItem(defaultGst) {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoryId: '', typeId: '', modelId: null,
    qty: 1, price: '', gstPercent: String(defaultGst ?? 18),
  }
}

const cellInput = "w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"

// One row of the compact Assets table — mirrors CreatePO.jsx's own ItemRow
// exactly (same table/cell styling, same "pick from a picker, or fill the
// columns yourself" shape): ASSET (AssetModelPicker search) | Category |
// Type | Qty | Price | GST % | Amount. Picking a model via the picker fills
// only Category/Type/Price here, the same three things ProductPicker's own
// onSelect fills (there: sku/unit/price) — nothing else, no dynamic detail
// fields at all. A one-off asset needs no picker interaction whatsoever:
// Category/Type are always-live dropdowns in their own columns, so a user
// can just fill those two directly and skip the picker entirely. Every
// other Add Asset field this row used to capture inline (Asset Name, Brand,
// RAM, Processor, Serial Number, Purchase & Warranty dates, Vendor) is now
// captured only once at GRN receipt (CreatePurchase.jsx's
// AssetUnitDetailsSection), pre-filled from the model when modelId is set
// (assetModelStore.js's resolveAssetModelTemplateFields()) and blank
// otherwise — see handleSave() below, which now creates every asset with an
// empty `fields: {}`.
function AssetItemRow({ item, assetModels, onUpdate, onRemove, showRemove }) {
  const category = item.categoryId ? getAssetCategory(item.categoryId) : null
  const selectedModel = item.modelId ? assetModels.find(m => m.id === item.modelId) : null
  const amount = computeLineAmount(item.qty, item.price, item.gstPercent)

  function selectModel(model) {
    onUpdate({ categoryId: model.categoryId, typeId: model.typeId, price: String(model.defaultPrice ?? ''), modelId: model.id })
  }
  // Manually changing Category/Type clears modelId — the row no longer
  // matches whatever model it was based on (if any), same as before.
  function selectCategory(e) {
    onUpdate({ categoryId: e.target.value, typeId: '', modelId: null })
  }
  function selectType(e) {
    onUpdate({ typeId: e.target.value, modelId: null })
  }
  function updateQty(value) { onUpdate({ qty: Math.max(1, Number(value) || 1) }) }
  function updatePrice(value) { onUpdate({ price: value }) }
  function updateGst(value) { onUpdate({ gstPercent: value }) }

  return (
    <tr>
      <td className="px-2 py-2 min-w-[220px] align-top">
        <AssetModelPicker
          assetModels={assetModels}
          value={selectedModel?.name || ''}
          placeholder="Search asset models…"
          onSelect={selectModel}
          getHint={m => `Default Price: ₹${Number(m.defaultPrice ?? 0).toLocaleString('en-IN')}`}
        />
        <p className="text-[11px] text-gray-400 mt-1">Or pick Category &amp; Type directly (one-off asset)</p>
      </td>
      <td className="px-2 py-2 min-w-[150px]">
        <select className={cellInput} value={item.categoryId} onChange={selectCategory}>
          <option value="">Select…</option>
          {ASSET_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
        </select>
      </td>
      <td className="px-2 py-2 min-w-[150px]">
        <select className={cellInput} value={item.typeId} onChange={selectType} disabled={!category}>
          <option value="">{category ? 'Select…' : '—'}</option>
          {category?.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </td>
      <td className="px-2 py-2 w-20">
        <input type="number" min="1" className={cellInput} value={item.qty} onChange={e => updateQty(e.target.value)} />
      </td>
      <td className="px-2 py-2 w-24">
        <input type="number" min="0" step="0.01" className={cellInput} value={item.price} onChange={e => updatePrice(e.target.value)} placeholder="0.00" />
      </td>
      <td className="px-2 py-2 w-20">
        <input type="number" min="0" max="100" className={cellInput} value={item.gstPercent} onChange={e => updateGst(e.target.value)} placeholder="18" />
      </td>
      <td className="px-2 py-2 text-right text-xs font-semibold text-gray-800 whitespace-nowrap">₹{amount.toLocaleString('en-IN')}</td>
      <td className="px-2 py-2">
        {showRemove && (
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  )
}

// returnTo lets this same wizard be mounted under different route
// namespaces (currently only Purchase Orders' "Add Purchase Order → Asset"
// flow at /inventory/purchase-orders/new/asset) without hardcoding where
// Back/Cancel/Save should land — App.jsx's <Route> element supplies this
// per mount point.
export default function AddAsset({ returnTo = '/assets' }) {
  const navigate = useNavigate()

  const vendors = useMemo(() => getVendors().filter(v => v.status === 'active'), [])
  // Active-status Asset Master templates only — an inactive/retired model
  // shouldn't be offered as a starting point for a new purchase, same as
  // Product PO creation's own ProductPicker never needs an active filter
  // because productStore.js has no analogous "don't show me this" toggle
  // (Products are just filtered active in their own picker usages already).
  const assetModels = useMemo(() => getAssetModels().filter(m => m.status === 'active'), [])
  // Same sources Inventory's own Create PO wizard (CreatePO.jsx) reads —
  // Company/Entity, Store and Vendor apply once per PO (not per line item),
  // so they're selected here rather than folded into assetTaxonomy.js's
  // per-category field templates. Store is a flat, non-cascading list, same
  // as CreatePO.jsx's own Delivery Store field (stores aren't scoped to a
  // company entity in storeStore.js).
  const entities = useMemo(() => getActiveCompanyEntities(), [])
  const stores = useMemo(() => getStores().filter(s => s.status === 'active'), [])
  const [companyEntityId, setCompanyEntityId] = useState(() => entities[0]?.id ?? null)
  const [storeId, setStoreId] = useState('')
  // A PO-level Vendor field, same as CreatePO.jsx's own Basic Details step —
  // needed now that no line captures its own Vendor at PO-creation time at
  // all (Vendor is an instance-scoped taxonomy field, entered only at GRN
  // receipt — see AssetItemRow's own note); previously this was derived
  // implicitly from whichever line's inline fields happened to carry one,
  // which no longer exists to derive from.
  const [vendorId, setVendorId] = useState('')

  function currentDefaultGst() {
    return companyEntityId != null ? getInventorySettings(companyEntityId).defaultGstPercent : 18
  }
  const [lineItems, setLineItems] = useState(() => [emptyLineItem(currentDefaultGst())])
  const [showErrors, setShowErrors] = useState(false)
  const [saveError, setSaveError] = useState('')

  function updateLineItem(id, patch) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, ...patch } : li))
  }
  function addLineItem() { setLineItems(prev => [...prev, emptyLineItem(currentDefaultGst())]) }
  function removeLineItem(id) { setLineItems(prev => prev.filter(li => li.id !== id)) }

  // Company/Entity, Store and Vendor are required same as every line's own
  // Category/Type/Quantity — the asset record itself doesn't store any of
  // them (see raisePurchaseOrderForAssets() below; assetStore.js's data
  // model is unchanged), but all three are needed to raise a correct Asset
  // Purchase PO, so they're validated up front rather than discovered
  // missing only when "Save & Raise PO" is clicked.
  const allValid = lineItems.length > 0
    && lineItems.every(li => !!li.categoryId && !!li.typeId && Number(li.qty) >= 1)
    && companyEntityId != null && !!storeId && !!vendorId

  // Save as Draft → every created asset status 'Draft', no PO. Save &
  // Raise PO → status 'PO Raised', then raises one real Purchase Order
  // carrying one line per item above, through the same savePurchaseOrder()/
  // approval pipeline the Inventory module's own Create PO wizard uses
  // (poType: 'Asset Purchase' is the only thing that marks it as
  // asset-originated — everything else, including approval routing, is
  // identical). Assets are created first so the PO's own lines can
  // describe them, then each is patched with the resulting po.id/poItemId
  // once the PO exists — a PO can never be created before the assets it's
  // for. Every created asset starts with an empty `fields: {}` — Category/
  // Type/Quantity/Price/GST% is everything this wizard captures now; Asset
  // Name, Brand, RAM, Processor, Serial Number, Purchase & Warranty dates
  // and Vendor are all entered later, per physical unit, at GRN receipt
  // (CreatePurchase.jsx's AssetUnitDetailsSection) — pre-filled there from
  // the Asset Master model when this line came from one (assetModelId),
  // left blank otherwise.
  function handleSave(status) {
    if (!allValid) { setShowErrors(true); return }
    setSaveError('')
    try {
      const createdByLine = lineItems.map(li => {
        const category = getAssetCategory(li.categoryId)
        const type = getAssetType(li.categoryId, li.typeId)
        const qty = Math.max(1, Number(li.qty) || 1)
        const price = Math.max(0, Number(li.price) || 0)
        const gstPercent = Math.max(0, Number(li.gstPercent) || 0)
        const payload = { categoryId: li.categoryId, categoryLabel: category.label, typeId: li.typeId, typeLabel: type.label }
        const assets = createAssetsBulk(
          Array.from({ length: qty }, () => ({ ...payload, fields: {} })),
          status,
        )
        return { qty, price, gstPercent, assets, modelId: li.modelId ?? null }
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
  // it goes straight to 'Sent'. No new approval logic here at all. Reads
  // companyEntityId/storeId/vendorId from the user's own selection above
  // (allValid already guarantees all three are set before this can be
  // called) — critically, this is what makes the approval check below run
  // against the entity the user actually configured, instead of a fixed
  // company entity's settings. The PO's own top-level gstPercent still
  // comes from that entity's Inventory Settings default, same as before —
  // each line's own gstPercent (entered in the table) is what actually
  // prices that line's amount, same relationship CreatePO.jsx's own
  // top-level GST% field has to each of its own product rows.
  function raisePurchaseOrderForAssets(createdByLine) {
    const settings = getInventorySettings(companyEntityId)
    const items = createdByLine.map(({ qty, price, gstPercent, assets, modelId }) => {
      const sample = assets[0]
      const sampleName = assetDisplayName(sample)
      return {
        id: `POI-asset-${sample.id}`,
        type: 'hardware',
        productId: '',
        productName: `${sample.categoryLabel} — ${sample.typeLabel}${sampleName !== sample.typeLabel ? ` (${sampleName})` : ''}${qty > 1 ? ` × ${qty}` : ''}`,
        sku: '', unit: 'Piece', qty, price, gstPercent,
        amount: computeLineAmount(qty, price, gstPercent),
        // Which Asset Master template (if any) this line was raised from —
        // null for the manual one-off flow. CreatePurchase.jsx's GRN receipt
        // step reads this back to pre-fill each unit's spec fields from the
        // model's own fieldDefaults, closing the loop Asset Master started:
        // capture a spec once, reuse it at GRN receipt.
        assetModelId: modelId,
      }
    })
    const totalAssets = createdByLine.reduce((sum, c) => sum + c.assets.length, 0)
    const po = savePurchaseOrder({
      poType: 'Asset Purchase',
      companyEntityId,
      storeId,
      vendorId,
      orderDate: new Date().toISOString().slice(0, 10),
      estimatedDeliveryDate: '',
      gstPercent: settings.defaultGstPercent,
      items,
      notes: `Auto-generated from Asset Management for ${totalAssets} asset(s).`,
      terms: settings.poTerms,
      discount: 0, otherCharges: 0,
    }, { action: 'send' })

    createdByLine.forEach(({ assets }, i) => {
      const poItemId = items[i].id
      assets.forEach(a => updateAsset(a.id, { poId: po.id, poItemId }))
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header — same back-arrow + title treatment as Inventory's Create PO
          wizard (CreatePO.jsx), just without its StepProgress since this
          form is intentionally single-page rather than multi-step. */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
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
            {showErrors && !allValid && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a company/entity, store, and vendor, and a category, type, and quantity for every asset row, before saving.
              </div>
            )}

            {/* Applies once per PO regardless of how many items it carries —
                same Company/Entity, Store and Vendor sources CreatePO.jsx's
                own Basic Details step uses, required so the eventual PO (if
                raised) is created against the entity whose Inventory
                Settings actually govern it. */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Company / Entity" required>
                <Select value={companyEntityId ?? ''} onChange={e => setCompanyEntityId(Number(e.target.value))}>
                  <option value="">Select company/entity…</option>
                  {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Store" required>
                <Select value={storeId} onChange={e => setStoreId(e.target.value)}>
                  <option value="">Select store…</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Vendor" required>
              <Select value={vendorId} onChange={e => setVendorId(e.target.value)}>
                <option value="">Select vendor…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
              </Select>
            </FormField>

            {/* Assets — compact table, same shape as CreatePO.jsx's own
                Products step: one row per line item, "+ Add Asset Row" to
                add more. Selecting a saved Asset Master model via the
                AssetModelPicker fills Category/Type/Price inline; a one-off
                asset just needs Category & Type picked directly. No spec/
                instance fields render here at all — see AssetItemRow's own
                note. */}
            <div className="space-y-3 pt-2 border-t border-surface-border">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assets</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Asset', 'Category', 'Type', 'Qty', 'Price', 'GST %', 'Amount', ''].map((h, i) => (
                        <th key={i} className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map(li => (
                      <AssetItemRow
                        key={li.id} item={li} assetModels={assetModels}
                        onUpdate={patch => updateLineItem(li.id, patch)}
                        onRemove={() => removeLineItem(li.id)}
                        showRemove={lineItems.length > 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addLineItem}
                className="flex items-center gap-1.5 text-brand-blue text-sm font-medium hover:text-brand-blue-dark">
                <Plus size={14} /> Add Asset Row
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar — same fixed placement/sizing as CreatePO.jsx's Back/
          Save Draft/Send PO bar: Back bottom-left, primary actions
          bottom-right. There's no prior/next step to move between here, so
          Back always returns to returnTo instead of decrementing a step. */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate(returnTo)}>Back</Button>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={<Save size={14} />} onClick={() => handleSave('Draft')}>Save as Draft</Button>
          <Button size="sm" icon={<ClipboardList size={14} />} onClick={() => handleSave('PO Raised')}>Save &amp; Raise PO</Button>
        </div>
      </div>
    </div>
  )
}
