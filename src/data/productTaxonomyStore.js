// Product Taxonomy master store — module-level pub/sub pattern (mirrors
// assetModelStore.js/productStore.js). Backs Inventory's Product Taxonomy
// (Configuration): a 3-level admin-configurable classification — Category ->
// Subcategory -> Specification (e.g. ONT -> Dual Band -> GPON) — that a
// later phase will wire the Add Product form's dropdowns to read from
// instead of a free-text Product Name. This phase only builds the taxonomy
// master itself; productStore.js and the Add/Edit Product form are untouched.

import { logAudit } from './auditLogStore'

// Seeded so /inventory/product-taxonomy isn't empty on first load.
const CATEGORY_SEED = [
  { id: 'PTAX-CAT-001', label: 'ONT', status: 'active' },
  { id: 'PTAX-CAT-002', label: 'Router', status: 'active' },
  { id: 'PTAX-CAT-003', label: 'Cable', status: 'active' },
]

const SUBCATEGORY_SEED = [
  { id: 'PTAX-SUB-001', categoryId: 'PTAX-CAT-001', label: 'Dual Band', status: 'active' },
  { id: 'PTAX-SUB-002', categoryId: 'PTAX-CAT-001', label: 'Single Band', status: 'active' },
  { id: 'PTAX-SUB-003', categoryId: 'PTAX-CAT-002', label: 'WiFi 6', status: 'active' },
  { id: 'PTAX-SUB-004', categoryId: 'PTAX-CAT-003', label: 'Fiber', status: 'active' },
]

const SPECIFICATION_SEED = [
  { id: 'PTAX-SPEC-001', subcategoryId: 'PTAX-SUB-001', label: 'GPON', status: 'active' },
  { id: 'PTAX-SPEC-002', subcategoryId: 'PTAX-SUB-001', label: 'EPON', status: 'active' },
  { id: 'PTAX-SPEC-003', subcategoryId: 'PTAX-SUB-002', label: 'GPON', status: 'active' },
  { id: 'PTAX-SPEC-004', subcategoryId: 'PTAX-SUB-002', label: 'EPON', status: 'active' },
  { id: 'PTAX-SPEC-005', subcategoryId: 'PTAX-SUB-003', label: 'Dual Band', status: 'active' },
  { id: 'PTAX-SPEC-006', subcategoryId: 'PTAX-SUB-003', label: 'Tri Band', status: 'active' },
  { id: 'PTAX-SPEC-007', subcategoryId: 'PTAX-SUB-004', label: 'Single Mode', status: 'active' },
  { id: 'PTAX-SPEC-008', subcategoryId: 'PTAX-SUB-004', label: 'Multi Mode', status: 'active' },
]

let _categories = [...CATEGORY_SEED]
let _subcategories = [...SUBCATEGORY_SEED]
let _specifications = [...SPECIFICATION_SEED]

// Independent sequences per level, continuing after the highest seeded
// suffix — same convention productStore.js/assetModelStore.js use.
let _nextCategorySeq = CATEGORY_SEED.length + 1
let _nextSubcategorySeq = SUBCATEGORY_SEED.length + 1
let _nextSpecificationSeq = SPECIFICATION_SEED.length + 1

const _listeners = []

// One combined notification for all three levels — every mutation here
// touches this tree as a whole (adding a Subcategory changes what a
// Category's own child count shows, for instance), so callers subscribe
// once and re-read whichever getter(s) they need rather than juggling
// three separate subscriptions.
function notify() {
  _listeners.forEach(fn => fn())
}

export function subscribeProductTaxonomy(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// ── Categories ──────────────────────────────────────────────────────────────

export function getCategories() { return _categories }
export function getCategory(id) { return _categories.find(c => c.id === id) ?? null }

export function isCategoryLabelTaken(label, excludeId = null) {
  const q = label.trim().toLowerCase()
  return _categories.some(c => c.id !== excludeId && c.label.trim().toLowerCase() === q)
}

export function addCategory(label) {
  const trimmed = label.trim()
  const id = `PTAX-CAT-${String(_nextCategorySeq++).padStart(3, '0')}`
  const category = { id, label: trimmed, status: 'active' }
  _categories = [..._categories, category]
  notify()
  logAudit({ action: 'Create', module: 'Inventory', details: `Added product taxonomy category ${trimmed} (${id})` })
  return category
}

export function editCategory(id, label) {
  const trimmed = label.trim()
  _categories = _categories.map(c => c.id === id ? { ...c, label: trimmed } : c)
  notify()
  logAudit({ action: 'Edit', module: 'Inventory', details: `Renamed product taxonomy category ${id} to ${trimmed}` })
}

export function setCategoryStatus(id, status) {
  _categories = _categories.map(c => c.id === id ? { ...c, status } : c)
  notify()
  const category = getCategory(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} product taxonomy category ${category?.label ?? id}` })
}

// ── Subcategories ───────────────────────────────────────────────────────────

export function getSubcategories(categoryId) {
  return _subcategories.filter(s => s.categoryId === categoryId)
}
export function getSubcategory(id) { return _subcategories.find(s => s.id === id) ?? null }

export function isSubcategoryLabelTaken(categoryId, label, excludeId = null) {
  const q = label.trim().toLowerCase()
  return _subcategories.some(s => s.id !== excludeId && s.categoryId === categoryId && s.label.trim().toLowerCase() === q)
}

export function addSubcategory(categoryId, label) {
  const trimmed = label.trim()
  const id = `PTAX-SUB-${String(_nextSubcategorySeq++).padStart(3, '0')}`
  const subcategory = { id, categoryId, label: trimmed, status: 'active' }
  _subcategories = [..._subcategories, subcategory]
  notify()
  const category = getCategory(categoryId)
  logAudit({ action: 'Create', module: 'Inventory', details: `Added product taxonomy subcategory ${trimmed} (${id}) under ${category?.label ?? categoryId}` })
  return subcategory
}

export function editSubcategory(id, label) {
  const trimmed = label.trim()
  _subcategories = _subcategories.map(s => s.id === id ? { ...s, label: trimmed } : s)
  notify()
  logAudit({ action: 'Edit', module: 'Inventory', details: `Renamed product taxonomy subcategory ${id} to ${trimmed}` })
}

export function setSubcategoryStatus(id, status) {
  _subcategories = _subcategories.map(s => s.id === id ? { ...s, status } : s)
  notify()
  const subcategory = getSubcategory(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} product taxonomy subcategory ${subcategory?.label ?? id}` })
}

// ── Specifications ──────────────────────────────────────────────────────────

export function getSpecifications(subcategoryId) {
  return _specifications.filter(s => s.subcategoryId === subcategoryId)
}
export function getSpecification(id) { return _specifications.find(s => s.id === id) ?? null }

export function isSpecificationLabelTaken(subcategoryId, label, excludeId = null) {
  const q = label.trim().toLowerCase()
  return _specifications.some(s => s.id !== excludeId && s.subcategoryId === subcategoryId && s.label.trim().toLowerCase() === q)
}

export function addSpecification(subcategoryId, label) {
  const trimmed = label.trim()
  const id = `PTAX-SPEC-${String(_nextSpecificationSeq++).padStart(3, '0')}`
  const specification = { id, subcategoryId, label: trimmed, status: 'active' }
  _specifications = [..._specifications, specification]
  notify()
  const subcategory = getSubcategory(subcategoryId)
  logAudit({ action: 'Create', module: 'Inventory', details: `Added product taxonomy specification ${trimmed} (${id}) under ${subcategory?.label ?? subcategoryId}` })
  return specification
}

export function editSpecification(id, label) {
  const trimmed = label.trim()
  _specifications = _specifications.map(s => s.id === id ? { ...s, label: trimmed } : s)
  notify()
  logAudit({ action: 'Edit', module: 'Inventory', details: `Renamed product taxonomy specification ${id} to ${trimmed}` })
}

export function setSpecificationStatus(id, status) {
  _specifications = _specifications.map(s => s.id === id ? { ...s, status } : s)
  notify()
  const specification = getSpecification(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} product taxonomy specification ${specification?.label ?? id}` })
}
