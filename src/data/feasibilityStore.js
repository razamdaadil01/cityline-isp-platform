// Feasibility requests store

let _requests = []
const _listeners = []

export function getFeasibilityRequests() { return _requests }

export function saveFeasibilityRequest(req) {
  if (req.id && _requests.find(r => r.id === req.id)) {
    _requests = _requests.map(r => r.id === req.id ? { ...r, ...req } : r)
  } else {
    const id = `FR-${String(_requests.length + 1).padStart(3, '0')}`
    _requests = [..._requests, { ...req, id, createdAt: new Date().toISOString().slice(0, 10) }]
  }
  _listeners.forEach(fn => fn([..._requests]))
}

export function updateFeasibilityStatus(id, status) {
  _requests = _requests.map(r => r.id === id ? { ...r, feasibilityStatus: status } : r)
  _listeners.forEach(fn => fn([..._requests]))
}

export function subscribeFeasibility(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}
