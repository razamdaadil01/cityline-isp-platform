// Shared partner/store collection aggregation — used by Reports.jsx's
// Partner & Store-wise Collection Report. Real join: each customer now
// carries a real `storeId` (storeStore.js) and, for customers who signed
// up through a reseller, a real `partnerId` (partners.js) — see
// customersData.js's own comment on CUSTOMERS. Collection amounts are
// summed from each of those customers' real paymentsStore.js records
// (same source Revenue/Collection Reports already use).
//
// There's no real "pending" figure per store/partner — invoicesStore.js
// (the only pending-amount source anywhere in this app) has no
// customerId at all (it's a single shared, non-per-customer list — see
// that file's own comment, and collectionStats.js's), so a pending
// invoice can't be attributed to any specific customer, let alone the
// store/partner that customer belongs to. Only real, attributable numbers
// (collected amount, customer count, share of total) are surfaced here —
// no pending/collection-rate column is fabricated.

export const DIRECT_LABEL = 'Direct (no partner)'

function sumPaymentsByKey(customers, payments, keyOf) {
  const keyByCustomerId = new Map(customers.map(c => [c.id, keyOf(c)]))
  const collectedByKey = new Map()
  payments.forEach(p => {
    const key = keyByCustomerId.get(p.customerId)
    if (key == null) return
    collectedByKey.set(key, (collectedByKey.get(key) || 0) + (Number(p.paid ?? p.total) || 0))
  })
  return collectedByKey
}

// One row per real store (storeStore.js), including stores with zero
// assigned customers/collection so far — a store isn't hidden just for
// not having any activity yet.
export function computeStoreCollection(customers, payments, stores) {
  const collectedByStoreId = sumPaymentsByKey(customers, payments, c => c.storeId)
  const customerCountByStoreId = new Map()
  customers.forEach(c => {
    if (!c.storeId) return
    customerCountByStoreId.set(c.storeId, (customerCountByStoreId.get(c.storeId) || 0) + 1)
  })
  const totalCollected = [...collectedByStoreId.values()].reduce((sum, v) => sum + v, 0)
  return stores
    .map(s => {
      const collected = collectedByStoreId.get(s.id) ?? 0
      return {
        storeId: s.id,
        storeName: s.storeName,
        customerCount: customerCountByStoreId.get(s.id) ?? 0,
        collected,
        pct: totalCollected === 0 ? 0 : (collected / totalCollected) * 100,
      }
    })
    .sort((a, b) => b.collected - a.collected)
}

// One row per real partner (partners.js), including partners with no
// assigned customers/collection yet (same "don't hide zero-activity rows"
// convention as computeStoreCollection() above), plus a real "Direct (no
// partner)" bucket for every customer with no partnerId set — the normal
// case for an ISP, not an edge case to hide.
export function computePartnerCollection(customers, payments, partners) {
  const collectedByPartnerId = sumPaymentsByKey(customers, payments, c => c.partnerId ?? DIRECT_LABEL)
  const customerCountByPartnerId = new Map()
  customers.forEach(c => {
    const key = c.partnerId ?? DIRECT_LABEL
    customerCountByPartnerId.set(key, (customerCountByPartnerId.get(key) || 0) + 1)
  })
  const totalCollected = [...collectedByPartnerId.values()].reduce((sum, v) => sum + v, 0)

  const rows = partners.map(p => ({ key: p.id, label: p.name }))
  rows.push({ key: DIRECT_LABEL, label: DIRECT_LABEL })

  return rows
    .map(({ key, label }) => {
      const collected = collectedByPartnerId.get(key) ?? 0
      return {
        partnerId: key === DIRECT_LABEL ? null : key,
        partnerName: label,
        customerCount: customerCountByPartnerId.get(key) ?? 0,
        collected,
        pct: totalCollected === 0 ? 0 : (collected / totalCollected) * 100,
      }
    })
    .sort((a, b) => b.collected - a.collected)
}
