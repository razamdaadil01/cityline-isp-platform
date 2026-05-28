export const CURRENT_USER = 'Arjun Kumar'

let _salesPerm = 'full'
const _listeners = []

export function getSalesPermission() { return _salesPerm }

export function setSalesPermission(perm) {
  _salesPerm = perm
  _listeners.forEach(fn => fn(perm))
}

export function subscribeSalesPermission(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
