// Inventory module settings — scoped per Company/Entity, same convention as
// invoice numbering on companyEntities.js (module-level pub/sub, keyed by
// companyEntityId rather than a single global record). This is a distinct,
// Inventory-scoped settings surface from the main platform Settings page.
//
// poApprovalRequired only persists the boolean in Phase 1 — the actual
// conditional Send PO vs Send for Approval behavior gets wired into the PO
// creation flow in Phase 2.

const DEFAULTS = {
  poApprovalRequired: false,
  poTerms: '',
  defaultGstPercent: 18,
  poNumberFormat: 'CITY/PO/{YYYY}/{00001}',
}

let _settingsByEntity = {
  1: { poApprovalRequired: false, poTerms: 'Payment due within agreed terms. Goods must match PO specification.', defaultGstPercent: 18, poNumberFormat: 'CITY/PO/{YYYY}/{00001}' },
  2: { poApprovalRequired: false, poTerms: 'Payment due within agreed terms. Goods must match PO specification.', defaultGstPercent: 18, poNumberFormat: 'CLF/PO/{YYYY}/{00001}' },
}

const _listeners = []

function notify() { _listeners.forEach(fn => fn({ ..._settingsByEntity })) }

// Formats a sequence number per a PO number format template — {YYYY} becomes
// the current year, and a run of zeros like {00001} becomes the sequence
// number zero-padded to that many digits. Exported so the General Settings
// form's live preview renders using this exact same logic rather than a
// parallel copy that could drift from the real generator (mirrors
// companyEntities.js's formatInvoiceNumber pattern).
export function formatPoNumber(formatStr, seq = 1) {
  if (!formatStr) return ''
  return formatStr
    .replace(/\{YYYY\}/g, String(new Date().getFullYear()))
    .replace(/\{(0+)\}/g, (_m, zeros) => String(seq).padStart(zeros.length, '0'))
}

export function getInventorySettings(companyEntityId) {
  const settings = _settingsByEntity[companyEntityId] ?? DEFAULTS
  return { ...settings, poNumberPreview: formatPoNumber(settings.poNumberFormat, 1) }
}

export function saveInventorySettings(companyEntityId, settings) {
  _settingsByEntity = { ..._settingsByEntity, [companyEntityId]: { ...DEFAULTS, ..._settingsByEntity[companyEntityId], ...settings } }
  notify()
}

export function subscribeInventorySettings(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}
