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

let _assignments = []
let _nextInternalSeq = 1
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
        } else if (it.serials?.length) {
          it.serials.filter(s => s?.trim()).forEach(serial => units.push({ productId: it.productId, storeId: pur.storeId, value: serial.trim() }))
        } else if (it.macs?.length) {
          it.macs.filter(m => m?.trim()).forEach(mac => units.push({ productId: it.productId, storeId: pur.storeId, value: mac.trim() }))
        }
      })
    })
  return { balanceByKey, units, drums }
}

function alreadyAssignedQty(productId, storeId) {
  let sum = 0
  _assignments.forEach(a => {
    if (a.status === 'Returned' || a.storeId !== storeId) return
    a.hardwareLines.forEach(l => {
      if (l.productId !== productId || l.serials.length || l.macs.length) return
      sum += Number(l.assignedQty) || 0
    })
  })
  return sum
}

function alreadyAssignedValues() {
  const set = new Set()
  _assignments.forEach(a => {
    if (a.status === 'Returned') return
    a.hardwareLines.forEach(l => { l.serials.forEach(s => set.add(s)); l.macs.forEach(m => set.add(m)) })
  })
  return set
}

function alreadyAssignedMeters(drumNumber) {
  let sum = 0
  _assignments.forEach(a => {
    if (a.status === 'Returned') return
    a.wireLines.forEach(l => { if (l.drumNumber === drumNumber) sum += Number(l.assignedMeters) || 0 })
  })
  return sum
}

// ── Save ─────────────────────────────────────────────────────────────────
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
export function saveAssignment(data) {
  const { balanceByKey, units, drums } = computeGrossFromPurchases()
  const assignedValues = alreadyAssignedValues()

  const hardwareLines = (data.hardwareLines || [])
    .filter(l => (l.serials?.length) || (l.macs?.length) || (Number(l.assignedQty) || 0) > 0)
    .map((l, idx) => {
      const serials = l.serials ?? []
      const macs = l.macs ?? []
      if (serials.length || macs.length) {
        const values = [...serials, ...macs]
        values.forEach(v => {
          const unit = units.find(u => u.productId === l.productId && u.storeId === data.storeId && u.value === v)
          if (!unit) throw new Error(`${v} is not an available unit of ${l.productName} at ${data.storeName}.`)
          if (assignedValues.has(v)) throw new Error(`${v} has already been assigned to another engineer.`)
        })
        return {
          id: `ASGI-${_nextInternalSeq}-${idx}`, productId: l.productId, productName: l.productName,
          requiredQty: Number(l.requiredQty) || 0, assignedQty: values.length, serials, macs,
          remark: l.remark?.trim() || '',
        }
      }
      const assignedQty = Number(l.assignedQty) || 0
      const gross = balanceByKey[`${l.productId}|${data.storeId}`] ?? 0
      const available = gross - alreadyAssignedQty(l.productId, data.storeId)
      if (assignedQty > available) throw new Error(`Only ${available} of ${l.productName} available at ${data.storeName}.`)
      return {
        id: `ASGI-${_nextInternalSeq}-${idx}`, productId: l.productId, productName: l.productName,
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
      const remaining = drum.receivedMeters - alreadyAssignedMeters(l.drumNumber)
      if (assignedMeters > remaining) throw new Error(`Only ${remaining}m remaining on drum ${l.drumNumber}.`)
      return {
        id: `ASGW-${_nextInternalSeq}-${idx}`, productId: l.productId, productName: l.productName,
        requiredMeters: Number(l.requiredMeters) || 0, assignedMeters, drumNumber: l.drumNumber,
        remark: l.remark?.trim() || '',
      }
    })

  if (hardwareLines.length === 0 && wireLines.length === 0) {
    throw new Error('Select at least one item to assign.')
  }

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
