// POP Alerts & Notifications — PRD Phase 2. A pure, computed-on-read layer
// (mirrors inventoryLedger.js's own "recompute fresh from real data on
// every call rather than maintain separately-updated state" convention) —
// getPOPAlerts() re-derives every currently-true alert condition straight
// from popStore.js/workOrderStore.js/productStore.js/inventoryLedger.js
// each time it's called, so it can never drift: a Work Order resolving
// clears its SLA-breach alert next render, a stock receipt clears a low-
// stock alert next render, with no separate "dismiss" action needed for
// either.
//
// syncPOPAlertsToNotifications() is the one place this store keeps its own
// state (a session-lifetime Set of alert ids already pushed) — it diffs
// the freshly computed list against that Set and pushes only genuinely NEW
// alerts into the real global notificationStore.js (the same bell/panel
// Header.jsx already renders), so the bell doesn't get one fresh entry per
// alert on every single page render. Called from POP Management's own
// pages (POPManagement.jsx/POPWorkOrders.jsx) on mount — "on each relevant
// page load", per the PRD.
//
// This app has no real email/SMS gateway anywhere (see CustomerDetail.jsx's
// own Send SMS modal, which logs to Activity Log instead of delivering
// anything) — same honest pattern here: these are real, functioning
// in-app alerts, not a pretend email/SMS send.
//
// ── Role mapping (Supervisor / Store Manager / Admin / Technician) ──────
// This app's real roles (rolesStore.js) are Super Admin, Admin, Billing
// Manager, Support Agent, Field Engineer, Read Only — flat, with no
// dedicated "Supervisor" or "Store Manager" tier. Mapping used throughout
// this file (recorded on each alert as `targetRoleLabel`, and folded into
// the notification text pushed to the shared bell, since that feed has no
// per-user/per-role routing of its own — see its own file for why):
//   - "Supervisor" (Cleaning due, SLA breach)      -> Admin / Super Admin
//     (this app's actual day-to-day ops overseers; there's no separate
//     operations-supervisor role to target instead)
//   - "Store Manager" (Warranty/AMC, Low stock)    -> Admin / Super Admin
//     (same reasoning — Admin already holds full Inventory permissions;
//     there's no dedicated warehouse-manager role)
//   - "Admin" (Rent & Agreement expiry)            -> Admin / Super Admin
//     (exact match)
//   - "Technician" (Work Order assigned)           -> Field Engineer
//     (exact match — userStore.js's role='engineer', the canonical
//     Technician entity established by technicianHelpers.js)

import { getPOPs, getPOP, equipmentWarrantyStatus } from './popStore'
import { getWorkOrders, slaStatusOf } from './workOrderStore'
import { getProduct } from './productStore'
import { getProductAvailability } from './inventoryLedger'
import { addNotification } from './notificationStore'

// ── Configurable Cleaning Interval (Settings > POP Alerts Configuration) ──
// Same tiny get/save/subscribe-triplet-over-a-module-level-value shape as
// ticketsStore.js's own getSlaHours()/saveSlaHours()/subscribeSlaHours(),
// scaled down to a single number instead of a per-priority object.
export const DEFAULT_CLEANING_INTERVAL_DAYS = 60
let _cleaningIntervalDays = DEFAULT_CLEANING_INTERVAL_DAYS
const _cleaningIntervalListeners = []

export function getCleaningIntervalDays() { return _cleaningIntervalDays }

export function saveCleaningIntervalDays(days) {
  const n = Number(days)
  _cleaningIntervalDays = Number.isFinite(n) && n > 0 ? n : DEFAULT_CLEANING_INTERVAL_DAYS
  _cleaningIntervalListeners.forEach(fn => fn(_cleaningIntervalDays))
  return _cleaningIntervalDays
}

export function subscribeCleaningIntervalDays(fn) {
  _cleaningIntervalListeners.push(fn)
  return () => { const i = _cleaningIntervalListeners.indexOf(fn); if (i >= 0) _cleaningIntervalListeners.splice(i, 1) }
}

// Rent & Agreement Expiry reuses the same 30-day "approaching" window
// popStore.js's own equipmentWarrantyStatus()/EQUIPMENT_WARRANTY_EXPIRING_SOON_DAYS
// already established for Warranty/AMC — only the Cleaning interval is a
// PRD-requested configurable setting; this one and Warranty/AMC's stay a
// fixed, already-established 30 days for consistency across the app's two
// "expiry approaching" concepts.
const RENT_EXPIRY_WINDOW_DAYS = 30

const MS_PER_DAY = 86400000
function daysSince(dateStr) {
  if (!dateStr) return null
  const today = new Date().toISOString().slice(0, 10)
  return Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${dateStr}T00:00:00Z`)) / MS_PER_DAY)
}
function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date().toISOString().slice(0, 10)
  return Math.round((new Date(`${dateStr}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / MS_PER_DAY)
}

// Every product ever referenced on a POP Work Order's Hardware Need — the
// real, data-driven definition of "POP-related hardware" used to scope the
// Low Central Stock trigger (rather than alerting on the entire Product
// Management catalog, most of which has nothing to do with POPs at all).
function getPOPRelatedProductIds() {
  const ids = new Set()
  getWorkOrders().forEach(wo => (wo.hardwareNeed ?? []).forEach(line => { if (line.productId) ids.add(line.productId) }))
  return ids
}

export const POP_ALERT_TYPES = [
  'cleaning_due', 'sla_breach', 'warranty_expiry', 'low_stock', 'rent_expiry',
]

// Computes every currently-true POP alert across all 5 "standing condition"
// triggers (Work Order Assigned — trigger 6 — is an EVENT, not a standing
// condition, so it's fired directly from workOrderStore.js's saveWorkOrder()
// the moment it happens instead of being recomputed here — see that file).
// Each alert's `id` is deterministic (built from the real record ids it
// describes) so syncPOPAlertsToNotifications() below can tell "still the
// same open alert" apart from "a new one" across repeated calls.
export function getPOPAlerts() {
  const alerts = []
  const pops = getPOPs()
  const intervalDays = getCleaningIntervalDays()

  // 1. Cleaning due — per equipment item, not per POP: a POP with several
  // items only some of which are overdue should only flag those specific
  // items, not the whole site.
  pops.forEach(pop => {
    ;(pop.equipment ?? []).forEach(item => {
      const days = daysSince(item.lastCleaningDate)
      if (days === null || days >= intervalDays) {
        alerts.push({
          id: `cleaning-${pop.id}-${item.id}`,
          type: 'cleaning_due', severity: 'medium', color: 'yellow',
          title: 'Cleaning Due',
          description: `${item.label} at ${pop.name} ${days === null ? 'has never been cleaned' : `hasn't been cleaned in ${days} days`} (interval: ${intervalDays} days). Consider creating a Cleaning Work Order.`,
          targetRoleLabel: 'Supervisor',
          popId: pop.id, workOrderId: null, productId: null,
          link: '/network/pops/work-orders/new',
        })
      }
    })
  })

  // 2. SLA breach on a Work Order.
  getWorkOrders().forEach(wo => {
    if (slaStatusOf(wo) !== 'Breached') return
    const pop = getPOP(wo.popId)
    alerts.push({
      id: `sla-${wo.id}`,
      type: 'sla_breach', severity: 'high', color: 'red',
      title: 'SLA Breached',
      description: `Work Order ${wo.id} (${wo.category}) for ${pop?.name ?? wo.popId} has breached its SLA.`,
      targetRoleLabel: 'Supervisor',
      popId: wo.popId, workOrderId: wo.id, productId: null,
      link: `/network/pops/work-orders/${wo.id}`,
    })
  })

  // 3. Warranty/AMC expiry approaching (or already past) on a POP
  // equipment item — same 30-day badge already shown on POP Inventory.
  pops.forEach(pop => {
    ;(pop.equipment ?? []).forEach(item => {
      const status = equipmentWarrantyStatus(item)
      if (status !== 'Expiring Soon' && status !== 'Expired') return
      alerts.push({
        id: `warranty-${pop.id}-${item.id}`,
        type: 'warranty_expiry', severity: status === 'Expired' ? 'high' : 'medium', color: status === 'Expired' ? 'red' : 'yellow',
        title: status === 'Expired' ? 'Warranty/AMC Expired' : 'Warranty/AMC Expiring Soon',
        description: `${item.label} at ${pop.name} — warranty/AMC ${status === 'Expired' ? 'expired' : 'expires'} ${item.warrantyAmcExpiry}.`,
        targetRoleLabel: 'Store Manager',
        popId: pop.id, workOrderId: null, productId: null,
        link: `/network/pops/${pop.id}/inventory`,
      })
    })
  })

  // 4. Low central stock, scoped to POP-related hardware only.
  getPOPRelatedProductIds().forEach(productId => {
    const product = getProduct(productId)
    if (!product || product.reorderAlertQty == null) return
    const available = getProductAvailability(productId)
    if (available > product.reorderAlertQty) return
    alerts.push({
      id: `stock-${productId}`,
      type: 'low_stock', severity: 'medium', color: 'orange',
      title: 'Low Central Stock',
      description: `${product.name} — ${available} available at central stock, at or below the reorder level (${product.reorderAlertQty}). Used on POP Work Orders.`,
      targetRoleLabel: 'Store Manager',
      popId: null, workOrderId: null, productId,
      link: '/inventory/products',
    })
  })

  // 5. Rent & Agreement expiry approaching (or already past) on a POP.
  pops.forEach(pop => {
    const days = daysUntil(pop.rentAgreementExpiry)
    if (days === null || days > RENT_EXPIRY_WINDOW_DAYS) return
    alerts.push({
      id: `rent-${pop.id}`,
      type: 'rent_expiry', severity: days < 0 ? 'high' : 'medium', color: days < 0 ? 'red' : 'yellow',
      title: days < 0 ? 'Rent & Agreement Expired' : 'Rent & Agreement Expiring Soon',
      description: `${pop.name}'s rent/site agreement ${days < 0 ? 'expired' : 'expires'} ${pop.rentAgreementExpiry}.`,
      targetRoleLabel: 'Admin',
      popId: pop.id, workOrderId: null, productId: null,
      link: `/network/pops/${pop.id}`,
    })
  })

  return alerts
}

// Only 'blue'/'yellow'/'red'/'purple' render correctly in Header.jsx's own
// ICON_BG/BORDER_HEX maps (anything else silently falls back to blue) —
// this file's own richer per-alert `color` (including 'orange' for Low
// Stock) is for the dedicated POP Alerts widget's own Badge component,
// which has the full palette; notifications pushed to the shared bell are
// remapped down to that 4-color set by severity instead.
const NOTIFICATION_COLOR_BY_SEVERITY = { high: 'red', medium: 'yellow' }

// Diffs the freshly computed alert list against alerts already pushed to
// the shared bell this session and pushes only the new ones — called from
// POP Management's own page mounts. Returns the full current list either
// way, so a caller can render it directly (e.g. a "POP Alerts" widget)
// without a second getPOPAlerts() call.
const _notifiedAlertIds = new Set()
export function syncPOPAlertsToNotifications() {
  const alerts = getPOPAlerts()
  alerts.forEach(a => {
    if (_notifiedAlertIds.has(a.id)) return
    _notifiedAlertIds.add(a.id)
    addNotification({
      type: a.type,
      title: a.title,
      description: `${a.description} (Notify: ${a.targetRoleLabel})`,
      meta: a.workOrderId ?? a.popId ?? a.productId ?? '',
      reference: a.workOrderId ?? a.popId ?? a.productId ?? null,
      color: NOTIFICATION_COLOR_BY_SEVERITY[a.severity] ?? 'yellow',
    })
  })
  return alerts
}
