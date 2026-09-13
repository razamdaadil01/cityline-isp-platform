// Store (warehouse/branch) master store — module-level pub/sub pattern
// (mirrors feasibilityStore.js). Backs Inventory's Store Management
// (Phase 1: Configuration). branchCode is free text, following the same
// loose convention used by feasibilityStore.js/areaMappingStore.js — there's
// no canonical Branch master to foreign-key against yet. productCount/
// totalInventory are stubbed at 0 until real stock exists (Phase 4).
//
// address/gstin feed deliveryChallanStore.js's consignor/consignee block
// (see that file's storeParty()); city additionally feeds that same
// document's placeOfSupply and is shown for reference on Store
// Transfer/Store Management — every Store Transfer now goes through the
// same Send → Receive lifecycle regardless of city (see
// storeTransferStore.js's own file-level note), so city no longer decides
// a transfer's status path. All three are plain optional strings, same
// convention as every other free-text field on this record — no format
// validation (GSTIN's own companyEntities.js GSTIN_REGEX exists for a
// legal billing Company/Entity, not a physical Store, which isn't itself a
// GST-registered party the same way).

import { logAudit } from './auditLogStore'

const SEED = [
  {
    id: 'STR-001',
    storeName: 'Main Warehouse',
    branchCode: 'CNPL-001',
    address: 'Plot 14, MIDC Industrial Area, Andheri East',
    city: 'Mumbai',
    gstin: '27AAAAA0000A1Z5',
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
    address: 'Shop 3, Link Road, Andheri West',
    city: 'Mumbai',
    gstin: '27BBBBB1111B1Z3',
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
    address: '12 Hill Road, Bandra West',
    city: 'Mumbai',
    gstin: '27CCCCC2222C1Z1',
    contacts: [
      { name: 'Anjali Rao', phone: '96550 22334', email: 'anjali.rao@citylinenetworks.in' },
    ],
    productCount: 0,
    totalInventory: 0,
    status: 'active',
  },
  {
    // The one seeded store outside Mumbai — gives storeTransferStore.js's
    // seed data a real cross-city pair (Andheri Store → here) with a
    // genuinely different placeOfSupply on its Delivery Challan, even
    // though every transfer (same-city or cross-city) now goes through the
    // identical Send → Receive lifecycle.
    id: 'STR-004',
    storeName: 'Noida Store',
    branchCode: 'CNPL-004',
    address: 'B-12, Sector 62',
    city: 'Noida',
    gstin: '09DDDDD3333D1Z9',
    contacts: [
      { name: 'Rohit Verma', phone: '98110 55667', email: 'rohit.verma@citylinenetworks.in' },
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
