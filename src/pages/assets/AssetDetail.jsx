import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, UserPlus, RotateCcw, Wrench, AlertTriangle, ChevronDown } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import AssignAssetModal from '../../components/assets/AssignAssetModal'
import ReturnAssetModal from '../../components/assets/ReturnAssetModal'
import RepairRequestModal from '../../components/assets/RepairRequestModal'
import { getAsset, subscribeAssets, assetDisplayName, checkWarrantyAlerts } from '../../data/assetStore'
import {
  getActiveRepairForAsset, getRepairsForAsset, updateRepairStatus, resolveRepair, subscribeAssetRepairs,
} from '../../data/assetRepairStore'
import { getFieldsForType } from '../../data/assetTaxonomy'
import { getWarrantyStatus } from '../../utils/warrantyStatus'
import { getVendors } from '../../data/vendorStore'
import { FIELD_ENGINEERS } from '../../data/installationsStore'

const STATUS_BADGE = { Draft: 'gray', 'PO Raised': 'indigo', 'In Stock': 'green', Assigned: 'purple', 'Under Repair': 'orange', Retired: 'slate', Lost: 'black' }
const REPAIR_STATUS_BADGE = { 'Under Repair': 'orange', 'Sent to Vendor': 'indigo', 'In Progress': 'yellow', 'Received Back': 'blue', Resolved: 'green' }
const WARRANTY_BADGE = { Active: 'green', 'Expiring Soon': 'yellow', Expired: 'red', 'N/A': 'gray' }
// The one field (per category) whose value the Purchase/Warranty card
// shows the live warranty badge next to — same two keys
// utils/warrantyStatus.js itself reads (getWarrantyEndDate()).
function isWarrantyEndKey(key) { return key === 'warrantyEndDate' || key === 'warrantyDate' }
// Sent to Vendor -> In Progress -> Received Back — Resolved is reached via
// its own dedicated action (Mark Fixed / Beyond Repair) below, never via
// this "advance one step" map.
const NEXT_REPAIR_STATUS = { 'Under Repair': 'Sent to Vendor', 'Sent to Vendor': 'In Progress', 'In Progress': 'Received Back' }

// Which "section" a taxonomy field's value belongs in — purely by its key,
// since every category's field keys already carry that meaning
// consistently (purchaseDate/warrantyStartDate/warrantyEndDate/
// warrantyDate/vendorId/validFrom/validTo/issuedTo across all 5
// categories) rather than needing a per-category grouping map. Kit
// Components is always its own section, never folded into either group.
const PURCHASE_WARRANTY_KEYS = new Set([
  'purchaseDate', 'warrantyStartDate', 'warrantyEndDate', 'warrantyDate', 'vendorId', 'validFrom', 'validTo', 'issuedTo',
])

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">
        {value === undefined || value === null || value === '' ? <span className="text-gray-300">—</span> : value}
      </span>
    </div>
  )
}

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribeAssets(() => forceRerender(n => n + 1)), [])
  useEffect(() => subscribeAssetRepairs(() => forceRerender(n => n + 1)), [])
  // Phase 6 — same on-page-load scan AssetList.jsx runs (see
  // assetStore.js's own note on checkWarrantyAlerts()); this app has no
  // background job/cron to fire it any other way.
  useEffect(() => { checkWarrantyAlerts() }, [])

  const [assigning, setAssigning] = useState(false)
  const [returning, setReturning] = useState(false)
  const [sendingForRepair, setSendingForRepair] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [repairHistoryOpen, setRepairHistoryOpen] = useState(false)

  const asset = getAsset(id)

  if (!asset) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/assets')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Asset Management
        </button>
        <p className="text-sm text-gray-400 mt-4">Asset {id} was not found.</p>
      </div>
    )
  }

  const fieldDefs = getFieldsForType(asset.categoryId, asset.typeId)
  const basicFields = fieldDefs.filter(f => f.type !== 'kit-components' && !PURCHASE_WARRANTY_KEYS.has(f.key))
  const purchaseWarrantyFields = fieldDefs.filter(f => f.type !== 'kit-components' && PURCHASE_WARRANTY_KEYS.has(f.key))
  const kitComponentsField = fieldDefs.find(f => f.type === 'kit-components')
  const kitRows = kitComponentsField ? (asset.fields[kitComponentsField.key] || []) : []
  const isSplicingMachine = asset.categoryId === 'field-splicing-tools' && asset.typeId === 'splicing-machine'
  const activeRepair = getActiveRepairForAsset(asset.id)
  const repairs = getRepairsForAsset(asset.id)
  const warrantyStatus = getWarrantyStatus(asset)

  function displayValue(field) {
    const raw = asset.fields[field.key]
    if (raw === undefined || raw === null || raw === '') return null
    if (field.type === 'vendor-select') return getVendors().find(v => v.id === raw)?.companyName ?? raw
    if (field.type === 'engineer-select') return FIELD_ENGINEERS.find(e => e.id === raw)?.name ?? raw
    return raw
  }

  return (
    <div className="p-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/assets')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{asset.id}</h1>
              <Badge variant={STATUS_BADGE[asset.status] ?? 'gray'} size="sm" dot>{asset.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{asset.categoryLabel} · {asset.typeLabel} · {assetDisplayName(asset)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {asset.status === 'In Stock' && (
            <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setAssigning(true)}>
              Assign to Engineer
            </Button>
          )}
          {asset.status === 'Assigned' && (
            <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => setReturning(true)}>
              Return
            </Button>
          )}
          {asset.status === 'Under Repair' && !activeRepair && (
            <Button size="sm" icon={<Wrench size={14} />} onClick={() => setSendingForRepair(true)}>
              Send for Repair
            </Button>
          )}
          {asset.poId && (
            <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/inventory/purchase-orders/${asset.poId}`)}>
              View PO
            </Button>
          )}
        </div>
      </div>

      {asset.hasMissingComponents && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>Missing kit component(s) reported at last return — see Kit Components and Return History below.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Basic Information</p>
          {basicFields.length === 0 ? (
            <p className="text-xs text-gray-400">No basic fields recorded for this type.</p>
          ) : basicFields.map(f => <InfoRow key={f.key} label={f.label} value={displayValue(f)} />)}
        </div>

        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Purchase / Warranty Information</p>
          {purchaseWarrantyFields.length === 0 ? (
            <p className="text-xs text-gray-400">No purchase/warranty fields recorded for this type.</p>
          ) : purchaseWarrantyFields.map(f => {
            const value = displayValue(f)
            const showWarrantyBadge = isWarrantyEndKey(f.key) && value != null && warrantyStatus !== 'N/A'
            return (
              <InfoRow
                key={f.key} label={f.label}
                value={showWarrantyBadge ? (
                  <span className="inline-flex items-center gap-2">
                    {value}
                    <Badge variant={WARRANTY_BADGE[warrantyStatus] ?? 'gray'} size="sm" dot>{warrantyStatus}</Badge>
                  </span>
                ) : value}
              />
            )
          })}
          <InfoRow label="Added By" value={asset.createdBy} />
          <InfoRow label="Added On" value={(asset.createdAt || '').slice(0, 10)} />
        </div>

        {asset.status === 'Retired' && asset.retirementInfo && (
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card xl:col-span-2">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Retirement</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
              <InfoRow label="Reason" value={asset.retirementInfo.reason} />
              <InfoRow label="Retired On" value={(asset.retirementInfo.date || '').slice(0, 10)} />
              <InfoRow label="Retired By" value={asset.retirementInfo.retiredBy} />
            </div>
            <p className="text-xs text-gray-500 mt-3">Full history below (purchase, assignment, return, repair) stays on record for audit.</p>
          </div>
        )}

        {asset.status === 'Lost' && asset.lostInfo && (
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card xl:col-span-2">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Reported Lost</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
              <InfoRow label="Reported On" value={(asset.lostInfo.date || '').slice(0, 10)} />
              <InfoRow label="Reported By" value={asset.lostInfo.reportedBy} />
            </div>
            <InfoRow label="Reason / Notes" value={asset.lostInfo.reason} />
            <p className="text-xs text-gray-500 mt-3">Full history below (purchase, assignment, return, repair) stays on record for audit.</p>
          </div>
        )}

        {asset.status === 'Assigned' && asset.assignedTo && (
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card xl:col-span-2">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Assigned To</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
              <InfoRow label="Engineer" value={asset.assignedTo.engineerName} />
              <InfoRow label="Branch" value={asset.assignedTo.branchCode} />
              <InfoRow label="Assigned On" value={(asset.assignedTo.assignedAt || '').slice(0, 10)} />
            </div>
          </div>
        )}

        {activeRepair && (
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Repair Status</p>
              <div className="flex items-center gap-2">
                {activeRepair.isWarrantyClaim && <Badge variant="cyan" size="sm">Warranty Claim</Badge>}
                <Badge variant={REPAIR_STATUS_BADGE[activeRepair.status] ?? 'gray'} size="sm" dot>{activeRepair.status}</Badge>
              </div>
            </div>
            <InfoRow label="Repair ID" value={activeRepair.repairId} />
            <InfoRow label="Fault Description" value={activeRepair.faultDescription} />
            <InfoRow label="Repair Path" value={activeRepair.repairPath} />
            <InfoRow label="Reported By" value={activeRepair.reportedBy} />
            <InfoRow label="Reported Date" value={activeRepair.reportedDate} />
            {isSplicingMachine && (
              <InfoRow label="Kit Components Included" value={activeRepair.includeKitComponents ? 'Yes' : 'No'} />
            )}

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-border">
              {NEXT_REPAIR_STATUS[activeRepair.status] && (
                <Button
                  variant="secondary" size="sm"
                  onClick={() => updateRepairStatus(activeRepair.id, NEXT_REPAIR_STATUS[activeRepair.status])}
                >
                  Advance to {NEXT_REPAIR_STATUS[activeRepair.status]}
                </Button>
              )}
              {activeRepair.status === 'Received Back' && (
                <>
                  <Button size="sm" onClick={() => resolveRepair(activeRepair.id, { resolution: 'Fixed', remarks: '' })}>
                    Mark Fixed
                  </Button>
                  <Button
                    variant="danger" size="sm"
                    onClick={() => resolveRepair(activeRepair.id, { resolution: 'Beyond Repair', remarks: '' })}
                  >
                    Beyond Repair
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {kitComponentsField && (
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden xl:col-span-2">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Kit Components</h3>
              {/* Additive context only — components below keep showing their
                  own Received/Missing status from Phase 3 GRN confirmation,
                  unchanged; this just clarifies where the whole kit
                  physically is right now, since it moves as one unit with
                  the parent Splicing Machine (Phase 4a). */}
              {isSplicingMachine && asset.status === 'Assigned' && asset.assignedTo && (
                <p className="text-xs text-gray-500 mt-1">Currently assigned with {asset.assignedTo.engineerName}</p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Component Type</th>
                    <th className="text-left px-3 py-2 font-semibold">Component Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Serial Number</th>
                    <th className="text-right px-3 py-2 font-semibold">Quantity</th>
                    <th className="text-left px-3 py-2 font-semibold">Condition</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {kitRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No kit components recorded.</td></tr>
                  ) : kitRows.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-700">{row.componentType || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-gray-700">{row.componentName || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{row.serialNumber || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.quantity}</td>
                      <td className="px-3 py-2 text-gray-700">{row.condition || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2">
                        {row.receivedStatus === 'Lost' ? (
                          // Phase 8 — visually distinct from 'Missing' (red):
                          // Missing = not returned/unaccounted at a return
                          // event; Lost = explicitly reported lost/stolen.
                          <Badge variant="black" size="sm" dot>Lost</Badge>
                        ) : row.receivedStatus === 'Missing' ? (
                          <Badge variant="red" size="sm" dot>Missing</Badge>
                        ) : row.receivedStatus === 'Received' ? (
                          <Badge variant="green" size="sm" dot>Received</Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {asset.returnHistory && asset.returnHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
          <button
            type="button" onClick={() => setHistoryOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 border-b border-surface-border text-left"
          >
            <h3 className="text-sm font-semibold text-gray-800">Return History ({asset.returnHistory.length})</h3>
            <ChevronDown size={15} className={`text-gray-400 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </button>
          {historyOpen && (
            <div className="divide-y divide-surface-border">
              {asset.returnHistory.map(entry => (
                <div key={entry.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{entry.condition}</span>
                      <Badge variant={entry.resultStatus === 'Under Repair' ? 'orange' : 'green'} size="sm">{entry.resultStatus}</Badge>
                      {entry.missingComponentIds?.length > 0 && (
                        <Badge variant="red" size="sm" dot>{entry.missingComponentIds.length} missing</Badge>
                      )}
                    </div>
                    {entry.previousEngineer && <p className="text-xs text-gray-500 mt-1">Returned from {entry.previousEngineer}{entry.branchCode ? ` (${entry.branchCode})` : ''}</p>}
                    {entry.remarks && <p className="text-xs text-gray-600 mt-1">{entry.remarks}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{(entry.date || '').slice(0, 10)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">by {entry.initiatedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {repairs.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
          <button
            type="button" onClick={() => setRepairHistoryOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 border-b border-surface-border text-left"
          >
            <h3 className="text-sm font-semibold text-gray-800">Repair History ({repairs.length})</h3>
            <ChevronDown size={15} className={`text-gray-400 transition-transform ${repairHistoryOpen ? 'rotate-180' : ''}`} />
          </button>
          {repairHistoryOpen && (
            <div className="divide-y divide-surface-border">
              {repairs.map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-brand-blue">{r.repairId}</span>
                      <Badge variant={REPAIR_STATUS_BADGE[r.status] ?? 'gray'} size="sm" dot>{r.status}</Badge>
                      {r.isWarrantyClaim && <Badge variant="cyan" size="sm">Warranty Claim</Badge>}
                      {r.resolution && <Badge variant={r.resolution === 'Fixed' ? 'green' : 'red'} size="sm">{r.resolution}</Badge>}
                    </div>
                    <p className="text-xs text-gray-700 mt-1">{r.faultDescription}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.repairPath}{r.remarks ? ` — ${r.remarks}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{r.reportedDate}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">by {r.reportedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AssignAssetModal isOpen={assigning} onClose={() => setAssigning(false)} asset={asset} />
      <ReturnAssetModal isOpen={returning} onClose={() => setReturning(false)} asset={asset} />
      <RepairRequestModal isOpen={sendingForRepair} onClose={() => setSendingForRepair(false)} asset={asset} />
    </div>
  )
}
