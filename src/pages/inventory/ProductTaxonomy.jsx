import { useState, useEffect, useRef } from 'react'
import {
  Plus, ChevronRight, ChevronDown, MoreVertical, Edit2, CheckCircle2, XCircle, ListTree,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { FormField, Input } from '../../components/ui/FormInputs'
import {
  getCategories, getSubcategories, getSpecifications,
  getCategory, getSubcategory, getSpecification,
  addCategory, addSubcategory, addSpecification,
  editCategory, editSubcategory, editSpecification,
  setCategoryStatus, setSubcategoryStatus, setSpecificationStatus,
  isCategoryLabelTaken, isSubcategoryLabelTaken, isSpecificationLabelTaken,
  subscribeProductTaxonomy,
} from '../../data/productTaxonomyStore'

// Every entry's isLabelTaken is normalized to the same (label, parentId,
// excludeId) call shape for AddEditLabelModal below, even though the
// underlying store functions don't all take their args in that order
// (isCategoryLabelTaken has no parent scope at all; isSubcategoryLabelTaken/
// isSpecificationLabelTaken take their parent id before the label).
const LEVEL_CONFIG = {
  category: { title: 'Category', getRecord: getCategory, isLabelTaken: (label, parentId, excludeId) => isCategoryLabelTaken(label, excludeId) },
  subcategory: { title: 'Subcategory', getRecord: getSubcategory, isLabelTaken: (label, parentId, excludeId) => isSubcategoryLabelTaken(parentId, label, excludeId) },
  specification: { title: 'Specification', getRecord: getSpecification, isLabelTaken: (label, parentId, excludeId) => isSpecificationLabelTaken(parentId, label, excludeId) },
}

// ── Add / Edit / Rename modal — one small generic modal reused for all
// three levels, parameterized by `level` rather than three near-identical
// modals, since every level only ever collects a single label field. ────────
function AddEditLabelModal({ isOpen, onClose, level, mode, parentId, editing, onSubmit }) {
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setLabel(mode === 'edit' ? editing?.label ?? '' : '')
      setError('')
    }
  }, [isOpen, mode, editing])

  if (!isOpen) return null
  const config = LEVEL_CONFIG[level]

  function handleSave() {
    const trimmed = label.trim()
    if (!trimmed) { setError(`${config.title} name is required.`); return }
    const excludeId = mode === 'edit' ? editing.id : null
    if (config.isLabelTaken(trimmed, parentId, excludeId)) {
      setError(`"${trimmed}" already exists here. Please use a different name.`)
      return
    }
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="sm"
      title={mode === 'edit' ? `Rename ${config.title}` : `Add ${config.title}`}
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleSave}>{mode === 'edit' ? 'Save Changes' : `Add ${config.title}`}</Button>
      </>}
    >
      <FormField label={`${config.title} Name`} required error={error}>
        <Input autoFocus value={label} onChange={e => { setLabel(e.target.value); setError('') }} placeholder={`e.g. ${level === 'category' ? 'ONT' : level === 'subcategory' ? 'Dual Band' : 'GPON'}`} />
      </FormField>
    </Modal>
  )
}

// ── Shared row-action menu (Edit / Activate / Deactivate) ───────────────────
function RowMenu({ menu, menuRef, onEdit, onToggleStatus }) {
  if (!menu) return null
  const record = LEVEL_CONFIG[menu.level].getRecord(menu.id)
  if (!record) return null
  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: menu.top, right: menu.right, zIndex: 9999 }}
      className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-40"
    >
      <button onClick={() => onEdit(record)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Edit2 size={13} className="text-gray-400 shrink-0" /> Rename
      </button>
      <button onClick={() => onToggleStatus(record)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        {record.status === 'active'
          ? <><XCircle size={13} className="text-red-400 shrink-0" /> Deactivate</>
          : <><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Activate</>}
      </button>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'active') return null
  return <Badge variant="gray" size="sm">Inactive</Badge>
}

// ── Main page ─────────────────────────────────────────────────────────────────
// Tree-style Category -> Subcategory -> Specification management screen.
// Inactive rows at every level stay visible here (grayed out + Inactive
// badge) — only Phase 2's Add Product dropdowns will need to filter them
// out; this management screen intentionally shows everything so nothing
// gets hidden from whoever's configuring the taxonomy.
export default function ProductTaxonomy() {
  // productTaxonomyStore's notify() carries no payload (three independent
  // collections change together, unlike the single-array stores elsewhere
  // in this codebase) — this tick just forces a re-render so the getters
  // below are re-read fresh on every store mutation.
  const [, setTick] = useState(0)
  useEffect(() => subscribeProductTaxonomy(() => setTick(t => t + 1)), [])

  const categories = getCategories()

  const [expandedCategories, setExpandedCategories] = useState(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set())

  function toggleCategory(id) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleSubcategory(id) {
    setExpandedSubcategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const [menu, setMenu] = useState(null) // { level, id, top, right }
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menu) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menu])

  function openMenu(e, level, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({ level, id, top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  const [modalState, setModalState] = useState(null) // { level, mode, parentId, editing }

  function openAdd(level, parentId = null) {
    setModalState({ level, mode: 'add', parentId, editing: null })
    setMenu(null)
  }
  function openEdit(level, record, parentId = null) {
    setModalState({ level, mode: 'edit', parentId, editing: record })
    setMenu(null)
  }
  function closeModal() { setModalState(null) }

  function handleModalSubmit(label) {
    const { level, mode, parentId, editing } = modalState
    if (level === 'category') {
      mode === 'add' ? addCategory(label) : editCategory(editing.id, label)
    } else if (level === 'subcategory') {
      mode === 'add' ? addSubcategory(parentId, label) : editSubcategory(editing.id, label)
    } else {
      mode === 'add' ? addSpecification(parentId, label) : editSpecification(editing.id, label)
    }
  }

  function toggleStatus(level, record) {
    const next = record.status === 'active' ? 'inactive' : 'active'
    if (level === 'category') setCategoryStatus(record.id, next)
    else if (level === 'subcategory') setSubcategoryStatus(record.id, next)
    else setSpecificationStatus(record.id, next)
    setMenu(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Taxonomy</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Category → Subcategory → Specification — the structured classification new products will use instead of a free-text name.
          </p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => openAdd('category')}>Add Category</Button>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        {categories.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm text-gray-400">
            <ListTree size={32} className="mx-auto mb-2 text-gray-200" />
            No categories yet — add one to get started.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {categories.map(category => {
              const subcategories = getSubcategories(category.id)
              const catExpanded = expandedCategories.has(category.id)
              const catInactive = category.status !== 'active'
              return (
                <div key={category.id}>
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                    >
                      {catExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    <span className={`text-sm font-semibold ${catInactive ? 'text-gray-400' : 'text-gray-800'}`}>{category.label}</span>
                    <span className="text-xs text-gray-400">
                      ({subcategories.length} subcategor{subcategories.length === 1 ? 'y' : 'ies'})
                    </span>
                    <StatusBadge status={category.status} />
                    <div className="flex-1" />
                    <Button variant="secondary" size="xs" icon={<Plus size={12} />} onClick={() => openAdd('subcategory', category.id)}>
                      Add Subcategory
                    </Button>
                    <button
                      onClick={e => openMenu(e, 'category', category.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 ${menu?.level === 'category' && menu.id === category.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  {catExpanded && (
                    <div className="pl-9 pr-4 pb-2.5 bg-gray-50/50 border-t border-surface-border/60">
                      {subcategories.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3">No subcategories yet — add one above.</p>
                      ) : (
                        <div className="divide-y divide-surface-border/70">
                          {subcategories.map(subcategory => {
                            const specifications = getSpecifications(subcategory.id)
                            const subExpanded = expandedSubcategories.has(subcategory.id)
                            const subInactive = subcategory.status !== 'active'
                            return (
                              <div key={subcategory.id}>
                                <div className="flex items-center gap-2.5 py-2.5">
                                  <button
                                    onClick={() => toggleSubcategory(subcategory.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                                  >
                                    {subExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  <span className={`text-sm font-medium ${subInactive ? 'text-gray-400' : 'text-gray-700'}`}>{subcategory.label}</span>
                                  <span className="text-xs text-gray-400">
                                    ({specifications.length} specification{specifications.length === 1 ? '' : 's'})
                                  </span>
                                  <StatusBadge status={subcategory.status} />
                                  <div className="flex-1" />
                                  <Button variant="secondary" size="xs" icon={<Plus size={12} />} onClick={() => openAdd('specification', subcategory.id)}>
                                    Add Specification
                                  </Button>
                                  <button
                                    onClick={e => openMenu(e, 'subcategory', subcategory.id)}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 ${menu?.level === 'subcategory' && menu.id === subcategory.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                </div>

                                {subExpanded && (
                                  <div className="pl-8 pb-2">
                                    {specifications.length === 0 ? (
                                      <p className="text-xs text-gray-400 py-2">No specifications yet — add one above.</p>
                                    ) : (
                                      <div className="space-y-1">
                                        {specifications.map(spec => {
                                          const specInactive = spec.status !== 'active'
                                          return (
                                            <div key={spec.id} className="flex items-center gap-2.5 py-1.5">
                                              <span className={`text-xs ${specInactive ? 'text-gray-400' : 'text-gray-600'}`}>{spec.label}</span>
                                              <StatusBadge status={spec.status} />
                                              <div className="flex-1" />
                                              <button
                                                onClick={e => openMenu(e, 'specification', spec.id)}
                                                className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors shrink-0 ${menu?.level === 'specification' && menu.id === spec.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                              >
                                                <MoreVertical size={13} />
                                              </button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RowMenu
        menu={menu} menuRef={menuRef}
        onEdit={record => {
          const parentId = menu.level === 'subcategory' ? record.categoryId : menu.level === 'specification' ? record.subcategoryId : null
          openEdit(menu.level, record, parentId)
        }}
        onToggleStatus={record => toggleStatus(menu.level, record)}
      />

      {modalState && (
        <AddEditLabelModal
          isOpen={!!modalState}
          onClose={closeModal}
          level={modalState.level}
          mode={modalState.mode}
          parentId={modalState.parentId}
          editing={modalState.editing}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  )
}
