// Asset Model master store — module-level pub/sub pattern (mirrors
// productStore.js). Backs Inventory's Asset Master catalog (Configuration):
// a library of predefined asset templates (Category + Type + identifying
// fields + default per-field values) that Phase 2 will let Asset Purchase
// Orders pick from instead of re-entering every dynamic field from scratch.
// This phase only defines the catalog itself — nothing here is wired into
// AddAsset.jsx or the PO/GRN flow yet.

import { logAudit } from './auditLogStore'
import { getFieldsForType, getAssetType, BRAND_MODEL_FIELD_KEYS } from './assetTaxonomy'

let _assetModels = []
// No seed data yet — the catalog starts empty; ids are still assigned
// sequentially from 1 the same way productStore.js's _nextSeq is.
let _nextSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._assetModels])) }

export function getAssetModels() { return _assetModels }
export function getAssetModel(id) { return _assetModels.find(m => m.id === id) ?? null }

// Non-consuming — safe to call on every render while the Add Asset Model
// modal is open, mirrors productStore.js's previewNextProductId(). Doesn't
// advance _nextSeq itself; saveAssetModel() is the only thing that does
// that, at actual save time.
export function previewNextAssetModelId() {
  return `AST-MDL-${String(_nextSeq).padStart(3, '0')}`
}

export function subscribeAssetModels(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function isAssetModelNameTaken(name, excludeId = null) {
  const q = name.trim().toLowerCase()
  return _assetModels.some(m => m.id !== excludeId && m.name.trim().toLowerCase() === q)
}

// Create or update. Callers pass an `id` to update an existing asset model;
// omitting it (new model) assigns the next AST-MDL-### sequence id.
export function saveAssetModel(model) {
  const isNew = !(model.id && _assetModels.find(m => m.id === model.id))
  let saved
  if (!isNew) {
    _assetModels = _assetModels.map(m => m.id === model.id ? { ...m, ...model } : m)
    saved = _assetModels.find(m => m.id === model.id)
  } else {
    const id = `AST-MDL-${String(_nextSeq++).padStart(3, '0')}`
    saved = { ...model, id, status: model.status ?? 'active' }
    _assetModels = [..._assetModels, saved]
  }
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Inventory',
    details: `${isNew ? 'Added' : 'Updated'} asset model ${saved.name} (${saved.id})`,
  })
  return saved
}

// Resolves one Asset Master model into a { fieldKey: value } object of
// starting values for every template-scoped field its own Category/Type
// combination defines (assetTaxonomy.js's getFieldsForType()) — the single
// place this resolution logic lives, used by CreatePurchase.jsx's GRN
// receipt step to pre-fill a unit's spec fields (RAM, Processor, Brand
// Name, Model Name, etc.) whenever that PO line was raised from a saved
// model. Priority per field: the model's own saved default (fieldDefaults)
// first; then, for the Brand/Model fields Asset Master's own Add/Edit modal
// asks about separately rather than folding into fieldDefaults (see
// BRAND_MODEL_FIELD_KEYS), the model's own top-level brand/model; then an
// autofillFromAssetType field's own type label. Instance-scoped fields
// (Serial Number, every date field, Vendor, Asset Name) are skipped
// entirely — a saved template can never supply a value that's inherently
// unique per physical unit or per purchase, so those stay blank for
// whoever's filling that field in to enter fresh.
export function resolveAssetModelTemplateFields(model) {
  if (!model) return {}
  const defs = getFieldsForType(model.categoryId, model.typeId)
  const type = getAssetType(model.categoryId, model.typeId)
  const fields = {}
  defs.forEach(f => {
    if ((f.scope ?? 'template') === 'instance') return
    if (model.fieldDefaults && model.fieldDefaults[f.key] !== undefined) {
      fields[f.key] = model.fieldDefaults[f.key]
    } else if (BRAND_MODEL_FIELD_KEYS.includes(f.key)) {
      fields[f.key] = f.key === 'modelName' ? (model.model || '') : (model.brand || '')
    } else if (f.autofillFromAssetType) {
      fields[f.key] = type?.label
    }
  })
  return fields
}

// Asset models are never hard-deleted once an Asset PO could reference them
// (same BR as Products) — this status toggle is the only delete-adjacent
// action exposed anywhere in the UI.
export function setAssetModelStatus(id, status) {
  _assetModels = _assetModels.map(m => m.id === id ? { ...m, status } : m)
  notify()
  const model = getAssetModel(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} asset model ${model?.name ?? id}` })
}
