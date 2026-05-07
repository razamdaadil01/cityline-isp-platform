import { useState } from 'react'
import {
  Save, Bell, Mail, MessageSquare, Smartphone,
  Eye, Receipt, Users, Headphones, Info,
  CheckCircle2, X,
} from 'lucide-react'
import Button from '../components/ui/Button'

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200
        ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNELS = [
  { key: 'email',    label: 'Email',    icon: Mail,          color: 'text-blue-500'    },
  { key: 'sms',      label: 'SMS',      icon: Smartphone,    color: 'text-green-500'   },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500' },
]

const SECTION_META = {
  billing: {
    label: 'Billing Notifications',
    desc:  'Invoice, payment and overdue alerts sent to customers',
    icon:  Receipt,
    color: 'text-brand-blue',
    bg:    'bg-blue-50',
  },
  customer: {
    label: 'Customer Notifications',
    desc:  'Connection, service status and plan change updates',
    icon:  Users,
    color: 'text-brand-orange',
    bg:    'bg-orange-50',
  },
  support: {
    label: 'Support Notifications',
    desc:  'Ticket lifecycle updates for customers and admins',
    icon:  Headphones,
    color: 'text-purple-600',
    bg:    'bg-purple-50',
  },
}

const CHANNEL_BG = { email: 'bg-blue-50', sms: 'bg-green-50', whatsapp: 'bg-emerald-50' }
const CHANNEL_BORDER = { email: 'border-blue-100', sms: 'border-green-100', whatsapp: 'border-emerald-100' }

const TEMPLATE_SAMPLES = {
  email: {
    subject: 'Invoice #CL-INV-2024-001 Generated — Cityline Networks',
    body: `Dear {customer_name},

Your invoice for the month of {month} has been generated.

  Invoice No  : {invoice_no}
  Amount      : ₹{amount}
  Due Date    : {due_date}

Please make the payment before the due date to avoid service interruption.

Pay Online → {payment_link}

Regards,
Cityline Networks Support Team
📞 022-4567-8900`,
  },
  sms: {
    body: `Cityline Networks: Invoice #{invoice_no} of ₹{amount} generated for {month}. Due: {due_date}. Pay: {payment_link}`,
  },
  whatsapp: {
    body: `*Cityline Networks* 📶

Hi {customer_name}! Your invoice for {month} is ready.

🧾 Invoice : #{invoice_no}
💰 Amount  : ₹{amount}
📅 Due     : {due_date}

Tap to pay 👉 {payment_link}

Need help? Reply to this message.`,
  },
}

const INITIAL_SETTINGS = {
  billing: [
    {
      id: 'invoice_generated',
      label: 'Invoice Generated',
      desc: 'Sent when a new invoice is created for the customer',
      email: true, sms: false, whatsapp: true,
    },
    {
      id: 'payment_received',
      label: 'Payment Received',
      desc: 'Confirmation sent after successful payment',
      email: true, sms: true, whatsapp: false,
    },
    {
      id: 'payment_overdue_3',
      label: 'Payment Overdue (3 days)',
      desc: 'First overdue reminder sent 3 days after due date',
      email: true, sms: true, whatsapp: true,
    },
    {
      id: 'payment_overdue_7',
      label: 'Payment Overdue (7 days)',
      desc: 'Second overdue reminder sent 7 days after due date',
      email: true, sms: true, whatsapp: true,
    },
    {
      id: 'auto_suspension_warning',
      label: 'Auto-suspension Warning',
      desc: 'Alert before automatic service suspension due to non-payment',
      email: false, sms: true, whatsapp: true,
    },
  ],
  customer: [
    {
      id: 'new_connection_activated',
      label: 'New Connection Activated',
      desc: 'Welcome message sent on new connection activation',
      email: true, sms: true, whatsapp: false,
    },
    {
      id: 'service_suspended',
      label: 'Service Suspended',
      desc: 'Notification when customer service is suspended',
      email: false, sms: true, whatsapp: true,
    },
    {
      id: 'service_restored',
      label: 'Service Restored',
      desc: 'Confirmation when service is restored after suspension',
      email: false, sms: true, whatsapp: true,
    },
    {
      id: 'plan_changed',
      label: 'Plan Upgraded / Downgraded',
      desc: 'Notification when the customer plan is changed',
      email: true, sms: true, whatsapp: false,
    },
    {
      id: 'expiry_reminder_3',
      label: 'Expiry Reminder (3 days before)',
      desc: 'Reminder sent 3 days before plan expiry date',
      email: false, sms: true, whatsapp: true,
    },
  ],
  support: [
    {
      id: 'ticket_created',
      label: 'Ticket Created',
      desc: 'Acknowledgement sent when a support ticket is raised',
      email: true, sms: false, whatsapp: false,
    },
    {
      id: 'ticket_assigned',
      label: 'Ticket Assigned',
      desc: 'Notification when ticket is assigned to an engineer',
      email: true, sms: true, whatsapp: false,
    },
    {
      id: 'ticket_resolved',
      label: 'Ticket Resolved',
      desc: 'Confirmation when the support ticket is marked resolved',
      email: true, sms: true, whatsapp: true,
    },
    {
      id: 'sla_breach',
      label: 'SLA Breach Alert',
      desc: 'Alert sent when SLA threshold is breached',
      email: true, sms: false, whatsapp: false,
      adminOnly: true,
    },
  ],
}

// ── Template Preview Modal ────────────────────────────────────────────────────

function TemplateModal({ channel, onClose }) {
  if (!channel) return null
  const ch = CHANNELS.find(c => c.key === channel)
  const sample = TEMPLATE_SAMPLES[channel]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${CHANNEL_BG[channel]} flex items-center justify-center`}>
              <ch.icon size={15} className={ch.color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{ch.label} Template Preview</p>
              <p className="text-xs text-gray-400">Invoice Generated · Sample</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-3">
          {channel === 'email' ? (
            <>
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm text-gray-800">{sample.subject}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Body</p>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{sample.body}</pre>
              </div>
            </>
          ) : (
            <div className={`rounded-xl px-4 py-4 ${CHANNEL_BG[channel]} border ${CHANNEL_BORDER[channel]}`}>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{sample.body}</pre>
            </div>
          )}

          <p className="text-xs text-gray-400 flex items-center gap-1.5 pt-1">
            <Info size={12} className="shrink-0" />
            Variables in <code className="bg-gray-100 px-1 rounded text-gray-600">{'{curly_braces}'}</code> are replaced with real values at send time.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-surface-border flex justify-end">
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ── Notification Section ──────────────────────────────────────────────────────

function NotificationSection({ sectionKey, events, onToggle, onPreview }) {
  const meta = SECTION_META[sectionKey]
  const Icon = meta.icon

  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${meta.bg} rounded-lg flex items-center justify-center shrink-0`}>
            <Icon size={18} className={meta.color} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{meta.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>
          </div>
        </div>

        {/* Per-channel template preview buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-1">Templates:</span>
          {CHANNELS.map(ch => (
            <button
              key={ch.key}
              onClick={() => onPreview(ch.key)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-surface-border transition-colors"
            >
              <ch.icon size={12} className={ch.color} />
              <Eye size={11} />
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-6 py-2.5 bg-gray-50/80 border-b border-surface-border text-xs font-semibold text-gray-400 uppercase tracking-wide"
        style={{ gridTemplateColumns: '1fr 96px 76px 104px' }}
      >
        <span>Event</span>
        <span className="text-center flex items-center justify-center gap-1">
          <Mail size={11} className="text-blue-400" /> Email
        </span>
        <span className="text-center flex items-center justify-center gap-1">
          <Smartphone size={11} className="text-green-400" /> SMS
        </span>
        <span className="text-center flex items-center justify-center gap-1">
          <MessageSquare size={11} className="text-emerald-400" /> WhatsApp
        </span>
      </div>

      {/* Event rows */}
      <div className="divide-y divide-surface-border">
        {events.map(ev => (
          <div
            key={ev.id}
            className="grid items-center px-6 py-4 hover:bg-gray-50/50 transition-colors"
            style={{ gridTemplateColumns: '1fr 96px 76px 104px' }}
          >
            <div className="pr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-800">{ev.label}</p>
                {ev.adminOnly && (
                  <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    Admin only
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{ev.desc}</p>
            </div>
            <div className="flex justify-center">
              <Toggle checked={ev.email} onChange={() => onToggle(sectionKey, ev.id, 'email')} />
            </div>
            <div className="flex justify-center">
              <Toggle checked={ev.sms} onChange={() => onToggle(sectionKey, ev.id, 'sms')} />
            </div>
            <div className="flex justify-center">
              <Toggle checked={ev.whatsapp} onChange={() => onToggle(sectionKey, ev.id, 'whatsapp')} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [previewChannel, setPreviewChannel] = useState(null)
  const [saved, setSaved] = useState(false)

  const handleToggle = (section, id, channel) => {
    setSettings(prev => ({
      ...prev,
      [section]: prev[section].map(ev =>
        ev.id === id ? { ...ev, [channel]: !ev[channel] } : ev
      ),
    }))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <Bell size={20} className="text-brand-blue" />
            <h1 className="text-xl font-bold text-gray-900">Notification Settings</h1>
          </div>
          <p className="text-sm text-gray-500">
            Manage which events trigger Email, SMS and WhatsApp notifications
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 animate-pulse">
              <CheckCircle2 size={14} />
              Settings saved!
            </span>
          )}
          <Button icon={<Save size={15} />} onClick={handleSave}>
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Channel legend */}
      <div className="flex items-center gap-5 px-4 py-3 bg-white rounded-xl border border-surface-border shadow-card">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Channels</span>
        {CHANNELS.map(ch => (
          <div key={ch.key} className="flex items-center gap-1.5">
            <ch.icon size={14} className={ch.color} />
            <span className="text-xs font-medium text-gray-600">{ch.label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-gray-400 flex items-center gap-1.5">
          <Info size={12} className="shrink-0" />
          Toggle each channel per event · Click "Templates" to preview message content
        </span>
      </div>

      {/* The three notification sections */}
      {Object.keys(SECTION_META).map(key => (
        <NotificationSection
          key={key}
          sectionKey={key}
          events={settings[key]}
          onToggle={handleToggle}
          onPreview={setPreviewChannel}
        />
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <p className="text-xs text-gray-400">
          Changes take effect immediately after saving.
        </p>
        <div className="flex items-center gap-2.5">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <CheckCircle2 size={14} />
              Saved successfully!
            </span>
          )}
          <Button icon={<Save size={15} />} onClick={handleSave}>
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Template preview modal */}
      <TemplateModal channel={previewChannel} onClose={() => setPreviewChannel(null)} />
    </div>
  )
}
