import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, UserCheck, CheckCircle2, XCircle, MapPin, User,
  Phone, Mail, Calendar, FileText, Image, Upload, Wrench, Edit2, ExternalLink,
  Plus, Trash2, Check, Route, Download,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'
import AddHardwareModal from '../components/hardware/AddHardwareModal'
import MoveStageModal from '../components/leads/MoveStageModal'
import {
  getFeasibilityRequest, updateFeasibilityStatus, subscribeFeasibility, saveFeasibilityRequest,
} from '../data/feasibilityStore'
import { getPipelines } from '../data/pipelineStore'
import { saveFollowup } from '../data/followupStore'

/* ── Constants ─────────────────────────────────────────────────── */

const ENGINEERS = ['Arjun Kumar', 'Preethi Nair', 'Anita Sharma', 'Suresh Babu']

// Feasibility requests store their pipeline as the display name ("Residential",
// "Enterprise" — see feasibilityStore.js), but MoveStageModal's findStageId
// (shared from the Leads flow) looks pipelines up by the short key a lead
// record carries in lead.pipeline ("B2C", "Enterprise" — see PIPELINE_MAP in
// MoveStageModal.jsx). Without this translation, findStageId can't resolve a
// stage id, stageFields comes back empty, and the modal silently falls back
// to rendering nothing but its follow-up toggle.
const PIPELINE_NAME_TO_KEY = { Residential: 'B2C', Enterprise: 'Enterprise' }

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

const SEGMENT_STATUS_OPTIONS = ['New Build', 'Existing', 'Under Construction', 'Planned']
const SEGMENT_TYPE_OPTIONS = ['Underground Ducts', 'Aerial Cable', 'Duct Bank', 'Direct Buried']

const SEGMENT_STATUS_VARIANT = {
  'New Build':           'blue',
  'Existing':            'green',
  'Under Construction':  'yellow',
  'Planned':             'gray',
}

// The 4-stage business pipeline shown in the horizontal progress stepper —
// distinct from the tab bar below it, which is pure content navigation.
const PROGRESS_STAGE_LABELS = ['Request Raised', 'Engineer Assigned', 'Feasibility Check', 'Approved / Rejected']

/* ── Helpers ────────────────────────────────────────────────────── */

function fmtDate(d) {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return d
}

// Parses the "28.6293° N, 77.3649° E" GPS Location format (every
// feasibility request record uses it — see feasibilityStore.js) into
// signed decimal { lat, lng }, so it works for any record, not just one.
function parseGpsLocation(gps) {
  if (!gps) return null
  const m = gps.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NS])\s*,\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])/i)
  if (!m) return null
  const [, latRaw, latDir, lngRaw, lngDir] = m
  const lat = parseFloat(latRaw) * (latDir.toUpperCase() === 'S' ? -1 : 1)
  const lng = parseFloat(lngRaw) * (lngDir.toUpperCase() === 'W' ? -1 : 1)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

// Maps a feasibility request's actual data (feasibilityStatus,
// assignedEngineer) to the 4-stage business pipeline shown in the progress
// stepper — mirrors Installation Detail's Status Timeline, which derives
// its stages from installation.status rather than any UI navigation state.
// Pending/Assigned/In Progress all represent the feasibility check being
// actively carried out (whether or not an engineer has been assigned yet)
// — only Approved/Rejected marks the check as finished, at which point the
// terminal stage takes on the outcome's label and color.
function getFeasibilityProgressStage(req) {
  const status = req.feasibilityStatus
  const hasEngineer = !!req.assignedEngineer
  const isApproved = status === 'Approved'
  const isRejected = status === 'Rejected'
  const isTerminal = isApproved || isRejected

  return PROGRESS_STAGE_LABELS.map((label, idx) => {
    if (idx === 0) return { label, state: 'completed' }
    if (idx === 1) return { label, state: hasEngineer ? 'completed' : 'upcoming' }
    if (idx === 2) return { label, state: isTerminal ? 'completed' : 'current' }
    // idx === 3 — terminal stage; label + color reflect the outcome
    if (isApproved) return { label: 'Approved', state: 'completed', variant: 'approved' }
    if (isRejected) return { label: 'Rejected', state: 'completed', variant: 'rejected' }
    return { label, state: 'upcoming' }
  })
}

/* ── Sub-components ─────────────────────────────────────────────── */

function Card({ title, icon: Icon, headerAction, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-border shadow-card ${className}`}>
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={15} className="text-gray-400 shrink-0" />}
          <h2 className="text-sm font-semibold text-gray-900 truncate">{title}</h2>
        </div>
        {headerAction}
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

// Sub-box used by the Feasibility Summary card's 2x2 grid — same
// label-above-value pattern as InfoRow, just on a light-gray background
// tile instead of plain page background.
function SummaryBox({ label, children }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
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

/* ── Google Maps link ─────────────────────────────────────────────── */
// Inline header-row action for the Location Details card — opens Google
// Maps in a new tab at this record's parsed coordinates. Renders nothing
// if the GPS Location string can't be parsed.
function GoogleMapsLink({ req }) {
  const coords = parseGpsLocation(req.gpsLocation)
  if (!coords) return null

  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline shrink-0"
    >
      View on Google Maps <ExternalLink size={12} />
    </a>
  )
}

/* ── Tab bar ────────────────────────────────────────────────────── */
const TABS = [
  { key: 'lead-customer',            label: 'Lead & Customer' },
  { key: 'requirement-feasibility',  label: 'Requirement & Feasibility' },
  { key: 'hardware',                 label: 'Hardware' },
  { key: 'attachments',              label: 'Attachments' },
  { key: 'fiber-route',              label: 'Fiber Route' },
]

// Identical underline tab-bar pattern to Customer Detail's Profile/Package
// Details/Finance tabs. Independent of the progress stepper above —
// every tab is freely clickable regardless of stage completion.
function TabBar({ activeTab, onTabClick }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
      <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabClick(tab.key)}
            className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
              ${activeTab === tab.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Progress stepper (data-driven, horizontal) ───────────────────── */
// Horizontal numbered/checkmark stepper, restored to its original position
// above the tab row — but unlike the original tab-synced version, this
// reads the request's real business pipeline status
// (getFeasibilityProgressStage) instead of which tab is active, so it's
// fully independent of the tab bar's content navigation.
function ProgressStepper({ req }) {
  const stages = getFeasibilityProgressStage(req)

  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card px-6 py-5">
      <div className="flex items-center">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1
          const isCompleted = stage.state === 'completed'
          const isCurrent = stage.state === 'current'
          const isRejected = stage.variant === 'rejected'

          return (
            <div key={stage.label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCurrent
                    ? 'bg-brand-blue border-brand-blue text-white'
                    : isCompleted
                      ? isRejected
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isCompleted
                    ? (isRejected ? <XCircle size={14} /> : <Check size={14} />)
                    : i + 1}
                </div>
                <span className={`text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'text-brand-blue'
                    : isCompleted
                      ? (isRejected ? 'text-red-600' : 'text-gray-700')
                      : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  isCompleted ? (isRejected ? 'bg-red-400' : 'bg-emerald-400') : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function FeasibilityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [req, setReq] = useState(() => getFeasibilityRequest(id))
  const pipelines = getPipelines()

  useEffect(() => {
    return subscribeFeasibility(all => {
      setReq(all.find(r => r.id === id) ?? null)
    })
  }, [id])

  // ?tab=lead-customer|requirement-feasibility|hardware|attachments tracks
  // which section is showing (Location Details lives inside the
  // lead-customer tab rather than having its own), consistent with the
  // ?section=/?modal=-style URL-param navigation used elsewhere in the app —
  // clicking a tab pushes a new history entry so back/forward moves through
  // them; an invalid/missing param is corrected to the first tab via a
  // history replace on load.
  const tabParam = searchParams.get('tab')
  const activeTab = TABS.some(t => t.key === tabParam) ? tabParam : TABS[0].key

  useEffect(() => {
    if (!TABS.some(t => t.key === searchParams.get('tab'))) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('tab', TABS[0].key)
        return next
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goToTab(tab) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    })
  }

  // Modals
  const [showAssign,  setShowAssign]  = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showReject,  setShowReject]  = useState(false)
  const [showAddHardware, setShowAddHardware] = useState(false)

  const [assignForm,  setAssignForm]  = useState({ engineer: '', date: '', priority: 'Medium', notes: '' })
  const [approveForm, setApproveForm] = useState({ comment: '', fiberEstimate: '', hardware: '', installNotes: '' })
  const [rejectForm,  setRejectForm]  = useState({ reason: '', remarks: '' })
  const [summaryForm, setSummaryForm] = useState({ estDistance: '', nearestPop: '', fiberCore: '' })
  const [segmentForm, setSegmentForm] = useState({ pathName: '', distance: '', status: 'New Build', segmentType: 'Underground Ducts', remarks: '' })
  const [editingSegmentIndex, setEditingSegmentIndex] = useState(null)

  const [toast, setToast] = useState('')

  // ?modal=edit-stage-fields opens the same "Stage Fields — Feasibility"
  // modal used by the Leads move-stage flow (/sales/leads/:leadId?action=
  // move-stage) — reused as-is here, pre-filled from this feasibility
  // request's own data instead of a lead's.
  const stageFieldsOpen = searchParams.get('modal') === 'edit-stage-fields'

  function openStageFieldsEdit() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'edit-stage-fields')
      return next
    })
  }

  function closeStageFieldsEdit() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      return next
    })
  }

  // ?modal=configure-feasibility-summary opens the Configure modal for the
  // Feasibility Summary card's editable fields — same ?modal= URL-param
  // pattern as the Stage Fields modal above.
  const summaryConfigOpen = searchParams.get('modal') === 'configure-feasibility-summary'

  function openSummaryConfig() {
    setSummaryForm({
      estDistance: req.estimatedDistanceFromFiber || '',
      nearestPop:  req.nearestPop || '',
      fiberCore:   req.fiberCore || 'OFC 6 Core Cable',
    })
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'configure-feasibility-summary')
      return next
    })
  }

  function closeSummaryConfig() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      return next
    })
  }

  function handleSummaryConfigSave() {
    saveFeasibilityRequest({
      ...req,
      estimatedDistanceFromFiber: summaryForm.estDistance,
      nearestPop: summaryForm.nearestPop,
      fiberCore:  summaryForm.fiberCore,
    })
    closeSummaryConfig()
    setToast('Feasibility summary updated')
  }

  // ?modal=add-fiber-segment opens the Add/Edit Fiber Route Segment modal —
  // same ?modal= URL-param pattern as the Stage Fields and Configure
  // Feasibility Summary modals above. Reused for both adding a new segment
  // (editingSegmentIndex === null) and editing an existing row.
  const segmentModalOpen = searchParams.get('modal') === 'add-fiber-segment'

  function openAddSegment() {
    setSegmentForm({ pathName: '', distance: '', status: 'New Build', segmentType: 'Underground Ducts', remarks: '' })
    setEditingSegmentIndex(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'add-fiber-segment')
      return next
    })
  }

  function openEditSegment(index) {
    const seg = (req.fiberRouteSegments ?? [])[index]
    setSegmentForm({
      pathName:    seg.pathName || '',
      distance:    seg.distance || '',
      status:      seg.status || 'New Build',
      segmentType: seg.segmentType || 'Underground Ducts',
      remarks:     seg.remarks || '',
    })
    setEditingSegmentIndex(index)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'add-fiber-segment')
      return next
    })
  }

  function closeSegmentModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      return next
    })
  }

  function handleSaveSegment() {
    const segments = [...(req.fiberRouteSegments ?? [])]
    if (editingSegmentIndex === null) {
      segments.push({ ...segmentForm })
    } else {
      segments[editingSegmentIndex] = { ...segmentForm }
    }
    saveFeasibilityRequest({ ...req, fiberRouteSegments: segments })
    closeSegmentModal()
    setToast(editingSegmentIndex === null ? 'Fiber route segment added' : 'Fiber route segment updated')
  }

  function handleRemoveSegment(index) {
    saveFeasibilityRequest({ ...req, fiberRouteSegments: (req.fiberRouteSegments ?? []).filter((_, i) => i !== index) })
  }

  function handleStageFieldsSave(targetStage, fieldVals, fuData) {
    saveFeasibilityRequest({
      ...req,
      localityName:             fieldVals['s4-f1'] || req.localityName || '',
      subLocalityName:          fieldVals['s4-f2'] || req.subLocalityName || '',
      completeAddress:          fieldVals['s4-f3'] || req.completeAddress || '',
      landmark:                 fieldVals['s4-f4'] || req.landmark || '',
      connectionType:           fieldVals['s4-f5'] || req.connectionType || '',
      customerRequirementNotes: fieldVals['s4-f6'] || req.customerRequirementNotes || '',
      assignedBranch:           fieldVals['s4-f7'] || req.assignedBranch || '',
      internalRemarks:          fieldVals['s4-f8'] || req.internalRemarks || '',
    })
    if (fuData?.date) {
      saveFollowup({
        id: `FU-${Date.now()}`, leadId: req.leadId, leadName: req.customerName, phone: req.mobile,
        date: fuData.date, time: fuData.time, note: fuData.note, stage: targetStage,
        assignedTo: req.assignedEngineer || '', notifyTo: fuData.notifyTo,
        priority: req.priority ?? 'medium', status: 'Pending',
      })
    }
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

  function handleAddHardware(items) {
    if (items.length === 0) return
    saveFeasibilityRequest({ ...req, hardwareItems: [...(req.hardwareItems ?? []), ...items] })
    setShowAddHardware(false)
    setToast('Hardware added successfully')
  }

  function handleRemoveHardware(index) {
    saveFeasibilityRequest({ ...req, hardwareItems: (req.hardwareItems ?? []).filter((_, i) => i !== index) })
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

  // Shaped to duck-type the subset of a lead's fields MoveStageModal reads
  // to pre-fill the Feasibility stage fields (s4-f*, see stageFieldsStore.js)
  // — using this request's own location/requirement data instead of a lead's.
  const stageFieldsLead = {
    name:                req.customerName,
    pipeline:            PIPELINE_NAME_TO_KEY[req.pipeline] ?? req.pipeline,
    locality:            req.localityName,
    subLocality:         req.subLocalityName,
    address:             req.completeAddress,
    landmark:            req.landmark,
    siteType:            req.connectionType,
    customerRequirement: req.customerRequirementNotes,
    branchCode:          req.assignedBranch,
    remarks:             req.internalRemarks,
  }

  // ?category=chargeable|non-chargeable filters the Hardware tab's Added
  // Hardware list; absent (or any other value) shows everything. Original
  // array index is kept alongside each item so removal still targets the
  // right position in req.hardwareItems after filtering.
  const hardwareCategoryFilter = searchParams.get('category')
  const displayedHardwareItems = (req.hardwareItems ?? [])
    .map((h, i) => ({ ...h, _index: i }))
    .filter(h => {
      if (hardwareCategoryFilter === 'chargeable') return h.chargeable
      if (hardwareCategoryFilter === 'non-chargeable') return !h.chargeable
      return true
    })

  return (
    <div className="p-6 space-y-6">

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left Column (main content) ── */}
        <div className="lg:col-span-2 space-y-4">

        <ProgressStepper req={req} />

        <TabBar activeTab={activeTab} onTabClick={goToTab} />

        {/* Lead & Customer (Lead & Customer Info, plus Location Details as
            its own distinct card underneath — merged into this tab rather
            than kept as a separate tab) */}
        {activeTab === 'lead-customer' && (
          <div className="space-y-4">
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

            <Card title="Location Details" icon={MapPin} headerAction={<GoogleMapsLink req={req} />}>
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
              </div>
            </Card>
          </div>
        )}

        {/* Requirement & Feasibility (Feasibility Details merged with the
            Customer Requirement content, plus the Assignment/Approval/
            Rejection outcome cards, which aren't named as their own tab) */}
        {activeTab === 'requirement-feasibility' && (
          <div className="space-y-6">
              <Card
                title="Feasibility Details"
                icon={FileText}
                headerAction={
                  <Button variant="secondary" size="sm" icon={<Edit2 size={13} />} onClick={openStageFieldsEdit}>
                    Edit
                  </Button>
                }
              >
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
                        {req.customerRequirementNotes || req.customerRequirement || '—'}
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
          </div>
        )}

        {/* Hardware */}
        {activeTab === 'hardware' && (
              <Card
                title="Hardware Requirements"
                icon={Wrench}
                headerAction={
                  <button
                    onClick={() => setShowAddHardware(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={13} /> Add Hardware
                  </button>
                }
              >
                {(!req.hwItems?.length && !req.wireItems?.length && !req.hardwareItems?.length) ? (
                  <p className="text-sm text-gray-400 text-center py-4">No hardware requirements added yet</p>
                ) : (
                  <div className="space-y-6">
                    {/* Added Hardware (Chargeable/Non-Chargeable, via Add Hardware modal) —
                        filtered by ?category= when present */}
                    {req.hardwareItems?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Added Hardware</p>
                        <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden">
                          {displayedHardwareItems.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No {hardwareCategoryFilter} items</p>
                          ) : displayedHardwareItems.map(h => (
                            <div key={h._index} className="flex items-center gap-3 px-3 py-2.5">
                              <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{h.name}</span>
                              <Badge variant={h.chargeable ? 'orange' : 'gray'} size="sm" className="shrink-0">
                                {h.chargeable ? 'Chargeable' : 'Non-Chargeable'}
                              </Badge>
                              <span className="w-16 shrink-0 text-right text-xs text-gray-500">Qty {h.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveHardware(h._index)}
                                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
        )}

        {/* Attachments */}
        {activeTab === 'attachments' && (
          <Card title="Attachments" icon={Image}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AttachmentSlot label="Site Images"           icon={Image} />
              <AttachmentSlot label="Location Photos"       icon={MapPin} />
              <AttachmentSlot label="Supporting Documents"  icon={FileText} />
            </div>
          </Card>
        )}

        {/* Fiber Route */}
        {activeTab === 'fiber-route' && (
          <Card
            title="Fiber Route Details"
            icon={Route}
            headerAction={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={openAddSegment}>
                  Add Segment
                </Button>
                <button
                  type="button"
                  title="Export route data"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors shrink-0"
                >
                  <Download size={14} />
                </button>
              </div>
            }
          >
            {(!req.fiberRouteSegments?.length) ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No fiber route segments recorded yet. Click{' '}
                <button type="button" onClick={openAddSegment} className="font-semibold text-gray-500 hover:text-brand-blue transition-colors">
                  + Add Segment
                </button>{' '}
                to record route details.
              </p>
            ) : (
              <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden">
                {req.fiberRouteSegments.map((seg, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Route size={14} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{seg.pathName || '—'}</p>
                        <Badge variant={SEGMENT_STATUS_VARIANT[seg.status] || 'gray'} size="sm">{seg.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{seg.distance || '—'} · {seg.segmentType}</p>
                      {seg.remarks && <p className="text-xs text-gray-400 mt-1">{seg.remarks}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditSegment(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSegment(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        </div>

        {/* ── Right Column (sidebar) ── */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">

          {/* Feasibility Summary — sidebar card, visible regardless of
              active tab (unlike the tab-scoped content in the left
              column); stacked single-column rows since the sidebar is
              narrower than the main content column's old 2x2 grid. */}
          <Card
            title="Feasibility Summary"
            headerAction={
              <Button variant="secondary" size="sm" icon={<Edit2 size={13} />} onClick={openSummaryConfig}>
                Configure
              </Button>
            }
          >
            <div className="space-y-4">
              <SummaryBox label="Est. Distance">
                <p className="text-base font-bold text-gray-900">{req.estimatedDistanceFromFiber || '—'}</p>
              </SummaryBox>
              <SummaryBox label="Est. Fiber Cost">
                {/* TODO: wire to real inventory-based cost calculation once available */}
                <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-blue">
                  <FileText size={14} /> Auto-calculated
                </p>
                <p className="text-xs text-gray-400 mt-0.5">(Inventory Model)</p>
              </SummaryBox>
              <SummaryBox label="Nearest POP">
                <p className="text-base font-bold text-gray-900">{req.nearestPop || '—'}</p>
              </SummaryBox>
              <SummaryBox label="Fiber Core">
                <p className="text-base font-bold text-gray-900">{req.fiberCore || 'OFC 6 Core Cable'}</p>
              </SummaryBox>
            </div>
          </Card>
        </div>

      </div>

      {/* ── Feasibility Details Edit Modal (shared Stage Fields modal, reused
           as-is from the Leads move-stage flow) ──────────────────────── */}
      <MoveStageModal
        isOpen={stageFieldsOpen}
        onClose={closeStageFieldsEdit}
        lead={stageFieldsLead}
        pipelines={pipelines}
        targetStage="Feasibility"
        onSave={handleStageFieldsSave}
        title={`Feasibility Details — ${req.customerName}`}
      />

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

      {/* ── Configure Feasibility Summary Modal ─────────────────────── */}
      <Modal
        isOpen={summaryConfigOpen}
        onClose={closeSummaryConfig}
        title="Configure Feasibility Summary"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeSummaryConfig}>Cancel</Button>
          <Button size="sm" onClick={handleSummaryConfigSave}>Save</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Est. Distance">
            <Input placeholder="e.g. 1.2 km"
              value={summaryForm.estDistance} onChange={e => setSummaryForm(f => ({ ...f, estDistance: e.target.value }))} />
          </FormField>
          <FormField label="Nearest POP">
            <Input placeholder="e.g. POP-Sector78-02"
              value={summaryForm.nearestPop} onChange={e => setSummaryForm(f => ({ ...f, nearestPop: e.target.value }))} />
          </FormField>
          <FormField label="Fiber Core">
            <Input placeholder="e.g. OFC 6 Core Cable"
              value={summaryForm.fiberCore} onChange={e => setSummaryForm(f => ({ ...f, fiberCore: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Add/Edit Fiber Route Segment Modal ──────────────────────── */}
      <Modal
        isOpen={segmentModalOpen}
        onClose={closeSegmentModal}
        title={
          <span className="flex items-center gap-2">
            <Route size={15} className="text-brand-blue" />
            {editingSegmentIndex === null ? 'Add Fiber Route Segment' : 'Edit Fiber Route Segment'}
          </span>
        }
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeSegmentModal}>Cancel</Button>
          <Button size="sm"
            onClick={handleSaveSegment}
            disabled={!segmentForm.pathName.trim() || !segmentForm.distance.trim()}
          >
            {editingSegmentIndex === null ? 'Add Segment' : 'Save Changes'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Segment Path Name" required>
            <Input placeholder="e.g. POP-04 to MH-112"
              value={segmentForm.pathName} onChange={e => setSegmentForm(f => ({ ...f, pathName: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Distance" required>
              <Input placeholder="e.g. 450m"
                value={segmentForm.distance} onChange={e => setSegmentForm(f => ({ ...f, distance: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <Select value={segmentForm.status} onChange={e => setSegmentForm(f => ({ ...f, status: e.target.value }))}>
                {SEGMENT_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Segment Type">
            <Select value={segmentForm.segmentType} onChange={e => setSegmentForm(f => ({ ...f, segmentType: e.target.value }))}>
              {SEGMENT_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Remarks">
            <Input placeholder="e.g. Requires ROW permission"
              value={segmentForm.remarks} onChange={e => setSegmentForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Add Hardware Modal (shared Chargeable/Non-Chargeable picker) ── */}
      <AddHardwareModal
        open={showAddHardware}
        onClose={() => setShowAddHardware(false)}
        onAdd={handleAddHardware}
      />

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}
