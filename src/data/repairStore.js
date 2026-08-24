// Repair store — module-level pub/sub pattern (mirrors replacementStore.js).
// Tracks a serial/MAC-tracked unit sent back to its originating vendor for
// repair/service, for Vendor Detail's "Repairing Pending" tab. Same
// one-directional relationship as replacementStore.js: inventoryLedger.js
// layers these on top of its purchase/assignment-derived unit state, but
// this store never imports inventoryLedger.js back.
//
// This is currently a read-only, seed-only data model — nothing in the app
// yet CREATES a repair record. The most natural real trigger is Support/
// Tickets' existing "Mark as Replaced" flow (InventoryOverview.jsx's
// MarkReplacedModal, backed by replacementStore.js): today that flow only
// models "swap this faulty unit out for good," but in practice a faulty
// unit is often sent back to the vendor for repair rather than scrapped.
// A future phase should extend that same flow (or add a sibling "Send for
// Repair" action next to "Mark as Replaced" on Inventory Overview's Units
// tab) to call a saveRepairRecord()-equivalent here, the same way
// replacementStore.js is called today. Until that exists, the two seed
// records below stand in so Vendor Detail's Repairing Pending tab has real,
// clickable units to show rather than a permanently empty state.

export const REPAIR_STATUSES = ['Sent for Repair', 'In Service', 'Returned']

// value/productId reference real serials on PUR-000003 (VEN-001 / ZTE India
// Ltd's ONT Device receipt, purchaseStore.js) — that link is what lets
// Vendor Detail's serial click open the exact same getUnitTrail() history
// popup Inventory Overview itself uses for a unit.
const _repairs = [
  {
    id: 'RPR-000001', productId: 'PRD-001', productName: 'ONT Device',
    value: 'ZTE-ONT-2026-0001', kind: 'serial',
    vendorId: 'VEN-001', vendorName: 'ZTE India Ltd',
    status: 'Sent for Repair', expectedDeliveryDate: '2026-09-05',
    sentAt: '2026-08-15T10:00:00.000Z', sentBy: 'Admin User',
    remarks: 'Reported dead-on-arrival by field engineer; sent back for warranty repair.',
  },
  {
    id: 'RPR-000002', productId: 'PRD-001', productName: 'ONT Device',
    value: 'ZTE-ONT-2026-0002', kind: 'serial',
    vendorId: 'VEN-001', vendorName: 'ZTE India Ltd',
    status: 'In Service', expectedDeliveryDate: '2026-08-30',
    sentAt: '2026-08-10T10:00:00.000Z', sentBy: 'Admin User',
    remarks: 'Intermittent optical signal loss — vendor has acknowledged and begun diagnostics.',
  },
]

// No pub/sub yet — there's no write path to notify about (see note above).
// Add the usual _listeners/notify()/subscribeRepairs() trio here once a real
// "send for repair" action exists to call it.
export function getRepairs() { return _repairs }
export function getRepairsByVendor(vendorId) { return _repairs.filter(r => r.vendorId === vendorId) }
