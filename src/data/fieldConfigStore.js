// Field Configuration (FR-8) — per Customer Type, which Lead/Customer creation
// fields are Mandatory vs Optional. Read by the Customer Creation forms (to be
// built next) to decide which fields show a required asterisk and block
// submission when empty (BR-11).

export const RESIDENT_FIELDS = [
  'Branch',
  'First Name',
  'Last Name',
  'Primary Number',
  'Alternative Number',
  'Email',
  'Service Tag',
  'Sales Executive',
  'Lead Source',
  'Connection Type',
  'Entity/Partner',
  'Billing To',
  'Address Section',
  'Package Selection',
]

export const CORPORATE_FIELDS = [
  'Branch',
  'GST Number',
  'GST Type',
  'PAN',
  'Legal Company Name',
  'Contact Person Name',
  'Contact Person Email',
  'Primary Number',
  'Accounts Email',
  'Accounts Name',
  'Accounts Phone',
  'Technical Email',
  'Technical Name',
  'Technical Phone',
  'Service Tag',
  'Connection Type',
  'Entity/Partner',
  'Billing To',
  'Assigned To/Sales Executive',
  'Address Section',
  'Package Selection',
]

export const FIELDS_BY_TYPE = {
  resident: RESIDENT_FIELDS,
  corporate: CORPORATE_FIELDS,
}

// System-default-mandatory (BR-12) — toggle locked ON, cannot be made optional.
const LOCKED_FIELDS = {
  resident: ['First Name', 'Primary Number', 'Connection Type'],
  // TODO: exact locked-field list for Corporate not finalized in PRD (BR-12) —
  // confirm with BA before this list is final. Using "Contact Person Name" as
  // the closest equivalent to Resident's "First Name", since Corporate has no
  // first/last name fields.
  corporate: ['Contact Person Name', 'Primary Number', 'Connection Type'],
}

// Fields marked "Optional (configurable)" in FR-6/FR-7 — default to Optional
// (mandatory: false). Everything else defaults to Mandatory unless locked.
const DEFAULT_OPTIONAL_FIELDS = {
  resident: ['Last Name', 'Alternative Number', 'Email'],
  corporate: ['Accounts Email', 'Accounts Name', 'Accounts Phone', 'Technical Email', 'Technical Name', 'Technical Phone'],
}

// Mandatory-ness actually depends on the Connection Type selection, not a
// simple toggle — shown with a "Conditional" badge; the toggle still sets a
// baseline default.
const CONDITIONAL_FIELDS = {
  resident: ['Entity/Partner', 'Billing To'],
  corporate: ['Entity/Partner', 'Billing To'],
}

function isLocked(customerType, fieldName) {
  return LOCKED_FIELDS[customerType]?.includes(fieldName) ?? false
}

function isConditional(customerType, fieldName) {
  return CONDITIONAL_FIELDS[customerType]?.includes(fieldName) ?? false
}

function defaultMandatory(customerType, fieldName) {
  if (isLocked(customerType, fieldName)) return true
  if (DEFAULT_OPTIONAL_FIELDS[customerType]?.includes(fieldName)) return false
  return true
}

let _records = Object.entries(FIELDS_BY_TYPE).flatMap(([customerType, fields]) =>
  fields.map(fieldName => ({
    customerType,
    fieldName,
    mandatory: defaultMandatory(customerType, fieldName),
    locked: isLocked(customerType, fieldName),
    conditional: isConditional(customerType, fieldName),
  })))

const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._records])) }

// Ordered per FIELDS_BY_TYPE, one record per field, for the given customer type.
export function getFieldConfig(customerType) {
  const fields = FIELDS_BY_TYPE[customerType] || []
  return fields
    .map(fieldName => _records.find(r => r.customerType === customerType && r.fieldName === fieldName))
    .filter(Boolean)
}

export function getFieldCount(customerType) {
  return (FIELDS_BY_TYPE[customerType] || []).length
}

export function subscribeFieldConfig(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function setFieldMandatory(customerType, fieldName, mandatory) {
  _records = _records.map(r =>
    r.customerType === customerType && r.fieldName === fieldName && !r.locked
      ? { ...r, mandatory }
      : r)
  notify()
}
