// Product Taxonomy master store — module-level pub/sub pattern (mirrors
// assetModelStore.js/productStore.js). Backs Inventory's Product Taxonomy
// (Configuration): a 3-level admin-configurable classification — Category ->
// Subcategory -> Specification (e.g. ONT -> Dual Band -> GPON). One shared
// tree, not scoped per product type — ProductList.jsx's Add/Edit Product
// modal wires both its Hardware and Wire tabs' Category/Subcategory/
// Specification dropdowns to these same getters.

import { logAudit } from './auditLogStore'

// Seeded so /inventory/product-taxonomy isn't empty on first load.
// 'Network Accessories' and 'Splicing & Termination' were added to
// retroactively classify productStore.js's original legacy catalog
// (Wall Mount Bracket, POE Switch, Patch Cord, Optical Splitter, SFP
// Module, Coupler, FAT Box, PLC Splitter) — none of those are an ONT, a
// Router, or a Cable, so forcing them into the original three would have
// been a bad fit rather than a genuine classification.
const CATEGORY_SEED = [
  { id: 'PTAX-CAT-001', label: 'ONT', status: 'active' },
  { id: 'PTAX-CAT-002', label: 'Router', status: 'active' },
  { id: 'PTAX-CAT-003', label: 'Cable', status: 'active' },
  { id: 'PTAX-CAT-004', label: 'Network Accessories', status: 'active' },
  { id: 'PTAX-CAT-005', label: 'Splicing & Termination', status: 'active' },
]

// 'Drop Wire' (PTAX-SUB-005) is seeded alongside 'Fiber' under the existing
// 'Cable' category rather than under a new top-level category — the Wire
// tab's own seeded products (productStore.js's WIRE_SEED: "4/6 Core Fiber
// Cable", "Drop Wire") are all realistically "Cable" items already; a
// second "Wire" category next to "Cable" would just be a confusing
// near-duplicate. Wire and Hardware share this one taxonomy tree — nothing
// here is tab-scoped — so a Wire product can be classified under any
// Category (e.g. a wire-type accessory sold under 'Router'), same as a
// Hardware product could in principle pick 'Cable' if that ever made sense.
// 'Standard' (PTAX-SUB-006/007) covers the original generic 'ONT Device'/
// 'WiFi Router' catalog entries, which predate the Dual Band/Single Band
// and WiFi 6 subcategories and were never actually that specific — same
// label reused across both Categories (ONT and Router), which is fine
// since subcategory labels are only unique within their own categoryId.
const SUBCATEGORY_SEED = [
  { id: 'PTAX-SUB-001', categoryId: 'PTAX-CAT-001', label: 'Dual Band', status: 'active' },
  { id: 'PTAX-SUB-002', categoryId: 'PTAX-CAT-001', label: 'Single Band', status: 'active' },
  { id: 'PTAX-SUB-003', categoryId: 'PTAX-CAT-002', label: 'WiFi 6', status: 'active' },
  { id: 'PTAX-SUB-004', categoryId: 'PTAX-CAT-003', label: 'Fiber', status: 'active' },
  { id: 'PTAX-SUB-005', categoryId: 'PTAX-CAT-003', label: 'Drop Wire', status: 'active' },
  { id: 'PTAX-SUB-006', categoryId: 'PTAX-CAT-001', label: 'Standard', status: 'active' },
  { id: 'PTAX-SUB-007', categoryId: 'PTAX-CAT-002', label: 'Standard', status: 'active' },
  { id: 'PTAX-SUB-008', categoryId: 'PTAX-CAT-003', label: 'Conduit', status: 'active' },
  { id: 'PTAX-SUB-009', categoryId: 'PTAX-CAT-004', label: 'Mounting Hardware', status: 'active' },
  { id: 'PTAX-SUB-010', categoryId: 'PTAX-CAT-004', label: 'Networking Equipment', status: 'active' },
  { id: 'PTAX-SUB-011', categoryId: 'PTAX-CAT-004', label: 'Transceivers', status: 'active' },
  { id: 'PTAX-SUB-012', categoryId: 'PTAX-CAT-005', label: 'Patch Cords', status: 'active' },
  { id: 'PTAX-SUB-013', categoryId: 'PTAX-CAT-005', label: 'Optical Splitters', status: 'active' },
  { id: 'PTAX-SUB-014', categoryId: 'PTAX-CAT-005', label: 'Splice Enclosures', status: 'active' },
  { id: 'PTAX-SUB-015', categoryId: 'PTAX-CAT-005', label: 'Couplers & Connectors', status: 'active' },
]

// PTAX-SPEC-011 onward retroactively classify productStore.js's original
// legacy catalog (see CATEGORY_SEED's own note) — each label deliberately
// keeps the distinguishing detail from that product's old free-text name
// (e.g. '16-Port FAT Box', 'LC-LC 5m') rather than a generic placeholder,
// so the generated 3-part name stays as identifiable as the name it
// replaces instead of collapsing into something uselessly generic.
const SPECIFICATION_SEED = [
  { id: 'PTAX-SPEC-001', subcategoryId: 'PTAX-SUB-001', label: 'GPON', status: 'active' },
  { id: 'PTAX-SPEC-002', subcategoryId: 'PTAX-SUB-001', label: 'EPON', status: 'active' },
  { id: 'PTAX-SPEC-003', subcategoryId: 'PTAX-SUB-002', label: 'GPON', status: 'active' },
  { id: 'PTAX-SPEC-004', subcategoryId: 'PTAX-SUB-002', label: 'EPON', status: 'active' },
  { id: 'PTAX-SPEC-005', subcategoryId: 'PTAX-SUB-003', label: 'Dual Band', status: 'active' },
  { id: 'PTAX-SPEC-006', subcategoryId: 'PTAX-SUB-003', label: 'Tri Band', status: 'active' },
  { id: 'PTAX-SPEC-007', subcategoryId: 'PTAX-SUB-004', label: 'Single Mode', status: 'active' },
  { id: 'PTAX-SPEC-008', subcategoryId: 'PTAX-SUB-004', label: 'Multi Mode', status: 'active' },
  { id: 'PTAX-SPEC-009', subcategoryId: 'PTAX-SUB-005', label: 'Single Core', status: 'active' },
  { id: 'PTAX-SPEC-010', subcategoryId: 'PTAX-SUB-005', label: 'Multi Core', status: 'active' },
  { id: 'PTAX-SPEC-011', subcategoryId: 'PTAX-SUB-006', label: 'GPON', status: 'active' },
  { id: 'PTAX-SPEC-012', subcategoryId: 'PTAX-SUB-007', label: 'Dual Band', status: 'active' },
  { id: 'PTAX-SPEC-013', subcategoryId: 'PTAX-SUB-004', label: '4 Core', status: 'active' },
  { id: 'PTAX-SPEC-014', subcategoryId: 'PTAX-SUB-004', label: '6 Core', status: 'active' },
  { id: 'PTAX-SPEC-015', subcategoryId: 'PTAX-SUB-008', label: '40mm PLB HDPE', status: 'active' },
  { id: 'PTAX-SPEC-016', subcategoryId: 'PTAX-SUB-009', label: 'Wall Mount Bracket', status: 'active' },
  { id: 'PTAX-SPEC-017', subcategoryId: 'PTAX-SUB-010', label: 'PoE Switch', status: 'active' },
  { id: 'PTAX-SPEC-018', subcategoryId: 'PTAX-SUB-011', label: 'SFP 1G', status: 'active' },
  { id: 'PTAX-SPEC-019', subcategoryId: 'PTAX-SUB-012', label: 'LC-LC 5m', status: 'active' },
  { id: 'PTAX-SPEC-020', subcategoryId: 'PTAX-SUB-013', label: '1x8 PLC', status: 'active' },
  { id: 'PTAX-SPEC-021', subcategoryId: 'PTAX-SUB-013', label: '1:16 PLC', status: 'active' },
  { id: 'PTAX-SPEC-022', subcategoryId: 'PTAX-SUB-014', label: '16-Port FAT Box', status: 'active' },
  { id: 'PTAX-SPEC-023', subcategoryId: 'PTAX-SUB-015', label: 'Fiber Coupler', status: 'active' },
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
