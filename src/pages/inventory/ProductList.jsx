import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, MoreVertical, Edit2,
  CheckCircle2, XCircle, Package, Boxes, Hash, ScanLine, Info,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { FormField, Input, Select } from '../../components/ui/FormInputs'
import ColumnManager, { useColumnPrefs } from '../../components/table/ColumnManager'
import {
  getProducts, subscribeProducts, saveProduct, setProductStatus,
  isProductNameTaken, isSkuTaken, UNIT_TYPES, TRACKING_TYPES, GOOD_TYPES, previewNextProductId,
  getTrackingLabel,
} from '../../data/productStore'
import { usePermission } from '../../data/rolesStore'
import { getActiveCompanyEntities, getCompanyEntity } from '../../data/companyEntities'

const PRODUCT_TABLE_COLUMNS = [
  { key: 'productId',     label: 'Product ID',     visible: true, defaultVisible: true },
  { key: 'name',          label: 'Product Name',   visible: true, defaultVisible: true, locked: true },
  { key: 'sku',           label: 'SKU',            visible: true, defaultVisible: true },
  { key: 'productType',   label: 'Type',           visible: true, defaultVisible: true },
  { key: 'brand',         label: 'Brand',          visible: true, defaultVisible: true },
  { key: 'purchasedCompany', label: 'Purchased Company', visible: true, defaultVisible: true },
  { key: 'goodType',      label: 'Good Type',      visible: true, defaultVisible: true },
  { key: 'model',         label: 'Model',          visible: true, defaultVisible: true },
  { key: 'unitType',      label: 'Unit',           visible: true, defaultVisible: true },
  { key: 'sellingPrice',  label: 'Selling Price',  visible: true, defaultVisible: true },
  { key: 'availableQty',  label: 'Available Qty',  visible: true, defaultVisible: true },
  { key: 'reorderAlertQty', label: 'Reorder Alert', visible: true, defaultVisible: true },
  { key: 'trackingType',  label: 'Tracking',       visible: true, defaultVisible: true },
  { key: 'status',        label: 'Status',         visible: true, defaultVisible: true },
  { key: 'actions',       label: 'Action',         visible: true, defaultVisible: true },
]

const TRACKING_ICON = { quantity: Boxes, serial: Hash, mac: ScanLine }
const GOOD_TYPE_LABEL = Object.fromEntries(GOOD_TYPES.map(g => [g.value, g.label]))

// `trackingQuantity` is form-local only (never persisted) — it exists purely
// to break the exclusivity deadlock: trackedBySerial/trackedByMac being both
// false is otherwise ambiguous between "Quantity deliberately selected" and
// "nothing picked yet", which matters once Quantity's own checkbox needs to
// be uncheckable so Serial/MAC can be reached. See the Tracking Configuration
// block below for how the three checkboxes' disabled states interact.
function emptyHardwareForm() {
  return {
    name: '', sku: '', brand: '', purchasedCompanyId: '', goodType: 'consumable', model: '', imageUrl: '',
    sellingPrice: '', unitType: 'Piece', reorderAlertQty: '',
    trackingQuantity: true, trackedBySerial: false, trackedByMac: false,
  }
}

function emptyWireForm() {
  return { name: '', sku: '', brand: '', sellingPrice: '', reorderAlertQty: '' }
}

function productToForm(product) {
  if (product.productType === 'wire') {
    return {
      name: product.name, sku: product.sku, brand: product.brand,
      sellingPrice: String(product.sellingPrice ?? ''), reorderAlertQty: String(product.reorderAlertQty ?? ''),
    }
  }
  // Backward-compatible with any product record that only ever carried the
  // old `trackingType` string (no booleans yet) — falls back to deriving
  // trackedBySerial/trackedByMac from it so an existing 'serial'/'mac'
  // single-tracked product edits with zero behavior change.
  const trackedBySerial = product.trackedBySerial ?? (product.trackingType === 'serial')
  const trackedByMac = product.trackedByMac ?? (product.trackingType === 'mac')
  return {
    name: product.name, sku: product.sku, brand: product.brand,
    purchasedCompanyId: product.purchasedCompanyId != null ? String(product.purchasedCompanyId) : '',
    goodType: product.goodType || 'consumable',
    model: product.model,
    imageUrl: product.imageUrl, sellingPrice: String(product.sellingPrice ?? ''),
    unitType: product.unitType || 'Piece', reorderAlertQty: String(product.reorderAlertQty ?? ''),
    trackingQuantity: !trackedBySerial && !trackedByMac, trackedBySerial, trackedByMac,
  }
}

// ── Add / Edit Product modal — Hardware / Wire tabs ─────────────────────────

function AddEditProductModal({ isOpen, onClose, editing }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const companyEntities = getActiveCompanyEntities()
  // Read-only, system-generated — same auto-generated-and-shown-live pattern
  // as Create PO's previewNextPoNumber(): a fresh product being added shows
  // what its id WILL be on save; an existing one just shows its real id.
  // Applies to both Hardware and Wire tabs since it's rendered once in the
  // modal header, above the tab switcher.
  const productId = editing ? editing.id : previewNextProductId()
  // Tab is URL-driven (?type=wire), not local state — editing always shows
  // the product's own type regardless of the URL, matching switchTab()'s
  // existing add-only restriction below.
  const tab = editing ? editing.productType : (searchParams.get('type') === 'wire' ? 'wire' : 'hardware')
  const [hwForm, setHwForm] = useState(emptyHardwareForm)
  const [wireForm, setWireForm] = useState(emptyWireForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      if (editing.productType === 'wire') setWireForm(productToForm(editing))
      else setHwForm(productToForm(editing))
    } else {
      setHwForm(emptyHardwareForm())
      setWireForm(emptyWireForm())
    }
    setErrors({})
  }, [isOpen, editing])

  const form = tab === 'wire' ? wireForm : hwForm
  const setForm = tab === 'wire' ? setWireForm : setHwForm

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function switchTab(next) {
    if (editing) return // editing keeps the product's own type — tabs are add-only
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      if (next === 'wire') p.set('type', 'wire')
      else p.delete('type')
      return p
    })
    setErrors({})
  }

  // Quantity is exclusive with Serial/MAC; Serial and MAC can both be on at
  // once. Checking Quantity clears both others; checking either other
  // clears Quantity — each toggle also resolves the opposite side so the
  // three checkboxes' disabled states (rendered below) never deadlock.
  function toggleTrackingQuantity() {
    setHwForm(f => ({ ...f, trackingQuantity: !f.trackingQuantity, trackedBySerial: false, trackedByMac: false }))
    setErrors(e => ({ ...e, tracking: undefined }))
  }
  function toggleTrackedBySerial() {
    setHwForm(f => ({ ...f, trackedBySerial: !f.trackedBySerial, trackingQuantity: false }))
    setErrors(e => ({ ...e, tracking: undefined }))
  }
  function toggleTrackedByMac() {
    setHwForm(f => ({ ...f, trackedByMac: !f.trackedByMac, trackingQuantity: false }))
    setErrors(e => ({ ...e, tracking: undefined }))
  }

  function validate() {
    const errs = {}
    const excludeId = editing?.id ?? null
    if (!form.name.trim()) {
      errs.name = tab === 'wire' ? 'Wire name is required.' : 'Product name is required.'
    } else if (isProductNameTaken(form.name.trim(), excludeId)) {
      errs.name = `"${form.name.trim()}" already exists. Please use a different product name.`
    }
    if (form.sku.trim() && isSkuTaken(form.sku.trim(), excludeId)) {
      errs.sku = `"${form.sku.trim()}" already exists. Please use a different SKU.`
    }
    if (form.sellingPrice === '' || Number.isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) < 0)
      errs.sellingPrice = 'Enter a valid selling price.'
    if (form.reorderAlertQty === '' || Number.isNaN(Number(form.reorderAlertQty)) || Number(form.reorderAlertQty) < 0)
      errs.reorderAlertQty = 'Enter a valid reorder alert quantity.'
    if (tab === 'hardware' && !form.trackingQuantity && !form.trackedBySerial && !form.trackedByMac)
      errs.tracking = 'Select at least one tracking option.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    if (tab === 'wire') {
      saveProduct({
        id: editing?.id,
        productType: 'wire',
        name: form.name.trim(),
        sku: form.sku.trim(),
        brand: form.brand.trim(),
        model: '',
        imageUrl: '',
        unitType: 'Meter',
        sellingPrice: Number(form.sellingPrice),
        reorderAlertQty: Number(form.reorderAlertQty),
        trackedBySerial: false,
        trackedByMac: false,
        drumNumberRequired: true,
        status: editing?.status ?? 'active',
      })
    } else {
      saveProduct({
        id: editing?.id,
        productType: 'hardware',
        name: form.name.trim(),
        sku: form.sku.trim(),
        brand: form.brand.trim(),
        purchasedCompanyId: form.purchasedCompanyId ? Number(form.purchasedCompanyId) : null,
        goodType: form.goodType,
        model: form.model.trim(),
        imageUrl: form.imageUrl.trim(),
        unitType: form.unitType,
        sellingPrice: Number(form.sellingPrice),
        reorderAlertQty: Number(form.reorderAlertQty),
        trackedBySerial: form.trackingQuantity ? false : form.trackedBySerial,
        trackedByMac: form.trackingQuantity ? false : form.trackedByMac,
        drumNumberRequired: false,
        status: editing?.status ?? 'active',
      })
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex flex-col gap-0.5">
          <span>{editing ? 'Edit Product' : 'Add Product'}</span>
          <span className="text-xs font-normal text-gray-500">
            Product ID: <span className="font-mono font-semibold text-brand-blue">{productId}</span>
          </span>
        </span>
      }
      size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Product'}</Button>
      </>}
    >
      <div className="space-y-5">
        <div className="flex gap-1 border-b border-surface-border -mt-1">
          {['hardware', 'wire'].map(t => (
            <button
              key={t}
              type="button"
              disabled={!!editing}
              onClick={() => switchTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize
                ${tab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}
                ${editing ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'hardware' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Product Name" required error={errors.name}>
                <Input placeholder="e.g. ONT Device" value={hwForm.name} onChange={e => setField('name', e.target.value)} />
              </FormField>
              <FormField label="SKU ID" error={errors.sku}>
                <Input placeholder="e.g. HW-ONT-001" value={hwForm.sku} onChange={e => setField('sku', e.target.value)} />
              </FormField>
              <FormField label="Brand">
                <Input placeholder="e.g. ZTE" value={hwForm.brand} onChange={e => setField('brand', e.target.value)} />
              </FormField>
              <FormField label="Purchased Company Name">
                <Select value={hwForm.purchasedCompanyId} onChange={e => setField('purchasedCompanyId', e.target.value)}>
                  <option value="">Select company…</option>
                  {companyEntities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Good Type">
                <Select value={hwForm.goodType} onChange={e => setField('goodType', e.target.value)}>
                  {GOOD_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Model">
                <Input placeholder="e.g. F660" value={hwForm.model} onChange={e => setField('model', e.target.value)} />
              </FormField>
              <FormField label="Image URL" hint="Optional — link to a product photo">
                <Input placeholder="https://…" value={hwForm.imageUrl} onChange={e => setField('imageUrl', e.target.value)} />
              </FormField>
              <FormField label="Selling Price" required error={errors.sellingPrice}>
                <Input type="number" min="0" placeholder="0.00" value={hwForm.sellingPrice} onChange={e => setField('sellingPrice', e.target.value)} />
              </FormField>
              <FormField label="Unit Type" required>
                <Select value={hwForm.unitType} onChange={e => setField('unitType', e.target.value)}>
                  {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                </Select>
              </FormField>
              <FormField label="Reorder Alert Qty" required error={errors.reorderAlertQty}>
                <Input type="number" min="0" placeholder="e.g. 10" value={hwForm.reorderAlertQty} onChange={e => setField('reorderAlertQty', e.target.value)} />
              </FormField>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tracking Configuration</label>
              <div className="grid grid-cols-3 gap-2">
                {TRACKING_TYPES.map(t => {
                  const Icon = TRACKING_ICON[t.value]
                  const checked = t.value === 'quantity' ? hwForm.trackingQuantity
                    : t.value === 'serial' ? hwForm.trackedBySerial : hwForm.trackedByMac
                  // Quantity is exclusive with Serial/MAC: while either of the
                  // other two is on, Quantity is disabled; while Quantity is
                  // on, both Serial and MAC are disabled. Neither disables
                  // itself, so unchecking one side always stays reachable.
                  const disabled = t.value === 'quantity' ? (hwForm.trackedBySerial || hwForm.trackedByMac) : hwForm.trackingQuantity
                  const onToggle = t.value === 'quantity' ? toggleTrackingQuantity
                    : t.value === 'serial' ? toggleTrackedBySerial : toggleTrackedByMac
                  return (
                    <label
                      key={t.value}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors
                        ${checked ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        className="accent-brand-blue shrink-0 disabled:cursor-not-allowed"
                        checked={checked}
                        disabled={disabled}
                        onChange={onToggle}
                      />
                      <Icon size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">{t.label}</span>
                    </label>
                  )
                })}
              </div>
              {(hwForm.trackedBySerial || hwForm.trackedByMac) && (
                <div className="mt-2 space-y-1">
                  {hwForm.trackedBySerial && (
                    <p className="text-xs text-gray-500 flex items-start gap-1">
                      <Info size={11} className="mt-0.5 shrink-0" />
                      Every unit of this product will require a unique serial number at stock-in and assignment.
                    </p>
                  )}
                  {hwForm.trackedByMac && (
                    <p className="text-xs text-gray-500 flex items-start gap-1">
                      <Info size={11} className="mt-0.5 shrink-0" />
                      Every unit of this product will require a unique MAC number at stock-in and assignment.
                    </p>
                  )}
                  {hwForm.trackedBySerial && hwForm.trackedByMac && (
                    <p className="text-xs text-gray-500 flex items-start gap-1">
                      <Info size={11} className="mt-0.5 shrink-0" />
                      Both are tracked together — each physical unit carries one serial number AND one MAC number.
                    </p>
                  )}
                </div>
              )}
              {errors.tracking && <p className="text-xs text-red-500 mt-2">{errors.tracking}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Wire Name" required error={errors.name}>
                <Input placeholder="e.g. CAT6 Cable" value={wireForm.name} onChange={e => setField('name', e.target.value)} />
              </FormField>
              <FormField label="SKU ID" error={errors.sku}>
                <Input placeholder="e.g. WR-CAT6-001" value={wireForm.sku} onChange={e => setField('sku', e.target.value)} />
              </FormField>
              <FormField label="Brand">
                <Input placeholder="e.g. D-Link" value={wireForm.brand} onChange={e => setField('brand', e.target.value)} />
              </FormField>
              <FormField label="Unit" hint="Wire products are always tracked per meter">
                <Input value="Meter" disabled />
              </FormField>
              <FormField label="Selling Price / Meter" required error={errors.sellingPrice}>
                <Input type="number" min="0" placeholder="0.00" value={wireForm.sellingPrice} onChange={e => setField('sellingPrice', e.target.value)} />
              </FormField>
              <FormField label="Reorder Alert Qty / Meter" required error={errors.reorderAlertQty}>
                <Input type="number" min="0" placeholder="e.g. 100" value={wireForm.reorderAlertQty} onChange={e => setField('reorderAlertQty', e.target.value)} />
              </FormField>
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-surface-border px-3.5 py-3 bg-gray-50/60">
              <input type="checkbox" checked disabled className="accent-brand-blue" />
              <span className="text-sm text-gray-600">
                Drum Number Required
                <span className="block text-xs text-gray-400">Locked on for v1 — every wire stock-in must record a drum number.</span>
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Filter drawer ────────────────────────────────────────────────────────────

function FilterDrawer({ open, onClose, draft, setDraftField, onApply, onReset, brands, activeCount }) {
  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-purple-600" />
            <h2 className="text-sm font-bold text-gray-900">Filters</h2>
            {activeCount > 0 && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">{activeCount} active</span>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product Type</label>
            <div className="flex gap-4">
              {['', 'hardware', 'wire'].map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="draft-productType" value={v} checked={draft.productType === v}
                    onChange={() => setDraftField('productType', v)} className="accent-purple-600" />
                  <span className="text-sm text-gray-700 capitalize">{v || 'All'}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brand</label>
            <div className="relative">
              <select value={draft.brand} onChange={e => setDraftField('brand', e.target.value)}
                className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                <option value="">All</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
            <div className="flex gap-4">
              {['', 'active', 'inactive'].map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="draft-status" value={v} checked={draft.status === v}
                    onChange={() => setDraftField('status', v)} className="accent-purple-600" />
                  <span className="text-sm text-gray-700 capitalize">{v || 'All'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
          <button onClick={onReset} className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
            Clear All Filters
          </button>
          <button onClick={onApply} className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProductList() {
  const canCreate = usePermission('Inventory', 'Create')
  const canEdit = usePermission('Inventory', 'Edit')

  const [products, setProducts] = useState(getProducts)
  useEffect(() => subscribeProducts(setProducts), [])

  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:inventoryProductTable', PRODUCT_TABLE_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  const [search, setSearch] = useState('')

  // Add/Edit modal is deep-linkable via ?modal=add or ?modal=edit&id=<productId>
  // (plus ?type=wire while adding), same ?modal= convention used by Settings.jsx's
  // Company/Entity modal — merged with any other existing params rather than
  // clobbering them, push to open/switch tabs, replace to close.
  const [searchParams, setSearchParams] = useSearchParams()
  const modalParam = searchParams.get('modal')
  const editIdParam = searchParams.get('id')
  const editing = modalParam === 'edit' ? products.find(p => p.id === editIdParam) ?? null : null
  const modalOpen = modalParam === 'add' || (modalParam === 'edit' && !!editing)

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const [filterProductType, setFilterProductType] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const EMPTY_DRAFT = { productType: '', brand: '', status: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ productType: filterProductType, brand: filterBrand, status: filterStatus })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterProductType(draft.productType)
    setFilterBrand(draft.brand)
    setFilterStatus(draft.status)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  function setDraftField(k, v) { setDraft(prev => ({ ...prev, [k]: v })) }

  function clearAllFilters() {
    setFilterProductType(''); setFilterBrand(''); setFilterStatus('')
  }

  const activeFiltersCount = [filterProductType, filterBrand, filterStatus].filter(Boolean).length

  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false
      if (filterProductType && p.productType !== filterProductType) return false
      if (filterBrand && p.brand !== filterBrand) return false
      if (filterStatus && p.status !== filterStatus) return false
      return true
    })
  }, [products, search, filterProductType, filterBrand, filterStatus])

  function openAdd() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'add')
      next.delete('id')
      next.delete('type')
      return next
    })
  }
  function openEdit(product) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'edit')
      next.set('id', product.id)
      next.delete('type')
      return next
    })
    setMenuId(null)
  }
  function closeModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      next.delete('id')
      next.delete('type')
      return next
    }, { replace: true })
  }
  function toggleStatus(product) {
    setProductStatus(product.id, product.status === 'active' ? 'inactive' : 'active')
    setMenuId(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {products.length} products</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Product</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product name, SKU…"
            className="pl-9 pr-8 py-1.5 text-sm w-72 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={openDrawer}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
            activeFiltersCount > 0 ? 'bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90' : 'bg-white text-gray-700 border-surface-border hover:bg-gray-50'
          }`}
        >
          <Filter size={13} /> Filters
          {activeFiltersCount > 0 && <span className="bg-white/25 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold leading-none">{activeFiltersCount}</span>}
        </button>

        {activeFiltersCount > 0 && (
          <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      <FilterDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        draft={draft} setDraftField={setDraftField}
        onApply={applyDrawer} onReset={resetDrawer}
        brands={brands} activeCount={activeFiltersCount}
      />

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {visibleCols.has('productId')       && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Product ID</th>}
                {visibleCols.has('name')            && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[180px]">Product Name</th>}
                {visibleCols.has('sku')             && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">SKU</th>}
                {visibleCols.has('productType')     && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>}
                {visibleCols.has('brand')           && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Brand</th>}
                {visibleCols.has('purchasedCompany') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Purchased Company</th>}
                {visibleCols.has('goodType')        && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Good Type</th>}
                {visibleCols.has('model')           && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Model</th>}
                {visibleCols.has('unitType')        && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Unit</th>}
                {visibleCols.has('sellingPrice')    && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Selling Price</th>}
                {visibleCols.has('availableQty')    && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Available Qty</th>}
                {visibleCols.has('reorderAlertQty') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Reorder Alert</th>}
                {visibleCols.has('trackingType')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Tracking</th>}
                {visibleCols.has('status')          && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>}
                {visibleCols.has('actions')         && <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Package size={32} className="mx-auto mb-2 text-gray-200" />
                    No products found
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  {visibleCols.has('productId') && <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{p.id}</td>}
                  {visibleCols.has('name') && (
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{p.name}</span>
                    </td>
                  )}
                  {visibleCols.has('sku')  && <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{p.sku || '—'}</td>}
                  {visibleCols.has('productType') && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={p.productType === 'wire' ? 'orange' : 'blue'} size="sm" className="capitalize">{p.productType}</Badge>
                    </td>
                  )}
                  {visibleCols.has('brand') && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{p.brand || '—'}</td>}
                  {visibleCols.has('purchasedCompany') && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{getCompanyEntity(p.purchasedCompanyId)?.name || '—'}</td>}
                  {visibleCols.has('goodType') && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{GOOD_TYPE_LABEL[p.goodType] ?? '—'}</td>}
                  {visibleCols.has('model') && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{p.model || '—'}</td>}
                  {visibleCols.has('unitType') && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{p.unitType}</td>}
                  {visibleCols.has('sellingPrice') && <td className="px-4 py-3 text-right text-gray-800 font-medium text-xs whitespace-nowrap">₹{Number(p.sellingPrice).toLocaleString('en-IN')}</td>}
                  {visibleCols.has('availableQty') && <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">0</td>}
                  {visibleCols.has('reorderAlertQty') && <td className="px-4 py-3 text-right text-gray-600 text-xs whitespace-nowrap">{p.reorderAlertQty}</td>}
                  {visibleCols.has('trackingType') && (
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {p.productType === 'wire' ? (
                        <span className="text-gray-500">Drum No.</span>
                      ) : (
                        <span className="text-gray-600">{getTrackingLabel(p)}</span>
                      )}
                    </td>
                  )}
                  {visibleCols.has('status') && (
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'active' ? 'green' : 'gray'} dot size="sm">{p.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                  )}
                  {visibleCols.has('actions') && (
                    <td className="px-4 py-3 w-12 text-center">
                      <button
                        onClick={e => openMenu(e, p.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === p.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const product = products.find(p => p.id === menuId)
        if (!product) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            {canEdit && (
              <button onClick={() => openEdit(product)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
              </button>
            )}
            {canEdit && (
              <button onClick={() => toggleStatus(product)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                {product.status === 'active'
                  ? <><XCircle size={13} className="text-red-400 shrink-0" /> Deactivate</>
                  : <><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Activate</>}
              </button>
            )}
          </div>
        )
      })()}

      <AddEditProductModal isOpen={modalOpen} onClose={closeModal} editing={editing} />
    </div>
  )
}
