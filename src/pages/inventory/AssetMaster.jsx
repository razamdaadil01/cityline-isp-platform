import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, MoreVertical, Edit2,
  CheckCircle2, XCircle, LayoutTemplate,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { FormField, Input, Select } from '../../components/ui/FormInputs'
import {
  getAssetModels, subscribeAssetModels, saveAssetModel, setAssetModelStatus,
  isAssetModelNameTaken, previewNextAssetModelId,
} from '../../data/assetModelStore'
import { ASSET_CATEGORIES, getAssetCategory, getAssetType, getFieldsForType } from '../../data/assetTaxonomy'
import { AssetDetailFields } from '../assets/AddAsset'
import { getVendors } from '../../data/vendorStore'

function emptyForm() {
  return { categoryId: '', typeId: '', name: '', brand: '', model: '', defaultPrice: '', fieldDefaults: {} }
}

function modelToForm(model) {
  return {
    categoryId: model.categoryId, typeId: model.typeId,
    name: model.name, brand: model.brand || '', model: model.model || '',
    defaultPrice: String(model.defaultPrice ?? ''),
    fieldDefaults: { ...model.fieldDefaults },
  }
}

// ── Add / Edit Asset Model modal ────────────────────────────────────────────
// Step 1 (Category → dependent Type) mirrors the same UX AddAsset.jsx's own
// LineItemCard uses when raising an Asset Purchase Order; Step 2 reuses that
// same file's exported AssetDetailFields component to render the exact
// dynamic-field set assetTaxonomy.js defines for the chosen Category/Type,
// here edited as this template's default values rather than a real asset's
// actual values. Category/Type lock once editing, same as Product's own
// productType lock in ProductList.jsx.
function AddEditAssetModelModal({ isOpen, onClose, editing }) {
  const vendors = useMemo(() => getVendors().filter(v => v.status === 'active'), [])
  const assetModelId = editing ? editing.id : previewNextAssetModelId()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setForm(editing ? modelToForm(editing) : emptyForm())
    setErrors({})
  }, [isOpen, editing])

  const category = form.categoryId ? getAssetCategory(form.categoryId) : null
  const type = category && form.typeId ? getAssetType(form.categoryId, form.typeId) : null

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function selectCategory(e) {
    setForm(f => ({ ...f, categoryId: e.target.value, typeId: '', fieldDefaults: {} }))
    setErrors(er => ({ ...er, categoryId: undefined, typeId: undefined }))
  }

  // Pre-fills any autofillFromAssetType field (Ladder's "Type", Authority/
  // Access's "Card/Asset Type", Generic Tools' "Category" — see
  // assetTaxonomy.js) with the chosen type's own label, same as AddAsset's
  // LineItemCard does — otherwise that read-only field would have no value
  // to show/carry as a default at all.
  function selectType(e) {
    const nextTypeId = e.target.value
    setErrors(er => ({ ...er, typeId: undefined }))
    if (!nextTypeId) { setForm(f => ({ ...f, typeId: '', fieldDefaults: {} })); return }
    const defs = getFieldsForType(form.categoryId, nextTypeId)
    const autofilled = {}
    defs.forEach(f => {
      if (f.autofillFromAssetType) autofilled[f.key] = category.types.find(t => t.id === nextTypeId)?.label
    })
    setForm(f => ({ ...f, typeId: nextTypeId, fieldDefaults: autofilled }))
  }

  function updateFieldDefault(key, value) {
    setForm(f => ({ ...f, fieldDefaults: { ...f.fieldDefaults, [key]: value } }))
  }

  function validate() {
    const errs = {}
    const excludeId = editing?.id ?? null
    if (!form.categoryId) errs.categoryId = 'Select a category.'
    if (!form.typeId) errs.typeId = 'Select a type.'
    if (!form.name.trim()) errs.name = 'Asset model name is required.'
    else if (isAssetModelNameTaken(form.name.trim(), excludeId))
      errs.name = `"${form.name.trim()}" already exists. Please use a different name.`
    if (form.defaultPrice === '' || Number.isNaN(Number(form.defaultPrice)) || Number(form.defaultPrice) < 0)
      errs.defaultPrice = 'Enter a valid default price.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveAssetModel({
      id: editing?.id,
      categoryId: form.categoryId,
      typeId: form.typeId,
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      defaultPrice: Number(form.defaultPrice),
      fieldDefaults: form.fieldDefaults,
      status: editing?.status ?? 'active',
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex flex-col gap-0.5">
          <span>{editing ? 'Edit Asset Model' : 'Add Asset Model'}</span>
          <span className="text-xs font-normal text-gray-500">
            Asset Model ID: <span className="font-mono font-semibold text-brand-blue">{assetModelId}</span>
          </span>
        </span>
      }
      size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Asset Model'}</Button>
      </>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category" required error={errors.categoryId}>
            <Select value={form.categoryId} onChange={selectCategory} disabled={!!editing}>
              <option value="">Select category…</option>
              {ASSET_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Type" required error={errors.typeId}>
            <Select value={form.typeId} onChange={selectType} disabled={!!editing || !category}>
              <option value="">{category ? 'Select type…' : 'Select a category first'}</option>
              {category?.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border">
          <FormField label="Name" required error={errors.name}>
            <Input placeholder="e.g. Fujikura 90S+ Splicing Machine" value={form.name} onChange={e => setField('name', e.target.value)} />
          </FormField>
          <FormField label="Default Price" required error={errors.defaultPrice}>
            <Input type="number" min="0" placeholder="0.00" value={form.defaultPrice} onChange={e => setField('defaultPrice', e.target.value)} />
          </FormField>
          <FormField label="Brand">
            <Input placeholder="e.g. Fujikura" value={form.brand} onChange={e => setField('brand', e.target.value)} />
          </FormField>
          <FormField label="Model">
            <Input placeholder="e.g. 90S+" value={form.model} onChange={e => setField('model', e.target.value)} />
          </FormField>
        </div>

        {type ? (
          <div className="pt-4 border-t border-surface-border">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Default Field Values</p>
            <AssetDetailFields
              categoryId={form.categoryId} typeId={form.typeId} fields={form.fieldDefaults}
              onChange={updateFieldDefault} showErrors={false} vendors={vendors}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed border-surface-border rounded-lg bg-gray-50/60">
            <p className="text-sm text-gray-400">Select a category and type to configure this template's default field values.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Filter drawer ────────────────────────────────────────────────────────────

function FilterDrawer({ open, onClose, draft, setDraftField, onApply, onReset, activeCount }) {
  const category = draft.categoryId ? getAssetCategory(draft.categoryId) : null
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
            <div className="relative">
              <select
                value={draft.categoryId}
                onChange={e => setDraftField('categoryId', e.target.value)}
                className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer"
              >
                <option value="">All</option>
                {ASSET_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</label>
            <div className="relative">
              <select
                value={draft.typeId}
                onChange={e => setDraftField('typeId', e.target.value)}
                disabled={!category}
                className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="">{category ? 'All' : 'Select a category first'}</option>
                {category?.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
            <div className="flex gap-4">
              {['', 'active', 'inactive'].map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="draft-am-status" value={v} checked={draft.status === v}
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

export default function AssetMaster() {
  const [models, setModels] = useState(getAssetModels)
  useEffect(() => subscribeAssetModels(setModels), [])

  const [search, setSearch] = useState('')

  // Add/Edit modal is deep-linkable via ?modal=add or ?modal=edit&id=<assetModelId>,
  // same ?modal= convention as ProductList.jsx — merged with any other existing
  // params rather than clobbering them, push to open/switch, replace to close.
  const [searchParams, setSearchParams] = useSearchParams()
  const modalParam = searchParams.get('modal')
  const editIdParam = searchParams.get('id')
  const editing = modalParam === 'edit' ? models.find(m => m.id === editIdParam) ?? null : null
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

  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const EMPTY_DRAFT = { categoryId: '', typeId: '', status: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ categoryId: filterCategoryId, typeId: filterTypeId, status: filterStatus })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterCategoryId(draft.categoryId)
    setFilterTypeId(draft.typeId)
    setFilterStatus(draft.status)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  function setDraftField(k, v) {
    // Picking a new Category clears any Type already drafted from the
    // previous category — same dependent-dropdown reset AddAsset's own
    // Category/Type selection uses.
    setDraft(prev => k === 'categoryId' ? { ...prev, categoryId: v, typeId: '' } : { ...prev, [k]: v })
  }

  function clearAllFilters() {
    setFilterCategoryId(''); setFilterTypeId(''); setFilterStatus('')
  }

  const activeFiltersCount = [filterCategoryId, filterTypeId, filterStatus].filter(Boolean).length

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return models.filter(m => {
      if (q && !m.name.toLowerCase().includes(q) && !(m.brand || '').toLowerCase().includes(q) && !(m.model || '').toLowerCase().includes(q)) return false
      if (filterCategoryId && m.categoryId !== filterCategoryId) return false
      if (filterTypeId && m.typeId !== filterTypeId) return false
      if (filterStatus && m.status !== filterStatus) return false
      return true
    })
  }, [models, search, filterCategoryId, filterTypeId, filterStatus])

  function openAdd() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'add')
      next.delete('id')
      return next
    })
  }
  function openEdit(model) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'edit')
      next.set('id', model.id)
      return next
    })
    setMenuId(null)
  }
  function closeModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      next.delete('id')
      return next
    }, { replace: true })
  }
  function toggleStatus(model) {
    setAssetModelStatus(model.id, model.status === 'active' ? 'inactive' : 'active')
    setMenuId(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {models.length} asset models</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Asset Model</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, brand, model…"
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
        activeCount={activeFiltersCount}
      />

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset Model ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[200px]">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Model</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Default Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    <LayoutTemplate size={32} className="mx-auto mb-2 text-gray-200" />
                    No asset models found
                  </td>
                </tr>
              ) : filtered.map(m => {
                const category = getAssetCategory(m.categoryId)
                const type = getAssetType(m.categoryId, m.typeId)
                return (
                  <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{m.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{m.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{category?.label ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{type?.label ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{m.brand || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{m.model || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-800 font-medium text-xs whitespace-nowrap">₹{Number(m.defaultPrice).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.status === 'active' ? 'green' : 'gray'} dot size="sm">{m.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3 w-12 text-center">
                      <button
                        onClick={e => openMenu(e, m.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === m.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const model = models.find(m => m.id === menuId)
        if (!model) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button onClick={() => openEdit(model)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button onClick={() => toggleStatus(model)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              {model.status === 'active'
                ? <><XCircle size={13} className="text-red-400 shrink-0" /> Deactivate</>
                : <><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Activate</>}
            </button>
          </div>
        )
      })()}

      <AddEditAssetModelModal isOpen={modalOpen} onClose={closeModal} editing={editing} />
    </div>
  )
}
