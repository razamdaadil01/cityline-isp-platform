import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, ChevronDown, AlertTriangle, CheckSquare, Square } from 'lucide-react'
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
const REQUEST_STATUS_BADGE = {
  Pending: 'yellow', Approved: 'blue', Rejected: 'red', Fulfilled: 'green',
}

// Non-terminal statuses that can be set from the view page without entering
// the full edit form. Resolved and Closed require the edit form because
// Resolved triggers hardware deduction side effects and requires resolution
// fields; Closed may require supervisor approval — both need the form's own
// validation to be safe.
const QUICK_STATUSES = WORK_ORDER_STATUSES.filter(s => !CLOSED_WORK_ORDER_STATUSES.includes(s))

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children ?? <span className="text-gray-400">—</span>}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-4 pt-5 border-t border-surface-border">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

function ChecklistDisplay({ items, values }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => {
        const checked = values?.[item.key] ?? false
        return (
          <div key={item.key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-sm text-gray-700">
            {checked
              ? <CheckSquare size={15} className="text-brand-blue shrink-0" />
              : <Square size={15} className="text-gray-300 shrink-0" />}
            {item.label}
          </div>
        )
      })}
    </div>
  )
}

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

  function fmt(val) { return val || '—' }
  function fmtDate(iso) {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
  }

  return (
    <div className="p-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/network/pops/work-orders')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
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
              {pop && <> · <span className="font-medium text-gray-700">{pop.name}</span></>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick status change — only non-terminal transitions available here */}
          {!isClosed && (
            <div className="relative">
              <button
                onClick={() => setStatusMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-surface-border rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Change Status <ChevronDown size={12} className={statusMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
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
                      Resolved / Closed →
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

      <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-0 divide-y divide-surface-border">
        {/* Basic Details */}
        <div className="pb-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Details</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <Field label="Work Order ID">
              <span className="font-mono text-brand-blue">{wo.id}</span>
            </Field>
            <Field label="Linked POP">
              {pop
                ? <button onClick={() => navigate(`/network/pops/${pop.id}`)} className="text-brand-blue hover:underline text-sm">{pop.name} ({pop.id})</button>
                : <span className="text-gray-400">{wo.popId}</span>}
            </Field>
            <Field label="Category">{wo.category}</Field>
            <Field label="Priority">
              <Badge variant={PRIORITY_BADGE[wo.priority] ?? 'gray'} size="sm">{wo.priority}</Badge>
            </Field>
            <Field label="Status">
              <Badge variant={STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
            </Field>
            <Field label="SLA Due">
              <p className="text-sm text-gray-700">{fmtDate(wo.slaDate)}</p>
              <Badge variant={SLA_BADGE[slaStatus] ?? 'gray'} size="sm" className="mt-0.5">{slaStatus}</Badge>
            </Field>
            <Field label="Created">{fmtDate(wo.createdAt)}</Field>
            {wo.resolvedAt && <Field label="Resolved">{fmtDate(wo.resolvedAt)}</Field>}
          </div>
        </div>

        {/* Category-specific: Cleaning */}
        {wo.category === 'Cleaning' && wo.cleaningChecklist && (
          <Section title="Cleaning Checklist">
            <ChecklistDisplay items={CLEANING_CHECKLIST_ITEMS} values={wo.cleaningChecklist} />
          </Section>
        )}

        {/* Category-specific: Maintenance */}
        {isMaintenance && (
          <Section title="Maintenance Details">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Equipment Involved">
                {involvedEquipment
                  ? `${involvedEquipment.type} — ${involvedEquipment.label}`
                  : wo.equipmentInvolved ? wo.equipmentInvolved : null}
              </Field>
              <Field label="Fault Type">{fmt(wo.faultType)}</Field>
            </div>
          </Section>
        )}

        {/* Category-specific: Installation */}
        {isInstallation && (
          <Section title="Installation Details">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Project Reference">
                {linkedProject ? `${linkedProject.name} (${linkedProject._type} · ${linkedProject.id})` : null}
              </Field>
              <Field label="New Equipment Details">
                {wo.newEquipmentDetails ? <span className="whitespace-pre-line">{wo.newEquipmentDetails}</span> : null}
              </Field>
            </div>
          </Section>
        )}

        {/* Category-specific: Power Issue */}
        {isPowerIssue && (
          <Section title="Power Issue Details">
            <div className="grid grid-cols-3 gap-x-8 gap-y-4">
              <Field label="Downtime Start">{fmtDate(wo.downtimeStartTime)}</Field>
              <Field label="Battery Backup Status">{fmt(wo.batteryBackupStatus)}</Field>
              <Field label="Generator Status">{fmt(wo.generatorStatus)}</Field>
            </div>
          </Section>
        )}

        {/* Category-specific: Inspection */}
        {isInspection && wo.inspectionChecklist && (
          <Section title="Inspection Checklist">
            <ChecklistDisplay items={INSPECTION_CHECKLIST_ITEMS} values={wo.inspectionChecklist} />
            {wo.inspectionFindings && (
              <Field label="Inspection Findings">
                <span className="whitespace-pre-line">{wo.inspectionFindings}</span>
              </Field>
            )}
          </Section>
        )}

        {/* Scheduling & Assignment */}
        <Section title="Scheduling & Assignment">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Scheduled Date/Time">{fmtDate(wo.scheduledDateTime)}</Field>
            <Field label="Assigned Technicians">
              {assignedTechs.length === 0
                ? <span className="text-gray-400">Unassigned</span>
                : <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {assignedTechs.map(t => (
                      <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">{t.name}</span>
                    ))}
                  </div>}
            </Field>
          </div>
          <Field label="Description">
            {wo.description ? <span className="whitespace-pre-line">{wo.description}</span> : null}
          </Field>
        </Section>

        {/* Hardware Need */}
        <Section title="Hardware Need">
          {wo.hardwareNeed?.length > 0 ? (
            <div className="border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-surface-border">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Stock Transfer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {wo.hardwareNeed.map((row, i) => {
                    const product = products.find(p => p.id === row.productId)
                    const str = stockRequests.find(r => r.productId === row.productId)
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2.5 text-gray-700">{product?.name ?? row.productId}</td>
                        <td className="px-3 py-2.5 text-gray-700">{row.quantity}</td>
                        <td className="px-3 py-2.5 text-gray-500">{row.reason || '—'}</td>
                        <td className="px-3 py-2.5">
                          {str ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                              str.status === 'Pending' ? 'bg-amber-100 text-amber-700'
                              : str.status === 'Approved' ? 'bg-brand-blue/10 text-brand-blue'
                              : str.status === 'Rejected' ? 'bg-red-100 text-red-600'
                              : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {str.status} ({str.requestNumber})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No hardware items requested.</p>
          )}
        </Section>

        {/* Approval */}
        <Section title="Approval">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              {wo.requireSupervisorApproval
                ? <CheckSquare size={15} className="text-brand-blue" />
                : <Square size={15} className="text-gray-300" />}
              Supervisor approval required before close
            </div>
            {wo.requireSupervisorApproval && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {wo.supervisorApproval
                  ? <CheckSquare size={15} className="text-emerald-600" />
                  : <Square size={15} className="text-gray-300" />}
                Supervisor approved
              </div>
            )}
          </div>
        </Section>

        {/* Resolution — only when resolved/closed */}
        {isClosed && (
          <Section title="Resolution">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Resolution Notes">
                {wo.resolutionNotes ? <span className="whitespace-pre-line">{wo.resolutionNotes}</span> : null}
              </Field>
              <Field label="Root Cause">
                {wo.rootCause ? <span className="whitespace-pre-line">{wo.rootCause}</span> : null}
              </Field>
              <Field label="Time Taken">{wo.timeTaken != null ? `${wo.timeTaken} hrs` : null}</Field>
              <Field label="Technician Sign-off">
                <div className="flex items-center gap-1.5 text-sm">
                  {wo.technicianSignOff
                    ? <><CheckSquare size={14} className="text-emerald-600" /><span>Confirmed</span></>
                    : <><Square size={14} className="text-gray-300" /><span className="text-gray-400">Pending</span></>}
                </div>
              </Field>
            </div>

            {wo.hardwareUsed?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Hardware Used</p>
                <div className="border border-surface-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/60 border-b border-surface-border">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Qty Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {wo.hardwareUsed.map((u, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2.5 text-gray-700">{products.find(p => p.id === u.productId)?.name ?? u.productId}</td>
                          <td className="px-3 py-2.5 text-gray-700">{u.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {wo.hardwareDeducted && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                {wo.hardwareDeductionError ? (
                  <><AlertTriangle size={13} className="text-red-500" /><span className="text-red-600">Inventory deduction failed — {wo.hardwareDeductionError}</span></>
                ) : wo.inventoryAssignmentId ? (
                  <span className="text-emerald-700">Inventory deducted from central stock ({wo.inventoryAssignmentId})</span>
                ) : (
                  <span>No hardware used to deduct.</span>
                )}
              </p>
            )}
          </Section>
        )}

        {/* Activity Log */}
        {wo.activityLog?.length > 0 && (
          <Section title="Activity Log">
            <ol className="space-y-1.5">
              {[...wo.activityLog].reverse().map((entry, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-gray-600">
                  <span className="text-gray-400 whitespace-nowrap shrink-0">{fmtDate(entry.time)}</span>
                  <span>{entry.action}</span>
                  <span className="text-gray-400 ml-auto shrink-0">{entry.actor}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>
    </div>
  )
}
