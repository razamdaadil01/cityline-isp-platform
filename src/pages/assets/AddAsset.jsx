import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, AlertTriangle, ClipboardList,
  Laptop, Cable, Ruler, IdCard, Wrench, Package,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Select } from '../../components/ui/FormInputs'
import {
  ASSET_CATEGORIES, getAssetCategory, getFieldsForType, KIT_COMPONENT_TYPES, ASSET_CONDITIONS,
} from '../../data/assetTaxonomy'
import { createAssetsBulk } from '../../data/assetStore'
import { getVendors } from '../../data/vendorStore'
import { FIELD_ENGINEERS } from '../../data/installationsStore'

// Icon lookup for assetTaxonomy.js's own `icon` string field — kept out of
// the taxonomy file itself (data shouldn't import JSX), and defensively
// falls back to a generic Package icon rather than rendering nothing if a
// future taxonomy entry names an icon that doesn't exist in lucide-react.
const CATEGORY_ICONS = { Laptop, Cable, Ruler, IdCard, Wrench }
function CategoryIcon({ name, ...props }) {
  const Icon = CATEGORY_ICONS[name] || Package
  return <Icon {...props} />
}

let _localSeq = 1
function newItem() {
  return { localId: `item-${_localSeq++}`, categoryId: '', typeId: '', fields: {} }
}

// A field counts as filled the same way across every input type (text/
// number/date/select all end up as a non-empty string/number on
// item.fields) — kit-components is exempt since the brief never asks for a
// minimum row count, just that the section exists for Splicing Machine.
function isItemValid(item) {
  if (!item.categoryId || !item.typeId) return false
  const fields = getFieldsForType(item.categoryId, item.typeId)
  return fields.every(f => {
    if (!f.required || f.type === 'kit-components') return true
    const v = item.fields[f.key]
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
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">No components added yet.</td></tr>
            ) : rows.map(row => (
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
// their respective stores, kit-components is the sub-table above. A
// `readOnly` field (Ladder's "Type", Authority/Access's "Card/Asset Type",
// Generic Tools' "Category" — see assetTaxonomy.js's own note) is disabled
// rather than hidden, so the auto-filled value it already carries stays
// visible.
function AssetField({ field, item, onChange, showErrors, vendors }) {
  const value = item.fields[field.key]
  const isEmpty = value === undefined || value === null || String(value).trim() === ''
  const showError = showErrors && field.required && field.type !== 'kit-components' && isEmpty

  if (field.type === 'kit-components') {
    return (
      <div className="col-span-2">
        <p className="text-sm font-medium text-gray-700 mb-2">{field.label}</p>
        <KitComponentsTable value={value} onChange={v => onChange(field.key, v)} />
      </div>
    )
  }

  return (
    <FormField
      label={field.label} required={field.required}
      hint={field.recommended ? 'Recommended' : undefined}
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

// One item in the Add Asset session — its own self-contained Category →
// Type → Form mini-flow (per the brief: "each independently choosing its
// own category/type"), not a page-wide step wizard shared across items.
// The category/type grids disappear once picked (replaced by a "Change…"
// link) rather than staying visible with a selected state, so there's only
// ever one active sub-step showing per item at a time.
function ItemCard({ index, item, onChange, onRemove, canRemove, showErrors, vendors }) {
  const category = item.categoryId ? getAssetCategory(item.categoryId) : null
  const type = category?.types.find(t => t.id === item.typeId) ?? null

  function selectCategory(cat) {
    onChange({ categoryId: cat.id, typeId: '', fields: {} })
  }
  // Any field marked autofillFromAssetType (Ladder's "Type", Authority/
  // Access's "Card/Asset Type", Generic Tools' "Category" — see
  // assetTaxonomy.js) is pre-filled here, the moment a type is picked,
  // with that type's own label — read-only from then on (AssetField
  // disables it), so the user is never asked to redundantly re-enter the
  // exact thing they just chose.
  function selectType(t) {
    const fields = getFieldsForType(item.categoryId, t.id)
    const autofilled = {}
    fields.forEach(f => { if (f.autofillFromAssetType) autofilled[f.key] = t.label })
    onChange({ typeId: t.id, fields: autofilled })
  }
  function changeCategory() { onChange({ categoryId: '', typeId: '', fields: {} }) }
  function changeType() { onChange({ typeId: '', fields: {} }) }
  function updateField(key, value) { onChange({ fields: { ...item.fields, [key]: value } }) }

  const fields = type ? getFieldsForType(item.categoryId, item.typeId) : []
  const invalid = showErrors && !isItemValid(item)

  return (
    <div className={`bg-white rounded-xl border shadow-card p-6 space-y-5 ${invalid ? 'border-red-300' : 'border-surface-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">
          Item {index + 1}{type ? <span className="font-normal text-gray-500"> — {type.label}</span> : null}
        </p>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors" title="Remove item">
            <X size={16} />
          </button>
        )}
      </div>

      {!category ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Category</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ASSET_CATEGORIES.map(cat => (
              <button
                key={cat.id} type="button" onClick={() => selectCategory(cat)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-surface-border text-gray-600 hover:border-brand-blue/50 hover:bg-brand-blue/5 hover:text-brand-blue transition-colors"
              >
                <CategoryIcon name={cat.icon} size={22} />
                <span className="text-xs font-medium text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : !type ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Type — {category.label}</p>
            <button type="button" onClick={changeCategory} className="text-xs text-brand-blue hover:underline">Change Category</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {category.types.map(t => (
              <button
                key={t.id} type="button" onClick={() => selectType(t)}
                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-surface-border text-gray-600 hover:border-brand-blue/50 hover:bg-brand-blue/5 hover:text-brand-blue transition-colors"
              >
                <span className="text-sm font-medium text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category.label} · {type.label}</p>
            <button type="button" onClick={changeType} className="text-xs text-brand-blue hover:underline">Change Type</button>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {fields.map(f => (
              <AssetField key={f.key} field={f} item={item} onChange={updateField} showErrors={showErrors} vendors={vendors} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AddAsset() {
  const navigate = useNavigate()
  const [items, setItems] = useState([newItem()])
  const [showErrors, setShowErrors] = useState(false)
  const [saveError, setSaveError] = useState('')

  const vendors = useMemo(() => getVendors().filter(v => v.status === 'active'), [])

  function updateItem(localId, patch) {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, ...patch } : it))
  }
  function removeItem(localId) {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.localId !== localId) : prev)
  }
  function addItem() {
    setItems(prev => [...prev, newItem()])
  }

  const allValid = items.length > 0 && items.every(isItemValid)

  function buildPayload() {
    return items.map(it => {
      const category = getAssetCategory(it.categoryId)
      const type = category.types.find(t => t.id === it.typeId)
      return { categoryId: it.categoryId, categoryLabel: category.label, typeId: it.typeId, typeLabel: type.label, fields: it.fields }
    })
  }

  // Save as Draft → status 'Draft'. Save & Raise PO → status 'PO Raised'
  // only — per the brief, actually creating/wiring a PO from these assets
  // is Phase 2; this phase just records the intent on the asset itself and
  // returns to the list.
  function handleSave(status) {
    if (!allValid) { setShowErrors(true); return }
    setSaveError('')
    try {
      createAssetsBulk(buildPayload(), status)
      navigate('/assets')
    } catch (err) {
      setSaveError(err.message || 'Could not save these assets.')
    }
  }

  return (
    <div className="p-6 pb-10 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/assets')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Asset</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} in this session</p>
        </div>
      </div>

      {saveError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
        </div>
      )}
      {showErrors && !allValid && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a category, type, and fill every required field on each item before saving.
        </div>
      )}

      <div className="space-y-4">
        {items.map((item, idx) => (
          <ItemCard
            key={item.localId} index={idx} item={item}
            onChange={patch => updateItem(item.localId, patch)}
            onRemove={() => removeItem(item.localId)}
            canRemove={items.length > 1}
            showErrors={showErrors}
            vendors={vendors}
          />
        ))}
      </div>

      <button
        type="button" onClick={addItem}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-border rounded-xl text-sm font-medium text-gray-500 hover:border-brand-blue/40 hover:text-brand-blue transition-colors"
      >
        <Plus size={15} /> Add Another Item
      </button>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
        <Button variant="secondary" size="sm" onClick={() => handleSave('Draft')}>Save as Draft</Button>
        <Button size="sm" icon={<ClipboardList size={14} />} onClick={() => handleSave('PO Raised')}>Save &amp; Raise PO</Button>
      </div>
    </div>
  )
}
