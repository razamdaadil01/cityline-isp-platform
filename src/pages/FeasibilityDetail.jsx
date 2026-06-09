import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, UserCheck, CheckCircle2, XCircle, MapPin, User,
  Phone, Mail, Calendar, Clock, FileText, Image, Upload, Wrench, Edit2,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'
import {
  getFeasibilityRequest, updateFeasibilityStatus, subscribeFeasibility, saveFeasibilityRequest,
} from '../data/feasibilityStore'

/* ── Constants ─────────────────────────────────────────────────── */

const ENGINEERS = ['Arjun Kumar', 'Preethi Nair', 'Anita Sharma', 'Suresh Babu']

const REJECTION_REASONS = [
  'Not Feasible — Too Far from Network',
  'Not Feasible — No Fiber Route',
  'Not Feasible — High Cost',
  'Infrastructure Unavailable',
  'Other',
]

const STATUS_VARIANT = {
  Pending:       'yellow',
  Assigned:      'blue',
  'In Progress': 'purple',
  Approved:      'green',
  Rejected:      'red',
}

const PRIORITY_VARIANT = { High: 'red', Medium: 'yellow', Low: 'gray' }

/* ── Helpers ────────────────────────────────────────────────────── */

function fmtDate(d) {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return d
}

/* ── Sub-components ─────────────────────────────────────────────── */

function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-border shadow-card ${className}`}>
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
        {Icon && <Icon size={15} className="text-gray-400 shrink-0" />}
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function InfoGrid({ children, cols = 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : ''} gap-x-6 gap-y-5`}>
      {children}
    </div>
  )
}

/* ── Toast ──────────────────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      {msg}
    </div>
  )
}

/* ── Timeline entry ─────────────────────────────────────────────── */
const TIMELINE_COLOR = {
  Created:      { dot: 'bg-gray-400',    label: 'text-gray-700' },
  Assigned:     { dot: 'bg-brand-blue',  label: 'text-brand-blue' },
  'In Progress':{ dot: 'bg-purple-500',  label: 'text-purple-600' },
  Approved:     { dot: 'bg-emerald-500', label: 'text-emerald-600' },
  Rejected:     { dot: 'bg-red-500',     label: 'text-red-600' },
}

function TimelineEntry({ entry, isLast }) {
  const c = TIMELINE_COLOR[entry.action] || TIMELINE_COLOR.Created
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${c.dot}`} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${c.label}`}>{entry.action}</span>
          <span className="text-[11px] text-gray-400">by {entry.by}</span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{entry.at}</span>
        </div>
        {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
      </div>
    </div>
  )
}

/* ── Mock attachment placeholder ────────────────────────────────── */
function AttachmentSlot({ label, icon: Icon }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="border-2 border-dashed border-surface-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-brand-blue/40 hover:bg-blue-50/30 transition-colors cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-brand-blue/10 flex items-center justify-center transition-colors">
          <Icon size={18} className="text-gray-400 group-hover:text-brand-blue transition-colors" />
        </div>
        <p className="text-xs text-gray-400 group-hover:text-brand-blue transition-colors font-medium">Click to upload</p>
        <p className="text-[10px] text-gray-300">PNG, JPG, PDF up to 10 MB</p>
      </div>
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function FeasibilityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [req, setReq] = useState(() => getFeasibilityRequest(id))

  useEffect(() => {
    return subscribeFeasibility(all => {
      setReq(all.find(r => r.id === id) ?? null)
    })
  }, [id])

  // Modals
  const [showEdit,    setShowEdit]    = useState(false)
  const [editForm,    setEditForm]    = useState({})
  const [showAssign,  setShowAssign]  = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showReject,  setShowReject]  = useState(false)

  const [assignForm,  setAssignForm]  = useState({ engineer: '', date: '', priority: 'Medium', notes: '' })
  const [approveForm, setApproveForm] = useState({ comment: '', fiberEstimate: '', hardware: '', installNotes: '' })
  const [rejectForm,  setRejectForm]  = useState({ reason: '', remarks: '' })

  const [toast, setToast] = useState('')

  function openEdit() {
    setEditForm({
      localityName:             req.localityName             || '',
      subLocalityName:          req.subLocalityName          || '',
      completeAddress:          req.completeAddress          || '',
      landmark:                 req.landmark                 || '',
      connectionType:           req.connectionType           || '',
      customerRequirementNotes: req.customerRequirementNotes || '',
      assignedBranch:           req.assignedBranch           || '',
      fiberRequired:            req.fiberRequired             || '',
      priority:                 req.priority                 || 'Medium',
    })
    setShowEdit(true)
  }

  function handleSaveEdit() {
    saveFeasibilityRequest({ ...req, ...editForm })
    setShowEdit(false)
    setToast('Changes saved successfully')
  }

  function openAssign() {
    setAssignForm({ engineer: req.assignedEngineer || '', date: req.assignmentDate || '', priority: req.priority || 'Medium', notes: req.assignmentNotes || '' })
    setShowAssign(true)
  }

  function handleAssign() {
    updateFeasibilityStatus(req.id, 'Assigned', {
      assignedEngineer: assignForm.engineer,
      assignmentDate:   assignForm.date,
      priority:         assignForm.priority,
      assignmentNotes:  assignForm.notes,
      _note: `Assigned to ${assignForm.engineer}`,
    })
    setShowAssign(false)
    setToast('Engineer assigned successfully')
  }

  function openApprove() {
    setApproveForm({ comment: '', fiberEstimate: req.fiberRequired || '', hardware: '', installNotes: '' })
    setShowApprove(true)
  }

  function handleApprove() {
    const now = new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16).replace('T', ' ')
    updateFeasibilityStatus(req.id, 'Approved', {
      approvalComment:  approveForm.comment,
      fiberRequired:    approveForm.fiberEstimate,
      hardwareSummary:  approveForm.hardware,
      installationNotes:approveForm.installNotes,
      approvedBy:       'Admin',
      approvedAt:       now,
      _note: 'Feasibility approved',
    })
    setShowApprove(false)
    setToast('Feasibility approved successfully')
  }

  function openReject() {
    setRejectForm({ reason: '', remarks: '' })
    setShowReject(true)
  }

  function handleReject() {
    const now = new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16).replace('T', ' ')
    updateFeasibilityStatus(req.id, 'Rejected', {
      rejectionReason:  rejectForm.reason,
      rejectionRemarks: rejectForm.remarks,
      rejectedBy:       'Admin',
      rejectedAt:       now,
      _note: `Rejected — ${rejectForm.reason}`,
    })
    setShowReject(false)
    setToast('Feasibility rejected')
  }

  if (!req) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/sales/feasibility-requests')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Request Not Found</h1>
        </div>
        <p className="text-sm text-gray-500">No feasibility request with ID "{id}" exists.</p>
      </div>
    )
  }

  const status = req.feasibilityStatus
  const isAssigned   = ['Assigned', 'In Progress', 'Approved'].includes(status)
  const isApproved   = status === 'Approved'
  const isRejected   = status === 'Rejected'

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/sales/feasibility-requests')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0 mt-0.5">
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] mb-0.5">
            <button onClick={() => navigate('/sales/feasibility-requests')}
              className="text-gray-400 hover:underline transition-colors">
              Feasibility Requests
            </button>
            <span className="text-gray-300">›</span>
            <span className="text-gray-500">{req.id}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Feasibility Request — {req.id}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{req.customerName} · {req.area}</p>
        </div>

        {/* Status badge */}
        <Badge variant={STATUS_VARIANT[status] ?? 'gray'} dot>
          {status}
        </Badge>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button onClick={openEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border bg-white text-gray-600 hover:bg-gray-50 transition-colors">
            <Edit2 size={13} /> Edit
          </button>
          {!isApproved && !isRejected && (
            <button onClick={openAssign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-blue/30 bg-blue-50 text-brand-blue hover:bg-blue-100 transition-colors">
              <UserCheck size={13} /> Assign Engineer
            </button>
          )}
          {!isApproved && !isRejected && (
            <button onClick={openApprove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              <CheckCircle2 size={13} /> Approve
            </button>
          )}
          {!isApproved && !isRejected && (
            <button onClick={openReject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              <XCircle size={13} /> Reject
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left — main sections */}
        <div className="xl:col-span-2 space-y-6">

          {/* Section 1 — Lead & Customer Info */}
          <Card title="Lead & Customer Info" icon={User}>
            <InfoGrid>
              <InfoRow label="Lead ID"      value={req.leadId}        mono />
              <InfoRow label="Customer Name" value={req.customerName} />
              <InfoRow label="Mobile"       value={req.mobile}        mono />
              <InfoRow label="Email"        value={req.email} />
              <InfoRow label="Pipeline"     value={req.pipeline} />
              <InfoRow label="Stage"        value={req.stage} />
              <InfoRow label="Created By"   value={req.createdBy} />
              <InfoRow label="Created Date" value={fmtDate(req.createdAt)} />
            </InfoGrid>
          </Card>

          {/* Section 2 — Location Details */}
          <Card title="Location Details" icon={MapPin}>
            <div className="space-y-5">
              <InfoGrid>
                <InfoRow label="Village / Society" value={req.village} />
                <InfoRow label="Area"              value={req.area} />
                <InfoRow label="Locality"          value={req.localityName} />
                <InfoRow label="Sub Locality"      value={req.subLocalityName} />
                <InfoRow label="Landmark"          value={req.landmark} />
                <InfoRow label="GPS Location"      value={req.gpsLocation} mono />
                <InfoRow label="Connection Type"   value={req.connectionType} />
                <InfoRow label="Assigned Branch"   value={req.assignedBranch} mono />
              </InfoGrid>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Complete Address</p>
                {req.completeAddress
                  ? <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">{req.completeAddress}</p>
                  : <p className="text-sm font-medium text-gray-800">—</p>}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer Requirement</p>
                {(req.customerRequirementNotes || req.customerRequirement)
                  ? <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">{req.customerRequirementNotes || req.customerRequirement}</p>
                  : <p className="text-sm font-medium text-gray-800">—</p>}
              </div>
            </div>
          </Card>

          {/* Section 2b — Hardware Requirements */}
          <Card title="Hardware Requirements" icon={Wrench}>
            {(!req.hwItems?.length && !req.wireItems?.length) ? (
              <p className="text-sm text-gray-400 text-center py-4">No hardware requirements added yet</p>
            ) : (
              <div className="space-y-6">
                {/* Hardware Items table */}
                {req.hwItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hardware Items</p>
                    <div className="overflow-hidden rounded-lg border border-surface-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-surface-border">
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">QTY</th>
                            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                          {req.hwItems.map((row, i) => (
                            <tr key={row.id ?? i} className="hover:bg-gray-50/60">
                              <td className="px-4 py-2.5 text-sm text-gray-800 font-medium">{row.name || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-700 text-center">{row.qty || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500 text-center">{row.unit || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Wire / Cable table */}
                {req.wireItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Wire / Cable</p>
                    <div className="overflow-hidden rounded-lg border border-surface-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-surface-border">
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cable Name</th>
                            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">QTY</th>
                            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                          {req.wireItems.map((row, i) => (
                            <tr key={row.id ?? i} className="hover:bg-gray-50/60">
                              <td className="px-4 py-2.5 text-sm text-gray-800 font-medium">{row.name || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-700 text-center">{row.qty || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500 text-center">{row.unit || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Section 3 — Feasibility Details */}
          <Card title="Feasibility Details" icon={FileText}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
                <InfoRow label="Network Expansion Required"      value={req.networkExpansionRequired} />
                <InfoRow label="Est. Fiber Requirement"          value={req.fiberRequired ? `${req.fiberRequired} m` : '—'} />
                <InfoRow label="Est. Distance from Existing Fiber" value={req.estimatedDistanceFromFiber} />
                <InfoRow label="Pole Requirement"                value={req.poleRequirement} />
                <InfoRow label="Priority"
                  value={
                    req.priority
                      ? <Badge variant={PRIORITY_VARIANT[req.priority] || 'gray'} size="sm">{req.priority}</Badge>
                      : '—'
                  }
                />
                <InfoRow label="Connection Type" value={req.connectionType} />
                <InfoRow label="Branch" value={req.assignedBranch} mono />
              </div>

              {/* Full-width text fields */}
              <div className="space-y-4 pt-1">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Feasibility Reason</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">
                    {req.feasibilityReason || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer Requirement Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">
                    {req.customerRequirementNotes || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Internal Remarks</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">
                    {req.internalRemarks || '—'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 4 — Assignment Details (if assigned+) */}
          {isAssigned && (
            <Card title="Assignment Details" icon={UserCheck}>
              <InfoGrid>
                <InfoRow label="Assigned Engineer" value={req.assignedEngineer} />
                <InfoRow label="Assignment Date"   value={fmtDate(req.assignmentDate)} />
                <InfoRow label="Priority"
                  value={
                    req.priority
                      ? <Badge variant={PRIORITY_VARIANT[req.priority] || 'gray'} size="sm">{req.priority}</Badge>
                      : '—'
                  }
                />
              </InfoGrid>
              {req.assignmentNotes && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Internal Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">
                    {req.assignmentNotes}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Section 5a — Approval Details */}
          {isApproved && (
            <Card title="Approval Details" icon={CheckCircle2}>
              <InfoGrid cols={2}>
                <InfoRow label="Approved By" value={req.approvedBy} />
                <InfoRow label="Approved At" value={req.approvedAt} />
              </InfoGrid>
              <div className="space-y-4 mt-5">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Approval Comment</p>
                  <p className="text-sm text-gray-700 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100 leading-relaxed">
                    {req.approvalComment || '—'}
                  </p>
                </div>
                <InfoGrid cols={2}>
                  <InfoRow label="Estimated Fiber Requirement" value={req.fiberRequired ? `${req.fiberRequired} m` : '—'} />
                </InfoGrid>
                {req.hardwareSummary && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Hardware Summary</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">
                      {req.hardwareSummary}
                    </p>
                  </div>
                )}
                {req.installationNotes && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Installation Notes</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-surface-border leading-relaxed">
                      {req.installationNotes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Section 5b — Rejection Details */}
          {isRejected && (
            <Card title="Rejection Details" icon={XCircle}>
              <InfoGrid cols={2}>
                <InfoRow label="Rejected By" value={req.rejectedBy} />
                <InfoRow label="Rejected At" value={req.rejectedAt} />
                <InfoRow label="Rejection Reason" value={req.rejectionReason} />
              </InfoGrid>
              {req.rejectionRemarks && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Remarks</p>
                  <p className="text-sm text-gray-700 bg-red-50 rounded-lg px-4 py-3 border border-red-100 leading-relaxed">
                    {req.rejectionRemarks}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Section 6 — Attachments */}
          <Card title="Attachments" icon={Image}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AttachmentSlot label="Site Images"           icon={Image} />
              <AttachmentSlot label="Location Photos"       icon={MapPin} />
              <AttachmentSlot label="Supporting Documents"  icon={FileText} />
            </div>
          </Card>

        </div>

        {/* Right column — Activity Timeline */}
        <div className="space-y-6">
          <Card title="Activity Timeline" icon={Clock}>
            {(req.timeline?.length ?? 0) === 0 ? (
              <p className="text-xs text-gray-400">No activity yet.</p>
            ) : (
              <div>
                {req.timeline.map((entry, i) => (
                  <TimelineEntry
                    key={i}
                    entry={entry}
                    isLast={i === req.timeline.length - 1}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Edit Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={`Edit — ${req.id}`}
        size="md"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveEdit}>Save Changes</Button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Locality Name">
            <Input value={editForm.localityName} onChange={e => setEditForm(f => ({ ...f, localityName: e.target.value }))} placeholder="Enter locality name" />
          </FormField>
          <FormField label="Sub Locality Name">
            <Input value={editForm.subLocalityName} onChange={e => setEditForm(f => ({ ...f, subLocalityName: e.target.value }))} placeholder="Enter sub locality name" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Complete Address">
              <Textarea rows={2} value={editForm.completeAddress} onChange={e => setEditForm(f => ({ ...f, completeAddress: e.target.value }))} placeholder="Full address…" />
            </FormField>
          </div>
          <FormField label="Landmark">
            <Input value={editForm.landmark} onChange={e => setEditForm(f => ({ ...f, landmark: e.target.value }))} placeholder="Nearby landmark" />
          </FormField>
          <FormField label="Expected Connection Type">
            <Select value={editForm.connectionType} onChange={e => setEditForm(f => ({ ...f, connectionType: e.target.value }))}>
              <option value="">Select…</option>
              {['FTTH', 'Sector', 'Village'].map(t => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <div className="col-span-2">
            <FormField label="Customer Requirement">
              <Textarea rows={2} value={editForm.customerRequirementNotes} onChange={e => setEditForm(f => ({ ...f, customerRequirementNotes: e.target.value }))} placeholder="Customer's requirements…" />
            </FormField>
          </div>
          <FormField label="Assigned Branch">
            <Select value={editForm.assignedBranch} onChange={e => setEditForm(f => ({ ...f, assignedBranch: e.target.value }))}>
              <option value="">Select…</option>
              {['CNPL-001','CNPL-002','CNPL-003','CNPL-004','CNPL-005','CNPL-006','CNPL-007','CNPL-008','CNPL-009','CNPL-010','CNPL-011'].map(b => <option key={b}>{b}</option>)}
            </Select>
          </FormField>
          <FormField label="Fiber Req (M)">
            <Input type="number" min="0" value={editForm.fiberRequired} onChange={e => setEditForm(f => ({ ...f, fiberRequired: e.target.value }))} placeholder="e.g. 250" />
          </FormField>
          <FormField label="Priority" required>
            <Select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
              {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* ── Assign Engineer Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        title={`Assign Engineer — ${req.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowAssign(false)}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={!assignForm.engineer}>Assign Engineer</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Engineer Name" required>
            <Select value={assignForm.engineer} onChange={e => setAssignForm(f => ({ ...f, engineer: e.target.value }))}>
              <option value="">Select engineer…</option>
              {ENGINEERS.map(eng => <option key={eng}>{eng}</option>)}
            </Select>
          </FormField>
          <FormField label="Assignment Date">
            <Input type="date" value={assignForm.date} onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>
          <FormField label="Priority" required>
            <Select value={assignForm.priority} onChange={e => setAssignForm(f => ({ ...f, priority: e.target.value }))}>
              {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Internal Notes">
            <Textarea rows={3} placeholder="Any notes for the engineer…"
              value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Approve Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        title={`Approve Feasibility — ${req.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowApprove(false)}>Cancel</Button>
          <Button size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleApprove}
            disabled={!approveForm.comment.trim() || !approveForm.fiberEstimate}
          >Approve</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Approval Comment" required>
            <Textarea rows={3} placeholder="Reason for approval…"
              value={approveForm.comment} onChange={e => setApproveForm(f => ({ ...f, comment: e.target.value }))} />
          </FormField>
          <FormField label="Estimated Fiber Requirement (meters)" required>
            <Input type="number" min="0" placeholder="e.g. 250"
              value={approveForm.fiberEstimate} onChange={e => setApproveForm(f => ({ ...f, fiberEstimate: e.target.value }))} />
          </FormField>
          <FormField label="Hardware Summary">
            <Textarea rows={2} placeholder="List required hardware…"
              value={approveForm.hardware} onChange={e => setApproveForm(f => ({ ...f, hardware: e.target.value }))} />
          </FormField>
          <FormField label="Installation Notes">
            <Textarea rows={2} placeholder="Any special installation instructions…"
              value={approveForm.installNotes} onChange={e => setApproveForm(f => ({ ...f, installNotes: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={showReject}
        onClose={() => setShowReject(false)}
        title={`Reject Feasibility — ${req.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowReject(false)}>Cancel</Button>
          <Button size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleReject}
            disabled={!rejectForm.reason || !rejectForm.remarks.trim()}
          >Reject</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Rejection Reason" required>
            <Select value={rejectForm.reason} onChange={e => setRejectForm(f => ({ ...f, reason: e.target.value }))}>
              <option value="">Select reason…</option>
              {REJECTION_REASONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
          <FormField label="Remarks" required>
            <Textarea rows={3} placeholder="Additional remarks…"
              value={rejectForm.remarks} onChange={e => setRejectForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}
