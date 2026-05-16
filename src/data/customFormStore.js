// Module-level store shared between FormBuilder and Sales pages
const INITIAL = {
  B2C: { key: 'B2C', name: 'B2C Lead Form', fields: [] },
  B2B: { key: 'B2B', name: 'B2B Lead Form', fields: [] },
  ILL: { key: 'ILL', name: 'ILL Form', fields: [] },
}

let _modules = JSON.parse(JSON.stringify(INITIAL))
const _listeners = []

export function getFormModules() { return _modules }

export function setFormModule(key, fields) {
  _modules = { ..._modules, [key]: { ..._modules[key], fields } }
  _listeners.forEach(fn => fn(_modules))
}

export function subscribeFormModules(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
