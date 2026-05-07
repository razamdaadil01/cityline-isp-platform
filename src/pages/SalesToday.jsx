import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, Phone, MessageSquare, CheckCircle2,
  Clock, AlertCircle, CalendarDays, User, ArrowUpRight
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Data: leads where followUp = today (2026-05-07) ─────────────────────────

const TODAY_LEADS = [
  {
    id: 'LD-204', name: 'Meena Iyer',   phone: '9123887766', area: 'HSR Layout',
    source: 'Social Media', stage: 'Negotiation', plan: '500 Mbps Ultra',
    assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',
    lastActivity: 'Price discussed yesterday', followUpTime: '10:00 AM',
    priority: 'high', notes: 'Very close to closing. Wants ₹100 discount.',
    callDone: false,
  },
  {
    id: 'LD-205', name: 'Deepak Joshi', phone: '9011556677', area: 'Electronic City',
    source: 'Cold Call', stage: 'Follow-up', plan: '100 Mbps Home',
    assigned: 'Suresh Babu', assignedInitials: 'SB', assignedColor: 'bg-emerald-500',
    lastActivity: 'No answer – retry today', followUpTime: '11:30 AM',
    priority: 'medium', notes: 'Called twice, no answer. Try in the morning.',
    callDone: false,
  },
  {
    id: 'LD-212', name: 'Pooja Nair',   phone: '9432109876', area: 'Electronic City',
    source: 'Social Media', stage: 'Follow-up', plan: '100 Mbps Home',
    assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',
    lastActivity: 'Missed call returned', followUpTime: '02:00 PM',
    priority: 'medium', notes: 'Said will decide by today.',
    callDone: false,
  },
  {
    id: 'LD-214', name: 'Divya Krishnan', phone: '9876001234', area: 'Koramangala',
    source: 'Referral', stage: 'Negotiation', plan: '200 Mbps Pro',
    assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange',
    lastActivity: 'Final offer sent', followUpTime: '04:00 PM',
    priority: 'high', notes: 'Wants to confirm the installation date.',
    callDone: false,
  },
]

const PRIORITY_CFG = {
  high:   { label: 'High',   badgeVariant: 'red',    rowBorder: 'border-l-red-400',    bg: '' },
  medium: { label: 'Medium', badgeVariant: 'yellow', rowBorder: 'border-l-amber-400',  bg: '' },
  low:    { label: 'Low',    badgeVariant: 'gray',   rowBorder: 'border-l-gray-300',   bg: '' },
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const SOURCE_VARIANT = {
  'Walk-in': 'orange', 'Referral': 'green', 'Website': 'blue',
  'Cold Call': 'gray', 'Social Media': 'purple',
}

const STAGE_CHIP = {
  'New Inquiry':    'bg-blue-100 text-blue-700',
  'Contacted':      'bg-cyan-100 text-cyan-700',
  'Follow-up':      'bg-purple-100 text-purple-700',
  'Site Survey':    'bg-amber-100 text-amber-700',
  'Quotation Sent': 'bg-orange-100 text-orange-700',
  'Negotiation':    'bg-pink-100 text-pink-700',
  'Won':            'bg-emerald-100 text-emerald-700',
  'Lost':           'bg-red-100 text-red-600',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SalesToday() {
  const [leads, setLeads] = useState(
    [...TODAY_LEADS].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  )

  function toggleDone(id) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, callDone: !l.callDone } : l))
  }

  const doneCount    = leads.filter(l => l.callDone).length
  const pendingCount = leads.filter(l => !l.callDone).length
  const highCount    = leads.filter(l => l.priority === 'high' && !l.callDone).length

  return (
    <div className="p-6 max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/sales"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Today's Call List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Leads scheduled for follow-up on{' '}
            <span className="font-semibold text-gray-700">Thursday, 7 May 2026</span>
          </p>
        </div>
        <Link to="/sales">
          <Button variant="secondary" size="sm" iconRight={<ArrowUpRight size={14} />}>
            Full Pipeline
          </Button>
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Today',  value: leads.length,  icon: CalendarDays, color: 'text-navy',          bg: 'bg-navy/10'         },
          { label: 'Pending',      value: pendingCount,  icon: Clock,        color: 'text-brand-orange',  bg: 'bg-brand-orange/10' },
          { label: 'High Priority',value: highCount,     icon: AlertCircle,  color: 'text-red-600',       bg: 'bg-red-100'         },
          { label: 'Completed',    value: doneCount,     icon: CheckCircle2, color: 'text-emerald-600',   bg: 'bg-emerald-100'     },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Call cards */}
      <div className="space-y-3">
        {leads.map((lead, idx) => {
          const cfg = PRIORITY_CFG[lead.priority]
          return (
            <div
              key={lead.id}
              className={`bg-white rounded-xl border border-surface-border shadow-card border-l-4 ${cfg.rowBorder} transition-all ${
                lead.callDone ? 'opacity-60' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Done toggle */}
                  <button
                    onClick={() => toggleDone(lead.id)}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      lead.callDone
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {lead.callDone && <CheckCircle2 size={14} className="text-white" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-gray-900 ${lead.callDone ? 'line-through text-gray-400' : ''}`}>
                            {lead.name}
                          </p>
                          <Badge variant={cfg.badgeVariant} size="sm">{cfg.label} Priority</Badge>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_CHIP[lead.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {lead.stage}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="font-mono">{lead.phone}</span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {lead.area}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {lead.followUpTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">{lead.assigned}</span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${lead.assignedColor}`}>
                          {lead.assignedInitials}
                        </div>
                      </div>
                    </div>

                    {/* Plan + source */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={SOURCE_VARIANT[lead.source] ?? 'gray'} size="sm">{lead.source}</Badge>
                      {lead.plan && (
                        <span className="text-[11px] font-semibold bg-navy/10 text-navy px-2 py-0.5 rounded-full">
                          {lead.plan}
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">
                        {lead.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action row */}
                {!lead.callDone && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border">
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors"
                    >
                      <Phone size={13} /> Call Now
                    </a>
                    <a
                      href={`https://wa.me/91${lead.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </a>
                    <button
                      onClick={() => toggleDone(lead.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 border border-emerald-400 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-50 transition-colors ml-auto"
                    >
                      <CheckCircle2 size={13} /> Mark Done
                    </button>
                  </div>
                )}

                {lead.callDone && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600">Call completed</span>
                    <button
                      onClick={() => toggleDone(lead.id)}
                      className="ml-auto text-xs text-gray-400 hover:text-gray-600 hover:underline"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* All done state */}
      {doneCount === leads.length && leads.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
          <p className="font-bold text-emerald-800 text-lg">All calls done for today!</p>
          <p className="text-sm text-emerald-600 mt-1">Great work. Check back tomorrow for new follow-ups.</p>
        </div>
      )}
    </div>
  )
}
