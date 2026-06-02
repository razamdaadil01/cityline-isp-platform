import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Calendar, List, Plus, Clock, Phone, MessageSquare,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  Bell, Search, Filter, X, Users, LayoutGrid, MoreVertical, Ban, ChevronDown, CalendarClock, Edit3,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import CallModal from '../components/ui/CallModal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getFollowups, saveFollowup, markFollowupDone, cancelFollowup, subscribeFollowups,
} from '../data/followupStore'
import { getSalesPermission, subscribeSalesPermission, CURRENT_USER } from '../data/salesPermissionStore'
import { getUsers, subscribeUsers } from '../data/userStore'

// ── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]


const STAGES = [
  'New Inquiry', 'Contacted', 'Follow-up', 'Site Survey',
  'Quotation Sent', 'Negotiation', 'Won', 'Lost',
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

function FollowupModal({ isOpen, onClose, initial, onSave, staff = [] }) {
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
        <FormField label="Assigned To">
          <Select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
            <option value="">Select Rep</option>
            {staff.map(s => <option key={s.name}>{s.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Priority">
          <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </FormField>
        <div className="col-span-2">
          <FormField label="Note">
            <Textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Context or reminder for this follow-up…" rows={3} />
          </FormField>
        </div>
        <div className="col-span-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Notify To</p>
          <div className="flex flex-wrap gap-2">
            {staff.map(s => (
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

function KanbanCard({ fu, colId, onMarkDone, onEdit, onCancel, isDragging, onDragStart, onDragEnd, onCall }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const isCompleted = fu.status === 'Done'
  const isCancelled = fu.status === 'Cancelled'
  const isOverdue = colId === 'overdue'
  const isUpcoming = colId === 'upcoming'

  const daysOverdue = isOverdue
    ? Math.floor((new Date(TODAY + 'T00:00:00') - new Date(fu.date + 'T00:00:00')) / 86400000)
    : 0

  const assignedStaff = getUsers().find(s => s.name === fu.assignedTo)

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
      <button
        onClick={e => { e.stopPropagation(); onCall?.({ name: fu.leadName, phone: fu.phone }) }}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 mb-2 transition-colors group"
      >
        <Phone size={11} className="group-hover:text-emerald-500" /> {fu.phone}
      </button>

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

function TableView({ followups, onMarkDone, onReschedule, onEdit, onCancel }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPos, setMenuPos]       = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (!openMenuId) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  function openMenu(e, id) {
    const rect = e.currentTarget.getBoundingClientRect()
    const menuH = 172
    setMenuPos({
      top: window.innerHeight - rect.bottom < menuH ? rect.top - menuH : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setOpenMenuId(prev => prev === id ? null : id)
  }

  const menuFu = followups.find(f => f.id === openMenuId) ?? null

  return (
    <>
    <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {['FU ID', 'Lead Name', 'Customer', 'Date', 'Time', 'Assigned', 'Notifiers', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {followups.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No follow-ups found</td>
              </tr>
            ) : (
              followups.map(fu => {
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
                        {fu.leadId ? (
                          <Link
                            to={`/sales/leads/${fu.leadId}/overview`}
                            className={`font-semibold text-sm text-brand-blue hover:underline ${isDone || isCancelled ? 'line-through text-gray-400' : ''}`}
                          >
                            {fu.leadName}
                          </Link>
                        ) : (
                          <span className={`font-semibold text-gray-900 text-sm ${isDone || isCancelled ? 'line-through text-gray-400' : ''}`}>
                            {fu.leadName}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {fu.customer || '—'}
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
                              const s = getUsers().find(st => st.name === n)
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
                        <button
                          onClick={e => openMenu(e, fu.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            openMenuId === fu.id
                              ? 'bg-gray-100 text-gray-700'
                              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    {/* ⋮ Dropdown portal */}
    {menuFu && (
      <div
        ref={menuRef}
        style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
        className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
      >
        {menuFu.status !== 'Done' && menuFu.status !== 'Cancelled' && (
          <button
            onClick={() => { onMarkDone(menuFu.id); setOpenMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Mark Complete
          </button>
        )}
        {menuFu.status !== 'Done' && menuFu.status !== 'Cancelled' && (
          <button
            onClick={() => { onReschedule(menuFu); setOpenMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CalendarClock size={13} className="text-brand-blue shrink-0" /> Reschedule
          </button>
        )}
        <button
          onClick={() => { onEdit(menuFu); setOpenMenuId(null) }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit3 size={13} className="text-gray-400 shrink-0" /> Edit
        </button>
        {menuFu.status !== 'Done' && menuFu.status !== 'Cancelled' && (
          <>
            <div className="my-1 border-t border-surface-border" />
            <button
              onClick={() => { onCancel(menuFu); setOpenMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <X size={13} className="shrink-0" /> Cancel
            </button>
          </>
        )}
      </div>
    )}
    </>
  )
}

// ── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ followups, onEdit, onCall }) {
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
                          <button
                            onClick={() => onCall?.({ name: fu.leadName, phone: fu.phone })}
                            className="flex items-center gap-1 text-xs text-gray-400 font-mono hover:text-emerald-600 transition-colors group"
                          >
                            <Phone size={10} className="group-hover:text-emerald-500" />
                            {fu.phone}
                          </button>
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
                        <button
                          onClick={() => onCall?.({ name: fu.leadName, phone: fu.phone })}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Phone size={11} /> Call
                        </button>
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
  const [salesPerm, setSalesPerm] = useState(getSalesPermission)
  const [allUsers, setAllUsers]   = useState(getUsers)
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'calendar' ? 'calendar' : 'table' // 'table' | 'calendar' (kanban hidden)
  const [editingFU, setEditingFU] = useState(null)
  const showModal = searchParams.get('action') === 'new' || editingFU !== null
  const [cancelTarget, setCancelTarget]       = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [search, setSearch]         = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')
  const [callModal, setCallModal]           = useState({ open: false, name: '', phone: '' })
  const [callToast, setCallToast]           = useState(null)

  useEffect(() => subscribeFollowups(setFollowups), [])
  useEffect(() => subscribeSalesPermission(setSalesPerm), [])
  useEffect(() => subscribeUsers(setAllUsers), [])

  const activeStaff = allUsers.filter(u => u.status === 'active')

  function saveFU(fu) { saveFollowup(fu) }
  function markDone(id) { markFollowupDone(id) }
  function openEdit(fu) { setEditingFU(fu) }
  function openReschedule(fu) { setRescheduleTarget(fu) }
  function openCancel(fu) { setCancelTarget(fu) }

  function confirmCancel() {
    if (cancelTarget) { cancelFollowup(cancelTarget.id); setCancelTarget(null) }
  }

  function clearAllFilters() {
    setFilterStatus(''); setFilterPipeline('')
    setFilterAssigned(''); setFilterDateFrom(''); setFilterDateTo('')
  }

  const scopedFollowups = salesPerm === 'view_my'
    ? followups.filter(fu => fu.assignedTo === CURRENT_USER)
    : followups

  const searchTrimmed = search.trim().toLowerCase()
  const filtered = scopedFollowups.filter(fu => {
    if (searchTrimmed && !fu.leadName.toLowerCase().includes(searchTrimmed) && !fu.phone.includes(search.trim())) return false
    if (filterStatus === 'dueToday'  && !(fu.date === TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled')) return false
    if (filterStatus === 'upcoming'  && !(fu.date > TODAY  && fu.status !== 'Done' && fu.status !== 'Cancelled')) return false
    if (filterStatus === 'overdue'   && !(fu.date < TODAY  && fu.status !== 'Done' && fu.status !== 'Cancelled')) return false
    if (filterStatus === 'completed' && fu.status !== 'Done') return false
    if (filterStatus === 'cancelled' && fu.status !== 'Cancelled') return false
    if (filterPipeline && fu.pipeline !== filterPipeline) return false
    if (filterAssigned && fu.assignedTo !== filterAssigned) return false
    if (filterDateFrom && fu.date < filterDateFrom) return false
    if (filterDateTo && fu.date > filterDateTo) return false
    return true
  })

  const filterCount = [filterStatus, filterPipeline, filterAssigned, filterDateFrom || filterDateTo].filter(Boolean).length
  const hasActiveFilters = filterCount > 0

  const pendingCount   = scopedFollowups.filter(f => f.date >= TODAY && f.status !== 'Done' && f.status !== 'Cancelled').length
  const overdueCount   = scopedFollowups.filter(f => f.date < TODAY  && f.status !== 'Done' && f.status !== 'Cancelled').length
  const doneCount      = scopedFollowups.filter(f => f.status === 'Done').length
  const cancelledCount = scopedFollowups.filter(f => f.status === 'Cancelled').length

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and track lead follow-ups</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg">
            {/* Kanban button hidden — re-enable by uncommenting
            <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('view', 'kanban'); return n })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={13} /> Kanban
            </button>
            */}
            <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('view', 'table'); return n })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={13} /> Table
            </button>
            <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('view', 'calendar'); return n })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar size={13} /> Calendar
            </button>
          </div>
          <Button icon={<Plus size={14} />} onClick={() => { setEditingFU(null); setSearchParams({ action: 'new' }) }}>
            Set Follow-up
          </Button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: scopedFollowups.length, icon: CalendarClock, color: 'text-gray-600',    bg: 'bg-gray-100'    },
          { label: 'Pending',   value: pendingCount,           icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50'    },
          { label: 'Overdue',   value: overdueCount,           icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-100'     },
          { label: 'Completed', value: doneCount,              icon: CheckCircle2,  color: 'text-emerald-700', bg: 'bg-emerald-100' },
          { label: 'Cancelled', value: cancelledCount,         icon: Ban,           color: 'text-gray-500',    bg: 'bg-gray-100'    },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Search + Filter ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shrink-0 ${
              hasActiveFilters
                ? 'border-purple-500 bg-purple-50 text-purple-600 hover:bg-purple-100'
                : 'border-surface-border bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'
            }`}
            title="Open filters"
          >
            <Filter size={15} />
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter pills */}
        {(hasActiveFilters || search.trim()) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={11} className="text-purple-400 shrink-0" />
            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-gray-900 ml-0.5"><X size={10} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterStatus === 'dueToday' ? 'Due Today' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                <button onClick={() => setFilterStatus('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterPipeline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterPipeline}
                <button onClick={() => setFilterPipeline('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterAssigned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterAssigned}
                <button onClick={() => setFilterAssigned('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Date: {filterDateFrom || '…'} → {filterDateTo || '…'}
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            <button onClick={() => { clearAllFilters(); setSearch('') }}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-0.5">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      {view === 'calendar' ? (
        <CalendarView followups={filtered} onEdit={openEdit} onCall={({ name, phone }) => setCallModal({ open: true, name, phone })} />
      ) : (
        <TableView followups={filtered} onMarkDone={markDone} onReschedule={openReschedule} onEdit={openEdit} onCancel={openCancel} />
      )}
      {/* KanbanView kept in code for re-enablement — rendered when button is uncommented above:
      {view === 'kanban' && <KanbanView followups={filtered} onMarkDone={markDone} onEdit={openEdit} onCancel={openCancel} />}
      */}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <FollowupModal
          isOpen={showModal}
          onClose={() => { setEditingFU(null); setSearchParams({}) }}
          initial={editingFU}
          onSave={saveFU}
          staff={activeStaff}
        />
      )}
      {cancelTarget && (
        <CancelConfirmModal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
          leadName={cancelTarget?.leadName}
        />
      )}
      {rescheduleTarget && (
        <RescheduleModal
          key={rescheduleTarget.id}
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          followup={rescheduleTarget}
          onSave={saveFU}
        />
      )}

      <CallModal
        isOpen={callModal.open}
        onClose={() => setCallModal({ open: false, name: '', phone: '' })}
        customerName={callModal.name}
        phoneNumber={callModal.phone}
        onCallInitiated={() => {
          setCallModal({ open: false, name: '', phone: '' })
          setCallToast('Call initiated successfully')
          setTimeout(() => setCallToast(null), 3000)
        }}
      />
      {callToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {callToast}
        </div>
      )}

      {/* ── Filter Drawer ────────────────────────────────────────────────────── */}
      <div className={`fixed top-14 left-0 right-0 bottom-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  <option value="dueToday">Due Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Pipeline */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pipeline</label>
              <div className="relative">
                <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Pipelines</option>
                  <option value="Residential">Residential</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Assigned User */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned User</label>
              <div className="relative">
                <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Users</option>
                  {activeStaff.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Follow-up Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

          </div>

          {/* Drawer footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}
