// Radius (Zone) store — module-level pub/sub pattern (mirrors other stores).
// Persists zone config across navigation within a session. Each zone
// corresponds to a Jaze ISP radius connection; recharge-status checks and
// live sync require the actual Jaze integration (not in scope here).

import { logAudit } from './auditLogStore'

const SEED = [
  { id: 1, customerType: 'Cityline', zoneName: 'Andheri West Zone', zoneId: 'AW-001', zoneUrl: 'https://jaze.cityline.in/aw', username: 'admin_aw', password: 'P@ssw0rd!1', addedDate: '2025-03-12', active: true },
  { id: 2, customerType: 'Partner',  zoneName: 'Bandra East Zone',  zoneId: 'BE-002', zoneUrl: 'https://jaze.cityline.in/be', username: 'admin_be', password: 'Secur3#Be2', addedDate: '2025-05-01', active: true },
  { id: 3, customerType: 'Cityline', zoneName: 'Versova Zone',      zoneId: 'VS-003', zoneUrl: 'https://jaze.cityline.in/vs', username: 'admin_vs', password: 'V3rs0va$3!', addedDate: '2026-01-08', active: true },
]

let _zones = [...SEED]
let _nextId = SEED.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._zones])) }

export function getZones() { return [..._zones] }

export function subscribeZones(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function addZone(data) {
  const zone = { ...data, id: _nextId++, addedDate: new Date().toISOString().slice(0, 10), active: true }
  _zones = [..._zones, zone]
  notify()
  logAudit({ action: 'Create', module: 'Settings', details: `Radius zone added: ${zone.zoneName} (${zone.zoneId})` })
  return zone
}

export function updateZone(id, patch) {
  _zones = _zones.map(z => z.id === id ? { ...z, ...patch } : z)
  notify()
  const updated = _zones.find(z => z.id === id)
  logAudit({ action: 'Update', module: 'Settings', details: `Radius zone updated: ${updated?.zoneName ?? id}` })
  return updated ?? null
}

export function removeZone(id) {
  const zone = _zones.find(z => z.id === id)
  _zones = _zones.filter(z => z.id !== id)
  notify()
  if (zone) logAudit({ action: 'Delete', module: 'Settings', details: `Radius zone removed: ${zone.zoneName} (${zone.zoneId})` })
}

export function toggleZoneActive(id) {
  const zone = _zones.find(z => z.id === id)
  if (!zone) return
  updateZone(id, { active: !zone.active })
}
