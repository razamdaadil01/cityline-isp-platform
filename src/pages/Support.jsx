import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, ChevronDown, Filter, X, Clock, AlertTriangle,
  CheckCircle, AlertCircle, TrendingDown, Users, Zap,
  Phone, MessageCircle, Mail, MapPin, BarChart2, Upload,
  MessageSquare, Paperclip, XCircle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { MOCK_TICKETS, AGENTS, CATEGORIES, SERVICE_TYPES, CALL_SOURCES, SLA_HOURS } from '../data/supportData'

// ─── SLA Timer ─────────────────────────────────────────────────────────────
function SLATimer({ createdAt, priority }) {
  const slaMs = SLA_HOURS[priority] * 3600000
  const deadline = new Date(createdAt).getTime() + slaMs

  const calcLeft = () => {
    const diff = deadline - Date.now()
    if (diff <= 0) return { total: -1, h: 0, m: 0 }
    const totalMin = Math.floor(diff / 60000)
    return { total: diff, h: Math.floor(totalMin / 60), m: totalMin % 60 }
  }

  const [left, setLeft] = useState(calcLeft)

  useEffect(() => {
    const id = setInterval(() => setLeft(calcLeft()), 30000)
    return () => clearInterval(id)
  }, [createdAt, priority])

  if (left.total < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <XCircle size={11} /> BREACHED
      </span>
    )
  }

  const isUrgent = priority === 'P1' && left.total < 30 * 60000
  const color = isUrgent ? 'text-red-600' : left.h < 1 ? 'text-amber-600' : 'text-gray-500'

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${isUrgent ? 'animate-pulse' : ''}`}>
      <Clock size={11} />
      {left.h > 0 ? `${left.h}h ${left.m}m` : `${left.m}m`}
    </span>
  )
}

// ─── Priority Badge ─────────────────────────────────────────────────────────
const P_VARIANT = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }
const P_LABEL = { P1: 'P1 · Critical', P2: 'P2 · High', P3: 'P3 · Medium', P4: 'P4 · Low' }
const STATUS_VARIANT = { open: 'blue', 'in-progress': 'orange', 'pending-customer': 'purple', escalated: 'red', resolved: 'green', closed: 'gray' }
const STATUS_LABEL = { open: 'Open', 'in-progress': 'In Progress', 'pending-customer': 'Pending Customer', escalated: 'Escalated', resolved: 'Resolved', closed: 'Closed' }
const SOURCE_ICON = { Phone: <Phone size={11} />, WhatsApp: <MessageCircle size={11} />, Email: <Mail size={11} />, 'Walk-in': <MapPin size={11} /> }

// ─── Create Ticket Modal ────────────────────────────────────────────────────
function CreateTicketModal({ onClose }) {
  const [form, setForm] = useState({
    userId: '',
    customerName: '',
    callSource: 'Phone',
    priority: 'P3',
    serviceType: 'FTTH',
    category: 'Connectivity',
    description: '',
    chargeable: false,
    smsEnabled: true,
    hiddenFromClient: false,
    files: [null, null, null],
  })
  const [step, setStep] = useState('form') // 'form' | 'success'
  const [userSearch, setUserSearch] = useState('')
  const fileRefs = [useRef(), useRef(), useRef()]

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setFile = (i, file) => {
    const files = [...form.files]
    files[i] = file
    setForm(f => ({ ...f, files }))
  }

  const handleSubmit = () => {
    setStep('success')
  }

  if (step === 'success') {
    const ticketId = 'TK-' + (1029 + Math.floor(Math.random() * 100))
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Ticket Created</h3>
        <p className="text-sm text-gray-500 mb-1">
          Ticket <span className="font-mono font-bold text-brand-blue">{ticketId}</span> raised successfully
        </p>
        <p className="text-xs text-gray-400 mb-6">
          {form.smsEnabled ? 'SMS sent to customer.' : 'SMS not sent (disabled).'}
        </p>
        <Button onClick={onClose} size="sm">Close</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* User search */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">User ID / Search Customer</label>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Enter User ID, name or phone…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        {userSearch && (
          <div className="mt-1 border border-surface-border rounded-lg overflow-hidden shadow-sm">
            {['Rajan Mehta (RM20210915 · 9876543210)', 'Radha Krishnan (RK20231105 · 9812334455)']
              .filter(c => c.toLowerCase().includes(userSearch.toLowerCase()))
              .map(c => (
                <button key={c} onClick={() => { setUserSearch(c.split(' (')[0]); set('customerName', c.split(' (')[0]) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-blue/5 hover:text-brand-blue transition-colors border-b border-surface-border last:border-0">
                  {c}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Row: Call Source + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Call Source</label>
          <div className="grid grid-cols-2 gap-1.5">
            {CALL_SOURCES.map(src => (
              <button key={src} onClick={() => set('callSource', src)}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  form.callSource === src
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-white text-gray-500 border-surface-border hover:border-brand-blue/40'
                }`}>
                {SOURCE_ICON[src]} {src}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Severity / Priority</label>
          <div className="grid grid-cols-2 gap-1.5">
            {['P1', 'P2', 'P3', 'P4'].map(p => (
              <button key={p} onClick={() => set('priority', p)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  form.priority === p
                    ? p === 'P1' ? 'bg-red-500 text-white border-red-500'
                      : p === 'P2' ? 'bg-brand-orange text-white border-brand-orange'
                      : p === 'P3' ? 'bg-amber-400 text-white border-amber-400'
                      : 'bg-gray-400 text-white border-gray-400'
                    : 'bg-white text-gray-500 border-surface-border hover:border-gray-300'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Service type + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Service Type</label>
          <div className="relative">
            <select value={form.serviceType} onChange={e => set('serviceType', e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-2 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
              {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
          <div className="relative">
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-2 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea rows={3} placeholder="Describe the issue in detail…"
          value={form.description} onChange={e => set('description', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
      </div>

      {/* File uploads */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Attachments <span className="text-gray-400 font-normal">(up to 3 files)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <input ref={fileRefs[i]} type="file" className="hidden" onChange={e => setFile(i, e.target.files[0])} />
              <button onClick={() => fileRefs[i].current?.click()}
                className={`w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs transition-colors ${
                  form.files[i]
                    ? 'border-brand-blue/40 bg-brand-blue/5 text-brand-blue'
                    : 'border-surface-border text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {form.files[i] ? (
                  <>
                    <Paperclip size={14} />
                    <span className="truncate max-w-full px-2">{form.files[i].name}</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Upload {i + 1}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
        {[
          { key: 'chargeable', label: 'Chargeable' },
          { key: 'smsEnabled', label: 'Send SMS to Customer' },
          { key: 'hiddenFromClient', label: 'Hidden from Client' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none group">
            <div
              onClick={() => set(key, !form[key])}
              className={`w-9 h-5 rounded-full flex items-center transition-all ${form[key] ? 'bg-brand-blue' : 'bg-gray-200'}`}>
              <span className={`w-4 h-4 bg-white rounded-full shadow transition-all ml-0.5 ${form[key] ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs text-gray-600 group-hover:text-gray-800">{label}</span>
            {key === 'smsEnabled' && form[key] && <span className="text-xs text-emerald-500 font-medium">ON</span>}
          </label>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={handleSubmit} icon={<Plus size={14} />} className="flex-1"
          disabled={!form.description.trim()}>
          Create Ticket
        </Button>
      </div>
    </div>
  )
}

// ─── Main Support Page ──────────────────────────────────────────────────────
export default function Support() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [serviceFilter, setServiceFilter] = useState('All')
  const [agentFilter, setAgentFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_TICKETS.filter(t => {
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false
      if (statusFilter !== 'All' && t.status !== statusFilter) return false
      if (serviceFilter !== 'All' && t.serviceType !== serviceFilter) return false
      if (agentFilter !== 'All' && t.assignedTo !== agentFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.id.toLowerCase().includes(q) &&
            !t.customerName.toLowerCase().includes(q) &&
            !t.issue.toLowerCase().includes(q) &&
            !t.phone.includes(q)) return false
      }
      return true
    })
  }, [priorityFilter, statusFilter, serviceFilter, agentFilter, search])

  const stats = useMemo(() => {
    const all = MOCK_TICKETS
    const byPriority = { P1: 0, P2: 0, P3: 0, P4: 0 }
    let breached = 0, resolved = 0
    all.forEach(t => {
      if (!['resolved', 'closed'].includes(t.status)) byPriority[t.priority]++
      const deadline = new Date(t.createdAt).getTime() + SLA_HOURS[t.priority] * 3600000
      if (deadline < Date.now() && !['resolved', 'closed'].includes(t.status)) breached++
      if (t.status === 'resolved') resolved++
    })
    return { byPriority, breached, resolved, total: all.length }
  }, [])

  const PRIORITY_TABS = ['All', 'P1', 'P2', 'P3', 'P4']
  const STATUS_TABS = ['All', 'open', 'in-progress', 'pending-customer', 'escalated', 'resolved']

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support & Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track, assign and resolve customer support requests</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New Ticket</Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Priority counts */}
        {[
          { label: 'P1 Critical', count: stats.byPriority.P1, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
          { label: 'P2 High', count: stats.byPriority.P2, bg: 'bg-orange-50', text: 'text-brand-orange', border: 'border-orange-200' },
          { label: 'P3 Medium', count: stats.byPriority.P3, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
          { label: 'P4 Low', count: stats.byPriority.P4, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => setPriorityFilter(s.label.split(' ')[0])}>
            <p className={`text-2xl font-black ${s.text}`}>{s.count}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-surface-border p-4 text-center shadow-card">
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Total Active</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${stats.breached > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-surface-border'}`}>
          <p className={`text-2xl font-black ${stats.breached > 0 ? 'text-red-600' : 'text-gray-500'}`}>{stats.breached}</p>
          <p className="text-xs text-gray-600 mt-0.5 font-medium flex items-center justify-center gap-1">
            {stats.breached > 0 && <AlertCircle size={10} className="text-red-500" />} SLA Breached
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{stats.resolved}</p>
          <p className="text-xs text-gray-600 mt-0.5 font-medium">Resolved Today</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search ticket, customer, phone…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        </div>

        {/* Priority pills */}
        <div className="flex gap-1">
          {PRIORITY_TABS.map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                priorityFilter === p
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-white border border-surface-border text-gray-500 hover:bg-gray-50'
              }`}>
              {p}
            </button>
          ))}
        </div>

        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            showFilters ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue' : 'bg-white border-surface-border text-gray-500 hover:bg-gray-50'
          }`}>
          <Filter size={12} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-surface-border shadow-card">
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
              <option value="All">All Status</option>
              {STATUS_TABS.slice(1).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
              <option value="All">All Services</option>
              {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
              <option value="All">All Agents</option>
              {AGENTS.map(a => <option key={a}>{a}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {(statusFilter !== 'All' || serviceFilter !== 'All' || agentFilter !== 'All') && (
            <button onClick={() => { setStatusFilter('All'); setServiceFilter('All'); setAgentFilter('All') }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <X size={11} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Ticket Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Active Tickets</h3>
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {stats.breached > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                <AlertTriangle size={11} /> {stats.breached} SLA breach{stats.breached > 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Ticket ID', 'Customer', 'Issue / Category', 'Priority', 'Status', 'Source', 'Assigned', 'SLA Remaining', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">No tickets match your filters.</td></tr>
              ) : filtered.map(t => {
                const isBreachedSoon = t.priority === 'P1' &&
                  (new Date(t.createdAt).getTime() + SLA_HOURS[t.priority] * 3600000 - Date.now()) < 30 * 60000 &&
                  !['resolved', 'closed'].includes(t.status)
                return (
                  <tr key={t.id}
                    className={`hover:bg-gray-50/70 transition-colors cursor-pointer ${isBreachedSoon ? 'bg-red-50/30' : ''}`}
                    onClick={() => navigate(`/support/ticket/${t.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-blue font-bold">{t.id}</span>
                      {isBreachedSoon && (
                        <p className="text-xs text-red-600 font-semibold flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle size={9} /> Urgent
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 whitespace-nowrap">{t.customerName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.phone}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-gray-700 text-xs font-medium truncate">{t.issue}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.category} · {t.serviceType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={P_VARIANT[t.priority]} size="sm" dot>{t.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[t.status]} size="sm">{STATUS_LABEL[t.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        {SOURCE_ICON[t.callSource]} {t.callSource}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.assignedTo}</td>
                    <td className="px-4 py-3">
                      {['resolved', 'closed'].includes(t.status)
                        ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle size={11} /> Done</span>
                        : <SLATimer createdAt={t.createdAt} priority={t.priority} />
                      }
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="xs" onClick={() => navigate(`/support/ticket/${t.id}`)}>View</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Support Ticket" size="lg">
        <CreateTicketModal onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}
