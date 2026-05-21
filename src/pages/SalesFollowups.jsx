import { useState, useMemo, useEffect } from 'react'
import {
  Calendar, List, Plus, Clock, Phone, MessageSquare,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  Bell, Search, Filter, X, Users
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getFollowups, saveFollowup, markFollowupDone, subscribeFollowups } from '../data/followupStore'

// ── Constants ────────────────────────────────────────────────────────────────

const TODAY = '2026-05-15'
const TODAY_DATE = new Date(TODAY)

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

const PRIORITY_COLOR = {
  high:   'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low:    'text-gray-500 bg-gray-50 border-gray-200',
}

const STATUS_BADGE = {
  Pending: 'yellow',
  Done:    'green',
  Overdue: 'red',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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

// ── Table View ───────────────────────────────────────────────────────────────

function TableView({ followups, onEdit, onMarkDone, search }) {
  const filtered = search.trim()
    ? followups.filter(f =>
        f.leadName.toLowerCase().includes(search.toLowerCase()) ||
        f.phone.includes(search)
      )
    : followups

  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-surface-border">
              {['Lead Name', 'Phone', 'Date & Time', 'Stage', 'Assigned To', 'Notify To', 'Note', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No follow-ups found</td>
              </tr>
            ) : (
              filtered.map(fu => {
                const isOverdue = fu.status === 'Overdue' || (fu.date < TODAY && fu.status === 'Pending')
                const isDone = fu.status === 'Done'
                return (
                  <tr
                    key={fu.id}
                    className={`border-b border-surface-border last:border-0 transition-colors hover:bg-gray-50 ${
                      isOverdue ? 'bg-red-50/40' : isDone ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-gray-900 ${isDone ? 'line-through text-gray-400' : ''}`}>
                        {fu.leadName}
                      </span>
                      <span className="text-[10px] text-gray-400 block">{fu.leadId}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                      <a href={`tel:${fu.phone}`} className="hover:text-brand-blue transition-colors">{fu.phone}</a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                        {fu.date}
                      </span>
                      <span className="text-[11px] text-gray-400 block">{fu.time}</span>
                      {isOverdue && (
                        <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-semibold mt-0.5">
                          <AlertCircle size={10} /> Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{fu.stage}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fu.assignedTo || '—'}</td>
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
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-xs text-gray-500 line-clamp-2">{fu.note || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[isOverdue ? 'Overdue' : fu.status] ?? 'gray'} size="sm">
                        {isOverdue && fu.status !== 'Done' ? 'Overdue' : fu.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!isDone && (
                          <button
                            onClick={() => onMarkDone(fu.id)}
                            title="Mark Done"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(fu)}
                          title="Edit"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors"
                        >
                          <Bell size={14} />
                        </button>
                        <a
                          href={`tel:${fu.phone}`}
                          title="Call"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors"
                        >
                          <Phone size={14} />
                        </a>
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

  // Build date → followups map
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
          {/* Empty cells before first day */}
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

  useEffect(() => subscribeFollowups(setFollowups), [])
  const [showModal, setShowModal] = useState(false)
  const [editingFU, setEditingFU] = useState(null)
  const [search, setSearch] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  function saveFU(fu) {
    saveFollowup(fu)
  }

  function markDone(id) {
    markFollowupDone(id)
  }

  function openEdit(fu) {
    setEditingFU(fu)
    setShowModal(true)
  }

  const filtered = followups.filter(fu => {
    if (filterAssigned && fu.assignedTo !== filterAssigned) return false
    if (filterDateFrom && fu.date < filterDateFrom) return false
    if (filterDateTo && fu.date > filterDateTo) return false
    return true
  })

  const pendingCount = followups.filter(f => f.status === 'Pending' || (f.date >= TODAY && f.status !== 'Done')).length
  const overdueCount = followups.filter(f => f.status === 'Overdue' || (f.date < TODAY && f.status === 'Pending')).length
  const doneCount    = followups.filter(f => f.status === 'Done').length

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
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: followups.length, color: 'text-gray-700',      bg: 'bg-gray-100'      },
          { label: 'Pending', value: pendingCount,     color: 'text-amber-600',     bg: 'bg-amber-100'     },
          { label: 'Overdue', value: overdueCount,     color: 'text-red-600',       bg: 'bg-red-100'       },
          { label: 'Done',    value: doneCount,        color: 'text-emerald-700',   bg: 'bg-emerald-100'   },
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
        <TableView followups={filtered} onEdit={openEdit} onMarkDone={markDone} search={search} />
      ) : (
        <CalendarView followups={filtered} onEdit={openEdit} />
      )}

      {/* Modal */}
      {showModal && (
        <FollowupModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingFU(null) }}
          initial={editingFU}
          onSave={saveFU}
        />
      )}
    </div>
  )
}
