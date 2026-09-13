// Scrap store — module-level pub/sub pattern (mirrors repairStore.js/
// replacementStore.js). Records a serial/MAC-tracked unit permanently
// removed from stock — physically damaged beyond repair, or otherwise
// written off. Same one-directional relationship those two stores already
// established: inventoryLedger.js layers these on top of its purchase/
// assignment-derived unit state, but this store never imports
// inventoryLedger.js back.
//
// A scrapped unit is permanent — unlike a repair record ('Sent for Repair'
// -> 'In Service' -> 'Returned'), there is no further status this record
// ever transitions to, so this store has no status field and no update
// function at all, just save + read.

import { logAudit } from './auditLogStore'

let _scraps = []
let _nextSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._scraps])) }

export function getScraps() { return _scraps }
export function getScrapsByStore(storeId) { return _scraps.filter(s => s.storeId === storeId) }

export function subscribeScraps(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// `value`/`kind` identify the physical unit the same way repairStore.js's
// saveRepair()/replacementStore.js's saveReplacement() do (a serial or MAC
// string, plus which one it is) — the caller (Assignments.jsx's "Scrap"
// action, InventoryOverview.jsx's Units tab) resolves these from the
// unit's own record, never free-typed. `storeId`/`storeName` are where the
// unit was scrapped from, for Store-scoped views later.
export function saveScrap({ productId, productName, value, kind, storeId, storeName, reason }, actor = 'Admin User') {
  const scrap = {
    id: `SCR-${String(_nextSeq++).padStart(6, '0')}`,
    productId, productName, value, kind,
    storeId, storeName,
    reason: (reason || '').trim(),
    scrappedAt: new Date().toISOString(), scrappedBy: actor,
  }
  _scraps = [scrap, ..._scraps]
  notify()
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `${value} (${productName}) scrapped — ${scrap.reason}`,
  })
  return scrap
}
