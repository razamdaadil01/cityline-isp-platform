import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getAssets, getAsset, subscribeAssets, assetDisplayName, ASSET_STATUSES } from '../../data/assetStore'
import { getAssetRepairs, subscribeAssetRepairs } from '../../data/assetRepairStore'
import { getWarrantyStatus, getWarrantyEndDate } from '../../utils/warrantyStatus'

// Phase 7 — Reports & Dashboard (PRD Section 12). Read-only aggregation
// over Phases 1-6's own stores; no new data capture, no write paths here.
// Same small per-page badge-map convention every other Asset Management
// page already uses (AssetList.jsx/AssetDetail.jsx keep their own copies
// too, rather than sharing one) — kept local rather than imported.
const WARRANTY_BADGE = { Active: 'green', 'Expiring Soon': 'yellow', Expired: 'red', 'N/A': 'gray' }
const REPAIR_STATUS_BADGE = { 'Under Repair': 'orange', 'Sent to Vendor': 'indigo', 'In Progress': 'yellow', 'Received Back': 'blue', Resolved: 'green' }
// Phase 8 — same Retired/Lost colors AssetList.jsx/AssetDetail.jsx use.
const STATUS_BADGE = { Retired: 'slate', Lost: 'black' }

function ReportCard({ title, count, children }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {count != null && <span className="text-xs text-gray-400">{count}</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ children = 'No data yet.' }) {
  return <p className="px-5 py-6 text-center text-sm text-gray-400">{children}</p>
}

// ── (a) Assets by Category / Status ─────────────────────────────────────
function categoryStatusBreakdown(assets) {
  const byCategory = new Map()
  assets.forEach(a => {
    if (!byCategory.has(a.categoryId)) {
      byCategory.set(a.categoryId, {
        categoryLabel: a.categoryLabel,
        counts: Object.fromEntries(ASSET_STATUSES.map(s => [s, 0])),
        total: 0,
      })
    }
    const row = byCategory.get(a.categoryId)
    row.counts[a.status] = (row.counts[a.status] ?? 0) + 1
    row.total += 1
  })
  return [...byCategory.values()].sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel))
}

// ── (b) Assets by Engineer — a live view of assignedTo, not a stored
// report; recomputed fresh from `assets` on every render. ────────────────
function engineerHoldings(assets) {
  const byEngineer = new Map()
  assets.filter(a => a.status === 'Assigned' && a.assignedTo).forEach(a => {
    const name = a.assignedTo.engineerName
    if (!byEngineer.has(name)) byEngineer.set(name, [])
    byEngineer.get(name).push(a)
  })
  return [...byEngineer.entries()]
    .map(([engineerName, list]) => ({ engineerName, assets: list }))
    .sort((a, b) => a.engineerName.localeCompare(b.engineerName))
}

// ── (c) Warranty Expiry Report — reuses Phase 6's own live computation,
// never a stored status. Sorted soonest-to-expire first (an Expired end
// date sorts before an Expiring Soon one, same "furthest overdue first"
// ordering a plain ascending date sort naturally gives). ────────────────
function warrantyExpiryReport(assets) {
  return assets
    .map(a => ({ asset: a, warrantyStatus: getWarrantyStatus(a), endDate: getWarrantyEndDate(a) }))
    .filter(r => r.warrantyStatus === 'Expiring Soon' || r.warrantyStatus === 'Expired')
    .sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''))
}

// ── (d) Repair History & Recurring Faults — aggregated from
// assetRepairStore.js's own live records (getAssetRepairs()), not a
// repairHistory array on the asset record — that field was deliberately
// never added; see assetRepairStore.js's own file-level note on why
// getRepairsForAsset()/getAssetRepairs() are the single source of truth
// for repair history instead of a duplicated snapshot. "Recurring fault"
// = more than one repair record against the same asset. ─────────────────
function recurringFaults(repairs) {
  const byAsset = new Map()
  repairs.forEach(r => {
    if (!byAsset.has(r.assetId)) byAsset.set(r.assetId, [])
    byAsset.get(r.assetId).push(r)
  })
  return [...byAsset.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([assetId, list]) => {
      const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return { assetId, count: list.length, mostRecent: sorted[0] }
    })
    .sort((a, b) => b.count - a.count)
}

// ── (e) Missing/Lost Component Report — an asset qualifies only via its
// own hasMissingComponents flag, set specifically by initiateAssetReturn()
// when a real Return flow marks a kit component as not-returned. A
// component sitting at receivedStatus: 'Missing' on its own (e.g. seeded
// directly, or flagged at GRN with no Return event behind it) does NOT
// surface here — there's no real flagged date/event to report. Flagged
// date is read off the most recent returnHistory entry that actually
// listed a missing component, since that's the only place a "when" exists
// for this. ────────────────────────────────────────────────────────────
function missingComponentReport(assets) {
  return assets
    .filter(a => a.hasMissingComponents)
    .map(a => {
      const missingComponents = (a.fields?.kitComponents || []).filter(c => c.receivedStatus === 'Missing')
      const lastFlagged = (a.returnHistory || []).find(e => e.missingComponentIds?.length > 0)
      return { asset: a, missingComponents, flaggedDate: lastFlagged?.date ?? null }
    })
}

// ── (f) Retired / Lost Assets — Phase 8 audit visibility. Reason/date are
// read from whichever of retirementInfo/lostInfo applies to the asset's
// own current terminal status. ───────────────────────────────────────────
function retiredLostReport(assets) {
  return assets
    .filter(a => a.status === 'Retired' || a.status === 'Lost')
    .map(a => ({
      asset: a,
      reason: a.status === 'Retired' ? a.retirementInfo?.reason : a.lostInfo?.reason,
      date: a.status === 'Retired' ? a.retirementInfo?.date : a.lostInfo?.date,
      by: a.status === 'Retired' ? a.retirementInfo?.retiredBy : a.lostInfo?.reportedBy,
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export default function AssetReports() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState(getAssets)
  useEffect(() => subscribeAssets(setAssets), [])
  const [repairs, setRepairs] = useState(getAssetRepairs)
  useEffect(() => subscribeAssetRepairs(setRepairs), [])

  const categoryRows = categoryStatusBreakdown(assets)
  const engineerRows = engineerHoldings(assets)
  const warrantyRows = warrantyExpiryReport(assets)
  const recurringRows = recurringFaults(repairs)
  const repairLog = [...repairs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const missingRows = missingComponentReport(assets)
  const retiredLostRows = retiredLostReport(assets)

  const th = 'text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[11px]'
  const td = 'px-4 py-2.5 text-gray-700'

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/assets')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Read-only summaries over existing asset, assignment, repair and warranty data.</p>
        </div>
      </div>

      {/* (a) Assets by Category / Status */}
      <ReportCard title="Assets by Category / Status" count={`${assets.length} assets`}>
        {categoryRows.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className={th}>Category</th>
                  {ASSET_STATUSES.map(s => <th key={s} className={`${th} text-right`}>{s}</th>)}
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {categoryRows.map(row => (
                  <tr key={row.categoryLabel}>
                    <td className={`${td} font-medium text-gray-800`}>{row.categoryLabel}</td>
                    {ASSET_STATUSES.map(s => <td key={s} className={`${td} text-right`}>{row.counts[s] || <span className="text-gray-300">0</span>}</td>)}
                    <td className={`${td} text-right font-semibold text-gray-900`}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* (b) Assets by Engineer */}
      <ReportCard title="Assets by Engineer" count={`${engineerRows.length} engineer${engineerRows.length !== 1 ? 's' : ''}`}>
        {engineerRows.length === 0 ? <EmptyState /> : (
          <div className="divide-y divide-surface-border">
            {engineerRows.map(({ engineerName, assets: held }) => (
              <div key={engineerName} className="px-5 py-3.5">
                <p className="text-xs font-semibold text-gray-800 mb-2">{engineerName} <span className="text-gray-400 font-normal">({held.length})</span></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className={th}>Asset ID</th>
                        <th className={th}>Name</th>
                        <th className={th}>Category / Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {held.map(a => (
                        <tr key={a.id}>
                          <td className={`${td} font-mono text-brand-blue`}>{a.id}</td>
                          <td className={td}>{assetDisplayName(a)}</td>
                          <td className={td}>{a.categoryLabel} · {a.typeLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </ReportCard>

      {/* (c) Warranty Expiry Report */}
      <ReportCard title="Warranty Expiry Report" count={`${warrantyRows.length} asset${warrantyRows.length !== 1 ? 's' : ''}`}>
        {warrantyRows.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className={th}>Asset ID</th>
                  <th className={th}>Name</th>
                  <th className={th}>Category / Type</th>
                  <th className={th}>Warranty End Date</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {warrantyRows.map(({ asset: a, warrantyStatus, endDate }) => (
                  <tr key={a.id}>
                    <td className={`${td} font-mono text-brand-blue`}>{a.id}</td>
                    <td className={td}>{assetDisplayName(a)}</td>
                    <td className={td}>{a.categoryLabel} · {a.typeLabel}</td>
                    <td className={td}>{endDate || '—'}</td>
                    <td className={td}><Badge variant={WARRANTY_BADGE[warrantyStatus] ?? 'gray'} size="sm" dot>{warrantyStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* (d) Repair History & Recurring Faults */}
      <ReportCard title="Recurring Faults (2+ repairs)" count={`${recurringRows.length} asset${recurringRows.length !== 1 ? 's' : ''}`}>
        {recurringRows.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className={th}>Asset ID</th>
                  <th className={th}>Name</th>
                  <th className={`${th} text-right`}>Repairs</th>
                  <th className={th}>Most Recent Fault</th>
                  <th className={th}>Most Recent Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {recurringRows.map(row => {
                  const asset = getAsset(row.assetId)
                  return (
                    <tr key={row.assetId}>
                      <td className={`${td} font-mono text-brand-blue`}>{row.assetId}</td>
                      <td className={td}>{asset ? assetDisplayName(asset) : '—'}</td>
                      <td className={`${td} text-right font-semibold`}>{row.count}</td>
                      <td className={td}>{row.mostRecent.faultDescription}</td>
                      <td className={td}>{row.mostRecent.resolution || <span className="text-gray-300">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      <ReportCard title="Repair Log (all records)" count={`${repairLog.length} record${repairLog.length !== 1 ? 's' : ''}`}>
        {repairLog.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className={th}>Repair ID</th>
                  <th className={th}>Asset</th>
                  <th className={th}>Fault</th>
                  <th className={th}>Path</th>
                  <th className={th}>Status</th>
                  <th className={th}>Resolution</th>
                  <th className={th}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {repairLog.map(r => {
                  const asset = getAsset(r.assetId)
                  return (
                    <tr key={r.id}>
                      <td className={`${td} font-mono text-brand-blue`}>{r.repairId}</td>
                      <td className={td}>{r.assetId}{asset ? ` — ${assetDisplayName(asset)}` : ''}</td>
                      <td className={td}>{r.faultDescription}</td>
                      <td className={td}>{r.repairPath}{r.isWarrantyClaim ? ' (Warranty)' : ''}</td>
                      <td className={td}><Badge variant={REPAIR_STATUS_BADGE[r.status] ?? 'gray'} size="sm" dot>{r.status}</Badge></td>
                      <td className={td}>{r.resolution || <span className="text-gray-300">—</span>}</td>
                      <td className={td}>{r.reportedDate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* (e) Missing/Lost Component Report */}
      <ReportCard title="Missing / Lost Component Report" count={`${missingRows.length} asset${missingRows.length !== 1 ? 's' : ''}`}>
        {missingRows.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className={th}>Asset ID</th>
                  <th className={th}>Name</th>
                  <th className={th}>Missing Component(s)</th>
                  <th className={th}>Flagged On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {missingRows.map(({ asset: a, missingComponents, flaggedDate }) => (
                  <tr key={a.id}>
                    <td className={`${td} font-mono text-brand-blue`}>{a.id}</td>
                    <td className={td}>{assetDisplayName(a)}</td>
                    <td className={td}>
                      {missingComponents.length > 0
                        ? missingComponents.map(c => c.componentType || c.componentName || '—').join(', ')
                        : <span className="text-gray-400">Flagged at return — component detail not on this asset</span>}
                    </td>
                    <td className={td}>{flaggedDate ? flaggedDate.slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* (f) Retired / Lost Assets */}
      <ReportCard title="Retired / Lost Assets" count={`${retiredLostRows.length} asset${retiredLostRows.length !== 1 ? 's' : ''}`}>
        {retiredLostRows.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className={th}>Asset ID</th>
                  <th className={th}>Name</th>
                  <th className={th}>Status</th>
                  <th className={th}>Reason</th>
                  <th className={th}>Date</th>
                  <th className={th}>By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {retiredLostRows.map(({ asset: a, reason, date, by }) => (
                  <tr key={a.id}>
                    <td className={`${td} font-mono text-brand-blue`}>{a.id}</td>
                    <td className={td}>{assetDisplayName(a)}</td>
                    <td className={td}><Badge variant={STATUS_BADGE[a.status] ?? 'gray'} size="sm" dot>{a.status}</Badge></td>
                    <td className={td}>{reason || <span className="text-gray-300">—</span>}</td>
                    <td className={td}>{date ? date.slice(0, 10) : '—'}</td>
                    <td className={td}>{by || <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>
    </div>
  )
}
