// Asset Taxonomy — the single source of truth for every Asset Category/Type
// and the field template each type's Add Asset form renders. This is the
// "admin-configurable" surface the Phase 1 brief asks for: adding a new
// category or type, or changing a type's fields, is a pure data edit to the
// arrays below — AddAsset.jsx/AssetDetail.jsx never hardcode a category or
// type name, they only ever iterate ASSET_CATEGORIES and read a type's own
// `fields` array. No admin UI to edit this config exists yet in this phase
// (per the brief); this file IS the config it would eventually write to.
//
// Field shape: { key, label, type, required, recommended, options,
//                appliesToTypes, readOnly, autofillFromAssetType, hint, scope }
//   - `type` drives which input AddAsset.jsx's field renderer shows:
//     'text' | 'number' | 'date' | 'select' | 'vendor-select' |
//     'engineer-select' | 'kit-components' (the one repeatable sub-table).
//   - `required`/`recommended` are mutually informative, not both true at
//     once: `required` blocks Step 3 → Step 4 progression when empty;
//     `recommended` only shows a "(recommended)" hint, same as this app's
//     existing FormField `hint` convention elsewhere — it never blocks.
//   - `appliesToTypes`, when present, restricts a field (or the whole Kit
//     Components section) to only the listed type ids within that category
//     — e.g. Kit Components only shows for 'splicing-machine', not
//     'otdr'/'power-meter', even though all three share the same category.
//     Omitted entirely = applies to every type in the category.
//   - `autofillFromAssetType: true` (paired with `readOnly: true`) marks a
//     field whose value IS the asset type just chosen in Step 2 (e.g.
//     Ladder's own "Type" field, per the brief's explicit note) — the form
//     pre-fills it from the selected type's label and shows it read-only,
//     rather than asking the user to redundantly re-type/re-pick the exact
//     thing they already selected one step earlier. Applied consistently to
//     every category whose field list literally re-asks "what type is
//     this" (Ladder's "Type", Authority/Access's "Card/Asset Type", Generic
//     Tools' "Category") — Ladder is the only one the brief calls out by
//     name, but the same reasoning clearly extends to the other two.
//   - `scope`: 'template' (default, omitted on most fields) | 'instance'.
//     A field defaults to 'template' — it describes the model itself (a
//     spec/attribute true of every unit, e.g. RAM, Processor, Height) and
//     is safe to carry a reusable default value in Asset Master. 'instance'
//     marks a field whose value is inherently unique per physical unit or
//     per purchase transaction: Serial Number; every date field (the
//     "Purchase & Warranty" section AssetDetailFields groups them under:
//     Purchase Date, Warranty Start/End Date, Ladder's Warranty Date,
//     Authority/Access's Valid From/To); Asset Name (a per-unit nickname
//     like "Sales Laptop 02", distinct from Asset Master's own template-
//     identifying "Name" field, e.g. "Fujikura 90S+ Splicing Machine"); and
//     Vendor (which vendor supplied a given unit is a per-purchase/per-PO
//     decision, not a fixed attribute of the model). These can never have a
//     sensible model-wide default, so Asset Master's Add/Edit Asset Model
//     form filters them out of its "Default Field Values" step (via
//     AssetDetailFields' onlyTemplateFields prop). AddAsset.jsx's own wizard
//     and the GRN per-unit receipt step are unaffected — both still render
//     every field regardless of scope, since scope only matters when asking
//     "what's the default for every unit," not when entering one real unit.

export const KIT_COMPONENT_TYPES = [
  'Cleaver', 'Clamping Tool', 'Fiber Cutter', 'Cleaning Kit', 'Carrying Case', 'Battery', 'Charger', 'Other',
]

export const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Damaged']

export const ASSET_CATEGORIES = [
  {
    id: 'it-asset',
    label: 'IT Asset',
    icon: 'Laptop',
    types: [
      { id: 'desktop', label: 'Desktop' },
      { id: 'laptop', label: 'Laptop' },
      { id: 'monitor', label: 'Monitor' },
      { id: 'printer', label: 'Printer' },
    ],
    fields: [
      { key: 'assetName', label: 'Asset Name', type: 'text', required: true, scope: 'instance' },
      { key: 'brandName', label: 'Brand Name', type: 'text', required: true },
      { key: 'modelName', label: 'Model Name', type: 'text', required: true },
      { key: 'storageCapacity', label: 'SSD/Storage Capacity', type: 'text', required: true },
      { key: 'ram', label: 'RAM', type: 'text', required: false, recommended: true },
      { key: 'processor', label: 'Processor', type: 'text', required: false },
      { key: 'serialNumber', label: 'Serial Number', type: 'text', required: true, scope: 'instance' },
      { key: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true, scope: 'instance' },
      { key: 'warrantyStartDate', label: 'Warranty Start Date', type: 'date', required: true, scope: 'instance' },
      { key: 'warrantyEndDate', label: 'Warranty End Date', type: 'date', required: true, scope: 'instance' },
      { key: 'vendorId', label: 'Vendor', type: 'vendor-select', required: true, scope: 'instance' },
    ],
  },
  {
    id: 'field-splicing-tools',
    label: 'Field & Splicing Tools',
    icon: 'Cable',
    types: [
      { id: 'splicing-machine', label: 'Splicing Machine' },
      { id: 'otdr', label: 'OTDR' },
      { id: 'power-meter', label: 'Power Meter' },
    ],
    // "Same purchase/warranty/vendor fields as above" (IT Asset) minus the
    // computer-specific ones (Storage/RAM/Processor don't apply to a
    // splicing machine/OTDR/power meter) — Asset Name/Brand/Model/Serial
    // are kept since a tool still needs to be identifiable the same way.
    fields: [
      { key: 'assetName', label: 'Asset Name', type: 'text', required: true, scope: 'instance' },
      { key: 'brandName', label: 'Brand Name', type: 'text', required: true },
      { key: 'modelName', label: 'Model Name', type: 'text', required: true },
      { key: 'serialNumber', label: 'Serial Number', type: 'text', required: true, scope: 'instance' },
      { key: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true, scope: 'instance' },
      { key: 'warrantyStartDate', label: 'Warranty Start Date', type: 'date', required: true, scope: 'instance' },
      { key: 'warrantyEndDate', label: 'Warranty End Date', type: 'date', required: true, scope: 'instance' },
      { key: 'vendorId', label: 'Vendor', type: 'vendor-select', required: true, scope: 'instance' },
      // Splicing-Machine-only repeatable sub-table.
      { key: 'kitComponents', label: 'Kit Components', type: 'kit-components', required: false, appliesToTypes: ['splicing-machine'] },
    ],
  },
  {
    id: 'ladder',
    label: 'Ladder',
    icon: 'Ruler',
    types: [
      { id: 'aluminium-ladder', label: 'Aluminium Ladder' },
      { id: 'frp-ladder', label: 'FRP Ladder' },
      { id: 'extension-ladder', label: 'Extension Ladder' },
    ],
    fields: [
      { key: 'ladderName', label: 'Ladder Name', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'text', required: true, readOnly: true, autofillFromAssetType: true },
      { key: 'height', label: 'Height', type: 'text', required: true },
      { key: 'maxLoadCapacity', label: 'Max Load Capacity', type: 'text', required: false },
      { key: 'brand', label: 'Brand', type: 'text', required: true },
      { key: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true, scope: 'instance' },
      { key: 'warrantyDate', label: 'Warranty Date', type: 'date', required: false, scope: 'instance' },
    ],
  },
  {
    id: 'authority-access',
    label: 'Authority/Access',
    icon: 'IdCard',
    types: [
      { id: 'id-card', label: 'ID Card' },
      { id: 'access-card', label: 'Access Card' },
      { id: 'safety-gear', label: 'Safety Gear' },
    ],
    fields: [
      { key: 'cardAssetType', label: 'Card/Asset Type', type: 'text', required: true, readOnly: true, autofillFromAssetType: true },
      { key: 'cardIdNumber', label: 'Card/ID Number', type: 'text', required: true },
      { key: 'issuedTo', label: 'Issued To', type: 'engineer-select', required: true },
      { key: 'validFrom', label: 'Valid From', type: 'date', required: true, scope: 'instance' },
      { key: 'validTo', label: 'Valid To', type: 'date', required: true, scope: 'instance' },
    ],
  },
  {
    id: 'generic-tools',
    label: 'Generic Tools',
    icon: 'Wrench',
    types: [
      { id: 'plier-set', label: 'Plier Set' },
      { id: 'crimping-tool', label: 'Crimping Tool' },
      { id: 'tester', label: 'Tester' },
      { id: 'drill-machine', label: 'Drill Machine' },
    ],
    fields: [
      { key: 'toolName', label: 'Tool Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true, readOnly: true, autofillFromAssetType: true },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'serialNumber', label: 'Serial Number', type: 'text', required: false, scope: 'instance' },
      { key: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true, scope: 'instance' },
    ],
  },
]

export function getAssetCategory(categoryId) {
  return ASSET_CATEGORIES.find(c => c.id === categoryId) ?? null
}

export function getAssetType(categoryId, typeId) {
  const category = getAssetCategory(categoryId)
  return category?.types.find(t => t.id === typeId) ?? null
}

// The field template to render for a given category+type — every field in
// the category's own `fields` array, minus any `appliesToTypes`-scoped
// field that doesn't list this specific type (e.g. Kit Components, for
// every Field & Splicing Tools type except Splicing Machine).
export function getFieldsForType(categoryId, typeId) {
  const category = getAssetCategory(categoryId)
  if (!category) return []
  return category.fields.filter(f => !f.appliesToTypes || f.appliesToTypes.includes(typeId))
}
