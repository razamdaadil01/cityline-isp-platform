import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ClipboardList, PackageOpen, Calculator,
  AlertTriangle, Save, CheckCircle2, Trash2, Plus, X, Download, Upload,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import StepProgress from '../../components/customer-type/StepProgress'
import ProductPicker from '../../components/inventory/ProductPicker'
import { getActiveCompanyEntities, getCompanyEntity } from '../../data/companyEntities'
import { getVendors, getVendor } from '../../data/vendorStore'
import { getStores, getStore } from '../../data/storeStore'
import { getProducts, getProduct } from '../../data/productStore'
import { getPurchaseOrders, getPurchaseOrder, getPoStatusLabel } from '../../data/purchaseOrderStore'
import { getPurchase, savePurchase, computeItemFields, computePurchaseSummary } from '../../data/purchaseStore'
import { usePermission } from '../../data/rolesStore'
import { getInventorySettings } from '../../data/inventorySettingsStore'
import { getAssets } from '../../data/assetStore'
import { ASSET_CONDITIONS, getFieldsForType } from '../../data/assetTaxonomy'
import { AssetDetailFields } from '../assets/AddAsset'

const STEPS = [
  { id: 1, label: 'Select PO',        icon: ClipboardList },
  { id: 2, label: 'Product Receipt',  icon: PackageOpen },
  { id: 3, label: 'Calculation',      icon: Calculator },
]

// 'Approved' deliberately isn't listed — an approved PO converges straight
// to 'Sent' (purchaseOrderStore.js's syncPOStatusFromApproval), so it's not
// a reachable po.status value any more.
const RECEIVABLE_PO_STATUSES = ['Sent', 'Partially Received']
const MAC_RE = /^[0-9A-Fa-f]{2}([:-]?[0-9A-Fa-f]{2}){5}$/

// Asset Management's own linkage — a PO with poType 'Asset Purchase' can
// carry several lines (one per Category/Type/Qty combo — see AddAsset.jsx's
// "Save & Raise PO", which now supports multiple items per PO), each with
// one or more linked assets — `qty` of them, all created together via
// createAssetsBulk() and stamped with this same line's id as their own
// poItemId. Matched here by poId + poItemId (not by parsing anything out of
// the line's own id) so this holds regardless of how many units a line
// ordered. Standard POs never match anything here (getAssets() has no asset
// with poId === a Standard PO's id), so this is a no-op for the vast
// majority of POs. Order matches creation order (assetStore.js's
// createAssetsBulk() prepends new assets, getAssets() returns them in that
// same relative order), so array index lines up with "Unit 1, Unit 2, …"
// below.
function linkedAssetsForPOItem(po, poItem) {
  if (!po || po.poType !== 'Asset Purchase') return []
  return getAssets().filter(a => a.poId === po.id && a.poItemId === poItem.id)
}

// A Splicing Machine asset (assetTaxonomy.js: category 'field-splicing-
// tools', type 'splicing-machine') is the only asset type with a Kit
// Components sub-table — every other linked asset (or no linked asset at
// all, i.e. every Standard PO line) carries an empty kitComponents array,
// so CreatePurchase.jsx's "Kit Components Received" section never renders
// for them. Only the line's first/primary linked asset is ever checked — a
// Splicing Machine line is expected to stay qty 1 in practice (see
// AddAsset.jsx's own note), so a qty>1 Splicing Machine line would only
// surface/confirm its first unit's kit components, a known simplification
// rather than a fully per-unit kit UI.
function requestedKitComponents(primaryAsset) {
  if (primaryAsset?.categoryId !== 'field-splicing-tools' || primaryAsset?.typeId !== 'splicing-machine') return []
  const rows = primaryAsset.fields?.kitComponents || []
  // `received` defaults true (checked) — most components arrive as
  // planned, so GRN only needs the exceptions unchecked. serialNumber/
  // condition pre-fill from what was recorded at Add Asset time (often
  // blank for serialNumber — per the PRD, it's frequently only known at
  // physical delivery), both still editable here.
  return rows.map(c => ({
    id: c.id, componentType: c.componentType, componentName: c.componentName, quantity: c.quantity,
    serialNumber: c.serialNumber || '', condition: c.condition || '', received: true,
  }))
}

// Everything below Kit Components a linked asset carries — the same
// dynamic fields captured on the Add Asset form (Asset Name, Brand, Model,
// RAM, etc. — assetTaxonomy.js's getFieldsForType(categoryId, typeId)
// template) — copied here as reference. One entry per received unit
// (assetFieldSets, resized alongside serials below) so the receiving person
// can review/correct each unit's details without touching what was
// originally entered at PO creation time.
function assetDetailFieldsOnly(fields) {
  if (!fields) return {}
  const { kitComponents, ...rest } = fields
  return rest
}

// isStep2Valid() below only ever enforced Serial Number for an asset line
// (via `serials`/`serialsOk`) — every other assetTaxonomy.js `required:
// true` field (Asset Name, Brand Name, Purchase Date, Warranty Start/End
// Date, Vendor, etc.) could be left blank at GRN and the receiver could
// still confirm the purchase. That's what let a unit's warranty dates go
// permanently unset, which is how isAssetWithinWarranty() in
// assetRepairStore.js ends up always returning false for it later. This
// checks one unit's assetFieldSets entry against every required field its
// own Category/Type defines — except 'serialNumber', which stays
// exclusively validated via `serials`/`serialsOk` (AssetUnitDetailsSection
// still separately renders Serial Number bound to that array, not to this
// fields object — see its own note), and 'kit-components', which has no
// meaningful "filled" state and is confirmed through its own separate
// KitComponentsReceiptSection instead.
function assetUnitFieldsComplete(fieldSet, categoryId, typeId) {
  const requiredDefs = getFieldsForType(categoryId, typeId)
    .filter(f => f.required && f.key !== 'serialNumber' && f.type !== 'kit-components')
  return requiredDefs.every(f => {
    const v = fieldSet?.[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
}

function itemFromPOLine(it, i, linkedAssets = []) {
  const primaryAsset = linkedAssets[0] ?? null
  // Every spec field a unit needs at GRN (Asset Name, Brand, Model, RAM,
  // Processor, etc.) now comes straight from the real asset's own recorded
  // fields — captured once per PO line at Products-step time
  // (AddAsset.jsx's AssetLineCard) and copied onto every asset created from
  // that line. No template layer underneath it anymore (Asset Master has
  // been removed) — a receiver's own correction at GRN is the only thing
  // that can change it from here on.
  const assetOriginalFields = primaryAsset ? assetDetailFieldsOnly(primaryAsset.fields) : null
  return {
    id: `tmp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
    // The PO's own line id — distinct from this Purchase item's own `id`
    // above (a fresh tmp id local to this wizard session). An Asset line's
    // productId is always '' (see AddAsset.jsx — no catalog product to
    // reference), so a PO with several asset lines would otherwise have
    // every one of them collapse onto the same '' key when
    // receivedByProductIdForPO()/recalculatePOReceiptStatus()
    // (purchaseStore.js/purchaseOrderStore.js) aggregate received qty per
    // line across Purchases — poLineId is what lets those fall back to a
    // per-line-unique key instead, without changing anything for a real
    // catalog product (whose already-unique productId is still preferred).
    poLineId: it.id,
    source: 'po', type: it.type, productId: it.productId, productName: it.productName,
    sku: it.sku, unit: it.unit, poQty: it.qty, receivedQty: '',
    price: it.price, gstPercent: it.gstPercent,
    serials: [], macs: [], drumNumber: '', reason: '',
    // Batch-level (once per line, regardless of Received Qty) — unlike an
    // Asset line's own per-unit purchaseDate/warrantyStartDate/
    // warrantyEndDate (assetTaxonomy.js), a whole receipt of e.g. 5 ONT
    // Devices shares one Purchase Date and one Warranty Start/End Date, not
    // one each. Only meaningful for a real catalog product line (never
    // read/validated for an Asset-flow line, which has its own equivalent —
    // see isStep2Valid()'s own note) but harmless to seed blank here either way.
    purchaseDate: '', warrantyStartDate: '', warrantyEndDate: '',
    // One entry per linked asset (usually poQty of them) — assetIds[i] is
    // the real Asset record backing that unit slot, or null for a slot
    // beyond however many assets actually exist (e.g. an over-receipt past
    // what was ordered) — see resizeIds()/AssetUnitDetailsSection below.
    assetIds: linkedAssets.map(a => a.id),
    assetCategoryId: primaryAsset?.categoryId ?? null,
    assetTypeId: primaryAsset?.typeId ?? null,
    assetOriginalFields,
    assetFieldSets: linkedAssets.map(a => assetDetailFieldsOnly(a.fields)),
    kitComponents: requestedKitComponents(primaryAsset),
  }
}

function resizeArray(arr, len) {
  const next = arr.slice(0, len)
  while (next.length < len) next.push('')
  return next
}

// Same idea as resizeArray() above, one asset-detail-fields object per
// received unit instead of one string — a newly-added unit slot (Received
// Qty raised past what's already there) starts as a fresh copy of the
// as-ordered reference (`template`) rather than blank, since it's the same
// item that was ordered; a shrunk slot is simply dropped. Existing slots
// (which may carry a real linked asset's own fields, not just the template)
// are left untouched.
function resizeFieldSets(sets, len, template) {
  const next = sets.slice(0, len)
  while (next.length < len) next.push({ ...template })
  return next
}

// Same idea again, for assetIds — a newly-added unit slot has no real Asset
// record behind it (null), same reasoning as resizeFieldSets() above.
function resizeIds(ids, len) {
  const next = ids.slice(0, len)
  while (next.length < len) next.push(null)
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
                <Badge variant={po.status === 'Partially Received' ? 'orange' : 'indigo'} size="sm">{getPoStatusLabel(po.status)}</Badge>
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

// Dual-tracked product (Serial Number AND MAC Number both enabled) — one
// physical unit slot per received qty, each carrying its own serial+MAC
// pair side by side, rather than two independent lists. Paired by index:
// serials[i] and macs[i] describe the same unit.
function PairedTrackedInputs({ serials, macs, onSerialChange, onMacChange }) {
  return (
    <div className="space-y-2 mt-2">
      {serials.map((s, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 p-2 border border-surface-border rounded-lg">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Unit {i + 1} — Serial</label>
            <input
              value={s}
              onChange={e => onSerialChange(i, e.target.value)}
              placeholder={`Serial ${i + 1}`}
              className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Unit {i + 1} — MAC</label>
            <input
              value={macs[i] ?? ''}
              onChange={e => onMacChange(i, e.target.value)}
              placeholder={`MAC ${i + 1}`}
              className={`w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
                (macs[i] ?? '').trim() && !MAC_RE.test((macs[i] ?? '').trim()) ? 'border-red-300' : 'border-surface-border'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Counts how many of the item's received units already satisfy tracking —
// same per-unit rule isStep2Valid() applies in aggregate, just per-index so
// the product card can show a live "X of N units entered" summary.
function countEnteredUnits(item, trackedBySerial, trackedByMac, qty) {
  let count = 0
  for (let i = 0; i < qty; i++) {
    const serialOk = !trackedBySerial || (item.serials[i] ?? '').trim() !== ''
    const macOk = !trackedByMac || MAC_RE.test((item.macs[i] ?? '').trim())
    if (serialOk && macOk) count++
  }
  return count
}

function csvColumns(trackedBySerial, trackedByMac) {
  return ['Unit', ...(trackedBySerial ? ['Serial'] : []), ...(trackedByMac ? ['MAC'] : [])]
}

// Builds a downloadable CSV pre-filled with one row per unit (Unit 1..qty)
// and blank Serial/MAC cells for whichever columns this product tracks, so
// it can be filled in a spreadsheet and re-uploaded via Import CSV below.
function buildTemplateCsv(qty, trackedBySerial, trackedByMac) {
  const headers = csvColumns(trackedBySerial, trackedByMac)
  const lines = [headers.join(',')]
  for (let i = 1; i <= qty; i++) {
    lines.push([String(i), ...(trackedBySerial ? [''] : []), ...(trackedByMac ? [''] : [])].join(','))
  }
  return lines.join('\r\n')
}

function downloadTemplate(item, qty, trackedBySerial, trackedByMac) {
  const csv = buildTemplateCsv(qty, trackedBySerial, trackedByMac)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(item.productName || 'product').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-serial-mac-template.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Minimal manual CSV parser — the codebase has no papaparse dependency, and
// the format here is a plain 2-3 column, single-header-row CSV (no quoted
// commas expected), so a full parser library would be overkill.
function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const stripQuotes = cell => cell.trim().replace(/^"(.*)"$/, '$1')
  const headers = lines[0].split(',').map(stripQuotes)
  const rows = lines.slice(1).map(l => l.split(',').map(stripQuotes))
  return { headers, rows }
}

// Parses+validates an uploaded CSV against this product's tracked columns
// and expected unit count, returning either { serials, macs } (only the
// tracked ones populated, row order == unit order) or { error }. Imported
// values overwrite existing manual entries unconditionally — the caller
// applies the whole result in one update rather than merging cell-by-cell.
function parseImportedCsv(text, qty, trackedBySerial, trackedByMac) {
  const { headers, rows } = parseCsv(text)
  if (headers.length === 0) return { error: 'The CSV file is empty or could not be read.' }
  if (rows.some(r => r.length !== headers.length)) {
    return { error: 'The CSV file is malformed — every row must have the same number of columns as the header.' }
  }
  const serialIdx = headers.findIndex(h => h.toLowerCase() === 'serial')
  const macIdx = headers.findIndex(h => h.toLowerCase() === 'mac')
  if (trackedBySerial && serialIdx === -1) return { error: 'CSV is missing a "Serial" column.' }
  if (trackedByMac && macIdx === -1) return { error: 'CSV is missing a "MAC" column.' }
  if (rows.length !== qty) {
    return { error: `Expected ${qty} row${qty === 1 ? '' : 's'} (one per unit) but the CSV has ${rows.length}.` }
  }
  const serials = trackedBySerial ? rows.map(r => r[serialIdx] ?? '') : undefined
  const macs = trackedByMac ? rows.map(r => r[macIdx] ?? '') : undefined
  if (macs) {
    const invalidMac = macs.find(m => m.trim() && !MAC_RE.test(m.trim()))
    if (invalidMac) return { error: `CSV contains an invalid MAC address: "${invalidMac}".` }
  }
  return { serials, macs }
}

// Scoped to a single product line — opened from that line's "Enter Serials &
// MACs" summary instead of rendering one input pair per unit inline on the
// page (which made the Receipt step unusably long for large quantities).
// Edits go straight through onSerialChange/onMacChange into the same item
// state the inline inputs used to write to, so closing the modal doesn't
// need its own save step — the data is already persisted as it's typed.
// "Download Template" / "Import CSV" are an additive shortcut alongside the
// same manual per-unit fields — a successful import overwrites whichever
// columns it covers via a single onImport() call, then the user can still
// review/edit before Done, same as manual entry.
function SerialMacEntryModal({ isOpen, onClose, item, qty, trackedBySerial, trackedByMac, onSerialChange, onMacChange, onImport }) {
  const fileInputRef = useRef(null)
  const [importError, setImportError] = useState('')

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so re-selecting the same file re-fires onChange
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImportedCsv(String(reader.result ?? ''), qty, trackedBySerial, trackedByMac)
      if (result.error) { setImportError(result.error); return }
      setImportError('')
      onImport(result.serials, result.macs)
    }
    reader.onerror = () => setImportError('Could not read that file.')
    reader.readAsText(file)
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="lg"
      title={`${item.productName} — Serial & MAC Entry`}
      footer={<Button size="sm" onClick={onClose}>Done</Button>}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-surface-border">
          <p className="text-xs text-gray-500">Fill in each unit below, or download a template to fill in a spreadsheet and re-upload.</p>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => downloadTemplate(item, qty, trackedBySerial, trackedByMac)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline">
              <Download size={13} /> Download Template
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline">
              <Upload size={13} /> Import CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
          </div>
        </div>

        {importError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {importError}
          </div>
        )}

        {trackedBySerial && trackedByMac ? (
          <PairedTrackedInputs serials={item.serials} macs={item.macs} onSerialChange={onSerialChange} onMacChange={onMacChange} />
        ) : trackedBySerial ? (
          <TrackedInputs label="Serial" values={item.serials} onChange={onSerialChange} />
        ) : (
          <TrackedInputs label="MAC" values={item.macs} onChange={onMacChange} validate={v => MAC_RE.test(v.trim())} />
        )}
      </div>
    </Modal>
  )
}

// Shown only below a Splicing Machine asset's own receipt line (item.
// kitComponents is only ever populated for that case — see
// requestedKitComponents() above) — everything else in the GRN flow is
// untouched. Component Type/Name/Quantity were fixed at Add Asset request
// time and aren't re-editable here; only Serial Number, Condition, and the
// Received/Missing confirmation are. onUpdate writes straight back into
// this item's own kitComponents array (same item state every other field
// on this card already flows through), so it's carried into buildPayload()
// and, on Confirm, written onto the linked asset by purchaseStore.js's
// confirmKitComponentsForAsset().
function KitComponentsReceiptSection({ item, onUpdate }) {
  if (!item.kitComponents || item.kitComponents.length === 0) return null

  function updateComponent(id, patch) {
    onUpdate({ kitComponents: item.kitComponents.map(c => c.id === id ? { ...c, ...patch } : c) })
  }

  return (
    <div className="rounded-lg border border-surface-border bg-gray-50/60 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <PackageOpen size={13} className="text-brand-blue" /> Kit Components Received
      </p>
      <div className="space-y-2">
        {item.kitComponents.map(c => (
          <div key={c.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center bg-white border border-surface-border rounded-lg p-2.5">
            <div className="sm:col-span-3">
              <p className="text-xs font-medium text-gray-800">{c.componentType || '—'}</p>
              <p className="text-[11px] text-gray-400">{c.componentName || '—'} · Qty {c.quantity}</p>
            </div>
            <div className="sm:col-span-4">
              <input
                value={c.serialNumber}
                onChange={e => updateComponent(c.id, { serialNumber: e.target.value })}
                placeholder="Serial Number"
                className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={c.condition}
                onChange={e => updateComponent(c.id, { condition: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">Condition…</option>
                {ASSET_CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center sm:justify-end gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox" checked={c.received}
                  onChange={e => updateComponent(c.id, { received: e.target.checked })}
                  className="accent-brand-blue"
                />
                {c.received ? <span className="text-emerald-600">Received</span> : <span className="text-red-500">Missing</span>}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Shown only for an Asset-flow receipt line (item.assetIds non-empty — see
// linkedAssetsForPOItem() above) in place of the Product flow's "Enter
// Serials & MACs" modal — one expandable card per received unit
// (assetFieldSets/serials, both resized alongside Received Qty by
// ReceiptItemCard's own setReceivedQty()), each holding that unit's Serial
// Number plus its Add Asset detail fields (Asset Name, Brand, Model, RAM,
// etc. — the full set for a non-kit type; Purchase & Warranty dates and
// Vendor only for a kit-eligible type, since identityFieldKeys drops the
// rest as redundant with the card header — see this component's own note),
// pre-filled from what was captured at PO creation and editable here so the
// receiver can correct anything the vendor actually shipped differently.
// Reuses AddAsset.jsx's own AssetDetailFields renderer (includeKitComponents
// ={false} — Kit Components already has its own separate section below,
// KitComponentsReceiptSection) rather than a second copy of that rendering.
// Each unit slot maps 1:1 to its own real Asset record (item.assetIds[i])
// whenever one exists, so on Confirm every unit's corrected fields are
// written back onto its own asset — see purchaseStore.js's own note at the
// write-back call site; a slot beyond however many assets actually exist
// (e.g. an over-receipt) has no record to write into.
function AssetUnitDetailsSection({ item, onUpdate, searchParams, patchSearchParams, showValidation, isKitItem }) {
  const vendors = getVendors().filter(v => v.status === 'active')
  // Kit-type assets (Splicing Machine) already show their own identity —
  // Asset Name/Brand/Model — in ReceiptItemCard's own card header (e.g.
  // "Field & Splicing Tools — Splicing Machine (Fusion Splicer Unit C)"),
  // and the Kit Components Received list below is their real per-shipment
  // correction mechanism, so those identity fields would just duplicate
  // what's already visible. Still asks for Serial Number, Purchase &
  // Warranty dates and Vendor below regardless of kit status — none of
  // those are captured anywhere else, and isStep2Valid()'s assetFieldsOk
  // check still requires them per unit whether or not the type is kit-
  // eligible, so hiding them here would make a Splicing Machine PO
  // permanently unconfirmable.
  const identityFieldKeys = isKitItem
    ? getFieldsForType(item.assetCategoryId, item.assetTypeId)
        .filter(f => f.type !== 'date' && f.type !== 'vendor-select' && f.type !== 'kit-components')
        .map(f => f.key)
    : []
  // Derived straight from the URL (&item=<poLineId>&unit=<n>) rather than
  // its own local state — same convention as this wizard's own
  // showAddOutside above — so a reload/deep-link/Back-Forward always shows
  // whichever unit the URL names, and expand/collapse never needs its own
  // effect to stay in sync. `item` disambiguates when a PO has more than
  // one line item; poLineId is the original PO line's own stable id (see
  // itemFromPOLine()'s own note), unlike this receipt item's own `id`
  // which is freshly regenerated on every load. Unit 1 is the default when
  // nothing valid is in the URL, so the common case (qty 1) needs no extra
  // click; a stale/invalid pair (wrong item, out-of-range unit — e.g. an
  // old link to a PO that has since been re-received with fewer units)
  // falls back to that same default instead of erroring.
  const urlUnit = Number(searchParams.get('unit'))
  const hasValidUrlUnit = searchParams.get('item') === item.poLineId
    && Number.isInteger(urlUnit) && urlUnit >= 1 && urlUnit <= item.assetFieldSets.length
  const expandedIndex = hasValidUrlUnit ? urlUnit - 1 : 0

  // Expanding a unit replaces the URL's &item=/&unit= pair (so only one
  // "current" unit is ever tracked, replacing history rather than pushing
  // so expand/collapse clicks don't clutter Back); collapsing the
  // currently-expanded one just clears both params, returning to the
  // ?po=...&step=2 base state and the Unit-1 default above.
  //
  // Collapse only fires when the URL is *explicitly* tracking this unit
  // (hasValidUrlUnit && expandedIndex === i) — not just whenever the
  // clicked index happens to match expandedIndex's fallback value. With no
  // valid unit/item pair in the URL yet, expandedIndex defaults to 0 (Unit
  // 1 open) purely as a rendering fallback; without the hasValidUrlUnit
  // guard, the very first click on that already-open default unit would
  // satisfy `expandedIndex === i` and take the collapse branch — clearing
  // params that were never set, so the URL never actually gets the pair
  // written and toggling again looks like a no-op.
  function toggle(i) {
    if (hasValidUrlUnit && expandedIndex === i) {
      patchSearchParams({ item: null, unit: null }, { replace: true })
    } else {
      patchSearchParams({ item: item.poLineId, unit: i + 1 }, { replace: true })
    }
  }
  function updateUnitField(i, key, value) {
    onUpdate({ assetFieldSets: item.assetFieldSets.map((set, idx) => idx === i ? { ...set, [key]: value } : set) })
  }
  function updateUnitSerial(i, value) {
    onUpdate({ serials: item.serials.map((s, idx) => idx === i ? value : s) })
  }
  function updateUnitMac(i, value) {
    const next = [...item.macs]; next[i] = value
    onUpdate({ macs: next })
  }

  return (
    <div className="space-y-2">
      {item.assetFieldSets.map((fieldSet, i) => {
        const serialMissing = !(item.serials[i] ?? '').trim()
        // Same required-field set isStep2Valid()'s own assetFieldsOk check
        // enforces, surfaced here per-unit so a receiver blocked from
        // proceeding can actually see which collapsed unit(s) need
        // attention without expanding every one — see
        // assetUnitFieldsComplete()'s own note.
        const fieldsIncomplete = !assetUnitFieldsComplete(fieldSet, item.assetCategoryId, item.assetTypeId)
        const showUnitWarning = showValidation && (serialMissing || fieldsIncomplete)
        return (
          <div key={i} className="rounded-lg border border-surface-border overflow-hidden">
            <button
              type="button" onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50/60 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                Unit {i + 1}{item.assetFieldSets.length > 1 ? ` of ${item.assetFieldSets.length}` : ''}
                {showUnitWarning && <AlertTriangle size={12} className="text-amber-500" />}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedIndex === i ? 'rotate-180' : ''}`} />
            </button>
            {expandedIndex === i && (
              <div className="p-3 space-y-4 bg-white border-t border-surface-border">
                <FormField label="Serial No." required error={showValidation && serialMissing ? 'Serial Number is required.' : undefined}>
                  <Input
                    value={item.serials[i] ?? ''}
                    onChange={e => updateUnitSerial(i, e.target.value)}
                    placeholder="Serial Number"
                    error={showValidation && serialMissing}
                  />
                </FormField>
                {/* Not for a kit-type item — its own identity (and this
                    unit's kit) is covered elsewhere; see this component's
                    own file-level note. */}
                {!isKitItem && (
                  <FormField label="MAC ID" hint="Optional">
                    <Input value={item.macs[i] ?? ''} onChange={e => updateUnitMac(i, e.target.value)} placeholder="MAC ID" />
                  </FormField>
                )}
                <AssetDetailFields
                  categoryId={item.assetCategoryId} typeId={item.assetTypeId}
                  fields={fieldSet} onChange={(key, value) => updateUnitField(i, key, value)}
                  vendors={vendors} includeKitComponents={false} showErrors={showValidation}
                  // 'serialNumber' is excluded here since
                  // "Identification & Specifications" would otherwise
                  // render it a second time (getFieldsForType() includes
                  // it, and nothing else here filters it out), bound to
                  // fieldSet.serialNumber (the asset's own already-recorded
                  // value, if any) rather than the canonical item.serials[i]
                  // the explicit "Serial Number" field above is bound to.
                  // That orphaned copy could show a stale/legacy value
                  // (e.g. a seeded asset's original serial) right next to a
                  // blank required field asking for the same thing — see
                  // the recent investigation. Note: excluding it here is a
                  // display-only fix — fieldSet.serialNumber still rides
                  // along inside assetFieldSets[i] and still reaches
                  // confirmAssetDetailFieldsAtGRN's write-back unedited;
                  // item.serials[i] itself is never merged into that
                  // write-back at all (it's persisted separately, only onto
                  // this Purchase record's own `serials` array) — a real,
                  // separate gap this fix does not touch.
                  //
                  // identityFieldKeys (see this component's own note above)
                  // additionally drops Asset Name/Brand/Model/spec fields
                  // for a kit-type item — empty for every other item, so
                  // this is a no-op there.
                  excludeKeys={['serialNumber', ...identityFieldKeys]}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Shown instead of AssetUnitDetailsSection's per-unit accordion for a
// non-kit asset line with a single unit — Received Qty 0 (not yet
// arrived) or 1 (received), ReceiptItemCard's own showInlineSerialMac — a
// "Unit 1 of 1" toggle would add a click for no benefit when there's only
// one unit, and these fields are meant to be fillable before Received Qty
// is even set to 1. Serial No./MAC ID already moved into ReceiptItemCard's
// own top-level row for this case, so this holds only the remaining spec/
// correction fields (Asset Name, Brand Name, Model Name, SSD/Storage
// Capacity, RAM, Processor) plus Purchase & Warranty/Vendor, unchanged
// from what AssetUnitDetailsSection itself would otherwise show — always
// visible, no toggle, since there's only one field set to show.
function AssetSpecFieldsPanel({ item, onUpdate, showValidation }) {
  const vendors = getVendors().filter(v => v.status === 'active')
  const fieldSet = item.assetFieldSets[0] ?? {}
  function updateField(key, value) {
    const next = [...item.assetFieldSets]; next[0] = { ...fieldSet, [key]: value }
    onUpdate({ assetFieldSets: next })
  }
  return (
    <div className="rounded-lg border border-surface-border p-3 bg-white space-y-4">
      <AssetDetailFields
        categoryId={item.assetCategoryId} typeId={item.assetTypeId}
        fields={fieldSet} onChange={updateField}
        vendors={vendors} includeKitComponents={false} showErrors={showValidation}
        // 'serialNumber' excluded — it's now bound to the top-level row's
        // own Serial No. field (ReceiptItemCard), same reasoning as
        // AssetUnitDetailsSection's own excludeKeys note above.
        excludeKeys={['serialNumber']}
      />
    </div>
  )
}

function ReceiptItemCard({ item, onUpdate, onRemove, showValidation, searchParams, patchSearchParams }) {
  const product = getProduct(item.productId)
  const isWire = item.type === 'wire'
  // An Asset-flow line (item.assetIds non-empty — see
  // linkedAssetsForPOItem() above) has no catalog productId to read
  // trackedBySerial/trackedByMac off of, so it fell through this gate
  // entirely and never got serial capture at GRN. Every individually-
  // tracked asset needs its own serial regardless of category (Authority/
  // Access included, even though that category's own Add Asset fields
  // don't carry a serialNumber field — this is a receipt-time capture, not
  // an Add Asset one), so any asset line is trackedBySerial too. MAC is
  // captured for a non-kit asset line too (see isNonKitAssetItem below) —
  // optional, no format validation, purely a capture field — but that's a
  // parallel, asset-specific concern, not the same "trackedByMac" flag a
  // real catalog product carries, so trackedByMac itself stays product-only.
  const isAssetItem = Array.isArray(item.assetIds) && item.assetIds.length > 0
  const isKitAssetItem = isAssetItem && item.kitComponents.length > 0
  const isNonKitAssetItem = isAssetItem && !isKitAssetItem
  const trackedBySerial = !!product?.trackedBySerial || isAssetItem
  const trackedByMac = !!product?.trackedByMac
  const isTracked = !isWire && (trackedBySerial || trackedByMac)
  const [modalOpen, setModalOpen] = useState(false)

  function setReceivedQty(qtyStr) {
    const rawQty = Math.max(0, Number(qtyStr) || 0)
    // An asset line's own PO Qty is always 1 now (AddAsset.jsx locks it at
    // creation), so Received Qty can only ever be 0 (not yet arrived) or 1
    // (received) — clamped here rather than just relying on the input's own
    // max="1" (a native stepper affordance only, not a hard block on typed
    // input), and the stored value itself is clamped too, not just the qty
    // used to resize the arrays below, so the field can't keep showing a
    // higher typed number while everything behind it silently caps at 1.
    const qty = isAssetItem ? Math.min(rawQty, 1) : rawQty
    const patch = { receivedQty: isAssetItem ? String(qty) : qtyStr }
    if (isAssetItem) {
      // Never resize an asset line's own serials/macs/assetFieldSets/
      // assetIds down to 0 — there's always at least one real linked asset
      // per line (exactly one now that PO Qty is locked to 1; a legacy
      // multi-asset line predating that lock keeps whatever it already has
      // instead of losing everything). Received Qty 0 is this line's
      // normal starting state ("not yet arrived"), and Serial No./MAC ID/
      // Identification & Specifications are all meant to be fillable then
      // too (see showInlineSerialMac below) — resizing to `qty` directly
      // would wipe all of that out the moment Received Qty reads 0.
      const resizeLen = Math.max(qty, 1)
      patch.serials = resizeArray(item.serials, resizeLen)
      patch.macs = resizeArray(item.macs, resizeLen)
      patch.assetFieldSets = resizeFieldSets(item.assetFieldSets, resizeLen, item.assetOriginalFields)
      patch.assetIds = resizeIds(item.assetIds, resizeLen)
    } else {
      if (trackedBySerial) patch.serials = resizeArray(item.serials, qty)
      if (trackedByMac) patch.macs = resizeArray(item.macs, qty)
    }
    onUpdate(patch)
  }

  const derived = computeItemFields({ ...item, receivedQty: Number(item.receivedQty) || 0 })
  const qty = Number(item.receivedQty) || 0
  const enteredCount = isTracked ? countEnteredUnits(item, trackedBySerial, trackedByMac, qty) : 0
  const showWarning = showValidation && isTracked && qty > 0 && enteredCount < qty
  // A non-kit asset line collapses Serial No./MAC ID straight into the
  // top-level row (no "Unit 1 of 1" accordion needed for a single unit) —
  // see the row/below-row rendering further down. True at both Received
  // Qty 0 (not yet arrived — this line's normal starting state) and 1
  // (received), so Serial No./MAC ID/Identification & Specifications are
  // all visible and editable from the start, not gated behind marking the
  // unit received first. qty <= 1 covers both of those; a >1 case can
  // still exist on an already-saved legacy Purchase from before Received
  // Qty was clamped to 0/1, in which case this stays false and the
  // per-unit accordion (AssetUnitDetailsSection, with Serial No./MAC ID at
  // the top of each unit's own block) renders instead, same as before.
  const showInlineSerialMac = isNonKitAssetItem && qty <= 1
  function updateInlineSerial(value) {
    const next = [...item.serials]; next[0] = value
    onUpdate({ serials: next })
  }
  function updateInlineMac(value) {
    const next = [...item.macs]; next[0] = value
    onUpdate({ macs: next })
  }
  const inlineSerialMissing = showInlineSerialMac && !(item.serials[0] ?? '').trim()

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

      {isNonKitAssetItem ? (
        // Short/Extra belong only to the Product PO receipt flow, where
        // partial/over-shipment tracking against an ordered qty makes sense
        // — an Asset line's qty is just "how many of this exact asset
        // arrived," so those two columns are dropped here entirely. Serial
        // No./MAC ID fold into this same row whenever there's a single unit
        // to capture (showInlineSerialMac, true at Received Qty 0 or 1) so
        // they're fillable before the unit is even marked received —
        // otherwise (a legacy multi-unit line) they move into each unit's
        // own block below (AssetUnitDetailsSection).
        <div className={`grid grid-cols-2 ${showInlineSerialMac ? 'sm:grid-cols-5' : 'sm:grid-cols-3'} gap-3`}>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">PO Qty</label>
            <p className="text-sm font-medium text-gray-700 py-1.5">{item.poQty || 0}</p>
          </div>
          <FormField label="Received Qty">
            <Input type="number" min="0" max="1" value={item.receivedQty} onChange={e => setReceivedQty(e.target.value)} placeholder="0" />
          </FormField>
          {showInlineSerialMac && (
            <>
              <FormField label="Serial No." required error={showValidation && inlineSerialMissing ? 'Serial Number is required.' : undefined}>
                <Input
                  value={item.serials[0] ?? ''}
                  onChange={e => updateInlineSerial(e.target.value)}
                  placeholder="Serial Number"
                  error={showValidation && inlineSerialMissing}
                />
              </FormField>
              <FormField label="MAC ID" hint="Optional">
                <Input value={item.macs[0] ?? ''} onChange={e => updateInlineMac(e.target.value)} placeholder="MAC ID" />
              </FormField>
            </>
          )}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Amount</label>
            <p className="text-sm font-semibold text-gray-900 py-1.5">₹{derived.amount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">{isWire ? 'PO Qty (m)' : 'PO Qty'}</label>
            <p className="text-sm font-medium text-gray-700 py-1.5">{item.poQty || 0}</p>
          </div>
          <FormField label={isWire ? 'Received (m)' : 'Received Qty'}>
            <Input type="number" min="0" max={isKitAssetItem ? 1 : undefined} value={item.receivedQty} onChange={e => setReceivedQty(e.target.value)} placeholder="0" />
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
      )}

      {!isAssetItem && (
        // Once per line, not per unit — an Asset-flow line already asks for
        // its own equivalent per unit (AssetUnitDetailsSection below), so
        // this only ever renders for a real catalog product line (hardware
        // or wire). Same required-field rigor isStep2Valid() enforces for
        // an Asset line's own purchaseDate/warrantyStartDate/
        // warrantyEndDate — see that function's own note.
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Purchase Date" required hint="Required whenever a quantity is received" error={showValidation && !item.purchaseDate ? 'Required.' : undefined}>
            <Input type="date" value={item.purchaseDate} onChange={e => onUpdate({ purchaseDate: e.target.value })} error={showValidation && !item.purchaseDate} />
          </FormField>
          <FormField label="Warranty Start Date" required error={showValidation && !item.warrantyStartDate ? 'Required.' : undefined}>
            <Input type="date" value={item.warrantyStartDate} onChange={e => onUpdate({ warrantyStartDate: e.target.value })} error={showValidation && !item.warrantyStartDate} />
          </FormField>
          <FormField label="Warranty End Date" required error={showValidation && !item.warrantyEndDate ? 'Required.' : undefined}>
            <Input type="date" value={item.warrantyEndDate} onChange={e => onUpdate({ warrantyEndDate: e.target.value })} error={showValidation && !item.warrantyEndDate} />
          </FormField>
        </div>
      )}

      {isWire ? (
        <FormField label="Drum Number" required hint="Required whenever a quantity is received">
          <Input value={item.drumNumber} onChange={e => onUpdate({ drumNumber: e.target.value })} placeholder="e.g. DRUM-0142" />
        </FormField>
      ) : showInlineSerialMac ? (
        // A single unit (Received Qty 0 or 1) — Serial No./MAC ID already
        // live in the row above, so this holds only the remaining spec/
        // correction fields, visible and editable from the start rather
        // than waiting for Received Qty to be set to 1.
        <AssetSpecFieldsPanel item={item} onUpdate={onUpdate} showValidation={showValidation} />
      ) : isAssetItem && qty > 0 ? (
        <AssetUnitDetailsSection
          item={item} onUpdate={onUpdate} searchParams={searchParams} patchSearchParams={patchSearchParams} showValidation={showValidation}
          isKitItem={isKitAssetItem}
        />
      ) : isTracked && qty > 0 ? (
        <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${showWarning ? 'border-amber-300 bg-amber-50' : 'border-surface-border bg-gray-50'}`}>
          <p className={`text-xs font-medium flex items-center gap-1.5 ${showWarning ? 'text-amber-700' : 'text-gray-600'}`}>
            {showWarning && <AlertTriangle size={13} className="shrink-0" />}
            {enteredCount} of {qty} unit{qty === 1 ? '' : 's'} entered
          </p>
          <button type="button" onClick={() => setModalOpen(true)} className="text-xs font-medium text-brand-blue hover:underline shrink-0">
            Enter Serials &amp; MACs
          </button>
        </div>
      ) : null}

      <KitComponentsReceiptSection item={item} onUpdate={onUpdate} />

      {item.source === 'outside' && (
        <FormField label="Reason" hint="Why this was bought outside a PO">
          <Input value={item.reason} onChange={e => onUpdate({ reason: e.target.value })} placeholder="e.g. Urgent field requirement" />
        </FormField>
      )}

      {isTracked && qty > 0 && !isAssetItem && (
        <SerialMacEntryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          item={item}
          qty={qty}
          trackedBySerial={trackedBySerial}
          trackedByMac={trackedByMac}
          onSerialChange={(i, v) => onUpdate({ serials: item.serials.map((s, idx) => idx === i ? v : s) })}
          onMacChange={(i, v) => onUpdate({ macs: item.macs.map((m, idx) => idx === i ? v : m) })}
          onImport={(serials, macs) => onUpdate({
            ...(trackedBySerial ? { serials } : {}),
            ...(trackedByMac ? { macs } : {}),
          })}
        />
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
      serials: product.trackedBySerial ? resizeArray([], receivedQty) : [],
      macs: product.trackedByMac ? resizeArray([], receivedQty) : [],
      drumNumber: '', reason: reason.trim(),
      purchaseDate: '', warrantyStartDate: '', warrantyEndDate: '',
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

  // Pre-select a PO carried in the URL (?po=<id>) on first load — mirrors
  // `existing` sourcing initial state below, only for a fresh (non-editing)
  // New Purchase. Only resolves against receivablePOs, so a stale/invalid
  // id in the URL is silently ignored rather than pre-selecting nothing.
  const poIdFromUrl = !isEditing ? searchParams.get('po') : null
  const poFromUrl = poIdFromUrl ? receivablePOs.find(po => po.id === poIdFromUrl) ?? null : null

  const [outsidePoMode, setOutsidePoMode] = useState(() => existing ? !existing.poId : false)
  const [poId, setPoId] = useState(() => existing?.poId ?? poFromUrl?.id ?? null)
  const [companyEntityId, setCompanyEntityId] = useState(() => existing?.companyEntityId ?? poFromUrl?.companyEntityId ?? entities[0]?.id ?? null)
  const [vendorId, setVendorId] = useState(() => existing?.vendorId ?? poFromUrl?.vendorId ?? '')
  const [storeId, setStoreId] = useState(() => existing?.storeId ?? poFromUrl?.storeId ?? '')
  const [purchaseDate, setPurchaseDate] = useState(existing?.purchaseDate ?? new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState(() =>
    existing?.items.map(it => ({
      ...it, receivedQty: String(it.receivedQty),
      // A Draft saved before this batch-date capture existed (e.g. this
      // store's own seeded PUR-000002) has no purchaseDate/warrantyStartDate/
      // warrantyEndDate keys at all — default them here rather than leaving
      // undefined, same as receivedQty's own normalization above, so the
      // date <Input>s stay controlled instead of switching from
      // uncontrolled once a value is typed.
      purchaseDate: it.purchaseDate ?? '', warrantyStartDate: it.warrantyStartDate ?? '', warrantyEndDate: it.warrantyEndDate ?? '',
    }))
    ?? poFromUrl?.items.map((it, i) => itemFromPOLine(it, i, linkedAssetsForPOItem(poFromUrl, it)))
    ?? []
  )
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')
  const [attemptedAction, setAttemptedAction] = useState(null) // null | 'step1' | 'step2' | 'draft' | 'confirm'

  const selectedPO = poId ? getPurchaseOrder(poId) : null

  // Inventory Settings' per-company-entity "Allow adding hardware outside
  // PO" toggle — off by default. Read fresh (not memoized) so a change made
  // in Settings takes effect immediately rather than needing this wizard
  // reopened.
  const allowOutsideHardware = companyEntityId != null ? !!getInventorySettings(companyEntityId).allowOutsidePOHardware : false

  // Merge-safe searchParams update — used for both the `po` selection and
  // step navigation below, so setting one param never clobbers the other
  // (a plain setSearchParams({step}) call replaces the whole query string).
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

  // Derived straight from the URL rather than its own useState — same
  // approach as `step` below — so the "Add Hardware Outside PO" form's open
  // state is the URL, not local state kept in sync with it. Reload/deep-link
  // with &outsideItem=true on this same URL and the form is just already open.
  const showAddOutside = searchParams.get('outsideItem') === 'true'
  function setShowAddOutside(open) {
    patchSearchParams({ outsideItem: open ? true : null })
  }

  function selectPO(po) {
    setPoId(po.id)
    setCompanyEntityId(po.companyEntityId)
    setVendorId(po.vendorId)
    setStoreId(po.storeId)
    // Re-selecting a PO replaces only the PO-sourced lines — any items
    // already added via "Add Hardware Outside PO" carry over.
    setItems(prev => [
      ...po.items.map((it, i) => itemFromPOLine(it, i, linkedAssetsForPOItem(po, it))),
      ...prev.filter(it => it.source === 'outside'),
    ])
    patchSearchParams({ po: po.id }, { replace: true })
  }

  function switchToOutsidePo() {
    setOutsidePoMode(true)
    setPoId(null)
    setItems(prev => prev.filter(it => it.source === 'outside'))
    patchSearchParams({ po: null }, { replace: true })
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
      const isAssetLine = Array.isArray(it.assetIds) && it.assetIds.length > 0
      // Purchase Date / Warranty Start/End Date — once per line, not per
      // unit (see ReceiptItemCard's own note and itemFromPOLine()'s), so
      // this checks the line's own three fields directly rather than
      // per-unit arrays. An Asset-flow line already enforces its own
      // per-unit equivalent below (assetFieldsOk, via assetUnitFieldsComplete()),
      // so it's excluded here rather than asked twice.
      const batchDatesOk = isAssetLine || (!!it.purchaseDate && !!it.warrantyStartDate && !!it.warrantyEndDate)
      if (it.type === 'wire') return !!it.drumNumber?.trim() && batchDatesOk
      const product = getProduct(it.productId)
      // Same trackedBySerial-or-asset-line rule ReceiptItemCard uses above —
      // an Asset-flow item (it.assetIds non-empty) requires Serial Number
      // here too, even though it has no catalog product to read
      // trackedBySerial off.
      const trackedBySerial = !!product?.trackedBySerial || isAssetLine
      const serialsOk = !trackedBySerial || (it.serials.length === it.receivedQty && it.serials.every(s => s.trim()))
      const macsOk = !product?.trackedByMac || (it.macs.length === it.receivedQty && it.macs.every(m => MAC_RE.test(m.trim())))
      // Every other required asset detail field (Asset Name, Brand Name,
      // Purchase Date, Warranty Start/End Date, Vendor, etc.) per unit —
      // see assetUnitFieldsComplete()'s own note on why this was missing.
      const assetFieldsOk = !isAssetLine || (
        it.assetFieldSets.length === it.receivedQty
        && it.assetFieldSets.every(fs => assetUnitFieldsComplete(fs, it.assetCategoryId, it.assetTypeId))
      )
      return serialsOk && macsOk && assetFieldsOk && batchDatesOk
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
    patchSearchParams({ step: id })
  }
  function goBack() {
    setAttemptedAction(null)
    if (step === 1) { navigate('/inventory/purchases'); return }
    patchSearchParams({ step: step - 1 })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    setAttemptedAction(null)
    patchSearchParams({ step: Math.min(step + 1, 3) })
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
        id: it.id, poLineId: it.poLineId ?? null, source: it.source, type: it.type, productId: it.productId, productName: it.productName,
        sku: it.sku, unit: it.unit, poQty: it.poQty, receivedQty: it.receivedQty,
        price: it.price, gstPercent: it.gstPercent,
        serials: it.serials, macs: it.macs, drumNumber: it.drumNumber, reason: it.reason,
        purchaseDate: it.purchaseDate || '', warrantyStartDate: it.warrantyStartDate || '', warrantyEndDate: it.warrantyEndDate || '',
        assetIds: it.assetIds ?? [], kitComponents: it.kitComponents ?? [],
        assetCategoryId: it.assetCategoryId ?? null, assetTypeId: it.assetTypeId ?? null,
        assetOriginalFields: it.assetOriginalFields ?? null, assetFieldSets: it.assetFieldSets ?? [],
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
                Enter at least one Received Qty above 0, and fill in Drum Number / Serial / MAC fields — plus every required asset detail (Asset Name, Brand, Warranty dates, etc.) for each unit — for every line with a quantity received.
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
                    <FormField label="Purchase Order" required hint="Only POs with status Sent or Partially Received can be received">
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
                        showValidation={attemptedAction === 'step2'}
                        searchParams={searchParams} patchSearchParams={patchSearchParams}
                      />
                    ))}
                  </div>
                )}

                {allowOutsideHardware && showAddOutside ? (
                  <AddOutsideItemForm products={products} onAdd={addOutsideItem} onCancel={() => setShowAddOutside(false)} />
                ) : allowOutsideHardware && canCreate ? (
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
