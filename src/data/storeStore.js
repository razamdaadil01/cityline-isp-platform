// Store (warehouse/branch) master store — module-level pub/sub pattern
// (mirrors feasibilityStore.js). Backs Inventory's Store Management
// (Phase 1: Configuration). branchCode is free text, following the same
// loose convention used by feasibilityStore.js/areaMappingStore.js — there's
// no canonical Branch master to foreign-key against yet. productCount/
// totalInventory are stubbed at 0 until real stock exists (Phase 4).

import { logAudit } from './auditLogStore'

const SEED = [
  {
    id: 'STR-001',
    storeName: 'Main Warehouse',
    branchCode: 'CNPL-001',
    contacts: [
      { name: 'Vinod Sharma', phone: '98200 44556', email: 'vinod.sharma@citylinenetworks.in' },
    ],
    productCount: 0,
    totalInventory: 0,
    status: 'active',
  },
  {
    id: 'STR-002',
    storeName: 'Andheri Store',
    branchCode: 'CNPL-002',
    contacts: [
      { name: 'Kiran Desai', phone: '97650 11223', email: 'kiran.desai@citylinenetworks.in' },
    ],
    productCount: 0,
    totalInventory: 0,
    status: 'active',
  },
  {
    id: 'STR-003',
    storeName: 'Bandra Store',
    branchCode: 'CNPL-003',
    contacts: [
      { name: 'Anjali Rao', phone: '96550 22334', email: 'anjali.rao@citylinenetworks.in' },
    ],
    productCount: 0,
    totalInventory: 0,
    status: 'active',
  },
]

let _stores = [...SEED]
let _nextSeq = _stores.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._stores])) }

export function getStores() { return _stores }
export function getStore(id) { return _stores.find(s => s.id === id) ?? null }

export function subscribeStores(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function isStoreNameTaken(storeName, excludeId = null) {
  const q = storeName.trim().toLowerCase()
  return _stores.some(s => s.id !== excludeId && s.storeName.trim().toLowerCase() === q)
}

// Create or update. Callers pass an `id` to update an existing store;
// omitting it (new store) assigns the next STR-### sequence id.
export function saveStore(store) {
  const isNew = !(store.id && _stores.find(s => s.id === store.id))
  let saved
  if (!isNew) {
    _stores = _stores.map(s => s.id === store.id ? { ...s, ...store } : s)
    saved = _stores.find(s => s.id === store.id)
  } else {
    const id = `STR-${String(_nextSeq++).padStart(3, '0')}`
    saved = { productCount: 0, totalInventory: 0, status: 'active', ...store, id }
    _stores = [..._stores, saved]
  }
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Inventory',
    details: `${isNew ? 'Added' : 'Updated'} store ${saved.storeName} (${saved.id})`,
  })
}

// Stores are never hard-deleted once inventory could exist in them (BR:
// "Store cannot be deactivated-to-delete if inventory exists") — v1 has no
// inventory yet, so this status toggle is the only delete-adjacent action
// exposed anywhere in the UI.
export function setStoreStatus(id, status) {
  _stores = _stores.map(s => s.id === id ? { ...s, status } : s)
  notify()
  const store = getStore(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} store ${store?.storeName ?? id}` })
}
