// Customer Type is a system-seeded configuration entity (FR-1): Resident and
// Corporate ship by default and are not user-creatable in this release. The
// record shape intentionally leaves room for more types (e.g. a future
// "Add Type" action) without a data-model change.
let _customerTypes = [
  { id: 'resident', name: 'Resident', status: 'Active', systemSeeded: true },
  { id: 'corporate', name: 'Corporate', status: 'Active', systemSeeded: true },
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
