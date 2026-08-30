import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, AlertTriangle, ClipboardList, Check, CheckCircle2, ChevronRight, Pencil, PackagePlus,
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

// A small "you are here" breadcrumb — purely a display summary of what's
// already been picked (Category, and Category + Type), not an alternate
// set of back-buttons: the "Change Category"/"Change Type" pills below are
// still the one way to actually go back, so this never carries an
// onClick of its own.
function Breadcrumb({ parts }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
          <span className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            i === parts.length - 1 ? 'bg-brand-blue/10 text-brand-blue font-semibold' : 'bg-gray-100 text-gray-600'
          }`}>
            {p}
          </span>
        </span>
      ))}
    </div>
  )
}

// Small pill-style "go back one step" link — same shape for both Change
// Category and Change Type, always top-right of its own section.
function ChangeLink({ onClick, children }) {
  return (
    <button
      type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface-border text-xs font-medium text-gray-500 hover:border-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors shrink-0"
    >
      <ArrowLeft size={11} /> {children}
    </button>
  )
}

// ── Step progress indicator — reflects whichever item is currently
// "active" (see AddAsset's own activeItemLocalId), not a page-wide wizard
// state. Category/Type read as done once picked; Details only reads as
// done once every required field on that type is actually filled. ────────
function StepIndicator({ item }) {
  const categoryDone = !!item.categoryId
  const typeDone = !!item.typeId
  const detailsDone = typeDone && isItemValid(item)
  const steps = [
    { label: 'Category', done: categoryDone, active: !categoryDone },
    { label: 'Type', done: typeDone, active: categoryDone && !typeDone },
    { label: 'Details', done: detailsDone, active: typeDone && !detailsDone },
  ]
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 shrink-0 transition-colors ${
              s.done ? 'bg-emerald-500 border-emerald-500 text-white'
                : s.active ? 'border-brand-blue text-brand-blue bg-brand-blue/5'
                : 'border-gray-300 text-gray-400'
            }`}>
              {s.done ? <Check size={12} /> : i + 1}
            </span>
            <span className={`text-xs font-semibold ${s.active ? 'text-brand-blue' : s.done ? 'text-emerald-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 sm:w-14 h-0.5 rounded-full ${steps[i + 1].done || steps[i + 1].active ? 'bg-brand-blue/30' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
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
// field carries a small "Recommended"/"Optional" hint (RAM is the one
// `recommended: true` field in the taxonomy today; every other non-required
// field reads "Optional") so that labeling is consistent across all 5
// category forms without each one needing its own copy.
function AssetField({ field, item, onChange, showErrors, vendors }) {
  const value = item.fields[field.key]
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
function FormSection({ label, fields, item, onChange, showErrors, vendors }) {
  if (fields.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">{label}</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {fields.map(f => (
          <AssetField key={f.key} field={f} item={item} onChange={onChange} showErrors={showErrors} vendors={vendors} />
        ))}
      </div>
    </div>
  )
}

// Collapsed, completed-item summary row — everything about the item is
// already valid, so it's shown as one line rather than re-rendering the
// full card. Clicking the row (or the pencil) re-expands it via onExpand;
// the remove (×) stays available without needing to expand first.
function ItemSummaryRow({ index, item, onExpand, onRemove, canRemove }) {
  const category = getAssetCategory(item.categoryId)
  const type = category?.types.find(t => t.id === item.typeId)
  const name = item.fields.assetName || item.fields.ladderName || item.fields.toolName || item.fields.cardIdNumber || ''

  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card px-5 py-3.5 flex items-center gap-3">
      <button type="button" onClick={onExpand} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Check size={14} />
        </span>
        <span className="text-sm font-medium text-gray-800 truncate">
          Item {index + 1} — {category?.label} · {type?.label}{name ? ` · ${name}` : ''}
        </span>
        <span className="ml-auto shrink-0 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
          <CheckCircle2 size={11} /> Completed
        </span>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onExpand} title="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors">
          <Pencil size={14} />
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} title="Remove" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// One item in the Add Asset session — its own self-contained Category →
// Type → Form mini-flow (per the brief: "each independently choosing its
// own category/type"), not a page-wide step wizard shared across items.
// The category/type grids disappear once picked (replaced by a breadcrumb
// summary + "Change…" pill) rather than staying visible with a selected
// state, so there's only ever one active sub-step showing per item at a
// time. A fully-valid item that isn't the active one renders as
// ItemSummaryRow instead (see AddAsset's own isActive/collapse logic).
function ItemCard({ index, item, onChange, onRemove, canRemove, showErrors, vendors, isActive }) {
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
  // Presentational-only grouping — see FormSection's own note.
  const basicFields = fields.filter(f => f.type !== 'date' && f.type !== 'vendor-select' && f.type !== 'kit-components')
  const dateFields = fields.filter(f => f.type === 'date')
  const vendorFields = fields.filter(f => f.type === 'vendor-select')
  const kitFields = fields.filter(f => f.type === 'kit-components')

  const invalid = showErrors && !isItemValid(item)

  return (
    <div className={`bg-white rounded-xl border shadow-card p-6 space-y-5 transition-colors ${
      invalid ? 'border-red-300' : isActive ? 'border-brand-blue/30 ring-1 ring-brand-blue/10' : 'border-surface-border'
    }`}>
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
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-surface-border text-gray-600 hover:border-brand-blue/50 hover:bg-brand-blue/5 hover:text-brand-blue hover:shadow-md transition-all"
              >
                <CategoryIcon name={cat.icon} size={22} />
                <span className="text-xs font-medium text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : !type ? (
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <Breadcrumb parts={[category.label]} />
            <ChangeLink onClick={changeCategory}>Change Category</ChangeLink>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {category.types.map(t => (
              <button
                key={t.id} type="button" onClick={() => selectType(t)}
                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-surface-border text-gray-600 hover:border-brand-blue/50 hover:bg-brand-blue/5 hover:text-brand-blue hover:shadow-md transition-all"
              >
                <span className="text-sm font-medium text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Breadcrumb parts={[category.label, type.label]} />
            <ChangeLink onClick={changeType}>Change Type</ChangeLink>
          </div>
          <FormSection label="Basic Details" fields={basicFields} item={item} onChange={updateField} showErrors={showErrors} vendors={vendors} />
          <FormSection label="Purchase & Warranty" fields={dateFields} item={item} onChange={updateField} showErrors={showErrors} vendors={vendors} />
          <FormSection label="Vendor" fields={vendorFields} item={item} onChange={updateField} showErrors={showErrors} vendors={vendors} />
          {kitFields.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-surface-border">Kit Components</p>
              {kitFields.map(f => (
                <AssetField key={f.key} field={f} item={item} onChange={updateField} showErrors={showErrors} vendors={vendors} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AddAsset() {
  const navigate = useNavigate()
  const [items, setItems] = useState([newItem()])
  const [activeItemLocalId, setActiveItemLocalId] = useState(items[0].localId)
  const [showErrors, setShowErrors] = useState(false)
  const [saveError, setSaveError] = useState('')

  const vendors = useMemo(() => getVendors().filter(v => v.status === 'active'), [])

  function updateItem(localId, patch) {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, ...patch } : it))
  }
  function removeItem(localId) {
    if (items.length <= 1) return
    const next = items.filter(it => it.localId !== localId)
    if (activeItemLocalId === localId) setActiveItemLocalId(next[next.length - 1].localId)
    setItems(next)
  }
  function addItem() {
    const created = newItem()
    setItems(prev => [...prev, created])
    setActiveItemLocalId(created.localId)
  }

  const allValid = items.length > 0 && items.every(isItemValid)
  const activeItem = items.find(it => it.localId === activeItemLocalId) ?? items[0]

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
    <div className="p-6 pb-6 space-y-5">
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

      <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
        <StepIndicator item={activeItem} />
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
        {items.map((item, idx) => {
          const isActive = item.localId === activeItemLocalId
          const collapsed = !isActive && isItemValid(item)
          return collapsed ? (
            <ItemSummaryRow
              key={item.localId} index={idx} item={item}
              onExpand={() => setActiveItemLocalId(item.localId)}
              onRemove={() => removeItem(item.localId)}
              canRemove={items.length > 1}
            />
          ) : (
            <ItemCard
              key={item.localId} index={idx} item={item}
              onChange={patch => updateItem(item.localId, patch)}
              onRemove={() => removeItem(item.localId)}
              canRemove={items.length > 1}
              showErrors={showErrors}
              vendors={vendors}
              isActive={isActive}
            />
          )
        })}
      </div>

      <button
        type="button" onClick={addItem}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-border rounded-xl text-sm font-medium text-gray-500 hover:border-brand-blue/40 hover:text-brand-blue transition-colors"
      >
        <Plus size={15} /> Add Another Item
      </button>

      {/* Sticky bottom action bar — stays reachable without scrolling to
          the end, especially for long multi-item sessions. `-mx-6`/`px-6`
          cancels the page's own horizontal padding so the bar spans full
          width while its content stays aligned with everything above it. */}
      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-4 bg-white border-t border-surface-border shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.06)] flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={() => handleSave('Draft')}>Save as Draft</Button>
        <Button size="sm" icon={<ClipboardList size={14} />} onClick={() => handleSave('PO Raised')}>Save &amp; Raise PO</Button>
      </div>
    </div>
  )
}
