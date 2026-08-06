// Service Tags are scoped to a Customer Type and will later be referenced by
// the Lead Form, Customer Profile and Ticket module filters (FR-2) — kept as
// its own store, shaped as { id, name, customerType, status, displayOrder },
// so those future integrations only need to read from here.
//
// Inactive tags are hidden from new Lead/Customer/Ticket forms but preserved
// on existing records — that hiding logic will apply once those forms exist.

const TYPE_ORDER = ['resident', 'corporate']

let _serviceTags = [
  { id: 1, name: 'Broadband', customerType: 'resident', status: 'Active', displayOrder: 1 },
  { id: 2, name: 'Landline', customerType: 'resident', status: 'Active', displayOrder: 2 },
  { id: 3, name: 'ILL', customerType: 'corporate', status: 'Active', displayOrder: 1 },
  { id: 4, name: 'P2P', customerType: 'corporate', status: 'Active', displayOrder: 2 },
]
let _nextId = 5

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getServiceTags())) }

export function getServiceTags() {
  return [..._serviceTags].sort((a, b) => {
    if (a.customerType !== b.customerType) return TYPE_ORDER.indexOf(a.customerType) - TYPE_ORDER.indexOf(b.customerType)
    return a.displayOrder - b.displayOrder
  })
}

export function getServiceTagsForType(customerType) {
  return getServiceTags().filter(t => t.customerType === customerType)
}

export function countServiceTagsForType(customerType) {
  return _serviceTags.filter(t => t.customerType === customerType).length
}

export function subscribeServiceTags(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function nextDisplayOrder(customerType, excludeId) {
  const orders = _serviceTags
    .filter(t => t.customerType === customerType && t.id !== excludeId)
    .map(t => t.displayOrder)
  return orders.length ? Math.max(...orders) + 1 : 1
}

export function isTagNameTaken(name, customerType, excludeId) {
  const normalized = name.trim().toLowerCase()
  return _serviceTags.some(t =>
    t.customerType === customerType && t.id !== excludeId && t.name.trim().toLowerCase() === normalized)
}

export function saveServiceTag(tag) {
  const exists = tag.id != null && _serviceTags.some(t => t.id === tag.id)
  if (exists) {
    _serviceTags = _serviceTags.map(t => t.id === tag.id ? { ...t, ...tag } : t)
  } else {
    const newTag = { ...tag, id: _nextId++ }
    _serviceTags = [..._serviceTags, newTag]
    notify()
    return newTag
  }
  notify()
  return tag
}

export function setServiceTagStatus(id, status) {
  _serviceTags = _serviceTags.map(t => t.id === id ? { ...t, status } : t)
  notify()
}

// Recomputes displayOrder within each customerType group based on the new
// relative order of the given ids — works whether the reordered set spans
// one customer type (a filtered view) or several (the "All" view).
export function reorderServiceTags(orderedIds) {
  const counters = {}
  const orderMap = new Map()
  orderedIds.forEach(id => {
    const tag = _serviceTags.find(t => t.id === id)
    if (!tag) return
    counters[tag.customerType] = (counters[tag.customerType] || 0) + 1
    orderMap.set(id, counters[tag.customerType])
  })
  _serviceTags = _serviceTags.map(t => orderMap.has(t.id) ? { ...t, displayOrder: orderMap.get(t.id) } : t)
  notify()
}
