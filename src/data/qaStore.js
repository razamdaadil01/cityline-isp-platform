import { logAudit } from './auditLogStore'

export const QA_STATUSES = ['Pending', 'In Progress', 'Passed', 'Failed', 'Partially Passed']

let _nextSeq = 1
function nextQAId() {
  return `QA-${String(_nextSeq++).padStart(6, '0')}`
}
// suppress lint — nextQAId used only to advance _nextSeq in seed bootstrap
void nextQAId

const SEED = [
  {
    id: 'QA-000001',
    purchaseId: 'PUR-000001',
    purchaseNumber: 'PUR-2026-000001',
    poId: 'PO-000003',
    poNumber: 'CITY/PO/2026/00003',
    vendorId: 'VEN-003',
    vendorName: 'TP-Link India Pvt Ltd',
    storeId: 'STR-001',
    storeName: 'Main Warehouse',
    purchaseDate: '2026-07-20',
    inspectedBy: 'Admin User',
    inspectedAt: '2026-07-21T11:00:00.000Z',
    createdAt: '2026-07-20T10:30:00.000Z',
    status: 'Passed',
    remarks: 'All items inspected and passed. Good quality.',
    items: [
      {
        purchaseItemId: 'PURI-1',
        productId: 'PRD-006',
        productName: 'Patch Cord (LC-LC, 5m)',
        sku: '',
        unit: 'Piece',
        receivedQty: 80,
        passedQty: 80,
        failedQty: 0,
        condition: 'Good',
        conditionNotes: '',
        serials: [],
        macs: [],
      },
      {
        purchaseItemId: 'PURI-2',
        productId: 'PRD-003',
        productName: 'Wall Mount Bracket',
        sku: '',
        unit: 'Piece',
        receivedQty: 50,
        passedQty: 50,
        failedQty: 0,
        condition: 'Good',
        conditionNotes: '',
        serials: [],
        macs: [],
      },
    ],
  },
  {
    id: 'QA-000002',
    purchaseId: 'PUR-000003',
    purchaseNumber: 'PUR-2026-000003',
    poId: null,
    poNumber: null,
    vendorId: 'VEN-001',
    vendorName: 'ZTE India Ltd',
    storeId: 'STR-002',
    storeName: 'Andheri Store',
    purchaseDate: '2026-08-12',
    inspectedBy: 'Admin User',
    inspectedAt: '2026-08-13T09:00:00.000Z',
    createdAt: '2026-08-12T14:30:00.000Z',
    status: 'Failed',
    remarks: 'All units found damaged in transit. Vendor to be notified for replacement.',
    items: [
      {
        purchaseItemId: 'PURI-5',
        productId: 'PRD-001',
        productName: 'ONT Device',
        sku: '',
        unit: 'Piece',
        receivedQty: 3,
        passedQty: 0,
        failedQty: 3,
        condition: 'Damaged',
        conditionNotes: 'Packaging damaged. Units have visible physical damage on the casing.',
        serials: ['ZTE-ONT-2026-0001', 'ZTE-ONT-2026-0002', 'ZTE-ONT-2026-0003'],
        macs: [],
      },
    ],
  },
  {
    id: 'QA-000003',
    purchaseId: 'PUR-000005',
    purchaseNumber: 'PUR-2026-000005',
    poId: null,
    poNumber: null,
    vendorId: 'VEN-001',
    vendorName: 'ZTE India Ltd',
    storeId: 'STR-002',
    storeName: 'Andheri Store',
    purchaseDate: '2026-08-22',
    inspectedBy: 'Admin User',
    inspectedAt: null,
    createdAt: '2026-08-22T10:30:00.000Z',
    status: 'Pending',
    remarks: '',
    items: [
      {
        purchaseItemId: 'PURI-7',
        productId: 'PRD-001',
        productName: 'ONT Device',
        sku: '',
        unit: 'Piece',
        receivedQty: 5,
        passedQty: 0,
        failedQty: 0,
        condition: '',
        conditionNotes: '',
        serials: ['ZTE-ONT-2026-0004', 'ZTE-ONT-2026-0005', 'ZTE-ONT-2026-0006', 'ZTE-ONT-2026-0007', 'ZTE-ONT-2026-0008'],
        macs: [],
      },
    ],
  },
]

_nextSeq = SEED.length + 1

let _qaRecords = [...SEED]
let _nextInternalSeq = _qaRecords.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._qaRecords])) }

export function getQARecords() { return _qaRecords }
export function getQARecord(id) { return _qaRecords.find(r => r.id === id) ?? null }
export function getQAByPurchaseId(purchaseId) { return _qaRecords.find(r => r.purchaseId === purchaseId) ?? null }

export function subscribeQARecords(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function addQARecord(data) {
  const record = {
    id: `QA-${String(_nextInternalSeq++).padStart(6, '0')}`,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    inspectedBy: 'Admin User',
    inspectedAt: null,
    remarks: '',
    ...data,
  }
  _qaRecords = [record, ..._qaRecords]
  notify()
  logAudit({ action: 'Add', module: 'Inventory', details: `Created QA record ${record.id} for purchase ${record.purchaseNumber}` })
  return record
}

export function updateQARecord(id, fields) {
  _qaRecords = _qaRecords.map(r => r.id === id ? { ...r, ...fields } : r)
  notify()
  logAudit({ action: 'Edit', module: 'Inventory', details: `Updated QA record ${id} — status: ${fields.status ?? 'unchanged'}` })
}

export function getPendingQACount() {
  return _qaRecords.filter(r => r.status === 'Pending').length
}
