// Customer Type is a system-seeded configuration entity (FR-1): Resident and
// Corporate ship by default and are not user-creatable in this release. The
// record shape intentionally leaves room for more types (e.g. a future
// "Add Type" action) without a data-model change.
//
// Lead ID, Customer ID, PPPoE ID and App Password are all configured per
// Customer Type (Resident/Corporate get independent prefixes/patterns and
// sequences) — see Settings.jsx's Customer Type > "Lead ID Format" and
// "Customer ID & Credentials" panels. Each *Sequence counter is null until
// the first record of that type is actually created; the getNext*Sequence()
// functions below seed it from startingNumber.
let _customerTypes = [
  {
    id: 'resident', name: 'Resident', status: 'Active', systemSeeded: true,
    leadIdPrefix: 'RES-LD', includeYearInNumber: true, startingNumber: 1, sequencePadding: 3, lastIssuedSequence: null,
    customerIdConfig: { prefix: 'RES', includeYear: true, startingNumber: 1, sequencePadding: 4, lastIssuedSequence: null },
    pppoeIdConfig: { mode: 'auto', pattern: '{firstname}_{lastname}_{seq}' },
    appPasswordConfig: { mode: 'auto', pattern: 'Cit@{year}#{firstname}' },
  },
  {
    id: 'corporate', name: 'Corporate', status: 'Active', systemSeeded: true,
    leadIdPrefix: 'CORP-LD', includeYearInNumber: true, startingNumber: 1, sequencePadding: 3, lastIssuedSequence: null,
    customerIdConfig: { prefix: 'ENT', includeYear: true, startingNumber: 1, sequencePadding: 4, lastIssuedSequence: null },
    pppoeIdConfig: { mode: 'auto', pattern: '{firstname}_{lastname}_{seq}' },
    appPasswordConfig: { mode: 'auto', pattern: 'Cit@{year}#{firstname}' },
  },
]

const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._customerTypes])) }

export function getCustomerTypes() { return [..._customerTypes] }

export function getCustomerType(id) { return _customerTypes.find(t => t.id === id) ?? null }

export function subscribeCustomerTypes(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function setCustomerTypeStatus(id, status) {
  _customerTypes = _customerTypes.map(t => t.id === id ? { ...t, status } : t)
  notify()
}

// Saves the Lead ID Format panel's fields for a type. Deliberately separate
// from setCustomerTypeStatus (and doesn't touch lastIssuedSequence) so
// editing the format never accidentally resets progress already made
// through the sequence.
export function saveLeadIdConfig(id, { leadIdPrefix, includeYearInNumber, startingNumber, sequencePadding }) {
  _customerTypes = _customerTypes.map(t => t.id === id
    ? { ...t, leadIdPrefix, includeYearInNumber, startingNumber, sequencePadding }
    : t)
  notify()
}

// Formats a sequence number per a Customer Type's Lead ID config —
// {PREFIX}-{YYYY}-{SEQ} when includeYearInNumber, else {PREFIX}-{SEQ}, with
// SEQ zero-padded to sequencePadding digits. Exported so the Lead ID Format
// panel's live preview (Settings.jsx) renders using this exact same logic
// rather than a parallel copy that could drift from the real generator —
// same approach as companyEntities.js's formatInvoiceNumber().
export function formatLeadId(type, seq) {
  const padded = String(seq).padStart(Number(type.sequencePadding) || 3, '0')
  return type.includeYearInNumber
    ? `${type.leadIdPrefix}-${new Date().getFullYear()}-${padded}`
    : `${type.leadIdPrefix}-${padded}`
}

// Reads + advances a Customer Type's persisted sequence counter, mirroring
// the nextCustomerId()/nextSalesLeadId() read-then-increment pattern used
// elsewhere (customersData.js, leadsStore.js) — called by
// leadsStore.js's nextSalesLeadId(), kept here (not there) since the counter
// belongs to the Customer Type record it advances.
export function getNextLeadIdSequence(id) {
  const type = getCustomerType(id)
  if (!type) return null
  const nextSeq = (type.lastIssuedSequence ?? (Number(type.startingNumber) - 1)) + 1
  _customerTypes = _customerTypes.map(t => t.id === id ? { ...t, lastIssuedSequence: nextSeq } : t)
  notify()
  return nextSeq
}

// ── Customer ID config ───────────────────────────────────────────────────

export function saveCustomerIdConfig(id, { prefix, includeYear, startingNumber, sequencePadding }) {
  _customerTypes = _customerTypes.map(t => t.id === id
    ? { ...t, customerIdConfig: { ...t.customerIdConfig, prefix, includeYear, startingNumber, sequencePadding } }
    : t)
  notify()
}

// Same {PREFIX}-{YYYY}-{SEQ} / {PREFIX}-{SEQ} shape as formatLeadId()/
// formatInvoiceNumber(), just reading a nested customerIdConfig object
// instead of the flat leadId* fields directly on the type record.
export function formatCustomerId(config, seq) {
  const padded = String(seq).padStart(Number(config.sequencePadding) || 4, '0')
  return config.includeYear
    ? `${config.prefix}-${new Date().getFullYear()}-${padded}`
    : `${config.prefix}-${padded}`
}

export function getNextCustomerIdSequence(id) {
  const type = getCustomerType(id)
  if (!type?.customerIdConfig) return null
  const config = type.customerIdConfig
  const nextSeq = (config.lastIssuedSequence ?? (Number(config.startingNumber) - 1)) + 1
  _customerTypes = _customerTypes.map(t => t.id === id
    ? { ...t, customerIdConfig: { ...t.customerIdConfig, lastIssuedSequence: nextSeq } }
    : t)
  notify()
  return nextSeq
}

// ── PPPoE ID / App Password config ──────────────────────────────────────

export function savePppoeIdConfig(id, { mode, pattern }) {
  _customerTypes = _customerTypes.map(t => t.id === id ? { ...t, pppoeIdConfig: { mode, pattern } } : t)
  notify()
}

export function saveAppPasswordConfig(id, { mode, pattern }) {
  _customerTypes = _customerTypes.map(t => t.id === id ? { ...t, appPasswordConfig: { mode, pattern } } : t)
  notify()
}

// Simple {token} replacement — reasonable-default implementation since the
// PRD only says "give a PPPoE/App Password configuration" with no exact
// token syntax specified.
// TODO: token set is deliberately minimal (firstname/lastname/customerid/
// seq/year); confirm with BA whether more tokens (e.g. branch, plan) are
// actually needed before this goes further than a demo/preview.
const TOKEN_PATTERN = /\{(\w+)\}/g

export function applyPattern(pattern, tokens) {
  return (pattern || '').replace(TOKEN_PATTERN, (match, key) => (key in tokens ? tokens[key] : match))
}

// Derives {firstname}/{lastname}/{customerid}/{seq}/{year} from whatever a
// customer-like object ({ name, id }) has available. Works both for a
// freshly-generated customer (real name + a just-issued sequential id) and
// for older records that only have a flat id to derive a pseudo-sequence
// from (e.g. CustomerDetail.jsx's makeCustomerFromBase) — {seq} falls back
// to the id's own trailing digits, zero-padded, when no explicit seq is
// available, so the token still resolves to *something* stable per record.
export function buildCredentialTokens(customer) {
  const nameParts = (customer?.name || '').toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean)
  const firstname = nameParts[0] || 'customer'
  const lastname = nameParts.slice(1).join('') || ''
  const customerid = (customer?.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const seqMatch = (customer?.id || '').match(/(\d+)$/)
  const seq = seqMatch ? seqMatch[1] : '001'
  return { firstname, lastname, customerid, seq, year: String(new Date().getFullYear()) }
}

// Resolves a customer's PPPoE ID per its Customer Type's config: the
// configured pattern with tokens substituted in 'auto' mode, or whatever
// value is already on the customer (agent-entered) in 'manual' mode.
export function getPPPoEId(customer, customerTypeId) {
  const type = getCustomerType(customerTypeId)
  const config = type?.pppoeIdConfig
  if (!config || config.mode === 'manual') return customer?.pppoeUsername ?? ''
  return applyPattern(config.pattern, buildCredentialTokens(customer))
}

// Same shape as getPPPoEId(), for App Password.
export function getAppPassword(customer, customerTypeId) {
  const type = getCustomerType(customerTypeId)
  const config = type?.appPasswordConfig
  if (!config || config.mode === 'manual') return customer?.appPassword ?? ''
  return applyPattern(config.pattern, buildCredentialTokens(customer))
}
