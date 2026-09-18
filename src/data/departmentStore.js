// Department store — module-level pub/sub pattern, mirroring storeStore.js/
// companyEntities.js's shape (a flat array of addressable records with an
// id, name, description) rather than Complaint Categories' single
// category->subcategories map (ticketsStore.js) — a department is its own
// record a rename/delete button acts on individually, the same as a Store
// or a Company/Entity, not a whole-object replacement.
//
// Staff <-> Department binding: a `departmentId` field directly on the user
// record (userStore.js), the same convention role='engineer' users already
// use for `branch`/`zone` — a plain field on the "many" side (user) pointing
// at the "one" (department) it belongs to, rather than a `members` array
// kept here on the department record. Reading a department's bound staff
// means filtering getUsers() by departmentId, the same way
// technicianHelpers.js filters getUsers() by role.

// Seeded to match the real role distribution of userStore.js's 15
// INITIAL_USERS (10 engineer/Field Engineer, 1 billing, 1 support, 1
// super_admin, 1 admin, 1 readonly) — no seed user has a sales-type role,
// so there's no Sales department here; Super Admin/Admin/Read Only are
// grouped under Administration rather than a poorly-fitting "HR", since
// none of them are HR staff. Replaces the "sas" department created ad hoc
// during manual testing (that only ever existed in this store's in-memory
// state, never in this seed array, so it doesn't survive a reload anyway).
const INITIAL_DEPARTMENTS = [
  { id: 'DEPT-001', name: 'Technical', description: 'Field engineers handling installations, repairs and network maintenance.' },
  { id: 'DEPT-002', name: 'Billing', description: 'Manages invoicing, payments and billing operations.' },
  { id: 'DEPT-003', name: 'Support', description: 'Handles customer support tickets and service requests.' },
  { id: 'DEPT-004', name: 'Administration', description: 'System administrators and management overseeing platform operations.' },
]

let _departments = [...INITIAL_DEPARTMENTS]
let _nextSeq = INITIAL_DEPARTMENTS.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._departments])) }

export function getDepartments() { return _departments }

export function getDepartment(id) { return _departments.find(d => d.id === id) ?? null }

export function isDepartmentNameTaken(name, excludeId = null) {
  const q = name.trim().toLowerCase()
  return _departments.some(d => d.id !== excludeId && d.name.trim().toLowerCase() === q)
}

// Create or update. Callers pass an `id` to update an existing department;
// omitting it (new department) assigns the next DEPT-### sequence id —
// same isNew/sequence-id convention as storeStore.js's saveStore().
export function saveDepartment(department) {
  const isNew = !(department.id && _departments.find(d => d.id === department.id))
  let saved
  if (!isNew) {
    _departments = _departments.map(d => d.id === department.id ? { ...d, ...department } : d)
    saved = _departments.find(d => d.id === department.id)
  } else {
    const id = `DEPT-${String(_nextSeq++).padStart(3, '0')}`
    saved = { ...department, id }
    _departments = [..._departments, saved]
  }
  notify()
  return saved
}

export function deleteDepartment(id) {
  _departments = _departments.filter(d => d.id !== id)
  notify()
}

export function subscribeDepartments(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}
