import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, ChevronDown, AlertTriangle,
  ClipboardList, Calendar, Package, ShieldCheck,
  CheckCircle2, Activity, Wrench, Zap, ClipboardCheck,
  Check, Minus,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import {
  getWorkOrder, saveWorkOrder, slaStatusOf,
  CLEANING_CHECKLIST_ITEMS, INSPECTION_CHECKLIST_ITEMS,
  WORK_ORDER_STATUSES, CLOSED_WORK_ORDER_STATUSES,
} from '../data/workOrderStore'
import { getPOP } from '../data/popStore'
import { getAllTechnicians } from '../data/technicianHelpers'
import { getProducts } from '../data/productStore'
import { getStockTransferRequestsForWorkOrder } from '../data/stockTransferRequestStore'
import { getHDDProjects, getSiteProjects } from '../data/projectStore'

const STATUS_BADGE = {
  Open: 'blue', Assigned: 'indigo', 'In-Progress': 'orange', 'On-Hold': 'yellow', Resolved: 'green', Closed: 'gray',
}
const PRIORITY_BADGE = { Low: 'gray', Medium: 'blue', High: 'orange', Critical: 'red' }
const SLA_BADGE = { 'On Track': 'green', 'Due Soon': 'yellow', Breached: 'red', Met: 'green' }

// Non-terminal statuses changeable from the view page without the full edit
// form. Resolved/Closed require the edit form (hardware deduction + validation).
const QUICK_STATUSES = WORK_ORDER_STATUSES.filter(s => !CLOSED_WORK_ORDER_STATUSES.includes(s))

/* ── Shared primitives ─────────────────────────────────────────────────────── */

function InfoRow({ label, children, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono' : ''}`}>
        {children ?? <span className="text-gray-300 font-normal">—</span>}
      </div>
    </div>
  )
}

function InfoGrid({ children, cols = 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 4 ? 'xl:grid-cols-4' : cols === 2 ? '' : 'xl:grid-cols-3'} gap-x-6 gap-y-5`}>
      {children}
    </div>
  )
}

function SectionCard({ icon: Icon, title, children, accent }) {
  return (
    <div className={`rounded-xl border shadow-card ${accent ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-surface-border'}`}>
      <div className={`px-5 py-4 border-b flex items-center gap-2 ${accent ? 'border-emerald-200' : 'border-surface-border'}`}>
        {Icon && <Icon size={14} className={accent ? 'text-emerald-600 shrink-0' : 'text-gray-400 shrink-0'} />}
        <h2 className={`text-sm font-semibold ${accent ? 'text-emerald-900' : 'text-gray-900'}`}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ── Checklist display ─────────────────────────────────────────────────────── */

function ChecklistDisplay({ items, values }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {items.map(item => {
        const checked = values?.[item.key] ?? false
        return (
          <div key={item.key} className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              {checked
                ? <Check size={11} className="text-emerald-600" />
                : <Minus size={11} className="text-gray-400" />}
            </div>
            <span className={`text-sm ${checked ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export default function POPWorkOrderView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [wo, setWo] = useState(() => getWorkOrder(id))

  if (!wo) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Work Order not found.</p>
        <button onClick={() => navigate('/network/pops/work-orders')} className="mt-2 text-sm text-brand-blue hover:underline">
          Back to Work Orders
        </button>
      </div>
    )
  }

  const pop = getPOP(wo.popId)
  const technicians = getAllTechnicians()
  const products = getProducts()
  const slaStatus = slaStatusOf(wo)
  const isClosed = CLOSED_WORK_ORDER_STATUSES.includes(wo.status)
  const isMaintenance = wo.category === 'Preventive Maintenance' || wo.category === 'Breakdown-Fault'
  const isInstallation = wo.category === 'Installation'
  const isPowerIssue = wo.category === 'Power Issue'
  const isInspection = wo.category === 'Inspection'

  const allProjects = [
    ...getHDDProjects().map(p => ({ ...p, _type: 'HDD' })),
    ...getSiteProjects().map(p => ({ ...p, _type: 'Site' })),
  ]
  const linkedProject = wo.projectReference
    ? allProjects.find(p => p.id === wo.projectReference)
    : null

  const popEquipment = pop?.equipment ?? []
  const involvedEquipment = wo.equipmentInvolved
    ? popEquipment.find(e => e.id === wo.equipmentInvolved)
    : null

  const assignedTechs = (wo.assignedTechnicianIds ?? []).map(tid => technicians.find(t => t.id === tid)).filter(Boolean)
  const stockRequests = getStockTransferRequestsForWorkOrder(wo.id)

  function handleQuickStatus(newStatus) {
    setStatusMenuOpen(false)
    if (CLOSED_WORK_ORDER_STATUSES.includes(newStatus)) {
      navigate(`/network/pops/work-orders/${wo.id}/edit`)
      return
    }
    const saved = saveWorkOrder({ ...wo, status: newStatus })
    if (saved) setWo(saved)
  }

  function fmtDate(iso) {
    if (!iso) return null
    try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
  }

  return (
    <div className="p-6 pb-12">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/network/pops/work-orders')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{wo.id}</h1>
              <Badge variant={STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
              <Badge variant={PRIORITY_BADGE[wo.priority] ?? 'gray'} size="sm">{wo.priority}</Badge>
              <Badge variant={SLA_BADGE[slaStatus] ?? 'gray'} size="sm">SLA: {slaStatus}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {wo.category}
              {pop && <> · <span className="font-medium text-gray-700">{pop.name}</span> <span className="text-gray-400">({pop.id})</span></>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick status — non-terminal transitions only */}
          {!isClosed && (
            <div className="relative">
              <button
                onClick={() => setStatusMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-surface-border rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Change Status <ChevronDown size={12} className={`transition-transform ${statusMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {statusMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-surface-border rounded-xl shadow-xl py-1 z-50">
                  {QUICK_STATUSES.filter(s => s !== wo.status).map(s => (
                    <button
                      key={s}
                      onClick={() => handleQuickStatus(s)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                  <div className="border-t border-surface-border mt-1 pt-1">
                    <button
                      onClick={() => { setStatusMenuOpen(false); navigate(`/network/pops/work-orders/${wo.id}/edit`) }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Resolve / Close → Edit form
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <Button size="sm" variant="secondary" icon={<Edit2 size={14} />} onClick={() => navigate(`/network/pops/work-orders/${wo.id}/edit`)}>
            Edit
          </Button>
        </div>
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Basic Details */}
        <SectionCard icon={ClipboardList} title="Basic Details">
          <InfoGrid cols={4}>
            <InfoRow label="Work Order ID">
              <span className="font-mono text-brand-blue">{wo.id}</span>
            </InfoRow>
            <InfoRow label="Linked POP">
              {pop
                ? <button onClick={() => navigate(`/network/pops/${pop.id}`)} className="text-brand-blue hover:underline text-sm font-medium">{pop.name}</button>
                : <span className="text-gray-400 font-normal">{wo.popId}</span>}
            </InfoRow>
            <InfoRow label="Category">{wo.category}</InfoRow>
            <InfoRow label="Priority">
              <Badge variant={PRIORITY_BADGE[wo.priority] ?? 'gray'} size="sm">{wo.priority}</Badge>
            </InfoRow>
            <InfoRow label="Status">
              <Badge variant={STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
            </InfoRow>
            <InfoRow label="SLA Due">
              <p className="text-sm text-gray-800 font-medium leading-snug">{fmtDate(wo.slaDate) ?? '—'}</p>
              <Badge variant={SLA_BADGE[slaStatus] ?? 'gray'} size="sm" className="mt-1">{slaStatus}</Badge>
            </InfoRow>
            <InfoRow label="Created">{fmtDate(wo.createdAt)}</InfoRow>
            {wo.resolvedAt && <InfoRow label="Resolved At">{fmtDate(wo.resolvedAt)}</InfoRow>}
          </InfoGrid>
        </SectionCard>

        {/* Cleaning Checklist */}
        {wo.category === 'Cleaning' && wo.cleaningChecklist && (
          <SectionCard icon={ClipboardCheck} title="Cleaning Checklist">
            <ChecklistDisplay items={CLEANING_CHECKLIST_ITEMS} values={wo.cleaningChecklist} />
          </SectionCard>
        )}

        {/* Maintenance Details */}
        {isMaintenance && (
          <SectionCard icon={Wrench} title="Maintenance Details">
            <InfoGrid cols={2}>
              <InfoRow label="Equipment Involved">
                {involvedEquipment
                  ? `${involvedEquipment.type} — ${involvedEquipment.label}`
                  : wo.equipmentInvolved || null}
              </InfoRow>
              <InfoRow label="Fault Type">{wo.faultType || null}</InfoRow>
            </InfoGrid>
          </SectionCard>
        )}

        {/* Installation Details */}
        {isInstallation && (
          <SectionCard icon={Package} title="Installation Details">
            <InfoGrid cols={2}>
              <InfoRow label="Project Reference">
                {linkedProject ? `${linkedProject.name} (${linkedProject._type} · ${linkedProject.id})` : null}
              </InfoRow>
              <InfoRow label="New Equipment Details">
                {wo.newEquipmentDetails ? <span className="whitespace-pre-line font-normal text-gray-700">{wo.newEquipmentDetails}</span> : null}
              </InfoRow>
            </InfoGrid>
          </SectionCard>
        )}

        {/* Power Issue Details */}
        {isPowerIssue && (
          <SectionCard icon={Zap} title="Power Issue Details">
            <InfoGrid cols={3}>
              <InfoRow label="Downtime Start">{fmtDate(wo.downtimeStartTime)}</InfoRow>
              <InfoRow label="Battery Backup Status">{wo.batteryBackupStatus || null}</InfoRow>
              <InfoRow label="Generator Status">{wo.generatorStatus || null}</InfoRow>
            </InfoGrid>
          </SectionCard>
        )}

        {/* Inspection */}
        {isInspection && wo.inspectionChecklist && (
          <SectionCard icon={ClipboardCheck} title="Inspection Checklist">
            <ChecklistDisplay items={INSPECTION_CHECKLIST_ITEMS} values={wo.inspectionChecklist} />
            {wo.inspectionFindings && (
              <div className="mt-5 pt-4 border-t border-surface-border">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Inspection Findings</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{wo.inspectionFindings}</p>
              </div>
            )}
          </SectionCard>
        )}

        {/* Scheduling & Assignment */}
        <SectionCard icon={Calendar} title="Scheduling & Assignment">
          <InfoGrid cols={2}>
            <InfoRow label="Scheduled Date / Time">{fmtDate(wo.scheduledDateTime)}</InfoRow>
            <InfoRow label="Assigned Technicians">
              {assignedTechs.length === 0
                ? <span className="text-gray-400 font-normal">Unassigned</span>
                : <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {assignedTechs.map(t => (
                      <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">{t.name}</span>
                    ))}
                  </div>}
            </InfoRow>
          </InfoGrid>
          {wo.description && (
            <div className="mt-5 pt-4 border-t border-surface-border">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{wo.description}</p>
            </div>
          )}
        </SectionCard>

        {/* Hardware Need */}
        <SectionCard icon={Package} title="Hardware Need">
          {(wo.hardwareNeed?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No hardware items requested.</p>
          ) : (
            <div className="border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-surface-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-24">Qty</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-52">Stock Transfer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {wo.hardwareNeed.map((row, i) => {
                    const product = products.find(p => p.id === row.productId)
                    const str = stockRequests.find(r => r.productId === row.productId)
                    return (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-800 font-medium">{product?.name ?? row.productId}</td>
                        <td className="px-4 py-3 text-gray-700">{row.quantity}</td>
                        <td className="px-4 py-3 text-gray-500">{row.reason || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3">
                          {str ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              str.status === 'Pending' ? 'bg-amber-100 text-amber-700'
                              : str.status === 'Approved' ? 'bg-brand-blue/10 text-brand-blue'
                              : str.status === 'Rejected' ? 'bg-red-100 text-red-600'
                              : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {str.status} · {str.requestNumber}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Approval */}
        <SectionCard icon={ShieldCheck} title="Approval">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${wo.requireSupervisorApproval ? 'bg-brand-blue/10' : 'bg-gray-100'}`}>
                {wo.requireSupervisorApproval
                  ? <Check size={11} className="text-brand-blue" />
                  : <Minus size={11} className="text-gray-400" />}
              </div>
              <span className="text-sm text-gray-700">Supervisor approval required before close</span>
            </div>
            {wo.requireSupervisorApproval && (
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${wo.supervisorApproval ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {wo.supervisorApproval
                    ? <Check size={11} className="text-emerald-600" />
                    : <Minus size={11} className="text-gray-400" />}
                </div>
                <span className="text-sm text-gray-700">{wo.supervisorApproval ? 'Supervisor approved' : 'Awaiting supervisor approval'}</span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Resolution — accent card, only when resolved/closed */}
        {isClosed && (
          <SectionCard icon={CheckCircle2} title="Resolution" accent>
            <InfoGrid cols={2}>
              <InfoRow label="Resolution Notes">
                {wo.resolutionNotes
                  ? <span className="whitespace-pre-line font-normal text-gray-700">{wo.resolutionNotes}</span>
                  : null}
              </InfoRow>
              <InfoRow label="Root Cause">
                {wo.rootCause
                  ? <span className="whitespace-pre-line font-normal text-gray-700">{wo.rootCause}</span>
                  : null}
              </InfoRow>
              <InfoRow label="Time Taken">{wo.timeTaken != null ? `${wo.timeTaken} hrs` : null}</InfoRow>
              <InfoRow label="Technician Sign-off">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${wo.technicianSignOff ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {wo.technicianSignOff
                      ? <Check size={11} className="text-emerald-600" />
                      : <Minus size={11} className="text-gray-400" />}
                  </div>
                  <span className={wo.technicianSignOff ? 'text-emerald-700 font-medium' : 'text-gray-400'}>
                    {wo.technicianSignOff ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
              </InfoRow>
            </InfoGrid>

            {(wo.hardwareUsed?.length ?? 0) > 0 && (
              <div className="mt-5 pt-4 border-t border-emerald-200">
                <p className="text-[11px] font-semibold text-emerald-700/70 uppercase tracking-wide mb-3">Hardware Used</p>
                <div className="border border-emerald-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50 border-b border-emerald-200">
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-emerald-700/70 uppercase tracking-wide">Product</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-emerald-700/70 uppercase tracking-wide w-28">Qty Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {wo.hardwareUsed.map((u, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{products.find(p => p.id === u.productId)?.name ?? u.productId}</td>
                          <td className="px-4 py-2.5 text-gray-700">{u.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {wo.hardwareDeducted && (
              <div className="mt-4 pt-4 border-t border-emerald-200">
                {wo.hardwareDeductionError ? (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                    <AlertTriangle size={13} className="shrink-0" />
                    Inventory deduction failed — {wo.hardwareDeductionError}
                  </p>
                ) : wo.inventoryAssignmentId ? (
                  <p className="text-xs text-emerald-700 font-medium">
                    Inventory deducted from central stock ({wo.inventoryAssignmentId})
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">No hardware used — nothing to deduct.</p>
                )}
              </div>
            )}
          </SectionCard>
        )}

        {/* Activity Log */}
        {(wo.activityLog?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-surface-border shadow-card">
            <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
              <Activity size={14} className="text-gray-400 shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900">Activity Log</h2>
            </div>
            <div className="divide-y divide-surface-border">
              {[...wo.activityLog].reverse().map((entry, i) => (
                <div key={i} className="px-5 py-3.5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center mt-0.5">
                    <Activity size={11} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{entry.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {entry.time
                          ? (() => { try { return new Date(entry.time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return entry.time } })()
                          : '—'}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs font-medium text-gray-500">{entry.actor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
