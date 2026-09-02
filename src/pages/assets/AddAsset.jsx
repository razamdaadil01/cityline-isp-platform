import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Plus, X, AlertTriangle, ClipboardList, PackagePlus, FileQuestion } from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Select } from '../../components/ui/FormInputs'
import {
  ASSET_CATEGORIES, getAssetCategory, getAssetType, getFieldsForType, KIT_COMPONENT_TYPES, ASSET_CONDITIONS,
} from '../../data/assetTaxonomy'
import { createAsset, updateAsset, assetDisplayName } from '../../data/assetStore'
import { savePurchaseOrder, computeLineAmount } from '../../data/purchaseOrderStore'
import { getInventorySettings } from '../../data/inventorySettingsStore'
import { getVendors } from '../../data/vendorStore'
import { getActiveCompanyEntities } from '../../data/companyEntities'
import { getStores } from '../../data/storeStore'
import { FIELD_ENGINEERS } from '../../data/installationsStore'

// A field counts as filled the same way across every input type (text/
// number/date/select all end up as a non-empty string/number on
// item.fields) — kit-components is exempt since the brief never asks for a
// minimum row count, just that the section exists for Splicing Machine.
function isFormValid(categoryId, typeId, fields) {
  if (!categoryId || !typeId) return false
  const defs = getFieldsForType(categoryId, typeId)
  return defs.every(f => {
    if (!f.required || f.type === 'kit-components') return true
    const v = fields[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
}

// ── Kit Components — Splicing Machine's own repeatable sub-table ────────
function KitComponentsTable({ value, onChange }) {
  const rows = value || []

  function addRow() {
    onChange([...rows, {
      id: `kc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      componentType: '', componentName: '', serialNumber: '', quantity: 1, condition: '',
    }])
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

// basePath/returnTo/returnLabel let this same wizard be mounted under
// different route namespaces (currently only Purchase Orders' "Add
// Purchase Order → Asset" flow at /inventory/purchase-orders/new/asset)
// without hardcoding where its own category/type sub-routes live or where
// Back/Cancel/Save should land — App.jsx's <Route> element supplies these
// per mount point.
export default function AddAsset({ basePath = '/assets/new', returnTo = '/assets', returnLabel = 'Assets' }) {
  const navigate = useNavigate()
  // Category/Type live in the URL (basePath/:categoryId?/:typeId?), not
  // local state — deriving them fresh from useParams() on every render
  // (same convention as VendorDetail.jsx/HDDProjectDetail.jsx reading their
  // own :id/:tab straight off useParams() rather than mirroring it into
  // state) means back/forward navigation and direct/shareable links just
  // work, with no separate state to keep in sync with the URL.
  const { categoryId: urlCategoryId, typeId: urlTypeId } = useParams()
  const categoryId = urlCategoryId && getAssetCategory(urlCategoryId) ? urlCategoryId : ''
  const category = categoryId ? getAssetCategory(categoryId) : null
  const typeId = category && urlTypeId && getAssetType(categoryId, urlTypeId) ? urlTypeId : ''
  const type = typeId ? getAssetType(categoryId, typeId) : null

  // A URL naming an unknown category, or a type that doesn't exist under
  // it (including one left over after the category segment was edited by
  // hand), falls back to the bare basePath rather than silently
  // rendering an empty form for a combination that was never actually
  // selected.
  useEffect(() => {
    const categoryInvalid = !!urlCategoryId && !getAssetCategory(urlCategoryId)
    const typeInvalid = !!urlTypeId && (!categoryId || !getAssetType(categoryId, urlTypeId))
    if (categoryInvalid || typeInvalid) navigate(basePath, { replace: true })
  }, [urlCategoryId, urlTypeId, categoryId, basePath, navigate])

  const [fields, setFields] = useState({})
  const [showErrors, setShowErrors] = useState(false)
  const [saveError, setSaveError] = useState('')

  const vendors = useMemo(() => getVendors().filter(v => v.status === 'active'), [])
  // Same sources Inventory's own Create PO wizard (CreatePO.jsx) reads —
  // Company/Entity and Store apply once per asset (not per category/type),
  // so they're selected here rather than folded into assetTaxonomy.js's
  // per-category field templates. Store is a flat, non-cascading list, same
  // as CreatePO.jsx's own Delivery Store field (stores aren't scoped to a
  // company entity in storeStore.js).
  const entities = useMemo(() => getActiveCompanyEntities(), [])
  const stores = useMemo(() => getStores().filter(s => s.status === 'active'), [])
  const [companyEntityId, setCompanyEntityId] = useState(() => entities[0]?.id ?? null)
  const [storeId, setStoreId] = useState('')

  // Picking a new category drops any previously-selected type from the URL
  // (the old type may not even exist under the new category) — replacing
  // history, not pushing, so the back button doesn't need one step per
  // dropdown change.
  function selectCategory(e) {
    const nextCategoryId = e.target.value
    navigate(nextCategoryId ? `${basePath}/${nextCategoryId}` : basePath, { replace: true })
    setFields({})
  }
  // Any field marked autofillFromAssetType (Ladder's "Type", Authority/
  // Access's "Card/Asset Type", Generic Tools' "Category" — see
  // assetTaxonomy.js) is pre-filled here, the moment a type is picked,
  // with that type's own label — read-only from then on (AssetField
  // disables it), so the user is never asked to redundantly re-enter the
  // exact thing they just chose.
  function selectType(e) {
    const nextTypeId = e.target.value
    navigate(nextTypeId ? `${basePath}/${categoryId}/${nextTypeId}` : `${basePath}/${categoryId}`, { replace: true })
    if (!nextTypeId) { setFields({}); return }
    const defs = getFieldsForType(categoryId, nextTypeId)
    const autofilled = {}
    defs.forEach(f => { if (f.autofillFromAssetType) autofilled[f.key] = category.types.find(t => t.id === nextTypeId)?.label })
    setFields(autofilled)
  }
  function updateField(key, value) { setFields(prev => ({ ...prev, [key]: value })) }

  const fieldDefs = type ? getFieldsForType(categoryId, typeId) : []
  // Presentational-only grouping — see FormSection's own note.
  const basicDefs = fieldDefs.filter(f => f.type !== 'date' && f.type !== 'vendor-select' && f.type !== 'kit-components')
  const dateDefs = fieldDefs.filter(f => f.type === 'date')
  const vendorDefs = fieldDefs.filter(f => f.type === 'vendor-select')
  const kitDefs = fieldDefs.filter(f => f.type === 'kit-components')

  // Company/Entity and Store are required same as Category/Type — the
  // asset record itself doesn't store either (see buildPayload() below;
  // assetStore.js's data model is unchanged), but both are needed to raise
  // a correct Asset Purchase PO, so they're validated up front rather than
  // discovered missing only when "Save & Raise PO" is clicked.
  const allValid = isFormValid(categoryId, typeId, fields) && companyEntityId != null && !!storeId

  function buildPayload() {
    return { categoryId, categoryLabel: category.label, typeId, typeLabel: type.label, fields }
  }

  // Save as Draft → status 'Draft', no PO. Save & Raise PO → status
  // 'PO Raised', then raises a real Purchase Order through the same
  // savePurchaseOrder()/approval pipeline the Inventory module's own Create
  // PO wizard uses (poType: 'Asset Purchase' is the only thing that marks
  // it as asset-originated — everything else, including approval routing,
  // is identical). The asset is created first so the PO's single line item
  // can describe it, then patched with the resulting po.id once the PO
  // exists — a PO can never be created before the asset it's for.
  function handleSave(status) {
    if (!allValid) { setShowErrors(true); return }
    setSaveError('')
    try {
      const asset = createAsset(buildPayload(), status)
      if (status === 'PO Raised') {
        raisePurchaseOrderForAsset(asset)
      }
      navigate(returnTo)
    } catch (err) {
      setSaveError(err.message || 'Could not save this asset.')
    }
  }

  // Builds and saves a one-line Asset Purchase PO for a just-created asset,
  // then links it back onto the asset via poId. Follows savePurchaseOrder's
  // 'send' action exactly as Inventory's own Create PO wizard does — if
  // getInventorySettings(companyEntityId).poApprovalRequired is on, this
  // routes to 'Approval Request' with a linked Approvals record; otherwise
  // it goes straight to 'Sent'. No new approval logic here at all. Reads
  // companyEntityId/storeId from the user's own selection above (allValid
  // already guarantees both are set before this can be called) — critically,
  // this is what makes the approval check below run against the entity the
  // user actually configured, instead of a fixed company entity's settings.
  function raisePurchaseOrderForAsset(asset) {
    const settings = getInventorySettings(companyEntityId)
    const gstPercent = settings.defaultGstPercent
    // Asset purchases don't carry a fixed catalog price the way a stocked
    // Inventory product does — price starts at 0 and is filled in for real
    // once the PO reaches the vendor/is priced, same as any other PO line
    // can be edited before sending.
    const price = 0
    const item = {
      id: `POI-asset-${asset.id}`,
      type: 'hardware',
      productId: '', productName: `${asset.categoryLabel} — ${asset.typeLabel}${assetDisplayName(asset) !== asset.typeLabel ? ` (${assetDisplayName(asset)})` : ''}`,
      sku: '', unit: 'Piece', qty: 1, price, gstPercent,
      amount: computeLineAmount(1, price, gstPercent),
    }
    const po = savePurchaseOrder({
      poType: 'Asset Purchase',
      companyEntityId,
      storeId,
      vendorId: asset.fields.vendorId || null,
      orderDate: new Date().toISOString().slice(0, 10),
      estimatedDeliveryDate: '',
      gstPercent,
      items: [item],
      notes: `Auto-generated from Asset Management for asset ${asset.id}.`,
      terms: settings.poTerms,
      discount: 0, otherCharges: 0,
    }, { action: 'send' })
    updateAsset(asset.id, { poId: po.id })
  }

  return (
    <div className="p-6 pb-10 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(returnTo)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <nav className="flex items-center gap-1 text-xs font-medium text-gray-400 mb-0.5">
            <button onClick={() => navigate(returnTo)} className="hover:text-brand-blue transition-colors">{returnLabel}</button>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-500">Add Asset</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-900">Add Asset</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record a single asset into inventory.</p>
        </div>
      </div>

      {saveError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
        </div>
      )}
      {showErrors && !allValid && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a category, type, company/entity, store, and fill every required field before saving.
        </div>
      )}

      <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <FormField label="Category" required>
            <Select value={categoryId} onChange={selectCategory}>
              <option value="">Select category…</option>
              {ASSET_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Type" required>
            <Select value={typeId} onChange={selectType} disabled={!category}>
              <option value="">{category ? 'Select type…' : 'Select a category first'}</option>
              {category?.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </FormField>
        </div>

        {/* Applies once per asset regardless of category/type — same
            Company/Entity and Store sources CreatePO.jsx's own wizard uses,
            required so the eventual PO (if raised) is created against the
            entity whose Inventory Settings actually govern it. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
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

        {type ? (
          <div className="space-y-5 pt-1">
            <FormSection label="Basic Details" defs={basicDefs} fields={fields} onChange={updateField} showErrors={showErrors} vendors={vendors} />
            <FormSection label="Purchase & Warranty" defs={dateDefs} fields={fields} onChange={updateField} showErrors={showErrors} vendors={vendors} />
            <FormSection label="Vendor" defs={vendorDefs} fields={fields} onChange={updateField} showErrors={showErrors} vendors={vendors} />
            {kitDefs.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">Kit Components</p>
                {kitDefs.map(f => (
                  <AssetField key={f.key} field={f} fields={fields} onChange={updateField} showErrors={showErrors} vendors={vendors} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 py-12 px-4 border-2 border-dashed border-surface-border rounded-lg bg-gray-50/60">
            <FileQuestion size={22} className="text-gray-300" />
            <p className="text-sm text-gray-400">Select a category and type to continue.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={() => handleSave('Draft')}>Save as Draft</Button>
        <Button size="sm" icon={<ClipboardList size={14} />} onClick={() => handleSave('PO Raised')}>Save &amp; Raise PO</Button>
      </div>
    </div>
  )
}
