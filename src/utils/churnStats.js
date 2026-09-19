// Shared churn aggregation helper — used by Reports.jsx's Churn Report.
//
// "New joins per month" comes from each customer's real `createdOn` (now
// backfilled on every seeded record in customersData.js — see that file's
// own comment on CUSTOMERS). "Churned per month" comes from `statusChangedAt`
// (set by every updateCustomer() call that changes `status` — see that
// function's own comment) wherever the resulting status is 'Disconnected',
// the one real status value in CUSTOMER_STATUSES that means a customer has
// actually left, not just gone quiet. 'suspended'/'inactive' are reversible
// states — a suspended customer can be reactivated — so they're surfaced
// separately as "at risk", not folded into churn, which would overstate
// permanent loss.
//
// Unlike computeRevenueByMonth()/computeCollectionByMonth() (fed by
// paymentsStore.js, which only ever holds new, ongoing activity),
// createdOn is historical backfill spread over roughly the past 1-2 years,
// while statusChangedAt only starts recording real transitions from
// whenever this feature shipped — so this returns every month that has
// real data on either side, not just a recent rolling window: truncating
// to "last 6 months" the way the Revenue/Collection Reports do would hide
// almost all of the real join history behind an empty chart.
import { monthKeyFromDMonYYYY, monthLabelFromKey } from './dateFormats'

const CHURNED_STATUS = 'Disconnected'
const AT_RISK_STATUSES = new Set(['suspended', 'inactive'])

export function computeChurnByMonth(customers) {
  const newJoinsByKey = new Map()
  const churnedByKey = new Map()
  const atRiskByKey = new Map()

  customers.forEach(c => {
    const joinKey = monthKeyFromDMonYYYY(c.createdOn)
    if (joinKey) newJoinsByKey.set(joinKey, (newJoinsByKey.get(joinKey) || 0) + 1)

    if (c.statusChangedAt) {
      const key = c.statusChangedAt.slice(0, 7) // ISO "YYYY-MM-DD..." -> "YYYY-MM"
      if (c.status === CHURNED_STATUS) {
        churnedByKey.set(key, (churnedByKey.get(key) || 0) + 1)
      } else if (AT_RISK_STATUSES.has(c.status)) {
        atRiskByKey.set(key, (atRiskByKey.get(key) || 0) + 1)
      }
    }
  })

  const allKeys = new Set([...newJoinsByKey.keys(), ...churnedByKey.keys(), ...atRiskByKey.keys()])
  return [...allKeys]
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      const newJoins = newJoinsByKey.get(key) ?? 0
      const churned = churnedByKey.get(key) ?? 0
      return {
        key,
        month: monthLabelFromKey(key),
        newJoins,
        churned,
        atRisk: atRiskByKey.get(key) ?? 0,
        net: newJoins - churned,
      }
    })
}

// Live snapshot, not month-scoped — how many customers are in a reversible
// "at risk" state right now, independent of *when* they entered it. A
// real, immediately-populated number (today's 34 seeded customers already
// include several suspended/inactive ones) that doesn't depend on
// statusChangedAt having recorded anything yet.
export function countCurrentlyAtRisk(customers) {
  return customers.filter(c => AT_RISK_STATUSES.has(c.status)).length
}
