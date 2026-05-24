import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Calendar, List, Plus, Clock, Phone, MessageSquare,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  Bell, Search, Filter, X, Users, LayoutGrid, MoreVertical, Ban, ChevronDown, CalendarClock,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getFollowups, saveFollowup, markFollowupDone, cancelFollowup, subscribeFollowups,
} from '../data/followupStore'

// ── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]

const STAFF = [
  { name: 'Arjun Kumar',   initials: 'AK', color: 'bg-brand-blue'    },
  { name: 'Preethi Nair',  initials: 'PN', color: 'bg-purple-500'    },
  { name: 'Suresh Babu',   initials: 'SB', color: 'bg-emerald-500'   },
  { name: 'Anita Sharma',  initials: 'AS', color: 'bg-brand-orange'  },
]

const STAGES = [
  'New Inquiry', 'Contacted', 'Follow-up', 'Site Survey',
  'Quotation Sent', 'Negotiation', 'Hardware Assignment', 'Won', 'Lost',
]

const STATUS_BADGE = {
  Pending:   'yellow',
  Done:      'green',
  Overdue:   'red',
  Cancelled: 'gray',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const KANBAN_COLS = [
  {
    id: 'dueToday',
    label: 'Due Today',
    headerBg: 'bg-brand-orange',
    colBg: 'bg-orange-50/50',
    borderColor: 'border-orange-200',
    emptyMsg: 'No follow-ups due today',
    filter: fu => fu.date === TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled',
  },
  {
    id: 'upcoming',
    label: 'Upcoming',
    headerBg: 'bg-brand-blue',
    colBg: 'bg-blue-50/50',
    borderColor: 'border-blue-200',
    emptyMsg: 'No upcoming follow-ups',
    filter: fu => fu.date > TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    headerBg: 'bg-red-500',
    colBg: 'bg-red-50/50',
    borderColor: 'border-red-200',
    emptyMsg: 'No overdue follow-ups',
    filter: fu => fu.date < TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled',
  },
  {
    id: 'completed',
    label: 'Completed',
    headerBg: 'bg-emerald-500',
    colBg: 'bg-emerald-50/50',
    borderColor: 'border-emerald-200',
    emptyMsg: 'No completed follow-ups',
    filter: fu => fu.status === 'Done',
  },
]

// ── Set Follow-up Modal ──────────────────────────────────────────────────────

function FollowupModal({ isOpen, onClose, initial, onSave }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(initial ?? {
    leadName: '', phone: '', date: TODAY, time: '10:00',
    note: '', stage: '', assignedTo: '', notifyTo: [], priority: 'medium',
  })

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function toggleNotify(name) {
    setForm(p => ({
      ...p,
      notifyTo: p.notifyTo.includes(name)
        ? p.notifyTo.filter(n => n !== name)
        : [...p.notifyTo, name],
    }))
  }

  function handleSave() {
    if (!form.leadName.trim() || !form.date) return
    onSave({
      ...form,
      id: isEdit ? initial.id : `FU-${Date.now()}`,
      leadId: isEdit ? initial.leadId : `LD-${Date.now()}`,
      status: isEdit ? initial.status : 'Pending',
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Follow-up — ${initial.leadName}` : 'Set Follow-up'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? 'Save Changes' : 'Set Follow-up'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Lead Name" required>
          <Input value={form.leadName} onChange={e => set('leadName', e.target.value)} placeholder="Customer name" />
        </FormField>
        <FormField label="Phone">
          <Input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
        </FormField>
        <FormField label="Follow-up Date" required>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </FormField>
        <FormField label="Time">
          <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
        </FormField>
        <FormField label="Stage">
          <Select value={form.stage} onChange={e => set('stage', e.target.value)}>
            <option value="">Select Stage</option>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Assigned To">
          <Select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
            <option value="">Select Rep</option>
            {STAFF.map(s => <option key={s.name}>{s.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Priority">
          <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </FormField>
        <div />
        <div className="col-span-2">
          <FormField label="Note">
            <Textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Context or reminder for this follow-up…" rows={3} />
          </FormField>
        </div>
        <div className="col-span-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Notify To</p>
          <div className="flex flex-wrap gap-2">
            {STAFF.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => toggleNotify(s.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  form.notifyTo.includes(s.name)
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-surface-border bg-white text-gray-600 hover:border-brand-blue/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}>
                  {s.initials}
                </div>
                {s.name}
                {form.notifyTo.includes(s.name) && <CheckCircle2 size={12} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Cancel Confirm Modal ─────────────────────────────────────────────────────

function CancelConfirmModal({ isOpen, onClose, onConfirm, leadName }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel this follow-up?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Keep</Button>
          <Button variant="danger" onClick={onConfirm}>Cancel Follow-up</Button>
        </>
      }
    >
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ban size={22} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          This follow-up for{' '}
          <span className="font-semibold text-gray-900">{leadName}</span>{' '}
          will be marked as cancelled and removed from the active list.
        </p>
      </div>
    </Modal>
  )
}

// ── Reschedule Modal ─────────────────────────────────────────────────────────

function RescheduleModal({ isOpen, onClose, followup, onSave }) {
  const [date, setDate] = useState(followup?.date ?? TODAY)
  const [time, setTime] = useState(followup?.time ?? '10:00')

  useEffect(() => {
    if (isOpen && followup) {
      setDate(followup.date)
      setTime(followup.time)
    }
  }, [isOpen, followup])

  function handleSave() {
    if (!date) return
    onSave({ ...followup, date, time, status: followup.status === 'Cancelled' ? 'Pending' : followup.status })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reschedule — ${followup?.leadName ?? ''}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Reschedule</Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <FormField label="New Date" required>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FormField>
        <FormField label="New Time">
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ fu, colId, onMarkDone, onEdit, onCancel, isDragging, onDragStart, onDragEnd }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const isCompleted = fu.status === 'Done'
  const isCancelled = fu.status === 'Cancelled'
  const isOverdue = colId === 'overdue'
  const isUpcoming = colId === 'upcoming'

  const daysOverdue = isOverdue
    ? Math.floor((new Date(TODAY + 'T00:00:00') - new Date(fu.date + 'T00:00:00')) / 86400000)
    : 0

  const assignedStaff = STAFF.find(s => s.name === fu.assignedTo)

  // close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  return (
    <div
      draggable={!isCompleted && !isCancelled}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.() }}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-lg border border-surface-border p-3 transition-all select-none
        ${!isCompleted && !isCancelled ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        ${isDragging ? 'opacity-40 scale-[0.97] shadow-card-hover' : 'shadow-card hover:shadow-card-hover'}
        ${isCompleted || isCancelled ? 'opacity-60' : ''}
      `}
    >
      {/* Header: name + ⋯ menu */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="min-w-0">
          <p className={`font-semibold text-sm text-gray-900 truncate ${isCompleted ? 'line-through text-gray-400' : ''}`}>
            {fu.leadName}
          </p>
          <p className="text-[10px] text-gray-400">{fu.leadId}</p>
        </div>
        {!isCompleted && !isCancelled && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(p => !p)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={13} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-7 bg-white rounded-lg border border-surface-border shadow-lg z-20 py-1 w-40">
                <button
                  onClick={() => { setShowMenu(false); onCancel(fu) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Ban size={11} /> Cancel Follow-up
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phone */}
      <a
        href={`tel:${fu.phone}`}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-blue mb-2 transition-colors"
      >
        <Phone size={11} /> {fu.phone}
      </a>

      {/* Stage + priority */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
          {fu.stage}
        </span>
        {fu.priority === 'high' && <Badge variant="red" size="sm">High</Badge>}
        {fu.priority === 'medium' && <Badge variant="orange" size="sm">Med</Badge>}
      </div>

      {/* Date/time — show date prominently for upcoming */}
      <div className="flex items-center gap-1 text-xs mb-2">
        <Clock size={11} className="text-gray-400 flex-shrink-0" />
        {isUpcoming && (
          <span className="text-brand-blue font-semibold">{fu.date} ·&nbsp;</span>
        )}
        <span className="text-gray-500">{fu.time}</span>
      </div>

      {/* Overdue indicator */}
      {isOverdue && daysOverdue > 0 && (
        <div className="flex items-center gap-1 text-xs text-red-600 font-semibold mb-2">
          <AlertCircle size={11} />
          {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
        </div>
      )}

      {/* Completion date */}
      {isCompleted && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 mb-2">
          <CheckCircle2 size={11} /> Completed · {fu.date}
        </div>
      )}

      {/* Note preview */}
      {fu.note && (
        <p className="text-xs text-gray-400 italic line-clamp-1 mb-2">{fu.note}</p>
      )}

      {/* Footer: avatar + actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-border">
        {assignedStaff ? (
          <span
            title={fu.assignedTo}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 ${assignedStaff.color}`}
          >
            {assignedStaff.initials}
          </span>
        ) : <span />}

        {!isCompleted && !isCancelled && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onMarkDone(fu.id)}
              className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 px-1.5 py-1 rounded transition-colors whitespace-nowrap"
            >
              <CheckCircle2 size={10} /> Mark Complete
            </button>
            <button
              onClick={() => onEdit(fu)}
              className="flex items-center gap-1 text-[10px] font-medium text-brand-blue hover:bg-brand-blue/5 px-1.5 py-1 rounded transition-colors"
            >
              <Bell size={10} /> Reschedule
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Kanban View ───────────────────────────────────────────────────────────────

function KanbanView({ followups, onMarkDone, onEdit, onCancel }) {
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [cancelledOpen, setCancelledOpen] = useState(false)

  const cancelled = followups.filter(fu => fu.status === 'Cancelled')

  function handleDrop(colId) {
    if (!draggingId) return
    const fu = followups.find(f => f.id === draggingId)
    if (!fu || fu.status === 'Cancelled') return

    if (colId === 'dueToday') {
      saveFollowup({ ...fu, date: TODAY, status: 'Pending' })
    } else if (colId === 'completed') {
      onMarkDone(fu.id)
    } else if (colId === 'upcoming') {
      onEdit(fu)
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start">
      {KANBAN_COLS.map(col => {
        const cards = followups.filter(col.filter)
        const isDragTarget = dragOverCol === col.id && draggingId !== null

        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-72 rounded-xl border overflow-visible transition-all ${col.borderColor}
              ${isDragTarget ? 'ring-2 ring-brand-blue/50 scale-[1.01]' : ''}
            `}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverCol !== col.id) setDragOverCol(col.id) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null) }}
            onDrop={e => { e.preventDefault(); handleDrop(col.id) }}
          >
            {/* Column header */}
            <div className={`${col.headerBg} px-4 py-3 flex items-center justify-between rounded-t-xl`}>
              <span className="font-semibold text-sm text-white">{col.label}</span>
              <span className="text-white text-xs font-bold bg-white/25 px-2 py-0.5 rounded-full">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className={`${col.colBg} p-3 space-y-3 min-h-[200px] rounded-b-xl`}>
              {cards.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-10 text-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragTarget ? 'border-brand-blue/40 bg-brand-blue/5' : 'border-gray-200'
                }`}>
                  <p className="text-xs text-gray-400">{col.emptyMsg}</p>
                </div>
              ) : (
                cards.map(fu => (
                  <KanbanCard
                    key={fu.id}
                    fu={fu}
                    colId={col.id}
                    onMarkDone={onMarkDone}
                    onEdit={onEdit}
                    onCancel={onCancel}
                    isDragging={draggingId === fu.id}
                    onDragStart={() => setDraggingId(fu.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}

      {/* Cancelled column (collapsed accordion) */}
      <div className="flex-shrink-0 w-72 rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setCancelledOpen(p => !p)}
          className="w-full bg-gray-400 px-4 py-3 flex items-center justify-between hover:bg-gray-500 transition-colors"
        >
          <span className="font-semibold text-sm text-white">Cancelled</span>
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold bg-white/25 px-2 py-0.5 rounded-full">
              {cancelled.length}
            </span>
            <ChevronDown
              size={14}
              className={`text-white transition-transform duration-200 ${cancelledOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {cancelledOpen && (
          <div className="bg-gray-50/50 p-3 space-y-3 min-h-[80px]">
            {cancelled.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-center">
                <p className="text-xs text-gray-400">No cancelled follow-ups</p>
              </div>
            ) : (
              cancelled.map(fu => (
                <KanbanCard
                  key={fu.id}
                  fu={fu}
                  colId="cancelled"
                  onMarkDone={onMarkDone}
                  onEdit={onEdit}
                  onCancel={onCancel}
                  isDragging={false}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table View ───────────────────────────────────────────────────────────────

const STATUS_PILLS = [
  { id: 'all',       label: 'All'       },
  { id: 'dueToday',  label: 'Due Today' },
  { id: 'upcoming',  label: 'Upcoming'  },
  { id: 'overdue',   label: 'Overdue'   },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function TableView({ followups, onMarkDone, onReschedule, onCancel, search }) {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = search.trim()
      ? followups.filter(f =>
          f.leadName.toLowerCase().includes(search.toLowerCase()) ||
          f.phone.includes(search)
        )
      : followups

    switch (statusFilter) {
      case 'dueToday':  return result.filter(f => f.date === TODAY && f.status !== 'Done' && f.status !== 'Cancelled')
      case 'upcoming':  return result.filter(f => f.date > TODAY && f.status !== 'Done' && f.status !== 'Cancelled')
      case 'overdue':   return result.filter(f => f.date < TODAY && f.status !== 'Done' && f.status !== 'Cancelled')
      case 'completed': return result.filter(f => f.status === 'Done')
      case 'cancelled': return result.filter(f => f.status === 'Cancelled')
      default:          return result
    }
  }, [followups, search, statusFilter])

  return (
    <div className="space-y-3">
      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_PILLS.map(pill => (
          <button
            key={pill.id}
            onClick={() => setStatusFilter(pill.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              statusFilter === pill.id
                ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                : 'bg-white text-gray-500 border-surface-border hover:border-brand-blue/40 hover:text-brand-blue'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                {['FU ID', 'Lead Name', 'Customer', 'Pipeline', 'Stage', 'Date', 'Time', 'Assigned', 'Notifiers', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400 text-sm">No follow-ups found</td>
                </tr>
              ) : (
                filtered.map(fu => {
                  const isOverdue = fu.status === 'Overdue' || (fu.date < TODAY && fu.status === 'Pending')
                  const isDone = fu.status === 'Done'
                  const isCancelled = fu.status === 'Cancelled'
                  return (
                    <tr
                      key={fu.id}
                      className={`border-b border-surface-border last:border-0 transition-colors hover:bg-gray-50 ${
                        isCancelled ? 'bg-gray-50/60 opacity-70'
                        : isOverdue ? 'bg-red-50/40'
                        : isDone    ? 'bg-emerald-50/30'
                        : ''
                      }`}
                    >
                      {/* FU ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {fu.id}
                        </span>
                      </td>

                      {/* Lead Name */}
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-gray-900 text-sm ${isDone || isCancelled ? 'line-through text-gray-400' : ''}`}>
                          {fu.leadName}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {fu.customer || '—'}
                      </td>

                      {/* Pipeline */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {fu.pipeline ? (
                          <Badge variant={fu.pipeline === 'Corporate' ? 'navy' : 'blue'} size="sm">
                            {fu.pipeline}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {fu.stage}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                          {fu.date}
                        </div>
                        {isOverdue && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-semibold mt-0.5">
                            <AlertCircle size={10} /> Overdue
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{fu.time}</span>
                      </td>

                      {/* Assigned */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {fu.assignedTo || '—'}
                      </td>

                      {/* Notifiers */}
                      <td className="px-4 py-3">
                        {fu.notifyTo.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {fu.notifyTo.map(n => {
                              const s = STAFF.find(st => st.name === n)
                              return s ? (
                                <span
                                  key={n}
                                  title={n}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}
                                >
                                  {s.initials}
                                </span>
                              ) : null
                            })}
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge
                          variant={isCancelled ? 'gray' : (STATUS_BADGE[isOverdue ? 'Overdue' : fu.status] ?? 'gray')}
                          size="sm"
                        >
                          {isCancelled ? 'Cancelled' : isOverdue && !isDone ? 'Overdue' : fu.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!isDone && !isCancelled && (
                            <button
                              onClick={() => onMarkDone(fu.id)}
                              title="Mark Complete"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {!isDone && !isCancelled && (
                            <button
                              onClick={() => onReschedule(fu)}
                              title="Reschedule"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors"
                            >
                              <CalendarClock size={14} />
                            </button>
                          )}
                          <a
                            href={`tel:${fu.phone}`}
                            title="Call"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors"
                          >
                            <Phone size={14} />
                          </a>
                          {!isDone && !isCancelled && (
                            <button
                              onClick={() => onCancel(fu)}
                              title="Cancel Follow-up"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ followups, onEdit }) {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(4) // 0-indexed, May = 4
  const [selectedDate, setSelectedDate] = useState(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = TODAY

  const fuByDate = useMemo(() => {
    const map = {}
    followups.forEach(fu => {
      if (!map[fu.date]) map[fu.date] = []
      map[fu.date].push(fu)
    })
    return map
  }, [followups])

  function pad(n) { return String(n).padStart(2, '0') }
  function dateStr(d) { return `${year}-${pad(month + 1)}-${pad(d)}` }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const selectedFollowups = selectedDate ? (fuByDate[selectedDate] ?? []) : []

  const PRIORITY_DOT = {
    high:   'bg-red-500',
    medium: 'bg-amber-400',
    low:    'bg-gray-300',
  }

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="font-bold text-gray-900">{MONTH_NAMES[month]} {year}</h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-surface-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-surface-border bg-gray-50/50" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const ds = dateStr(day)
            const dayFU = fuByDate[ds] ?? []
            const isToday = ds === todayStr
            const isSelected = ds === selectedDate
            const hasOverdue = dayFU.some(f => f.status === 'Overdue' || (f.date < todayStr && f.status === 'Pending'))

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                className={`min-h-[80px] border-b border-r border-surface-border p-1.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-brand-blue/5 ring-1 ring-inset ring-brand-blue/30' : 'hover:bg-gray-50'
                } ${hasOverdue ? 'bg-red-50/40' : ''}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${
                  isToday ? 'bg-brand-blue text-white' : 'text-gray-700'
                }`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayFU.slice(0, 3).map(fu => (
                    <div
                      key={fu.id}
                      className={`flex items-center gap-1 text-[10px] rounded px-1 py-0.5 ${
                        fu.status === 'Overdue' || (fu.date < todayStr && fu.status === 'Pending')
                          ? 'bg-red-100 text-red-700'
                          : fu.status === 'Done'
                          ? 'bg-emerald-50 text-emerald-700'
                          : fu.status === 'Cancelled'
                          ? 'bg-gray-100 text-gray-400 line-through'
                          : 'bg-brand-blue/8 text-brand-blue'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[fu.priority]}`} />
                      <span className="truncate font-medium">{fu.leadName.split(' ')[0]}</span>
                    </div>
                  ))}
                  {dayFU.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayFU.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card">
        {selectedDate ? (
          <>
            <div className="px-4 py-3 border-b border-surface-border">
              <p className="font-semibold text-gray-900 text-sm">{selectedDate}</p>
              <p className="text-xs text-gray-500">{selectedFollowups.length} follow-up{selectedFollowups.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-surface-border max-h-[520px] overflow-y-auto">
              {selectedFollowups.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">No follow-ups on this date</div>
              ) : (
                selectedFollowups.map(fu => {
                  const isOverdue = fu.status === 'Overdue' || (fu.date < todayStr && fu.status === 'Pending')
                  return (
                    <div key={fu.id} className={`px-4 py-3 ${isOverdue ? 'bg-red-50/40' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{fu.leadName}</p>
                          <p className="text-xs text-gray-400 font-mono">{fu.phone}</p>
                        </div>
                        <Badge variant={STATUS_BADGE[isOverdue ? 'Overdue' : fu.status] ?? 'gray'} size="sm">
                          {isOverdue && fu.status !== 'Done' ? 'Overdue' : fu.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <Clock size={11} /> {fu.time} · {fu.stage}
                      </p>
                      {fu.note && <p className="text-xs text-gray-500 italic mb-2">{fu.note}</p>}
                      <div className="flex gap-2">
                        <a
                          href={`tel:${fu.phone}`}
                          className="flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:bg-brand-blue/5 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Phone size={11} /> Call
                        </a>
                        <button
                          onClick={() => onEdit(fu)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Bell size={11} /> Edit
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Calendar size={32} className="text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">Click a date</p>
            <p className="text-xs text-gray-300 mt-1">to see follow-ups</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SalesFollowups() {
  const [followups, setFollowups] = useState(getFollowups())
  const [view, setView] = useState('table')
  const [showModal, setShowModal] = useState(false)
  const [editingFU, setEditingFU] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => subscribeFollowups(setFollowups), [])

  function saveFU(fu) { saveFollowup(fu) }
  function markDone(id) { markFollowupDone(id) }

  function openEdit(fu) {
    setEditingFU(fu)
    setShowModal(true)
  }

  function openReschedule(fu) {
    setRescheduleTarget(fu)
  }

  function openCancel(fu) {
    setCancelTarget(fu)
  }

  function confirmCancel() {
    if (cancelTarget) {
      cancelFollowup(cancelTarget.id)
      setCancelTarget(null)
    }
  }

  const filtered = followups.filter(fu => {
    if (filterAssigned && fu.assignedTo !== filterAssigned) return false
    if (filterDateFrom && fu.date < filterDateFrom) return false
    if (filterDateTo && fu.date > filterDateTo) return false
    return true
  })

  const pendingCount   = followups.filter(f => f.date >= TODAY && f.status !== 'Done' && f.status !== 'Cancelled').length
  const overdueCount   = followups.filter(f => f.date < TODAY && f.status !== 'Done' && f.status !== 'Cancelled').length
  const doneCount      = followups.filter(f => f.status === 'Done').length
  const cancelledCount = followups.filter(f => f.status === 'Cancelled').length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and track lead follow-ups</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => { setEditingFU(null); setShowModal(true) }}>
          Set Follow-up
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: followups.length, color: 'text-gray-700',    bg: 'bg-gray-100'    },
          { label: 'Pending',   value: pendingCount,     color: 'text-amber-600',   bg: 'bg-amber-100'   },
          { label: 'Overdue',   value: overdueCount,     color: 'text-red-600',     bg: 'bg-red-100'     },
          { label: 'Completed', value: doneCount,        color: 'text-emerald-700', bg: 'bg-emerald-100' },
          { label: 'Cancelled', value: cancelledCount,   color: 'text-gray-500',    bg: 'bg-gray-100'    },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={14} /> Table View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar size={14} /> Calendar View
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={14} /> Kanban View
          </button>
        </div>

        {/* Search + filters (table only) */}
        {view === 'table' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads…"
                className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-56 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              size="sm"
              variant={showFilters ? 'primary' : 'secondary'}
              icon={<Filter size={13} />}
              onClick={() => setShowFilters(p => !p)}
            >
              Filters
            </Button>
          </div>
        )}
      </div>

      {/* Admin filters */}
      {showFilters && view === 'table' && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned By</label>
              <select
                value={filterAssigned}
                onChange={e => setFilterAssigned(e.target.value)}
                className="text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">All Staff</option>
                {STAFF.map(s => <option key={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setFilterAssigned(''); setFilterDateFrom(''); setFilterDateTo('') }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Main content */}
      {view === 'table' ? (
        <TableView followups={filtered} onMarkDone={markDone} onReschedule={openReschedule} onCancel={openCancel} search={search} />
      ) : view === 'calendar' ? (
        <CalendarView followups={filtered} onEdit={openEdit} />
      ) : (
        <KanbanView followups={filtered} onMarkDone={markDone} onEdit={openEdit} onCancel={openCancel} />
      )}

      {/* Set/Edit follow-up modal */}
      {showModal && (
        <FollowupModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingFU(null) }}
          initial={editingFU}
          onSave={saveFU}
        />
      )}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <CancelConfirmModal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
          leadName={cancelTarget?.leadName}
        />
      )}

      {/* Reschedule modal */}
      {rescheduleTarget && (
        <RescheduleModal
          key={rescheduleTarget.id}
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          followup={rescheduleTarget}
          onSave={saveFU}
        />
      )}
    </div>
  )
}
