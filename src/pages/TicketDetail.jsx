import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle, XCircle, Lock,
  Globe, User, Phone, Wifi, MapPin, Zap, ChevronDown, Send,
  AlertCircle, Shield, MessageSquare, Info,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { MOCK_TICKETS, AGENTS, SLA_HOURS } from '../data/supportData'

const P_VARIANT = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }
const STATUS_VARIANT = { open: 'blue', 'in-progress': 'orange', 'pending-customer': 'purple', escalated: 'red', resolved: 'green', closed: 'gray' }
const STATUS_LABEL = { open: 'Open', 'in-progress': 'In Progress', 'pending-customer': 'Pending Customer', escalated: 'Escalated', resolved: 'Resolved', closed: 'Closed' }
const TYPE_ICON = {
  created: <Zap size={12} className="text-brand-blue" />,
  update: <Info size={12} className="text-gray-400" />,
  status: <AlertCircle size={12} className="text-amber-500" />,
  resolved: <CheckCircle size={12} className="text-emerald-500" />,
}

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ─── OTP Close Modal ────────────────────────────────────────────────────────
function OTPModal({ ticket, onClose, onConfirm }) {
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  const handleSendOTP = () => setSent(true)

  const handleVerify = () => {
    if (otp === '123456') {
      setVerified(true)
      setError('')
    } else {
      setError('Incorrect OTP. Please try again.')
    }
  }

  if (verified) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">OTP Verified</h3>
        <p className="text-sm text-gray-500 mb-6">Ticket {ticket.id} will be closed.</p>
        <Button onClick={onConfirm} size="sm">Close Ticket</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">OTP Verification Required</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Customer OTP verification is required before closing this ticket.
            An OTP will be sent to <span className="font-semibold">{ticket.phone}</span>.
          </p>
        </div>
      </div>

      {!sent ? (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Closing ticket <span className="font-mono font-bold text-brand-blue">{ticket.id}</span> for{' '}
            <span className="font-semibold">{ticket.customerName}</span>.
          </p>
          <Button onClick={handleSendOTP} size="sm" icon={<Send size={14} />}>Send OTP to Customer</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 text-center">OTP sent to {ticket.phone}. Enter the 6-digit OTP below.</p>
          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
              className="w-full px-4 py-3 text-center text-xl font-mono font-bold tracking-widest border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
            {error && <p className="text-xs text-red-500 mt-1.5 text-center">{error}</p>}
          </div>
          <p className="text-xs text-gray-400 text-center">Demo OTP: 123456</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleVerify} disabled={otp.length !== 6} className="flex-1">Verify & Close</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Ticket Detail Page ─────────────────────────────────────────────────
export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(() => MOCK_TICKETS.find(t => t.id === id) || null)
  const [activeNoteTab, setActiveNoteTab] = useState('public')
  const [noteText, setNoteText] = useState('')
  const [assignedTo, setAssignedTo] = useState(ticket?.assignedTo || '')
  const [otpModal, setOtpModal] = useState(false)
  const [closed, setClosed] = useState(false)

  if (!ticket) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Ticket not found</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/support')}>Back to Support</Button>
      </div>
    )
  }

  const slaDeadline = new Date(ticket.createdAt).getTime() + SLA_HOURS[ticket.priority] * 3600000
  const slaLeft = slaDeadline - Date.now()
  const slaBreached = slaLeft <= 0 && !['resolved', 'closed'].includes(ticket.status)
  const slaPct = Math.max(0, Math.min(100, (slaLeft / (SLA_HOURS[ticket.priority] * 3600000)) * 100))
  const isUrgent = ticket.priority === 'P1' && slaLeft > 0 && slaLeft < 30 * 60000

  const handleAddNote = () => {
    if (!noteText.trim()) return
    const newNote = {
      time: new Date().toISOString(),
      author: 'Admin',
      text: noteText.trim(),
    }
    if (activeNoteTab === 'public') {
      setTicket(t => ({ ...t, publicNotes: [...t.publicNotes, newNote] }))
    } else {
      setTicket(t => ({ ...t, internalNotes: [...t.internalNotes, newNote] }))
    }
    setNoteText('')
  }

  const handleReassign = () => {
    if (assignedTo === ticket.assignedTo) return
    setTicket(t => ({
      ...t,
      assignedTo,
      timeline: [...t.timeline, {
        time: new Date().toISOString(),
        actor: 'Admin',
        type: 'update',
        action: `Reassigned from ${t.assignedTo} to ${assignedTo}.`,
      }],
    }))
  }

  const handleCloseConfirm = () => {
    setTicket(t => ({
      ...t,
      status: 'closed',
      otpVerified: true,
      timeline: [...t.timeline, {
        time: new Date().toISOString(),
        actor: 'Admin',
        type: 'resolved',
        action: 'Ticket closed after customer OTP verification.',
      }],
    }))
    setOtpModal(false)
    setClosed(true)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/support')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{ticket.id}</h1>
              <Badge variant={P_VARIANT[ticket.priority]} size="sm" dot>{ticket.priority}</Badge>
              <Badge variant={STATUS_VARIANT[ticket.status]} size="sm">{STATUS_LABEL[ticket.status]}</Badge>
              {slaBreached && <Badge variant="red" size="sm"><AlertTriangle size={10} className="inline mr-0.5" />SLA Breached</Badge>}
              {isUrgent && <Badge variant="red" size="sm" className="animate-pulse"><Clock size={10} className="inline mr-0.5" />Urgent</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xl">{ticket.issue}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => setOtpModal(true)}>
              Close Ticket
            </Button>
          )}
          {closed && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle size={13} /> Ticket Closed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT: Timeline + Notes */}
        <div className="xl:col-span-2 space-y-5">
          {/* SLA Bar */}
          {!['resolved', 'closed'].includes(ticket.status) && (
            <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">SLA Status — {SLA_HOURS[ticket.priority]}h window ({ticket.priority})</span>
                {slaBreached ? (
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1"><XCircle size={12} />BREACHED</span>
                ) : (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${isUrgent ? 'text-red-600' : slaLeft < H ? 'text-amber-600' : 'text-gray-600'}`}>
                    <Clock size={12} />
                    {slaLeft > 3600000 ? `${Math.floor(slaLeft / 3600000)}h ${Math.floor((slaLeft % 3600000) / 60000)}m` : `${Math.floor(slaLeft / 60000)}m`} remaining
                  </span>
                )}
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  slaBreached ? 'bg-red-500' : slaPct > 50 ? 'bg-emerald-500' : slaPct > 20 ? 'bg-amber-400' : 'bg-red-500'
                }`} style={{ width: `${slaBreached ? 100 : slaPct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{formatTime(ticket.createdAt)}</span>
                <span className="text-xs text-gray-400">{formatTime(new Date(slaDeadline).toISOString())}</span>
              </div>
            </div>
          )}

          {/* OTP Pending Banner */}
          {!ticket.otpVerified && !['resolved', 'closed'].includes(ticket.status) && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Shield size={16} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">OTP Verification Pending</p>
                <p className="text-xs text-amber-600 mt-0.5">Customer has not yet verified via OTP. Required before closing ticket.</p>
              </div>
              <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">Pending</span>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Activity Timeline</h3>
            </div>
            <div className="px-5 py-4">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-border" />
                <div className="space-y-5">
                  {ticket.timeline.map((event, i) => (
                    <div key={i} className="relative flex gap-4 pl-2">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-surface-border flex items-center justify-center shrink-0 z-10">
                        {TYPE_ICON[event.type] || <Info size={12} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-700">{event.actor}</span>
                          <span className="text-xs text-gray-400">{timeSince(event.time)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{event.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(event.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
              <div className="flex gap-1 ml-auto">
                <button onClick={() => setActiveNoteTab('public')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    activeNoteTab === 'public' ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  <Globe size={11} /> Public
                </button>
                <button onClick={() => setActiveNoteTab('internal')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    activeNoteTab === 'internal' ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  <Lock size={11} /> Internal
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {activeNoteTab === 'internal' && (
                <div className="flex items-center gap-2 bg-navy/5 border border-navy/20 rounded-lg px-3 py-2">
                  <Lock size={12} className="text-navy shrink-0" />
                  <p className="text-xs text-navy font-medium">Internal notes are hidden from the customer.</p>
                </div>
              )}

              {/* Notes list */}
              {(activeNoteTab === 'public' ? ticket.publicNotes : ticket.internalNotes).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No {activeNoteTab} notes yet.</p>
              ) : (
                (activeNoteTab === 'public' ? ticket.publicNotes : ticket.internalNotes).map((n, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${activeNoteTab === 'internal' ? 'bg-navy/3 border-navy/15' : 'bg-gray-50 border-surface-border'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">{n.author[0]}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{n.author}</span>
                      {activeNoteTab === 'internal' && <Lock size={10} className="text-navy" />}
                      <span className="text-xs text-gray-400 ml-auto">{timeSince(n.time)}</span>
                    </div>
                    <p className="text-sm text-gray-600 pl-8">{n.text}</p>
                  </div>
                ))
              )}

              {/* Add note */}
              {ticket.status !== 'closed' && (
                <div className="pt-2">
                  <textarea rows={2} placeholder={`Add ${activeNoteTab} note…`}
                    value={noteText} onChange={e => setNoteText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-surface-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                  <div className="flex justify-end mt-2">
                    <Button size="xs" onClick={handleAddNote} disabled={!noteText.trim()}
                      icon={<Send size={11} />}
                      variant={activeNoteTab === 'internal' ? 'navy' : 'primary'}>
                      Add {activeNoteTab === 'internal' ? 'Internal' : 'Public'} Note
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Info panels */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Customer</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{ticket.customerName.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{ticket.customerName}</p>
                  <p className="text-xs text-brand-blue font-mono">{ticket.userId}</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <Phone size={12} />, value: ticket.phone },
                  { icon: <Wifi size={12} />, value: ticket.services.join(', ') },
                  { icon: <MapPin size={12} />, value: `${ticket.zone} · ${ticket.oltName}` },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-gray-600">
                    <span className="text-gray-400 shrink-0">{r.icon}</span>
                    <span>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {ticket.otpVerified
                  ? <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle size={11} /> OTP Verified</span>
                  : <span className="text-xs text-amber-600 font-semibold flex items-center gap-1"><Shield size={11} /> OTP Pending</span>
                }
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Ticket Info</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {[
                { label: 'Category', value: ticket.category },
                { label: 'Service', value: `${ticket.serviceType} · ${ticket.callSource}` },
                { label: 'Created', value: formatTime(ticket.createdAt) },
                { label: 'Updated', value: formatTime(ticket.updatedAt) },
                { label: 'Chargeable', value: ticket.chargeable ? 'Yes' : 'No' },
                { label: 'SMS Sent', value: ticket.smsEnabled ? 'Yes' : 'No' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="font-medium text-gray-700">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Description</h3>
            </div>
            <p className="px-5 py-4 text-sm text-gray-600 leading-relaxed">{ticket.description}</p>
          </div>

          {/* Assign / Reassign */}
          {ticket.status !== 'closed' && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-800">Assign / Reassign</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Currently assigned to</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{ticket.assignedTo[0]}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{ticket.assignedTo}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reassign to</label>
                  <div className="relative">
                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                      className="w-full appearance-none pl-3 pr-7 py-2 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
                      {AGENTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <Button size="sm" variant="secondary" className="w-full"
                  disabled={assignedTo === ticket.assignedTo}
                  onClick={handleReassign}
                  icon={<User size={13} />}>
                  Confirm Reassign
                </Button>
              </div>
            </div>
          )}

          {/* Close button */}
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <Button variant="danger" size="sm" className="w-full" icon={<XCircle size={14} />} onClick={() => setOtpModal(true)}>
              Close Ticket (OTP Required)
            </Button>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      <Modal isOpen={otpModal} onClose={() => setOtpModal(false)} title="Close Ticket – OTP Verification" size="sm">
        <OTPModal ticket={ticket} onClose={() => setOtpModal(false)} onConfirm={handleCloseConfirm} />
      </Modal>
    </div>
  )
}

const H = 3600000
