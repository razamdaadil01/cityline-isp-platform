// Assignment (Hardware/Wire → Engineer) store — module-level pub/sub pattern
// (mirrors purchaseStore.js/purchaseOrderStore.js). Records what inventory
// was issued to which engineer, against which Work Order.
//
// Architecture note on why this file does NOT import inventoryLedger.js:
// inventoryLedger.js is the single computed "current truth" layer Phase 4's
// Inventory Overview reads from — it now folds THIS store's confirmed
// deductions on top of purchaseStore's receipts (see inventoryLedger.js) so
// that page reflects assignments automatically. If this file imported
// inventoryLedger.js back, that would be a circular dependency (the same
// one-directional-only discipline purchaseStore.js/purchaseOrderStore.js
// already established in Phase 2/3). Instead, saveAssignment()'s own stock
// validation re-derives gross received quantities directly from
// purchaseStore (mirroring inventoryLedger's own internal derivation on a
// smaller scale) and nets them against this store's own `_assignments` —
// mathematically identical to what inventoryLedger.js would report, just
// computed via an independent path that keeps the dependency graph acyclic.

import { getInstallations, FIELD_ENGINEERS } from './installationsStore'
import { getFeasibilityRequest } from './feasibilityStore'
import { getProducts } from './productStore'
import { getStores } from './storeStore'
import { getPurchases } from './purchaseStore'
import { logAudit } from './auditLogStore'

export const ASSIGNMENT_STATUSES = ['Assigned', 'Returned']

// Work Order types Assign to Engineer's Step 2 and Assign to User's Step 2
// both surface — a single source of truth so the two flows never drift.
// Only 'Installation' has a real backing data source today (getInstallations()
// below); the other four are real, selectable options with no fabricated
// records behind them yet — callers show an explicit empty/unsupported
// state for those rather than pretending they resolve to something.
export const WORK_ORDER_TYPES = ['Installation', 'Ticket', 'Incident', 'Network', 'Project']

// ── Number sequence — simple, global, mirrors purchaseStore.js's own
// PUR-YYYY-###### convention. ────────────────────────────────────────────
let _nextSeq = 1
function nextAssignmentNumber() {
  const year = new Date().getFullYear()
  return `ASG-${year}-${String(_nextSeq++).padStart(6, '0')}`
}

// ── Seed data — so Assign to Engineer's list isn't empty on first load.
// Every engineer/branch/store/product/Work Order referenced here is one
// already seeded elsewhere (installationsStore.js's FIELD_ENGINEERS and
// Installations, storeStore.js, productStore.js) — nothing invented. The
// only two additions made anywhere to support this seed are: PUR-000004 in
// purchaseStore.js (a Drop Wire drum at Andheri Store — no wire stock
// existed at all before that, and a wire-line demo needs a real drum to
// assign meters off of) and INS-011 in installationsStore.js (a fourth
// Work Order in an existing branch for an existing engineer, since only 3
// of the 10 original Installations both sit in a branch with a real Store
// AND carry a non-empty hardware/wire requirement — INS-005/006/009).
//
// Quantities below are deliberately conservative against the real seeded
// stock so nothing here goes negative or double-counts: ONT Device has 3
// serials at Andheri (only 1 used, 2 left 'Available'); Wall Mount Bracket
// has 50 at Main Warehouse (2 used); Patch Cord has 80 at Main Warehouse
// (10 used); the Drop Wire drum has 500m (30 used). A few requirement
// lines (ONT/Ethernet Cat6 at Main Warehouse, which genuinely has no stock
// of either) are deliberately left unfulfilled/omitted — the same partial-
// assignment behavior saveAssignment() itself produces when a line has
// nothing available, called out via each record's own remarks.
const SEED = [
  {
    id: 'ASG-000001', assignmentNumber: 'ASG-2026-000001',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    branchCode: 'CNPL-002',
    workOrderId: 'INS-005', workOrderLabel: 'INS-005',
    storeId: 'STR-002', storeName: 'Andheri Store',
    hardwareLines: [
      { id: 'ASGI-1-0', productId: 'PRD-001', productName: 'ONT Device', requiredQty: 1, assignedQty: 1, serials: ['ZTE-ONT-2026-0001'], macs: [], remark: 'Urgent — customer escalation, ONT replacement priority.' },
      { id: 'ASGI-1-1', productId: 'PRD-003', productName: 'Wall Mount Bracket', requiredQty: 1, assignedQty: 1, serials: [], macs: [], remark: '' },
    ],
    wireLines: [
      { id: 'ASGW-1-0', productId: 'PRD-010', productName: 'Drop Wire', requiredMeters: 30, assignedMeters: 30, drumNumber: 'DR-00871', remark: '' },
    ],
    remarks: 'Escalated FTTH install — issued same day.',
    status: 'Assigned', assignedBy: 'Admin User', assignedAt: '2026-08-16T09:30:00.000Z',
  },
  {
    id: 'ASG-000002', assignmentNumber: 'ASG-2026-000002',
    engineerId: 'eng-003', engineerName: 'Anita Sharma',
    branchCode: 'CNPL-001',
    workOrderId: 'INS-006', workOrderLabel: 'INS-006',
    storeId: 'STR-001', storeName: 'Main Warehouse',
    hardwareLines: [
      { id: 'ASGI-2-0', productId: 'PRD-003', productName: 'Wall Mount Bracket', requiredQty: 1, assignedQty: 1, serials: [], macs: [], remark: '' },
    ],
    wireLines: [],
    remarks: 'ONT Device pending — out of stock at Main Warehouse.',
    status: 'Assigned', assignedBy: 'Admin User', assignedAt: '2026-08-18T14:00:00.000Z',
  },
  {
    id: 'ASG-000003', assignmentNumber: 'ASG-2026-000003',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    branchCode: 'CNPL-001',
    workOrderId: 'INS-009', workOrderLabel: 'INS-009',
    storeId: 'STR-001', storeName: 'Main Warehouse',
    hardwareLines: [
      { id: 'ASGI-3-0', productId: 'PRD-003', productName: 'Wall Mount Bracket', requiredQty: 1, assignedQty: 1, serials: [], macs: [], remark: '' },
    ],
    wireLines: [],
    remarks: 'Partial issue — ONT Device and Ethernet Cat6 pending next stock receipt.',
    status: 'Assigned', assignedBy: 'Admin User', assignedAt: '2026-08-20T11:15:00.000Z',
  },
  {
    id: 'ASG-000004', assignmentNumber: 'ASG-2026-000004',
    engineerId: 'eng-004', engineerName: 'Suresh Babu',
    branchCode: 'CNPL-001',
    workOrderId: 'INS-011', workOrderLabel: 'INS-011',
    storeId: 'STR-001', storeName: 'Main Warehouse',
    hardwareLines: [
      { id: 'ASGI-4-0', productId: 'PRD-006', productName: 'Patch Cord (LC-LC, 5m)', requiredQty: 10, assignedQty: 10, serials: [], macs: [], remark: 'Bulk patch cords for rack termination — handle with care.' },
    ],
    wireLines: [],
    remarks: '',
    status: 'Assigned', assignedBy: 'Admin User', assignedAt: '2026-08-22T16:45:00.000Z',
  },
  // ── Two more ONT issuances, both already handed off to their customers
  // (see userAssignmentStore.js's seed) — demonstrates the Assignment
  // List's 'Assigned to User' line status alongside 'Assigned to Engineer'
  // on ASG-000001-4 above. ONT Device is the only serial-tracked product
  // today, and ASG-000001 already used the only "free" existing Work Order
  // (INS-005) that needed one, so these two draw on installationsStore.js's
  // INS-015/INS-016 (added specifically for this) and the two ONT serials
  // left over at Andheri Store from PUR-000003 after ASG-000001 took the
  // first (ZTE-ONT-2026-0002/0003) — not the serials PUR-000005 reserved
  // for INS-012/013/014's own separate demo.
  {
    id: 'ASG-000005', assignmentNumber: 'ASG-2026-000005',
    engineerId: 'eng-002', engineerName: 'Preethi Nair',
    branchCode: 'CNPL-002',
    workOrderId: 'INS-015', workOrderLabel: 'INS-015',
    storeId: 'STR-002', storeName: 'Andheri Store',
    hardwareLines: [
      { id: 'ASGI-5-0', productId: 'PRD-001', productName: 'ONT Device', requiredQty: 1, assignedQty: 1, serials: ['ZTE-ONT-2026-0002'], macs: [], remark: '' },
    ],
    wireLines: [],
    remarks: '',
    status: 'Assigned', assignedBy: 'Admin User', assignedAt: '2026-08-04T09:00:00.000Z',
  },
  {
    id: 'ASG-000006', assignmentNumber: 'ASG-2026-000006',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    branchCode: 'CNPL-002',
    workOrderId: 'INS-016', workOrderLabel: 'INS-016',
    storeId: 'STR-002', storeName: 'Andheri Store',
    hardwareLines: [
      { id: 'ASGI-6-0', productId: 'PRD-001', productName: 'ONT Device', requiredQty: 1, assignedQty: 1, serials: ['ZTE-ONT-2026-0003'], macs: [], remark: '' },
    ],
    wireLines: [],
    remarks: '',
    status: 'Assigned', assignedBy: 'Admin User', assignedAt: '2026-08-06T09:00:00.000Z',
  },
  // ── Three fully-'Returned' assignments — ASSIGNMENT_STATUSES' other
  // value had no seed example before this. hardwareLines/wireLines are
  // empty on all three, matching returnAssignmentLine()'s own real
  // invariant exactly: it always deletes a line from the array on return,
  // and only ever flips status to 'Returned' once every line is gone — a
  // 'Returned' assignment in this app never has any lines left to show.
  // Their former engineer/store/units are correctly free again as a
  // result: getAssignableWorkOrders() only excludes a Work Order for a
  // non-'Returned' assignment (INS-012/013/014 below are open again),
  // and alreadyAssignedQty()/alreadyAssignedValues()/alreadyAssignedMeters()
  // here plus inventoryLedger.js's own computeLedger() (`a.status !==
  // 'Returned'`) both skip these three entirely — the serial+MAC pair,
  // the WiFi Router unit, and the drum meters they once claimed all read
  // as 'Available' again with no separate ledger write needed.
  //
  // IMPORTANT UI caveat: Assignments.jsx's flattenRows() produces one row
  // per hardwareLine/wireLine, never one row per assignment record — with
  // no lines left, these three produce zero rows on /inventory/assign
  // (the same reason they never show an "Edit"/"Back to Store" entry
  // point there either; nothing in this app's UI reads an assignment's
  // raw status literally, only that line-level fallback). Their 'Returned'
  // status is real and fully exercises the underlying data model exactly
  // as a genuine return would, it just isn't a row this particular list
  // can render — there's no "assignment" left to show once every line is
  // gone, the same reason a fully-returned store transfer/PO leaves no
  // outstanding line item to display either.
  //
  // Work Orders INS-012/013/014 (Andheri Store branch CNPL-002, team
  // eng-001 Arjun Kumar + eng-002 Preethi Nair) were free of any prior
  // assignment before this — used here rather than reusing
  // INS-005/006/009/011/015/016 above, which already carry a live
  // 'Assigned' record apiece.
  {
    id: 'ASG-000007', assignmentNumber: 'ASG-2026-000007',
    engineerId: 'eng-002', engineerName: 'Preethi Nair',
    branchCode: 'CNPL-002',
    workOrderId: 'INS-012', workOrderLabel: 'INS-012',
    storeId: 'STR-002', storeName: 'Andheri Store',
    hardwareLines: [],
    wireLines: [],
    remarks: 'Originally issued 1 ONT Device (serial ZTE-ONT-2026-0009 / MAC A4:B1:C2:10:00:09) for this install — job rescheduled before deployment, unit returned unused to Andheri Store.',
    status: 'Returned', assignedBy: 'Admin User', assignedAt: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 'ASG-000008', assignmentNumber: 'ASG-2026-000008',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    branchCode: 'CNPL-002',
    workOrderId: 'INS-013', workOrderLabel: 'INS-013',
    storeId: 'STR-002', storeName: 'Andheri Store',
    hardwareLines: [],
    wireLines: [],
    remarks: 'Originally issued 1 WiFi Router for this install — found defective on pre-install check, returned to Andheri Store for RMA.',
    status: 'Returned', assignedBy: 'Admin User', assignedAt: '2026-08-12T11:30:00.000Z',
  },
  {
    id: 'ASG-000009', assignmentNumber: 'ASG-2026-000009',
    engineerId: 'eng-002', engineerName: 'Preethi Nair',
    branchCode: 'CNPL-002',
    workOrderId: 'INS-014', workOrderLabel: 'INS-014',
    storeId: 'STR-002', storeName: 'Andheri Store',
    hardwareLines: [],
    wireLines: [],
    remarks: 'Originally issued 15m off Drop Wire drum DR-00871 for this install — job cancelled before the run was made, meters returned unspooled to the drum.',
    status: 'Returned', assignedBy: 'Admin User', assignedAt: '2026-08-14T09:45:00.000Z',
  },
]

_nextSeq = SEED.length + 1

let _assignments = [...SEED]
let _nextInternalSeq = _assignments.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._assignments])) }

export function getAssignments() { return _assignments }
export function getAssignment(id) { return _assignments.find(a => a.id === id) ?? null }

export function subscribeAssignments(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// ── Branch → Store resolution ───────────────────────────────────────────
// The seeded Store master is 1:1 with branchCode today (one active store
// per branch) — this resolves to that store rather than adding a separate
// "pick a store" step the phase brief doesn't ask for. If a branch ever
// gains a second active store, this picks the first one; a real store
// picker would be the natural follow-up at that point.
export function getStoreForBranch(branchCode) {
  return getStores().find(s => s.branchCode === branchCode && s.status === 'active') ?? null
}

// ── Engineers per branch ────────────────────────────────────────────────
// There's no per-branch engineer roster anywhere in the app — engineers are
// only ever linked to a branch indirectly, through the Work Orders they've
// been assigned to (Installations' "Assign Team" step writes their name
// onto the Work Order's engineerName field). So "engineers belonging to
// branch X" is derived from that existing link rather than inventing a new
// per-branch roster: any FIELD_ENGINEERS entry whose name appears on at
// least one Work Order in that branch.
export function getEngineersForBranch(branchCode) {
  const names = new Set()
  getInstallations()
    .filter(inst => inst.branch === branchCode && inst.engineerName)
    .forEach(inst => inst.engineerName.split(',').map(s => s.trim()).filter(Boolean).forEach(n => names.add(n)))
  return FIELD_ENGINEERS.filter(e => names.has(e.name))
}

// ── Work Order eligibility ──────────────────────────────────────────────
// "Has an engineer assigned via Assign Team" reads as: the Work Order
// carries a non-empty engineerName — that field is only ever written by
// Installations.jsx's handleNetAssign() (the Assign Team modal's submit),
// via updateInstallationStatus(id, 'Assigned', { engineerName, ... }). A
// Work Order can list multiple engineers (a team install); it's eligible
// for whichever of those named engineers is doing the picking here.
// Already-issued Work Orders are excluded — v1 has no Return workflow yet
// (per the phase brief), so any non-Returned Assignment record against a
// Work Order takes it off the list for good until that ships.
export function getAssignableWorkOrders(branchCode, engineerName) {
  return getInstallations().filter(inst => {
    if (inst.branch !== branchCode) return false
    const names = (inst.engineerName || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!names.includes(engineerName)) return false
    const alreadyIssued = _assignments.some(a => a.workOrderId === inst.id && a.status !== 'Returned')
    return !alreadyIssued
  })
}

export function getWorkOrder(id) {
  return getInstallations().find(i => i.id === id) ?? null
}

// ── Requirement resolution ──────────────────────────────────────────────
// Loose text → live product matching: strips a trailing "(...)" unit
// annotation (Installation hardware/wire rows carry names like "Drop Wire
// (m)" or "Ethernet Cat6 (m)") and compares case-insensitively, falling
// back to a substring match either direction. A line that still matches no
// live product surfaces in the requirement card with productId: null —
// Step 3 shows it as required either way (tell the user what's needed, per
// the PRD), it just can't be fulfilled from live inventory in Step 4.
function normalizeName(s) {
  return (s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
function matchProduct(name) {
  const target = normalizeName(name)
  if (!target) return null
  const products = getProducts()
  return products.find(p => normalizeName(p.name) === target)
    ?? products.find(p => { const n = normalizeName(p.name); return n && (n.includes(target) || target.includes(n)) })
    ?? null
}

// Mirrors Installations.jsx's own startAssign() precedence exactly: prefer
// a linked Feasibility record's hwItems/wireItems (rich {id,name,qty,unit}
// rows a completed Assign Team step can write back), else the Work Order's
// own hwItems/wireItems (same shape, written directly onto the Installation
// when Assign Team's hardware toggle was used), else its baseline
// hardware/wires arrays (the {name,qty} shape every seeded Installation
// already carries). Nothing here invents a new linking field — feasibilityId
// is the same key Installations.jsx already reads.
export function resolveWorkOrderRequirement(workOrder) {
  if (!workOrder) return { hardware: [], wire: [] }
  const fr = workOrder.feasibilityId ? getFeasibilityRequest(workOrder.feasibilityId) : null
  const hwSource = fr?.hwItems?.length ? fr.hwItems
    : workOrder.hwItems?.length ? workOrder.hwItems
    : workOrder.hardware ?? []
  const wireSource = fr?.wireItems?.length ? fr.wireItems
    : workOrder.wireItems?.length ? workOrder.wireItems
    : workOrder.wires ?? []

  const hardware = hwSource.map(h => {
    const product = matchProduct(h.name)
    return { name: h.name, requiredQty: Number(h.qty) || 0, productId: product?.id ?? null, productName: product?.name ?? h.name }
  })
  const wire = wireSource.map(w => {
    const product = matchProduct(w.name)
    return { name: w.name, requiredMeters: Number(w.qty) || 0, productId: product?.id ?? null, productName: product?.name ?? w.name }
  })
  return { hardware, wire }
}

// ── Gross-from-purchases snapshot (save-time validation only) ──────────
// Deliberately duplicates a slice of inventoryLedger.js's own derivation —
// see the file-level note above for why this can't just import that module.
function computeGrossFromPurchases() {
  const balanceByKey = {}
  const units = []
  const drums = []
  getPurchases()
    .filter(pur => pur.status === 'Confirmed')
    .forEach(pur => {
      pur.items.forEach(it => {
        const receivedQty = Number(it.receivedQty) || 0
        if (!it.productId || receivedQty <= 0) return
        const key = `${it.productId}|${pur.storeId}`
        balanceByKey[key] = (balanceByKey[key] ?? 0) + receivedQty
        if (it.type === 'wire' && it.drumNumber?.trim()) {
          drums.push({ productId: it.productId, storeId: pur.storeId, drumNumber: it.drumNumber.trim(), receivedMeters: receivedQty })
        } else if (it.serials?.length && it.macs?.length) {
          // Dual-tracked (Serial + MAC both enabled) — mirrors
          // inventoryLedger.js's own pairing: one unit per received qty,
          // serials[i]/macs[i] describing the same physical unit.
          const count = Math.max(it.serials.length, it.macs.length)
          for (let i = 0; i < count; i++) {
            const serial = (it.serials[i] || '').trim()
            const mac = (it.macs[i] || '').trim()
            if (!serial && !mac) continue
            units.push({ productId: it.productId, storeId: pur.storeId, value: serial || mac, serial: serial || null, mac: mac || null })
          }
        } else if (it.serials?.length) {
          it.serials.filter(s => s?.trim()).forEach(serial => units.push({ productId: it.productId, storeId: pur.storeId, value: serial.trim() }))
        } else if (it.macs?.length) {
          it.macs.filter(m => m?.trim()).forEach(mac => units.push({ productId: it.productId, storeId: pur.storeId, value: mac.trim() }))
        }
      })
    })
  return { balanceByKey, units, drums }
}

// `excludeId` on all three below — used only by updateAssignment()'s own
// validation — leaves one specific assignment's own prior lines out of the
// "already assigned" tally, so editing that assignment sees its own picks
// as still-available-to-pick instead of double-counting them against
// themselves. Mirrors inventoryLedger.js's computeLedger()
// `excludeAssignmentId` on the read side (see that file's note).
function alreadyAssignedQty(productId, storeId, excludeId = null) {
  let sum = 0
  _assignments.forEach(a => {
    if (a.status === 'Returned' || a.storeId !== storeId || a.id === excludeId) return
    a.hardwareLines.forEach(l => {
      if (l.productId !== productId || l.serials.length || l.macs.length) return
      sum += Number(l.assignedQty) || 0
    })
  })
  return sum
}

function alreadyAssignedValues(excludeId = null) {
  const set = new Set()
  _assignments.forEach(a => {
    if (a.status === 'Returned' || a.id === excludeId) return
    a.hardwareLines.forEach(l => { l.serials.forEach(s => set.add(s)); l.macs.forEach(m => set.add(m)) })
  })
  return set
}

function alreadyAssignedMeters(drumNumber, excludeId = null) {
  let sum = 0
  _assignments.forEach(a => {
    if (a.status === 'Returned' || a.id === excludeId) return
    a.wireLines.forEach(l => { if (l.drumNumber === drumNumber) sum += Number(l.assignedMeters) || 0 })
  })
  return sum
}

// ── Save / Update ────────────────────────────────────────────────────────
// data: { engineerId, engineerName, branchCode, workOrderId, workOrderLabel,
//         storeId, storeName,
//         hardwareLines: [{ productId, productName, requiredQty, assignedQty, serials, macs, remark }],
//         wireLines: [{ productId, productName, requiredMeters, assignedMeters, drumNumber, remark }],
//         remarks }
// `remark` on each line is a per-item note distinct from the whole-
// assignment `remarks` string above — both are optional and stored as-is.
// Throws with a descriptive message if a line would take a balance negative
// — the wizard's own live "Available" counters are meant to prevent this
// interactively, but the store re-validates independently rather than
// trusting the caller, the same way isConfirmable()-style gates elsewhere
// in Inventory never assume the UI alone kept the data valid.
//
// Shared by saveAssignment() and updateAssignment() below. `idSeq` seeds
// this call's line ids (so both callers get uniquely-prefixed
// ASGI-*/ASGW-* ids without either needing to know the other's counter
// scheme); `excludeId`, only ever the assignment's own id from
// updateAssignment(), keeps its own prior lines out of the "already
// assigned" tally it would otherwise be validated against — see the
// excludeId note on alreadyAssignedQty()/alreadyAssignedValues()/
// alreadyAssignedMeters() above.
function validateLines(data, idSeq, excludeId = null) {
  const { balanceByKey, units, drums } = computeGrossFromPurchases()
  const assignedValues = alreadyAssignedValues(excludeId)

  const hardwareLines = (data.hardwareLines || [])
    .filter(l => (l.serials?.length) || (l.macs?.length) || (Number(l.assignedQty) || 0) > 0)
    .map((l, idx) => {
      const serials = l.serials ?? []
      const macs = l.macs ?? []
      if (serials.length || macs.length) {
        const values = [...serials, ...macs]
        values.forEach(v => {
          const unit = units.find(u => u.productId === l.productId && u.storeId === data.storeId && (u.value === v || u.mac === v))
          if (!unit) throw new Error(`${v} is not an available unit of ${l.productName} at ${data.storeName}.`)
          if (assignedValues.has(v)) throw new Error(`${v} has already been assigned to another engineer.`)
        })
        // Dual-tracked (serial+mac both present) picks are paired 1:1 — the
        // unit count is the longer of the two lists, not their combined
        // length (which would double-count each physical unit).
        return {
          id: `ASGI-${idSeq}-${idx}`, productId: l.productId, productName: l.productName,
          requiredQty: Number(l.requiredQty) || 0, assignedQty: Math.max(serials.length, macs.length), serials, macs,
          remark: l.remark?.trim() || '',
        }
      }
      const assignedQty = Number(l.assignedQty) || 0
      const gross = balanceByKey[`${l.productId}|${data.storeId}`] ?? 0
      const available = gross - alreadyAssignedQty(l.productId, data.storeId, excludeId)
      if (assignedQty > available) throw new Error(`Only ${available} of ${l.productName} available at ${data.storeName}.`)
      return {
        id: `ASGI-${idSeq}-${idx}`, productId: l.productId, productName: l.productName,
        requiredQty: Number(l.requiredQty) || 0, assignedQty, serials: [], macs: [],
        remark: l.remark?.trim() || '',
      }
    })

  const wireLines = (data.wireLines || [])
    .filter(l => (Number(l.assignedMeters) || 0) > 0)
    .map((l, idx) => {
      const assignedMeters = Number(l.assignedMeters) || 0
      const drum = drums.find(d => d.drumNumber === l.drumNumber && d.productId === l.productId && d.storeId === data.storeId)
      if (!drum) throw new Error(`Drum ${l.drumNumber} was not found at ${data.storeName}.`)
      const remaining = drum.receivedMeters - alreadyAssignedMeters(l.drumNumber, excludeId)
      if (assignedMeters > remaining) throw new Error(`Only ${remaining}m remaining on drum ${l.drumNumber}.`)
      return {
        id: `ASGW-${idSeq}-${idx}`, productId: l.productId, productName: l.productName,
        requiredMeters: Number(l.requiredMeters) || 0, assignedMeters, drumNumber: l.drumNumber,
        remark: l.remark?.trim() || '',
      }
    })

  if (hardwareLines.length === 0 && wireLines.length === 0) {
    throw new Error('Select at least one item to assign.')
  }

  return { hardwareLines, wireLines }
}

export function saveAssignment(data) {
  const { hardwareLines, wireLines } = validateLines(data, _nextInternalSeq)

  const assignment = {
    id: `ASG-${String(_nextInternalSeq++).padStart(6, '0')}`,
    assignmentNumber: nextAssignmentNumber(),
    engineerId: data.engineerId, engineerName: data.engineerName,
    branchCode: data.branchCode,
    workOrderId: data.workOrderId, workOrderLabel: data.workOrderLabel ?? data.workOrderId,
    storeId: data.storeId, storeName: data.storeName,
    hardwareLines, wireLines,
    remarks: data.remarks || '',
    status: 'Assigned',
    assignedBy: 'Admin User', assignedAt: new Date().toISOString(),
  }
  _assignments = [assignment, ..._assignments]
  notify()

  const itemCount = hardwareLines.reduce((s, l) => s + l.assignedQty, 0) + wireLines.length
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `Assigned ${itemCount} items to ${assignment.engineerName} for ${assignment.workOrderLabel}`,
  })

  return assignment
}

// Edits an existing assignment in place — same `data` shape and validation
// as saveAssignment(), with the assignment's own prior lines excluded from
// the "already assigned" tally (see validateLines()'s note) so its own
// picks are still available to keep, drop, or change. Keeps the original
// id/assignmentNumber/status/assignedBy/assignedAt — those describe when
// and by whom the assignment was first issued, which editing its contents
// doesn't rewrite; the audit log entry below is the record of the edit
// itself. Line ids are freshly minted (not reused from before the edit) —
// nothing keys off a hardwareLine/wireLine id surviving an edit today.
export function updateAssignment(id, data) {
  const existing = _assignments.find(a => a.id === id)
  if (!existing) throw new Error('Assignment not found.')

  const { hardwareLines, wireLines } = validateLines(data, _nextInternalSeq++, id)

  const updated = {
    ...existing,
    engineerId: data.engineerId, engineerName: data.engineerName,
    branchCode: data.branchCode,
    workOrderId: data.workOrderId, workOrderLabel: data.workOrderLabel ?? data.workOrderId,
    storeId: data.storeId, storeName: data.storeName,
    hardwareLines, wireLines,
    remarks: data.remarks || '',
  }
  _assignments = _assignments.map(a => a.id === id ? updated : a)
  notify()

  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Edited assignment ${existing.assignmentNumber} (${data.engineerName} for ${updated.workOrderLabel})`,
  })

  return updated
}

// ── Return one line to store ────────────────────────────────────────────
// Reverses a single hardwareLine/wireLine — its serial/MAC unit(s) or
// quantity/meters move back to store-available stock simply by removing
// the line from this assignment's own hardwareLines/wireLines array.
// inventoryLedger.js's computeLedger() derives every unit's status, balance
// deduction, and drum remaining-meters purely from CURRENT non-Returned
// assignments' line contents — once a line is gone, whatever it claimed is
// automatically Available again with no separate ledger write needed (the
// same reason alreadyAssignedQty()/alreadyAssignedValues()/
// alreadyAssignedMeters() above only ever look at _assignments directly).
// If removing this line empties the assignment entirely, the assignment's
// own `status` flips to 'Returned' — never left dangling as 'Assigned'
// with an empty line list, which would make getAssignableWorkOrders()
// keep treating its Work Order as already issued despite nothing being
// assigned any more. `lineKind` is 'hardware' or 'wire'; `lineId` is the
// line's own `id` (e.g. 'ASGI-1-0'/'ASGW-1-0').
export function returnAssignmentLine(assignmentId, lineKind, lineId) {
  const assignment = _assignments.find(a => a.id === assignmentId)
  if (!assignment) throw new Error('Assignment not found.')
  if (assignment.status === 'Returned') throw new Error('This assignment has already been returned.')

  const lines = lineKind === 'wire' ? assignment.wireLines : assignment.hardwareLines
  const line = lines.find(l => l.id === lineId)
  if (!line) throw new Error('Line not found on this assignment.')

  const hardwareLines = lineKind === 'wire' ? assignment.hardwareLines : assignment.hardwareLines.filter(l => l.id !== lineId)
  const wireLines = lineKind === 'wire' ? assignment.wireLines.filter(l => l.id !== lineId) : assignment.wireLines
  const nowEmpty = hardwareLines.length === 0 && wireLines.length === 0

  const updated = { ...assignment, hardwareLines, wireLines, status: nowEmpty ? 'Returned' : assignment.status }
  _assignments = _assignments.map(a => a.id === assignmentId ? updated : a)
  notify()

  const qtyLabel = lineKind === 'wire' ? `${line.assignedMeters}m of ${line.productName}` : `${line.assignedQty} of ${line.productName}`
  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Returned ${qtyLabel} from ${assignment.engineerName} back to ${assignment.storeName}${nowEmpty ? ' — assignment fully returned' : ''}`,
  })

  return updated
}
