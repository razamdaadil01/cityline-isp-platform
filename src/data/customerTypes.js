// Customer Type is a system-seeded configuration entity (FR-1): Resident and
// Corporate ship by default and are not user-creatable in this release. The
// record shape intentionally leaves room for more types (e.g. a future
// "Add Type" action) without a data-model change.
//
// Lead ID numbering is configured per Customer Type (Resident/Corporate get
// independent prefixes and sequences) — see Settings.jsx's Customer Type >
// "Lead ID Format" panel. lastIssuedSequence is null until the first lead of
// that type is actually created; getNextLeadIdSequence() below seeds it from
// startingNumber.
let _customerTypes = [
  {
    id: 'resident', name: 'Resident', status: 'Active', systemSeeded: true,
    leadIdPrefix: 'RES-LD', includeYearInNumber: true, startingNumber: 1, sequencePadding: 3, lastIssuedSequence: null,
  },
  {
    id: 'corporate', name: 'Corporate', status: 'Active', systemSeeded: true,
    leadIdPrefix: 'CORP-LD', includeYearInNumber: true, startingNumber: 1, sequencePadding: 3, lastIssuedSequence: null,
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
