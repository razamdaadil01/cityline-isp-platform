import { useState, useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import {
  Save, Plus, Edit2, Trash2, Server, Key, Bell,
  Building2, Receipt, Shield, RefreshCw, Check,
  BookOpen, Webhook, Phone, Globe, Layers, MapPin, Map,
  MoreVertical, Eye, EyeOff, Download, Upload, X, Settings2,
  ChevronLeft, ChevronRight, Clock, AlertTriangle, Headphones, Users, Handshake,
  Tags, ListChecks, GripVertical, Lock, CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Accordion from '../components/ui/Accordion'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { MOCK_LANDLINES, MOCK_STATIC_IPS } from '../data/packagesStore'
import {
  PRIORITIES, PRIORITY_LABEL, getSlaHours, saveSlaHours,
  getSupportSettings, saveSupportSettings,
} from '../data/ticketsStore'
import { getOutageDetectionSettings, saveOutageDetectionSettings } from '../data/outagesStore'
import { getCustomerTypes, subscribeCustomerTypes, setCustomerTypeStatus } from '../data/customerTypes'
import {
  getServiceTags, subscribeServiceTags, saveServiceTag, setServiceTagStatus,
  reorderServiceTags, nextDisplayOrder, isTagNameTaken, countServiceTagsForType,
} from '../data/serviceTags'
import { getFieldConfig, subscribeFieldConfig, setFieldMandatory, getFieldCount } from '../data/fieldConfigStore'
import {
  getCompanyEntities, subscribeCompanyEntities, saveCompanyEntity, setCompanyEntityStatus,
  isValidGstin, PG_CONNECTIONS,
} from '../data/companyEntities'
import {
  getPartners, subscribePartners, savePartner, setPartnerStatus,
  isValidContactNumber, formatShareValue, SHARE_TYPES,
} from '../data/partners'

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',       label: 'General',               icon: Building2 },
  { id: 'billing',       label: 'Billing',               icon: Receipt   },
  { id: 'notifications', label: 'Notifications',         icon: Bell      },
  { id: 'sla',           label: 'SLA Configuration',      icon: Clock     },
  { id: 'support-configuration', label: 'Support Configuration', icon: Headphones },
  { id: 'outage-configuration', label: 'Outage Configuration', icon: AlertTriangle },
  { id: 'jaze',          label: 'Jaze Servers',          icon: Server    },
  { id: 'zoho',                label: 'Zoho Books',            icon: BookOpen  },
  { id: 'sales-configuration', label: 'Sales Configuration',   icon: Layers    },
  { id: 'roles',               label: 'Roles & Permissions',   icon: Shield    },
  { id: 'area-mapping',        label: 'Area Mapping',          icon: MapPin    },
  { id: 'zone',                label: 'Zone',                  icon: Map       },
  { id: 'master-config',       label: 'Master Configuration',  icon: Settings2 },
]

// System Configuration is a distinct sub-section within Settings — Customer
// Type is the first item; Company/Entity and Partner are added here later.
const SYSTEM_CONFIG_TABS = [
  { id: 'customer-type', label: 'Customer Type', icon: Users },
  { id: 'company-entity', label: 'Company / Entity', icon: Building2 },
  { id: 'partner', label: 'Partner', icon: Handshake },
]

// ── Mock data ─────────────────────────────────────────────────────────────────

const INIT_SERVERS = [
  { id: 1,  name: 'Mumbai-Core-01',    ip: '10.0.0.1',    port: 1812, type: 'RADIUS',   status: 'online' },
  { id: 2,  name: 'Mumbai-Core-02',    ip: '10.0.0.2',    port: 1812, type: 'RADIUS',   status: 'online' },
  { id: 3,  name: 'Andheri-NAS-01',   ip: '10.1.1.10',   port: 3799, type: 'NAS',      status: 'online' },
  { id: 4,  name: 'Andheri-NAS-02',   ip: '10.1.1.11',   port: 3799, type: 'NAS',      status: 'offline' },
  { id: 5,  name: 'Bandra-NAS-01',    ip: '10.1.2.10',   port: 3799, type: 'NAS',      status: 'online' },
  { id: 6,  name: 'Thane-NAS-01',     ip: '10.2.0.10',   port: 3799, type: 'NAS',      status: 'online' },
  { id: 7,  name: 'Kurla-NAS-01',     ip: '10.2.1.10',   port: 3799, type: 'NAS',      status: 'online' },
  { id: 8,  name: 'Core-Switch-01',   ip: '192.168.1.1', port: 161,  type: 'SNMP',     status: 'online' },
  { id: 9,  name: 'Core-Switch-02',   ip: '192.168.1.2', port: 161,  type: 'SNMP',     status: 'online' },
  { id: 10, name: 'Auth-Server-01',   ip: '172.16.0.1',  port: 8080, type: 'Auth',     status: 'online' },
  { id: 11, name: 'Auth-Server-02',   ip: '172.16.0.2',  port: 8080, type: 'Auth',     status: 'online' },
  { id: 12, name: 'Billing-API-01',   ip: '172.16.1.1',  port: 9090, type: 'API',      status: 'online' },
  { id: 13, name: 'AAA-Server-01',    ip: '10.3.0.1',    port: 1813, type: 'RADIUS',   status: 'online' },
  { id: 14, name: 'Borivali-NAS-01',  ip: '10.3.1.10',   port: 3799, type: 'NAS',      status: 'offline' },
  { id: 15, name: 'DHCP-Server-01',   ip: '10.0.1.1',    port: 67,   type: 'DHCP',     status: 'online' },
  { id: 16, name: 'Monitor-Agent-01', ip: '10.0.2.1',    port: 5000, type: 'Monitor',  status: 'online' },
]

const SERVER_TYPE_VARIANT = { RADIUS: 'blue', NAS: 'green', SNMP: 'purple', Auth: 'orange', API: 'cyan', DHCP: 'yellow', Monitor: 'gray' }

const ROLES = [
  { id: 'super_admin', label: 'Super Admin',     users: 1,  color: 'red'    },
  { id: 'admin',       label: 'Admin',           users: 3,  color: 'orange' },
  { id: 'billing',     label: 'Billing Manager', users: 4,  color: 'blue'   },
  { id: 'support',     label: 'Support Agent',   users: 12, color: 'green'  },
  { id: 'engineer',    label: 'Field Engineer',  users: 24, color: 'purple' },
  { id: 'readonly',    label: 'Read Only',       users: 2,  color: 'gray'   },
]

const MODULES = ['Dashboard', 'Customers', 'Sales', 'Billing', 'Support', 'Network', 'Inventory', 'Reports', 'Settings']

const PERMISSIONS = {
  super_admin: { Dashboard: 'full', Customers: 'full', Sales: 'full', Billing: 'full', Support: 'full', Network: 'full', Inventory: 'full', Reports: 'full', Settings: 'full' },
  admin:       { Dashboard: 'full', Customers: 'full', Sales: 'full', Billing: 'full', Support: 'full', Network: 'full', Inventory: 'full', Reports: 'full', Settings: 'view' },
  billing:     { Dashboard: 'view', Customers: 'view', Sales: 'view', Billing: 'full', Support: 'none', Network: 'none', Inventory: 'view', Reports: 'view', Settings: 'none' },
  support:     { Dashboard: 'view', Customers: 'view', Sales: 'none', Billing: 'view', Support: 'full', Network: 'view', Inventory: 'view', Reports: 'none', Settings: 'none' },
  engineer:    { Dashboard: 'view', Customers: 'view', Sales: 'none', Billing: 'none', Support: 'view', Network: 'view', Inventory: 'full', Reports: 'none', Settings: 'none' },
  readonly:    { Dashboard: 'view', Customers: 'view', Sales: 'view', Billing: 'view', Support: 'view', Network: 'view', Inventory: 'view', Reports: 'view', Settings: 'none' },
}
const PERM_VARIANT = { full: 'green', view: 'blue', none: 'gray' }
const PERM_LABEL   = { full: 'Full',  view: 'View', none: '—'    }

const NOTIF_EVENTS = [
  { id: 'new_customer',      label: 'New Customer Activation',   whatsapp: true,  sms: true  },
  { id: 'invoice_generated', label: 'Invoice Generated',         whatsapp: true,  sms: false },
  { id: 'payment_received',  label: 'Payment Received',          whatsapp: true,  sms: true  },
  { id: 'payment_due',       label: 'Payment Due Reminder',      whatsapp: true,  sms: true  },
  { id: 'payment_overdue',   label: 'Payment Overdue Alert',     whatsapp: true,  sms: true  },
  { id: 'support_open',      label: 'Support Ticket Opened',     whatsapp: false, sms: true  },
  { id: 'support_resolved',  label: 'Support Ticket Resolved',   whatsapp: true,  sms: true  },
  { id: 'service_suspend',   label: 'Service Suspended',         whatsapp: true,  sms: true  },
  { id: 'service_resume',    label: 'Service Resumed',           whatsapp: true,  sms: false },
  { id: 'plan_expire',       label: 'Plan Expiry Reminder',      whatsapp: true,  sms: true  },
  { id: 'caf_incomplete',    label: 'CAF Incomplete Reminder',   whatsapp: false, sms: true  },
  { id: 'engineer_assign',   label: 'Engineer Task Assigned',    whatsapp: true,  sms: false },
]

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200
        ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
        ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ── Tab Panels ────────────────────────────────────────────────────────────────

function GeneralTab() {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900 pb-4 border-b border-surface-border">Company Information</h2>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Company Name" required>
          <Input defaultValue="Cityline Networks Pvt Ltd" />
        </FormField>
        <FormField label="Business Type">
          <Select defaultValue="isp">
            <option value="isp">Internet Service Provider</option>
            <option value="cable">Cable Operator</option>
            <option value="both">ISP + Cable</option>
          </Select>
        </FormField>
        <FormField label="GST Number" required>
          <Input defaultValue="27AABCC1234D1Z5" />
        </FormField>
        <FormField label="License Number">
          <Input defaultValue="MH/ISP/2018/0042" />
        </FormField>
        <FormField label="Contact Email" required>
          <Input type="email" defaultValue="admin@citylinenetworks.in" />
        </FormField>
        <FormField label="Support Phone">
          <Input type="tel" defaultValue="+91 22 4567 8900" />
        </FormField>
      </div>
      <FormField label="Registered Address">
        <Textarea defaultValue="404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Currency">
          <Select defaultValue="inr"><option value="inr">INR (₹)</option></Select>
        </FormField>
        <FormField label="Timezone">
          <Select defaultValue="ist"><option value="ist">Asia/Kolkata (IST, UTC+5:30)</option></Select>
        </FormField>
        <FormField label="Date Format">
          <Select defaultValue="dmy">
            <option value="dmy">DD/MM/YYYY</option>
            <option value="mdy">MM/DD/YYYY</option>
            <option value="ymd">YYYY-MM-DD</option>
          </Select>
        </FormField>
        <FormField label="Language">
          <Select defaultValue="en"><option value="en">English</option></Select>
        </FormField>
      </div>
      <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button size="sm" icon={<Save size={14} />}>Save Changes</Button>
      </div>
    </div>
  )
}

function BillingTab() {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900 pb-4 border-b border-surface-border">Billing Configuration</h2>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Invoice Prefix">
          <Input defaultValue="CL-INV" />
        </FormField>
        <FormField label="Invoice Starting Number">
          <Input type="number" defaultValue="1001" />
        </FormField>
        <FormField label="Due Days (after billing date)">
          <Input type="number" defaultValue="7" />
        </FormField>
        <FormField label="Late Fee (%)">
          <Input type="number" defaultValue="2" />
        </FormField>
        <FormField label="GST Rate (%)">
          <Select defaultValue="18">
            <option value="18">18% (Standard)</option>
            <option value="12">12%</option>
            <option value="5">5%</option>
            <option value="0">0% (Exempt)</option>
          </Select>
        </FormField>
        <FormField label="Payment Gateway">
          <Select defaultValue="razorpay">
            <option value="razorpay">Razorpay</option>
            <option value="paytm">Paytm</option>
            <option value="stripe">Stripe</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Invoice Footer Note">
        <Textarea rows={2} defaultValue="Thank you for choosing Cityline Networks. For support, call 022-4567-8900." />
      </FormField>
      <div className="space-y-3 pt-2">
        {[
          { label: 'Auto-generate monthly invoices', desc: 'Invoices generated automatically on billing date', checked: true  },
          { label: 'Send invoice via WhatsApp',      desc: 'WhatsApp invoice PDF to customer on generation', checked: true  },
          { label: 'Auto-suspend on overdue',        desc: 'Suspend service after 15 days of non-payment',   checked: false },
          { label: 'Prorated billing for new joins', desc: 'Charge proportional amount for partial months',  checked: true  },
        ].map(item => (
          <div key={item.label} className="flex items-start justify-between p-3 rounded-lg border border-surface-border">
            <div>
              <p className="text-sm font-medium text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
            <Toggle checked={item.checked} onChange={() => {}} />
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button size="sm" icon={<Save size={14} />}>Save Changes</Button>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [events, setEvents] = useState(NOTIF_EVENTS)

  const toggle = (id, channel) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, [channel]: !e[channel] } : e))
  }

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Notification Settings</h2>
        <p className="text-xs text-gray-500 mt-1">Configure which events trigger WhatsApp and SMS notifications to customers</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="WhatsApp Business Number">
          <Input defaultValue="+91 98765 43210" />
        </FormField>
        <FormField label="SMS Provider">
          <Select defaultValue="msg91">
            <option value="msg91">MSG91</option>
            <option value="twilio">Twilio</option>
            <option value="fast2sms">Fast2SMS</option>
          </Select>
        </FormField>
      </div>

      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] bg-gray-50/80 border-b border-surface-border px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide gap-4">
          <span>Event</span>
          <span className="w-24 text-center">WhatsApp</span>
          <span className="w-20 text-center">SMS</span>
        </div>
        <div className="divide-y divide-surface-border">
          {events.map(ev => (
            <div key={ev.id} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 gap-4 hover:bg-gray-50/50">
              <span className="text-sm text-gray-700">{ev.label}</span>
              <div className="w-24 flex justify-center">
                <Toggle checked={ev.whatsapp} onChange={() => toggle(ev.id, 'whatsapp')} />
              </div>
              <div className="w-20 flex justify-center">
                <Toggle checked={ev.sms} onChange={() => toggle(ev.id, 'sms')} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
        <Button variant="secondary" size="sm">Reset to Defaults</Button>
        <Button size="sm" icon={<Save size={14} />}>Save Changes</Button>
      </div>
    </div>
  )
}

function SlaConfigTab() {
  const [hours, setHours] = useState(getSlaHours)
  const [saved, setSaved] = useState(false)

  function setHour(priority, value) {
    setHours(h => ({ ...h, [priority]: value }))
    setSaved(false)
  }

  const parsed = Object.fromEntries(PRIORITIES.map(p => [p, Number(hours[p])]))
  const allPositive = PRIORITIES.every(p => Number.isFinite(parsed[p]) && parsed[p] > 0)
  const orderedCorrectly = allPositive && parsed.P1 < parsed.P2 && parsed.P2 < parsed.P3 && parsed.P3 < parsed.P4

  function handleSave() {
    if (!allPositive) return
    saveSlaHours(parsed)
    setSaved(true)
  }

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">SLA Configuration</h2>
        <p className="text-xs text-gray-500 mt-1">
          Set the response window (in hours) used to calculate each ticket's SLA deadline, per priority.
          Changes here only apply going forward — to new tickets and to existing tickets the next time their
          priority changes — already-computed SLA deadlines are not recalculated retroactively.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PRIORITIES.map(p => (
          <FormField key={p} label={`${PRIORITY_LABEL[p]} — Response Window (hours)`}>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={hours[p]}
              onChange={e => setHour(p, e.target.value)}
            />
          </FormField>
        ))}
      </div>

      {!allPositive && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Each priority needs a positive number of hours.
        </div>
      )}

      {allPositive && !orderedCorrectly && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          P1 is usually shortest and P4 longest (P1 &lt; P2 &lt; P3 &lt; P4). That ordering isn't enforced —
          just flagging it in case it's unintentional.
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <Check size={14} className="shrink-0" />
          SLA settings saved. New tickets and priority changes will use these windows going forward.
        </div>
      )}

      <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
        <Button size="sm" icon={<Save size={14} />} onClick={handleSave} disabled={!allPositive}>Save</Button>
      </div>
    </div>
  )
}

function SupportConfigTab() {
  const [settings, setSettings] = useState(getSupportSettings)
  const [saved, setSaved] = useState(false)

  function handleToggle(v) {
    setSettings(s => ({ ...s, allowMultipleOpenComplaints: v }))
    setSaved(false)
  }

  function handleSave() {
    saveSupportSettings(settings)
    setSaved(true)
  }

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Support Configuration</h2>
        <p className="text-xs text-gray-500 mt-1">
          Rules that govern how agents handle duplicate complaints in the Create Ticket wizard.
        </p>
      </div>

      <div className="flex items-start justify-between p-3 rounded-lg border border-surface-border">
        <div>
          <p className="text-sm font-medium text-gray-800">Allow Multiple Open Complaints per Customer</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Off (default): creating a new ticket while an open one exists is blocked unless the agent
            gives a reason. On: agents can create additional tickets freely, no reason required.
          </p>
        </div>
        <Toggle checked={settings.allowMultipleOpenComplaints} onChange={handleToggle} />
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <Check size={14} className="shrink-0" />
          Support settings saved.
        </div>
      )}

      <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
        <Button size="sm" icon={<Save size={14} />} onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}

const TICKET_COUNT_THRESHOLD_OPTIONS = [4, 5, 10, 15, 20]

function OutageConfigTab() {
  const [settings, setSettings] = useState(getOutageDetectionSettings)
  const [saved, setSaved] = useState(false)

  function setField(k, v) {
    setSettings(s => ({ ...s, [k]: v }))
    setSaved(false)
  }

  function handleSave() {
    saveOutageDetectionSettings({
      ticketCountThreshold: Number(settings.ticketCountThreshold),
      timeWindowMinutes: Number(settings.timeWindowMinutes),
    })
    setSaved(true)
  }

  const valid = TICKET_COUNT_THRESHOLD_OPTIONS.includes(Number(settings.ticketCountThreshold)) &&
    Number(settings.timeWindowMinutes) > 0

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Outage Configuration</h2>
        <p className="text-xs text-gray-500 mt-1">
          Thresholds for detecting a possible network outage from a burst of tickets on the same NAS Port.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ticket Count Threshold">
          <Select value={settings.ticketCountThreshold} onChange={e => setField('ticketCountThreshold', e.target.value)}>
            {TICKET_COUNT_THRESHOLD_OPTIONS.map(n => <option key={n} value={n}>{n} tickets</option>)}
          </Select>
        </FormField>
        <FormField label="Time Window (minutes)">
          <Input type="number" min="1" value={settings.timeWindowMinutes} onChange={e => setField('timeWindowMinutes', e.target.value)} />
        </FormField>
      </div>

      <p className="text-xs text-gray-500">
        When this many tickets are created on the same NAS Port within the time window, an incident alert is shown on the Support Dashboard.
      </p>

      {saved && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <Check size={14} className="shrink-0" />
          Outage detection settings saved.
        </div>
      )}

      <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
        <Button size="sm" icon={<Save size={14} />} onClick={handleSave} disabled={!valid}>Save</Button>
      </div>
    </div>
  )
}

function ServerCard({ server, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border p-4 hover:border-brand-blue/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-navy/5 rounded-lg flex items-center justify-center">
          <Server size={16} className="text-navy" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${server.status === 'online' ? 'text-green-600' : 'text-red-500'}`}>
            {server.status === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate">{server.name}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-mono">{server.ip}:{server.port}</p>
      <div className="mt-2 flex items-center justify-between">
        <Badge variant={SERVER_TYPE_VARIANT[server.type] || 'gray'} size="sm">{server.type}</Badge>
        <div className="flex gap-0.5">
          <button onClick={() => onEdit(server)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(server.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function JazeServersTab() {
  const [servers, setServers] = useState(INIT_SERVERS)
  const [editServer, setEditServer] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', ip: '', port: '', type: 'RADIUS' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (editServer) {
      setServers(s => s.map(x => x.id === editServer.id ? { ...editServer, ...form } : x))
      setEditServer(null)
    } else {
      setServers(s => [...s, { ...form, id: Date.now(), status: 'online' }])
      setShowAdd(false)
    }
    setForm({ name: '', ip: '', port: '', type: 'RADIUS' })
  }

  const handleEdit = (sv) => {
    setForm({ name: sv.name, ip: sv.ip, port: sv.port, type: sv.type })
    setEditServer(sv)
  }

  const handleDelete = (id) => setServers(s => s.filter(x => x.id !== id))

  const onlineCount = servers.filter(s => s.status === 'online').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Jaze ISP Manager — Servers</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {onlineCount} of {servers.length} servers online
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}>Test All</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setForm({ name: '', ip: '', port: '', type: 'RADIUS' }); setShowAdd(true) }}>
            Add Server
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {servers.map(sv => (
          <ServerCard key={sv.id} server={sv} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showAdd || !!editServer}
        onClose={() => { setShowAdd(false); setEditServer(null) }}
        title={editServer ? `Edit Server — ${editServer.name}` : 'Add Jaze Server'}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setEditServer(null) }}>Cancel</Button>
          <Button size="sm" icon={<Save size={14} />} onClick={handleSave}>
            {editServer ? 'Save Changes' : 'Add Server'}
          </Button>
        </>}>
        <div className="space-y-4">
          <FormField label="Server Name" required>
            <Input placeholder="e.g. Mumbai-Core-01" value={form.name} onChange={e => set('name', e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="IP Address" required>
              <Input placeholder="10.0.0.1" value={form.ip} onChange={e => set('ip', e.target.value)} />
            </FormField>
            <FormField label="Port" required>
              <Input type="number" placeholder="1812" value={form.port} onChange={e => set('port', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Server Type">
            <Select value={form.type} onChange={e => set('type', e.target.value)}>
              {['RADIUS', 'NAS', 'SNMP', 'Auth', 'API', 'DHCP', 'Monitor'].map(t => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}

function ZohoBooksTab() {
  const [connected, setConnected] = useState(true)
  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Zoho Books Integration</h2>
          <p className="text-xs text-gray-500 mt-1">Sync invoices, payments and customers with Zoho Books</p>
        </div>
        <Badge variant={connected ? 'green' : 'gray'} dot>{connected ? 'Connected' : 'Disconnected'}</Badge>
      </div>

      {connected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check size={16} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700">Zoho Books is connected</p>
            <p className="text-xs text-green-600 mt-0.5">Organization: Cityline Networks Pvt Ltd · Last sync: 5 minutes ago</p>
          </div>
          <button onClick={() => setConnected(false)}
            className="ml-auto text-xs text-red-500 hover:text-red-600 font-medium underline">Disconnect</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Zoho Client ID">
          <Input type="password" defaultValue="1000.XXXXXXXXXXXXXXXXXXXXXXXXX" />
        </FormField>
        <FormField label="Zoho Client Secret">
          <Input type="password" defaultValue="********************************" />
        </FormField>
        <FormField label="Organization ID">
          <Input defaultValue="20097512" />
        </FormField>
        <FormField label="API Region">
          <Select defaultValue="in">
            <option value="in">India (zohoapis.in)</option>
            <option value="com">Global (zohoapis.com)</option>
          </Select>
        </FormField>
      </div>

      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50/80 border-b border-surface-border">
          <p className="text-sm font-semibold text-gray-800">Auto Export Schedule</p>
        </div>
        <div className="divide-y divide-surface-border">
          {[
            { label: 'Export Invoices',         freq: 'Daily at 11:00 PM',    enabled: true  },
            { label: 'Export Payments',         freq: 'Daily at 11:30 PM',    enabled: true  },
            { label: 'Export Customer List',    freq: 'Weekly (Sunday)',       enabled: false },
            { label: 'Sync Chart of Accounts',  freq: 'Monthly (1st)',         enabled: false },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.freq}</p>
              </div>
              <Toggle checked={item.enabled} onChange={() => {}} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
        <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}>Sync Now</Button>
        <Button variant="secondary" size="sm" icon={<Webhook size={14} />}>Test Webhook</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm">Cancel</Button>
          <Button size="sm" icon={<Save size={14} />}>Save Config</Button>
        </div>
      </div>
    </div>
  )
}

function RolesTab() {
  const [activeRole, setActiveRole] = useState('admin')

  const role = ROLES.find(r => r.id === activeRole)

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Roles & Permissions</h2>
          <p className="text-xs text-gray-500 mt-1">Define what each role can access across the platform</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />}>Add Role</Button>
      </div>

      <div className="flex gap-5">
        {/* Role list */}
        <div className="w-52 shrink-0 space-y-1.5">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setActiveRole(r.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between
                ${activeRole === r.id ? 'bg-brand-blue text-white' : 'bg-white border border-surface-border text-gray-700 hover:bg-gray-50'}`}>
              <div>
                <p className="text-sm font-medium leading-tight">{r.label}</p>
                <p className={`text-xs mt-0.5 ${activeRole === r.id ? 'text-blue-100' : 'text-gray-400'}`}>{r.users} users</p>
              </div>
              <Shield size={14} className={activeRole === r.id ? 'text-blue-200' : 'text-gray-300'} />
            </button>
          ))}
        </div>

        {/* Permissions matrix */}
        <div className="flex-1 bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-2">
            <Shield size={15} className="text-brand-blue" />
            <h3 className="text-sm font-semibold text-gray-900">{role?.label} — Module Access</h3>
            <Badge variant={role?.color} size="sm" className="ml-2">{role?.users} users</Badge>
          </div>
          <div className="divide-y divide-surface-border">
            {MODULES.map(mod => {
              const perm = PERMISSIONS[activeRole]?.[mod] || 'none'
              return (
                <div key={mod} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                  <span className="text-sm font-medium text-gray-700">{mod}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant={PERM_VARIANT[perm]} size="sm">{PERM_LABEL[perm]}</Badge>
                    <div className="flex gap-1">
                      {['full', 'view', 'none'].map(p => (
                        <button key={p}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors
                            ${perm === p
                              ? p === 'full' ? 'bg-green-500 text-white' : p === 'view' ? 'bg-brand-blue text-white' : 'bg-gray-300 text-gray-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                          {p === 'none' ? 'No Access' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-4 border-t border-surface-border flex justify-end gap-2">
            <Button variant="secondary" size="sm">Reset</Button>
            <Button size="sm" icon={<Save size={14} />}>Save Permissions</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sales Configuration mock data ────────────────────────────────────────────

const INIT_LEAD_SOURCES = [
  { id: 1, name: 'Walk-in',       active: true  },
  { id: 2, name: 'Website',       active: true  },
  { id: 3, name: 'Referral',      active: true  },
  { id: 4, name: 'Social Media',  active: true  },
  { id: 5, name: 'Cold Call',     active: false },
  { id: 6, name: 'Partner',       active: true  },
]

const INIT_LEAD_STAGES = [
  { id: 1, name: 'New Lead',           order: 1, color: '#6366f1' },
  { id: 2, name: 'Contacted',          order: 2, color: '#0A8DCD' },
  { id: 3, name: 'Site Survey',        order: 3, color: '#f59e0b' },
  { id: 4, name: 'Proposal Sent',      order: 4, color: '#8b5cf6' },
  { id: 5, name: 'Negotiation',        order: 5, color: '#ec4899' },
  { id: 6, name: 'Won',               order: 6, color: '#22c55e' },
  { id: 7, name: 'Lost',              order: 7, color: '#ef4444' },
]

function SalesConfigTab() {
  const [sources, setSources] = useState(INIT_LEAD_SOURCES)
  const [stages, setStages]   = useState(INIT_LEAD_STAGES)
  const [addSourceModal, setAddSourceModal] = useState(false)
  const [addStageModal,  setAddStageModal]  = useState(false)
  const [newSource, setNewSource] = useState('')
  const [newStage,  setNewStage]  = useState({ name: '', color: '#0A8DCD' })
  const [pipeline, setPipeline] = useState({ name: 'Default Pipeline', autoAssign: true, notifyOnMove: true, wonStage: 'Won', lostStage: 'Lost' })

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Sales Configuration</h2>
        <p className="text-xs text-gray-500 mt-1">Manage lead sources, stages and pipeline settings</p>
      </div>

      {/* Lead Sources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Lead Sources</h3>
          <button onClick={() => setAddSourceModal(true)}
            className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600">
            <Plus size={13} /> Add Source
          </button>
        </div>
        <div className="rounded-xl border border-surface-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] bg-gray-50/80 border-b border-surface-border px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide gap-4">
            <span>Source Name</span><span>Active</span><span>Actions</span>
          </div>
          <div className="divide-y divide-surface-border">
            {sources.map(s => (
              <div key={s.id} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 gap-4 hover:bg-gray-50/50">
                <span className="text-sm text-gray-700">{s.name}</span>
                <Toggle checked={s.active} onChange={v => setSources(prev => prev.map(x => x.id === s.id ? { ...x, active: v } : x))} />
                <button onClick={() => setSources(prev => prev.filter(x => x.id !== s.id))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Stages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Lead Stages</h3>
          <button onClick={() => setAddStageModal(true)}
            className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600">
            <Plus size={13} /> Add Stage
          </button>
        </div>
        <div className="rounded-xl border border-surface-border overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] bg-gray-50/80 border-b border-surface-border px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide gap-4">
            <span>#</span><span>Stage Name</span><span>Color</span><span>Actions</span>
          </div>
          <div className="divide-y divide-surface-border">
            {stages.map(s => (
              <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center px-4 py-3 gap-4 hover:bg-gray-50/50">
                <span className="text-xs text-gray-400 w-5 text-center">{s.order}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-gray-700">{s.name}</span>
                </div>
                <input type="color" value={s.color}
                  onChange={e => setStages(prev => prev.map(x => x.id === s.id ? { ...x, color: e.target.value } : x))}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent" />
                <button onClick={() => setStages(prev => prev.filter(x => x.id !== s.id))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Settings */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Pipeline Settings</h3>
        <div className="rounded-xl border border-surface-border p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pipeline Name">
              <Input value={pipeline.name} onChange={e => setPipeline(p => ({ ...p, name: e.target.value }))} />
            </FormField>
            <FormField label="Won Stage">
              <Select value={pipeline.wonStage} onChange={e => setPipeline(p => ({ ...p, wonStage: e.target.value }))}>
                {stages.map(s => <option key={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
          </div>
          {[
            { key: 'autoAssign',   label: 'Auto-assign leads to available agents',  desc: 'Round-robin assignment when lead is created' },
            { key: 'notifyOnMove', label: 'Notify agent when lead moves stages',    desc: 'Push notification + email on stage change' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-surface-border">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={pipeline[key]} onChange={v => setPipeline(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button size="sm" icon={<Save size={14} />}>Save Pipeline</Button>
          </div>
        </div>
      </div>

      {/* Add Source Modal */}
      {addSourceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Add Lead Source</h2>
              <button onClick={() => setAddSourceModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Source Name *</label>
                <input value={newSource} onChange={e => setNewSource(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]"
                  placeholder="e.g. WhatsApp" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAddSourceModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={() => {
                  if (!newSource.trim()) return
                  setSources(prev => [...prev, { id: Date.now(), name: newSource.trim(), active: true }])
                  setNewSource('')
                  setAddSourceModal(false)
                }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stage Modal */}
      {addStageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Add Lead Stage</h2>
              <button onClick={() => setAddStageModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Stage Name *</label>
                <input value={newStage.name} onChange={e => setNewStage(s => ({ ...s, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]"
                  placeholder="e.g. Follow-up" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
                <input type="color" value={newStage.color} onChange={e => setNewStage(s => ({ ...s, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAddStageModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={() => {
                  if (!newStage.name.trim()) return
                  setStages(prev => [...prev, { id: Date.now(), name: newStage.name.trim(), color: newStage.color, order: prev.length + 1 }])
                  setNewStage({ name: '', color: '#0A8DCD' })
                  setAddStageModal(false)
                }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Zone mock data ────────────────────────────────────────────────────────────

const INIT_ZONES = [
  { id: 1, customerType: 'Cityline', zoneName: 'Andheri West Zone', zoneId: 'AW-001', zoneUrl: 'https://jaze.cityline.in/aw', username: 'admin_aw', password: 'P@ssw0rd!1', addedDate: '2025-03-12' },
  { id: 2, customerType: 'Partner',  zoneName: 'Bandra East Zone',  zoneId: 'BE-002', zoneUrl: 'https://jaze.cityline.in/be', username: 'admin_be', password: 'Secur3#Be2', addedDate: '2025-05-01' },
  { id: 3, customerType: 'Cityline', zoneName: 'Versova Zone',      zoneId: 'VS-003', zoneUrl: 'https://jaze.cityline.in/vs', username: 'admin_vs', password: 'V3rs0va$3!', addedDate: '2026-01-08' },
]

function ZoneTab() {
  const [zones, setZones] = useState(INIT_ZONES)
  const [addModal, setAddModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [shownPw, setShownPw] = useState({})
  const [form, setForm] = useState({ customerType: 'Cityline', zoneName: '', zoneId: '', zoneUrl: '', username: '', password: '' })

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Zone Management</h2>
          <p className="text-xs text-gray-500 mt-1">Configure Jaze ISP zone connections</p>
        </div>
        <button onClick={() => { setForm({ customerType: 'Cityline', zoneName: '', zoneId: '', zoneUrl: '', username: '', password: '' }); setAddModal(true) }}
          className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
          <Plus size={15} /> Add Zone
        </button>
      </div>

      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-surface-border">
                {['S.NO', 'CUSTOMER TYPE', 'ZONE NAME', 'ZONE ID', 'ZONE IP/URL', 'USERNAME', 'PASSWORD', 'ADDED DATE', 'ACTIONS'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {zones.map((z, idx) => (
                <tr key={z.id} className="hover:bg-gray-50/50 group">
                  <td className="px-3 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${z.customerType === 'Cityline' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {z.customerType}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-800">{z.zoneName}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{z.zoneId}</td>
                  <td className="px-3 py-3 text-xs text-[#0A8DCD] max-w-[180px] truncate">{z.zoneUrl}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{z.username}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gray-600">
                        {shownPw[z.id] ? z.password : '••••••••'}
                      </span>
                      <button onClick={() => setShownPw(p => ({ ...p, [z.id]: !p[z.id] }))}
                        className="text-gray-400 hover:text-gray-600">
                        {shownPw[z.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{z.addedDate}</td>
                  <td className="px-3 py-3 relative">
                    <button onClick={() => setMenuOpen(menuOpen === z.id ? null : z.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <MoreVertical size={15} />
                    </button>
                    {menuOpen === z.id && (
                      <div className="absolute right-8 top-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44" onMouseLeave={() => setMenuOpen(null)}>
                        {['Active', 'Edit', 'Remove', 'Check Recharge Status'].map(action => (
                          <button key={action} onClick={() => { if (action === 'Remove') setZones(prev => prev.filter(x => x.id !== z.id)); setMenuOpen(null) }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${action === 'Remove' ? 'text-red-500' : 'text-gray-700'}`}>
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No zones configured yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Zone Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Add Zone</h2>
              <button onClick={() => setAddModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Customer Type *</label>
                <select value={form.customerType} onChange={e => setF('customerType', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]">
                  <option>Cityline</option>
                  <option>Partner</option>
                </select>
              </div>
              {[
                ['Zone Name *',    'zoneName', 'e.g. Andheri West Zone'],
                ['Zone ID *',      'zoneId',   'e.g. AW-001'],
                ['Zone IP/URL *',  'zoneUrl',  'e.g. https://jaze.cityline.in/aw'],
                ['Username *',     'username', 'e.g. admin_aw'],
                ['Password *',     'password', 'Enter password'],
              ].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                  <input
                    type={key === 'password' ? 'password' : 'text'}
                    value={form[key]} onChange={e => setF(key, e.target.value)}
                    placeholder={ph}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={() => {
                  if (!form.zoneName || !form.zoneId) return
                  setZones(prev => [...prev, { id: Date.now(), ...form, addedDate: new Date().toISOString().slice(0, 10) }])
                  setAddModal(false)
                }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add Zone</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Master Configuration (Tenure, Bandwidth, OTT, Landline, Static IP) ───────

const MASTER_SUB_TABS = [
  { label: 'Tenure',           slug: 'tenure'    },
  { label: 'Bandwidth',        slug: 'bandwidth' },
  { label: 'Landline Numbers', slug: 'landline'  },
  { label: 'Static IP',        slug: 'static-ip' },
]

const INIT_MC_TENURES = [
  { id: 1, name: '1 Month',     months: 1,  description: 'Monthly billing cycle',     status: 'Active' },
  { id: 2, name: '3 Months',    months: 3,  description: 'Quarterly billing cycle',   status: 'Active' },
  { id: 3, name: '6 Months',    months: 6,  description: 'Semi-annual billing cycle', status: 'Active' },
  { id: 4, name: '1 Year',      months: 12, description: 'Annual billing cycle',      status: 'Active' },
  { id: 5, name: '12+1 Month',  months: 13, description: 'Annual + 1 free month',     status: 'Active' },
  { id: 6, name: '12+2 Months', months: 14, description: 'Annual + 2 free months',    status: 'Active' },
]

const INIT_MC_BANDWIDTHS = [
  { id: 1, speed: 50,  unit: 'Mbps', description: '50 Mbps fiber',  status: 'Active' },
  { id: 2, speed: 100, unit: 'Mbps', description: '100 Mbps fiber', status: 'Active' },
  { id: 3, speed: 150, unit: 'Mbps', description: '150 Mbps fiber', status: 'Active' },
  { id: 4, speed: 200, unit: 'Mbps', description: '200 Mbps fiber', status: 'Active' },
  { id: 5, speed: 300, unit: 'Mbps', description: '300 Mbps fiber', status: 'Active' },
  { id: 6, speed: 500, unit: 'Mbps', description: '500 Mbps fiber', status: 'Active' },
  { id: 7, speed: 1,   unit: 'Gbps', description: '1 Gbps fiber',   status: 'Active' },
]

const INIT_MC_OTT = [
  { id: 1, name: 'Cityline TV Gold',   provider: 'Playbox', description: 'Premium OTT bundle',  status: 'Active' },
  { id: 2, name: 'Cityline TV Silver', provider: 'Playbox', description: 'Standard OTT bundle', status: 'Active' },
  { id: 3, name: 'Cityline TV Basic',  provider: 'Playbox', description: 'Basic OTT bundle',    status: 'Active' },
]

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"

function StatusPill({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

const MC_PAGE_SIZE = 10

function MCPagination({ page, setPage, total }) {
  const totalPages = Math.max(1, Math.ceil(total / MC_PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * MC_PAGE_SIZE + 1
  const to   = Math.min(page * MC_PAGE_SIZE, total)
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
      <p className="text-xs text-gray-500">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setPage(p)}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${p === page ? 'bg-[#0A8DCD] text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function MasterConfigTab() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const sub = MASTER_SUB_TABS.find(t => t.slug === tab)?.label ?? 'Tenure'
  if (!tab) return <Navigate to="/settings/master-config/tenure" replace />

  // Tenure state
  const [tenures, setTenures] = useState(INIT_MC_TENURES)
  const [tenureModal, setTenureModal] = useState(false)
  const [tenureForm, setTenureForm] = useState({ name: '', months: '', description: '' })
  const [tenurePage, setTenurePage] = useState(1)

  // Bandwidth state
  const [bandwidths, setBandwidths] = useState(INIT_MC_BANDWIDTHS)
  const [bwModal, setBwModal] = useState(false)
  const [bwForm, setBwForm] = useState({ speed: '', unit: 'Mbps', description: '' })
  const [bwPage, setBwPage] = useState(1)

  // Landline state
  const [landlines, setLandlines] = useState(MOCK_LANDLINES)
  const [landlineModal, setLandlineModal] = useState(false)
  const [landlineBulkModal, setLandlineBulkModal] = useState(false)
  const [landlineForm, setLandlineForm] = useState({ number: '', status: 'Available' })
  const [landlinePage, setLandlinePage] = useState(1)

  // Static IP state
  const [staticIps, setStaticIps] = useState(MOCK_STATIC_IPS)
  const [ipModal, setIpModal] = useState(false)
  const [ipBulkModal, setIpBulkModal] = useState(false)
  const [ipForm, setIpForm] = useState({ ip: '', subnet: '', gateway: '', dns1: '', dns2: '' })
  const [ipPage, setIpPage] = useState(1)

  // Sliced data for current page
  const tenureRows   = tenures.slice((tenurePage   - 1) * MC_PAGE_SIZE, tenurePage   * MC_PAGE_SIZE)
  const bwRows       = bandwidths.slice((bwPage     - 1) * MC_PAGE_SIZE, bwPage       * MC_PAGE_SIZE)
  const landlineRows = landlines.slice((landlinePage - 1) * MC_PAGE_SIZE, landlinePage * MC_PAGE_SIZE)
  const ipRows       = staticIps.slice((ipPage       - 1) * MC_PAGE_SIZE, ipPage        * MC_PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Master Configuration</h2>
        <p className="text-xs text-gray-500 mt-1">Manage tenures, bandwidths, landlines and static IPs</p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {MASTER_SUB_TABS.map(t => (
          <button key={t.slug} onClick={() => navigate(`/settings/master-config/${t.slug}`)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              sub === t.label ? 'bg-white shadow-sm text-[#0F2744]' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TENURE ── */}
      {sub === 'Tenure' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Tenure Options</h3>
            <button onClick={() => setTenureModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600">
              <Plus size={13} /> Add Tenure
            </button>
          </div>
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-surface-border">
                {['Tenure Name','Months','Description','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-surface-border">
                {tenureRows.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.months}</td>
                    <td className="px-4 py-3 text-gray-500">{t.description}</td>
                    <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setTenures(prev => prev.filter(x => x.id !== t.id))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <MCPagination page={tenurePage} setPage={setTenurePage} total={tenures.length} />
          </div>
          {tenureModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">Add Tenure</h2>
                  <button onClick={() => setTenureModal(false)}><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-3">
                  {[['Tenure Name *','name','e.g. 12+1'],['Total Months *','months','e.g. 13'],['Description','description','']].map(([lbl,k,ph]) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lbl}</label>
                      <input value={tenureForm[k]} onChange={e => setTenureForm(f => ({...f,[k]:e.target.value}))}
                        type={k==='months'?'number':'text'} placeholder={ph} className={inp} />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setTenureModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                    <button onClick={() => {
                      if (!tenureForm.name || !tenureForm.months) return
                      setTenures(prev => [...prev, { id: Date.now(), name: tenureForm.name, months: Number(tenureForm.months), description: tenureForm.description, status: 'Active' }])
                      setTenureForm({ name: '', months: '', description: '' })
                      setTenureModal(false)
                    }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BANDWIDTH ── */}
      {sub === 'Bandwidth' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Bandwidth Options</h3>
            <button onClick={() => setBwModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600">
              <Plus size={13} /> Add Bandwidth
            </button>
          </div>
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-surface-border">
                {['Speed','Unit','Description','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-surface-border">
                {bwRows.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.speed} {b.unit}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{b.unit}</span></td>
                    <td className="px-4 py-3 text-gray-500">{b.description}</td>
                    <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setBandwidths(prev => prev.filter(x => x.id !== b.id))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <MCPagination page={bwPage} setPage={setBwPage} total={bandwidths.length} />
          </div>
          {bwModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">Add Bandwidth</h2>
                  <button onClick={() => setBwModal(false)}><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Speed *</label>
                      <input type="number" value={bwForm.speed} onChange={e => setBwForm(f=>({...f,speed:e.target.value}))} placeholder="e.g. 100" className={inp} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Unit *</label>
                      <select value={bwForm.unit} onChange={e => setBwForm(f=>({...f,unit:e.target.value}))} className={inp}>
                        <option>Mbps</option><option>Gbps</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                    <input value={bwForm.description} onChange={e => setBwForm(f=>({...f,description:e.target.value}))} className={inp} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setBwModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                    <button onClick={() => {
                      if (!bwForm.speed) return
                      setBandwidths(prev => [...prev, { id: Date.now(), speed: Number(bwForm.speed), unit: bwForm.unit, description: bwForm.description, status: 'Active' }])
                      setBwForm({ speed: '', unit: 'Mbps', description: '' })
                      setBwModal(false)
                    }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LANDLINE NUMBERS ── */}
      {sub === 'Landline Numbers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Landline Number Pool</h3>
            <div className="flex gap-2">
              <button onClick={() => setLandlineBulkModal(true)}
                className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                📥 Bulk Import
              </button>
              <button onClick={() => setLandlineModal(true)}
                className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600">
                <Plus size={13} /> Add Number
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-surface-border">
                {['Landline No','Status','Assigned To','Customer','Assigned Date','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-surface-border">
                {landlineRows.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">{l.number}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        l.status === 'Available' ? 'bg-green-100 text-green-700' :
                        l.status === 'Assigned'  ? 'bg-blue-100 text-blue-700'  : 'bg-gray-100 text-gray-500'
                      }`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.assignedTo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{l.customer || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.assignedDate || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setLandlines(prev => prev.filter(x => x.id !== l.id))}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <MCPagination page={landlinePage} setPage={setLandlinePage} total={landlines.length} />
          </div>
          {landlineModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">Add Landline Number</h2>
                  <button onClick={() => setLandlineModal(false)}><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Landline Number *</label>
                    <input value={landlineForm.number} onChange={e => setLandlineForm(f=>({...f,number:e.target.value}))}
                      placeholder="+91-120-..." className={inp} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                    <select value={landlineForm.status} onChange={e => setLandlineForm(f=>({...f,status:e.target.value}))} className={inp}>
                      <option>Available</option><option>Reserved</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setLandlineModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                    <button onClick={() => {
                      if (!landlineForm.number) return
                      setLandlines(prev => [...prev, { id: Date.now(), number: landlineForm.number, status: landlineForm.status, assignedTo: null, customer: null, assignedDate: null }])
                      setLandlineForm({ number: '', status: 'Available' })
                      setLandlineModal(false)
                    }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add Number</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {landlineBulkModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">Bulk Import Numbers</h2>
                  <button onClick={() => setLandlineBulkModal(false)}><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <button className="w-full flex items-center justify-center gap-2 border border-dashed border-[#0A8DCD] rounded-lg py-2 text-sm text-[#0A8DCD] hover:bg-blue-50">
                    <Download size={14} /> Download Excel Template
                  </button>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                    <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Drop Excel file here or click to upload</p>
                    <p className="text-xs mt-1">Supports .xlsx, .csv</p>
                  </div>
                  <button onClick={() => setLandlineBulkModal(false)} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STATIC IP ── */}
      {sub === 'Static IP' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Static IP Pool</h3>
            <div className="flex gap-2">
              <button onClick={() => setIpBulkModal(true)}
                className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                📥 Bulk Import
              </button>
              <button onClick={() => setIpModal(true)}
                className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600">
                <Plus size={13} /> Add IP
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-surface-border">
                {['IP Address','Subnet','Gateway','Status','Assigned To','Customer','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-surface-border">
                {ipRows.map(ip => (
                  <tr key={ip.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">{ip.ip}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ip.subnet}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ip.gateway}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ip.status === 'Available' ? 'bg-green-100 text-green-700' :
                        ip.status === 'Assigned'  ? 'bg-blue-100 text-blue-700'  : 'bg-gray-100 text-gray-500'
                      }`}>{ip.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ip.assignedTo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{ip.customer || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setStaticIps(prev => prev.filter(x => x.id !== ip.id))}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <MCPagination page={ipPage} setPage={setIpPage} total={staticIps.length} />
          </div>
          {ipModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">Add Static IP</h2>
                  <button onClick={() => setIpModal(false)}><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-3">
                  {[['IP Address *','ip','e.g. 103.21.58.10'],['Subnet Mask *','subnet','e.g. 255.255.255.0'],['Gateway *','gateway','e.g. 103.21.58.1'],['DNS Primary','dns1','e.g. 8.8.8.8'],['DNS Secondary','dns2','e.g. 8.8.4.4']].map(([lbl,k,ph]) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lbl}</label>
                      <input value={ipForm[k]} onChange={e => setIpForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} className={inp} />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setIpModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                    <button onClick={() => {
                      if (!ipForm.ip) return
                      setStaticIps(prev => [...prev, { id: Date.now(), ip: ipForm.ip, subnet: ipForm.subnet, gateway: ipForm.gateway, status: 'Available', assignedTo: null, customer: null }])
                      setIpForm({ ip: '', subnet: '', gateway: '', dns1: '', dns2: '' })
                      setIpModal(false)
                    }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add IP</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {ipBulkModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800">Bulk Import IPs</h2>
                  <button onClick={() => setIpBulkModal(false)}><X size={16} className="text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <button className="w-full flex items-center justify-center gap-2 border border-dashed border-[#0A8DCD] rounded-lg py-2 text-sm text-[#0A8DCD] hover:bg-blue-50">
                    <Download size={14} /> Download Excel Template
                  </button>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                    <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Drop Excel file here or click to upload</p>
                    <p className="text-xs mt-1">Supports .xlsx, .csv</p>
                  </div>
                  <button onClick={() => setIpBulkModal(false)} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── System Configuration: shared toggle ────────────────────────────────────────

function SysConfigToggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200
        ${checked ? 'bg-brand-blue' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ── System Configuration: Customer Type ─────────────────────────────────────────

function CustomerTypeListPanel({ onOpenServiceTags, onOpenFields }) {
  const [types, setTypes] = useState(getCustomerTypes)

  useEffect(() => subscribeCustomerTypes(setTypes), [])

  function handleToggle(type, next) {
    setCustomerTypeStatus(type.id, next ? 'Active' : 'Inactive')
  }

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Customer Type</h2>
        <p className="text-xs text-gray-500 mt-0.5">Resident and Corporate are system-seeded and cannot be added or removed</p>
      </div>

      <div className="rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Type Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mapped Service Tags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Fields Configured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {types.map(t => {
              const tagCount = countServiceTagsForType(t.id)
              const fieldCount = getFieldCount(t.id)
              return (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <SysConfigToggle checked={t.status === 'Active'} onChange={v => handleToggle(t, v)} />
                      <span className={`text-xs font-medium whitespace-nowrap ${t.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{t.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onOpenServiceTags(t.id)}
                      className="inline-flex items-center gap-1.5 text-brand-blue hover:underline font-medium"
                    >
                      <Tags size={13} />
                      {tagCount} {tagCount === 1 ? 'tag' : 'tags'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onOpenFields(t.id)}
                      className="inline-flex items-center gap-1.5 text-brand-blue hover:underline font-medium"
                    >
                      <ListChecks size={13} />
                      {fieldCount} fields
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CT_TAG_BADGE_VARIANT = { resident: 'blue', corporate: 'purple' }

function ctEmptyTagForm(defaultType) {
  return { name: '', customerType: defaultType, status: 'Active', displayOrder: nextDisplayOrder(defaultType) }
}

function ServiceTagsPanel({ initialFilterType, onBack }) {
  const customerTypes = getCustomerTypes()
  const [filterType, setFilterType] = useState(() =>
    customerTypes.some(t => t.id === initialFilterType) ? initialFilterType : 'all')

  const [tags, setTags] = useState(getServiceTags)
  const [modalTag, setModalTag] = useState(null) // existing tag being edited, or null
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(() => ctEmptyTagForm(customerTypes[0]?.id))
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  useEffect(() => subscribeServiceTags(setTags), [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  const filtered = filterType === 'all' ? tags : tags.filter(t => t.customerType === filterType)

  function setField(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'customerType') next.displayOrder = nextDisplayOrder(v, modalTag?.id)
      return next
    })
    setError('')
  }

  function openAdd() {
    const defaultType = filterType !== 'all' ? filterType : customerTypes[0]?.id
    setModalTag(null)
    setForm(ctEmptyTagForm(defaultType))
    setError('')
    setShowModal(true)
  }

  function openEdit(tag) {
    setModalTag(tag)
    setForm({ name: tag.name, customerType: tag.customerType, status: tag.status, displayOrder: tag.displayOrder })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setModalTag(null)
  }

  function handleSave() {
    const name = form.name.trim()
    if (!name) { setError('Tag name is required.'); return }
    if (isTagNameTaken(name, form.customerType, modalTag?.id)) {
      setError('A service tag with this name already exists for the selected customer type.')
      return
    }
    saveServiceTag({
      id: modalTag?.id,
      name,
      customerType: form.customerType,
      status: form.status,
      displayOrder: Number(form.displayOrder) || nextDisplayOrder(form.customerType, modalTag?.id),
    })
    setToast(modalTag ? 'Service tag updated successfully' : 'Service tag added successfully')
    closeModal()
  }

  function handleStatusToggle(tag, checked) {
    setServiceTagStatus(tag.id, checked ? 'Active' : 'Inactive')
  }

  function handleDrop(dropIdx) {
    if (dragIndex === null || dragIndex === dropIdx) { setDragIndex(null); setOverIndex(null); return }
    const reordered = [...filtered]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIdx, 0, moved)
    reorderServiceTags(reordered.map(t => t.id))
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-blue">
        <ChevronLeft size={13} /> Back to Customer Type
      </button>

      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Service Tags</h2>
          <p className="text-xs text-gray-500 mt-0.5">Customer Type — Service Tag Master</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Service Tag</Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 shrink-0">Customer Type</label>
        <Select className="w-52" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All</option>
          {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicable Customer Type</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Display Order</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.map((tag, idx) => (
              <tr
                key={tag.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={e => { e.preventDefault(); setOverIndex(idx) }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                className={`transition-colors select-none
                  ${dragIndex === idx ? 'opacity-40' : 'hover:bg-gray-50/50'}
                  ${overIndex === idx && dragIndex !== null && dragIndex !== idx ? 'bg-blue-50/60' : ''}`}
              >
                <td className="px-3 py-3 text-gray-300 cursor-grab active:cursor-grabbing">
                  <GripVertical size={15} />
                </td>
                <td className="px-3 py-3 font-medium text-gray-900">{tag.name}</td>
                <td className="px-3 py-3">
                  <Badge variant={CT_TAG_BADGE_VARIANT[tag.customerType] || 'gray'} size="sm">
                    {customerTypes.find(t => t.id === tag.customerType)?.name || tag.customerType}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <SysConfigToggle checked={tag.status === 'Active'} onChange={v => handleStatusToggle(tag, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${tag.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{tag.status}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-600">{tag.displayOrder}</td>
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => openEdit(tag)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No service tags for this customer type yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalTag ? `Edit Service Tag — ${modalTag.name}` : 'Add Service Tag'}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{modalTag ? 'Save Changes' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Tag Name" required error={error}>
            <Input placeholder="e.g. Broadband" value={form.name} onChange={e => setField('name', e.target.value)} />
          </FormField>
          <FormField label="Applicable Customer Type" required>
            <Select value={form.customerType} onChange={e => setField('customerType', e.target.value)}>
              {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Display Order">
              <Input type="number" min="1" value={form.displayOrder} onChange={e => setField('displayOrder', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <div className="flex items-center gap-2.5 h-[38px]">
                <SysConfigToggle checked={form.status === 'Active'} onChange={v => setField('status', v ? 'Active' : 'Inactive')} />
                <span className="text-sm text-gray-600 whitespace-nowrap">{form.status}</span>
              </div>
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Success toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}

function FieldConfigPanel({ type, onSwitchType, onBack }) {
  const customerTypes = getCustomerTypes()
  const activeType = customerTypes.some(t => t.id === type) ? type : customerTypes[0]?.id

  const [fields, setFields] = useState(() => getFieldConfig(activeType))

  useEffect(() => {
    setFields(getFieldConfig(activeType))
    return subscribeFieldConfig(() => setFields(getFieldConfig(activeType)))
  }, [activeType])

  function handleToggle(field, next) {
    if (field.locked) return
    setFieldMandatory(activeType, field.fieldName, next)
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-blue">
        <ChevronLeft size={13} /> Back to Customer Type
      </button>

      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Field Configuration</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Customer Type — control which fields are Mandatory or Optional on the Lead/Customer creation form
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {customerTypes.map(t => (
          <button
            key={t.id}
            onClick={() => onSwitchType(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeType === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Changes apply going forward to new Lead/Customer entries; existing records are not retro-validated.
      </p>

      {/* Table */}
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mandatory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {fields.map(field => (
              <tr key={field.fieldName} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{field.fieldName}</span>
                    {field.conditional && <Badge variant="yellow" size="sm">Conditional</Badge>}
                    {field.locked && (
                      <Lock
                        size={12}
                        className="text-gray-400 shrink-0"
                        aria-label="System-default-mandatory field — cannot be made optional"
                        title="System-default-mandatory field — cannot be made optional"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <SysConfigToggle checked={field.mandatory} disabled={field.locked} onChange={v => handleToggle(field, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${field.mandatory ? 'text-green-600' : 'text-gray-400'}`}>
                      {field.mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CustomerTypeTab() {
  const [view, setView] = useState({ mode: 'list' })

  if (view.mode === 'service-tags') {
    return <ServiceTagsPanel initialFilterType={view.filterType} onBack={() => setView({ mode: 'list' })} />
  }
  if (view.mode === 'fields') {
    return (
      <FieldConfigPanel
        type={view.fieldsType}
        onSwitchType={t => setView({ mode: 'fields', fieldsType: t })}
        onBack={() => setView({ mode: 'list' })}
      />
    )
  }
  return (
    <CustomerTypeListPanel
      onOpenServiceTags={type => setView({ mode: 'service-tags', filterType: type })}
      onOpenFields={type => setView({ mode: 'fields', fieldsType: type })}
    />
  )
}

// ── System Configuration: Company / Entity ──────────────────────────────────────

const CE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ceEmptyForm() {
  return {
    name: '', gstin: '', email: '', address: '',
    bankName: '', accountNo: '', ifsc: '', branch: '',
    pgId: '', pgConnection: PG_CONNECTIONS[0], status: 'Active',
  }
}

function ceToForm(entity) {
  return {
    name: entity.name, gstin: entity.gstin, email: entity.email, address: entity.address,
    bankName: entity.bank?.bankName || '', accountNo: entity.bank?.accountNo || '',
    ifsc: entity.bank?.ifsc || '', branch: entity.bank?.branch || '',
    pgId: entity.pgId, pgConnection: entity.pgConnection, status: entity.status,
  }
}

function CompanyEntityTab() {
  const [entities, setEntities] = useState(getCompanyEntities)
  const [modalEntity, setModalEntity] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(ceEmptyForm)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => subscribeCompanyEntities(setEntities), [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function openAdd() {
    setModalEntity(null)
    setForm(ceEmptyForm())
    setErrors({})
    setShowModal(true)
  }

  function openEdit(entity) {
    setModalEntity(entity)
    setForm(ceToForm(entity))
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setModalEntity(null)
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Legal company name is required.'
    if (!form.gstin.trim()) errs.gstin = 'GSTIN is required.'
    else if (!isValidGstin(form.gstin)) errs.gstin = 'Enter a valid 15-character GSTIN (e.g. 27AABCU9603R1ZM).'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!CE_EMAIL_REGEX.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    if (!form.address.trim()) errs.address = 'Address is required.'
    if (!form.bankName.trim()) errs.bankName = 'Bank name is required.'
    if (!form.accountNo.trim()) errs.accountNo = 'Account number is required.'
    if (!form.ifsc.trim()) errs.ifsc = 'IFSC code is required.'
    if (!form.branch.trim()) errs.branch = 'Branch is required.'
    if (!form.pgId.trim()) errs.pgId = 'PG ID is required.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveCompanyEntity({
      id: modalEntity?.id,
      name: form.name.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      email: form.email.trim(),
      address: form.address.trim(),
      bank: { bankName: form.bankName.trim(), accountNo: form.accountNo.trim(), ifsc: form.ifsc.trim().toUpperCase(), branch: form.branch.trim() },
      pgId: form.pgId.trim(),
      pgConnection: form.pgConnection,
      status: form.status,
    })
    setToast(modalEntity ? 'Company/Entity updated successfully' : 'Company/Entity added successfully')
    closeModal()
  }

  function handleStatusToggle(entity, checked) {
    setCompanyEntityStatus(entity.id, checked ? 'Active' : 'Inactive')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Company / Entity</h2>
          <p className="text-xs text-gray-500 mt-0.5">Legal billing entities used under Connection Type = Own</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Company/Entity</Button>
      </div>

      <div className="rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Legal Company Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">GSTIN</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PG Connection</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {entities.map(entity => (
              <tr key={entity.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{entity.name}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{entity.gstin}</td>
                <td className="px-4 py-3.5 text-gray-600">{entity.email}</td>
                <td className="px-4 py-3.5 text-gray-600">{entity.pgConnection}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <SysConfigToggle checked={entity.status === 'Active'} onChange={v => handleStatusToggle(entity, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${entity.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{entity.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => openEdit(entity)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {entities.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No companies/entities added yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalEntity ? `Edit Company/Entity — ${modalEntity.name}` : 'Add Company/Entity'}
        size="lg"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{modalEntity ? 'Save Changes' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Legal Company Name" required error={errors.name}>
              <Input placeholder="e.g. Cityline Networks Pvt Ltd" value={form.name} onChange={e => setField('name', e.target.value)} />
            </FormField>
            <FormField label="GSTIN" required error={errors.gstin} hint={!errors.gstin ? '15-character GSTIN, e.g. 27AABCU9603R1ZM' : undefined}>
              <Input
                placeholder="27AABCU9603R1ZM"
                value={form.gstin}
                maxLength={15}
                onChange={e => setField('gstin', e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" required error={errors.email}>
              <Input type="email" placeholder="accounts@company.in" value={form.email} onChange={e => setField('email', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <div className="flex items-center gap-2.5 h-[38px]">
                <SysConfigToggle checked={form.status === 'Active'} onChange={v => setField('status', v ? 'Active' : 'Inactive')} />
                <span className="text-sm text-gray-600 whitespace-nowrap">{form.status}</span>
              </div>
            </FormField>
          </div>
          <FormField label="Address" required error={errors.address}>
            <Textarea rows={2} placeholder="Registered address" value={form.address} onChange={e => setField('address', e.target.value)} />
          </FormField>

          <Accordion title="Bank Details & PG Connection" subtitle="Payout account and payment gateway used for this entity">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bank Name" required error={errors.bankName}>
                <Input placeholder="e.g. HDFC Bank" value={form.bankName} onChange={e => setField('bankName', e.target.value)} />
              </FormField>
              <FormField label="Account No." required error={errors.accountNo}>
                <Input placeholder="Account number" value={form.accountNo} onChange={e => setField('accountNo', e.target.value)} />
              </FormField>
              <FormField label="IFSC" required error={errors.ifsc}>
                <Input placeholder="e.g. HDFC0001234" value={form.ifsc} onChange={e => setField('ifsc', e.target.value.toUpperCase())} className="font-mono uppercase" />
              </FormField>
              <FormField label="Branch" required error={errors.branch}>
                <Input placeholder="e.g. Andheri West" value={form.branch} onChange={e => setField('branch', e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="PG ID" required error={errors.pgId}>
                <Input placeholder="e.g. rzp_live_XXXXXXXX" value={form.pgId} onChange={e => setField('pgId', e.target.value)} />
              </FormField>
              <FormField label="PG Connection" required hint="Illustrative list — depends on integrations built">
                <Select value={form.pgConnection} onChange={e => setField('pgConnection', e.target.value)}>
                  {PG_CONNECTIONS.map(pg => <option key={pg} value={pg}>{pg}</option>)}
                </Select>
              </FormField>
            </div>
          </Accordion>
        </div>
      </Modal>

      {/* Success toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}

// ── System Configuration: Partner ────────────────────────────────────────────────

const PARTNER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PARTNER_SHARE_TYPE_VARIANT = { Percentage: 'blue', Fixed: 'orange' }

function partnerEmptyForm() {
  return {
    name: '', shareType: 'Percentage', shareValue: '', contactNumber: '', email: '', address: '',
    bankName: '', accountNo: '', ifsc: '', status: 'Active',
  }
}

function partnerToForm(partner) {
  return {
    name: partner.name, shareType: partner.shareType, shareValue: partner.shareValue,
    contactNumber: partner.contactNumber, email: partner.email, address: partner.address || '',
    bankName: partner.bank?.bankName || '', accountNo: partner.bank?.accountNo || '', ifsc: partner.bank?.ifsc || '',
    status: partner.status,
  }
}

function PartnerTab() {
  const [partners, setPartners] = useState(getPartners)
  const [modalPartner, setModalPartner] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(partnerEmptyForm)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => subscribePartners(setPartners), [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function openAdd() {
    setModalPartner(null)
    setForm(partnerEmptyForm())
    setErrors({})
    setShowModal(true)
  }

  function openEdit(partner) {
    setModalPartner(partner)
    setForm(partnerToForm(partner))
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setModalPartner(null)
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Partner name is required.'
    const value = Number(form.shareValue)
    if (form.shareValue === '' || Number.isNaN(value)) errs.shareValue = 'Share value is required.'
    else if (form.shareType === 'Percentage' && (value < 0 || value > 100)) errs.shareValue = 'Percentage share must be between 0 and 100.'
    else if (form.shareType === 'Fixed' && value <= 0) errs.shareValue = 'Fixed share must be a positive amount.'
    if (!form.contactNumber.trim()) errs.contactNumber = 'Contact number is required.'
    else if (!isValidContactNumber(form.contactNumber)) errs.contactNumber = 'Enter a valid 10-digit contact number.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!PARTNER_EMAIL_REGEX.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    savePartner({
      id: modalPartner?.id,
      name: form.name.trim(),
      shareType: form.shareType,
      shareValue: Number(form.shareValue),
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      bank: { bankName: form.bankName.trim(), accountNo: form.accountNo.trim(), ifsc: form.ifsc.trim().toUpperCase() },
      status: form.status,
    })
    setToast(modalPartner ? 'Partner updated successfully' : 'Partner added successfully')
    closeModal()
  }

  function handleStatusToggle(partner, checked) {
    setPartnerStatus(partner.id, checked ? 'Active' : 'Inactive')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Partner</h2>
          <p className="text-xs text-gray-500 mt-0.5">Reseller/channel entities used under Connection Type = Partner</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Partner</Button>
      </div>

      <div className="rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Share Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Share Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {partners.map(partner => (
              <tr key={partner.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{partner.name}</td>
                <td className="px-4 py-3.5">
                  <Badge variant={PARTNER_SHARE_TYPE_VARIANT[partner.shareType] || 'gray'} size="sm">{partner.shareType}</Badge>
                </td>
                <td className="px-4 py-3.5 text-gray-600">{formatShareValue(partner)}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{partner.contactNumber}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <SysConfigToggle checked={partner.status === 'Active'} onChange={v => handleStatusToggle(partner, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${partner.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{partner.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => openEdit(partner)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No partners added yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalPartner ? `Edit Partner — ${modalPartner.name}` : 'Add Partner'}
        size="lg"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{modalPartner ? 'Save Changes' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Partner Name" required error={errors.name}>
              <Input placeholder="e.g. Metro Broadband Partners" value={form.name} onChange={e => setField('name', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <div className="flex items-center gap-2.5 h-[38px]">
                <SysConfigToggle checked={form.status === 'Active'} onChange={v => setField('status', v ? 'Active' : 'Inactive')} />
                <span className="text-sm text-gray-600 whitespace-nowrap">{form.status}</span>
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Share Type" required>
              <div className="inline-flex rounded-lg border border-surface-border p-0.5 bg-gray-50">
                {SHARE_TYPES.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setField('shareType', opt)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all
                      ${form.shareType === opt ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Share Value" required error={errors.shareValue}>
              <div className="relative">
                {form.shareType === 'Fixed' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                )}
                <Input
                  type="number"
                  min={0}
                  max={form.shareType === 'Percentage' ? 100 : undefined}
                  step={form.shareType === 'Percentage' ? 1 : 0.01}
                  placeholder={form.shareType === 'Percentage' ? 'e.g. 15' : 'e.g. 500'}
                  value={form.shareValue}
                  onChange={e => setField('shareValue', e.target.value)}
                  className={form.shareType === 'Fixed' ? 'pl-7' : 'pr-8'}
                />
                {form.shareType === 'Percentage' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                )}
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Number" required error={errors.contactNumber}>
              <Input type="tel" placeholder="10-digit mobile number" maxLength={10} value={form.contactNumber} onChange={e => setField('contactNumber', e.target.value.replace(/\D/g, ''))} />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <Input type="email" placeholder="partner@company.in" value={form.email} onChange={e => setField('email', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Address">
            <Textarea rows={2} placeholder="Address (optional)" value={form.address} onChange={e => setField('address', e.target.value)} />
          </FormField>

          <Accordion title="Bank Details" subtitle="Mandatory if payouts are disbursed via bank transfer" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bank Name">
                <Input placeholder="e.g. Axis Bank" value={form.bankName} onChange={e => setField('bankName', e.target.value)} />
              </FormField>
              <FormField label="Account No.">
                <Input placeholder="Account number" value={form.accountNo} onChange={e => setField('accountNo', e.target.value)} />
              </FormField>
              <FormField label="IFSC">
                <Input placeholder="e.g. UTIB0000123" value={form.ifsc} onChange={e => setField('ifsc', e.target.value.toUpperCase())} className="font-mono uppercase" />
              </FormField>
            </div>
          </Accordion>
        </div>
      </Modal>

      {/* Success toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => tab !== undefined ? 'master-config' : 'general')

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration, integrations and access control</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => {
                if (id === 'master-config') { navigate('/settings/master-config/tenure'); setActiveTab(id) }
                else if (id === 'area-mapping') navigate('/settings/area-mapping')
                else { navigate('/settings'); setActiveTab(id) }
              }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5
                  ${activeTab === id
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                <Icon size={15} className={activeTab === id ? 'text-blue-200' : 'text-gray-400'} />
                {label}
              </button>
            ))}

            <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">System Configuration</p>
            {SYSTEM_CONFIG_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { navigate('/settings'); setActiveTab(id) }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5
                  ${activeTab === id
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                <Icon size={15} className={activeTab === id ? 'text-blue-200' : 'text-gray-400'} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content panel */}
        <div className="flex-1 bg-white rounded-xl shadow-card border border-surface-border p-6">
          {activeTab === 'general'       && <GeneralTab />}
          {activeTab === 'billing'       && <BillingTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'sla'           && <SlaConfigTab />}
          {activeTab === 'support-configuration' && <SupportConfigTab />}
          {activeTab === 'outage-configuration' && <OutageConfigTab />}
          {activeTab === 'jaze'          && <JazeServersTab />}
          {activeTab === 'zoho'          && <ZohoBooksTab />}
          {activeTab === 'roles'                && <RolesTab />}
          {activeTab === 'sales-configuration' && <SalesConfigTab />}
          {activeTab === 'zone'                && <ZoneTab />}
          {activeTab === 'master-config'       && <MasterConfigTab />}
          {activeTab === 'customer-type'       && <CustomerTypeTab />}
          {activeTab === 'company-entity'      && <CompanyEntityTab />}
          {activeTab === 'partner'             && <PartnerTab />}
          {false && activeTab === 'landline-numbers' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Landline Numbers</h2>
                  <p className="text-sm text-gray-500">Manage landline number pool</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBulkImportModal(true)} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    📥 Bulk Import
                  </button>
                  <button onClick={() => setAddLandlineModal(true)} className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
                    + Add Number
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total',     value: landlines.length,                                      color: 'text-gray-800' },
                  { label: 'Available', value: landlines.filter(l => l.status === 'Available').length, color: 'text-green-600' },
                  { label: 'Assigned',  value: landlines.filter(l => l.status === 'Assigned').length,  color: 'text-blue-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      {['Landline No','Status','Assigned To','Customer','Assigned Date','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {landlines.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-800">{l.number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              l.status === 'Available' ? 'bg-green-100 text-green-700' :
                              l.status === 'Assigned'  ? 'bg-blue-100 text-blue-700' :
                              l.status === 'Reserved'  ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                            }`}>{l.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{l.assignedTo || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{l.customer || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{l.assignedDate || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setLandlines(prev => prev.filter(x => x.id !== l.id))} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {addLandlineModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-800">Add Landline Number</h2>
                      <button onClick={() => setAddLandlineModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div><label className="text-xs font-medium text-gray-500 mb-1 block">Landline Number *</label>
                        <input value={landlineForm.number} onChange={e => setLandlineForm(f => ({...f, number: e.target.value}))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="+91-120-..." /></div>
                      <div><label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                        <select value={landlineForm.status} onChange={e => setLandlineForm(f => ({...f, status: e.target.value}))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                          <option>Available</option><option>Reserved</option>
                        </select></div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setAddLandlineModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                        <button onClick={() => {
                          if (!landlineForm.number) return
                          setLandlines(prev => [...prev, { id: Date.now(), ...landlineForm, assignedTo: null, customer: null, assignedDate: null }])
                          setAddLandlineModal(false)
                          setLandlineForm({ number: '', status: 'Available', notes: '' })
                        }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add Number</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {bulkImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-800">Bulk Import Numbers</h2>
                      <button onClick={() => setBulkImportModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="p-5 space-y-4">
                      <button className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-sm text-[#0A8DCD] hover:bg-blue-50">📥 Download Excel Template</button>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                        <p className="text-sm">Drop Excel file here or click to upload</p>
                        <p className="text-xs mt-1">Supports .xlsx, .csv</p>
                      </div>
                      <button onClick={() => setBulkImportModal(false)} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {false && activeTab === 'static-ip' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Static IP Management</h2>
                  <p className="text-sm text-gray-500">Manage static IP address pool</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBulkImportModal(true)} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📥 Bulk Import</button>
                  <button onClick={() => setAddIpModal(true)} className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">+ Add IP</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total',     value: staticIps.length,                                        color: 'text-gray-800' },
                  { label: 'Available', value: staticIps.filter(ip => ip.status === 'Available').length, color: 'text-green-600' },
                  { label: 'Assigned',  value: staticIps.filter(ip => ip.status === 'Assigned').length,  color: 'text-blue-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      {['IP Address','Subnet','Gateway','Status','Assigned To','Customer','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {staticIps.map(ip => (
                        <tr key={ip.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-800">{ip.ip}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{ip.subnet}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{ip.gateway}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              ip.status === 'Available' ? 'bg-green-100 text-green-700' :
                              ip.status === 'Assigned'  ? 'bg-blue-100 text-blue-700' :
                              ip.status === 'Reserved'  ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                            }`}>{ip.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{ip.assignedTo || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{ip.customer || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setStaticIps(prev => prev.filter(x => x.id !== ip.id))} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {addIpModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-800">Add Static IP</h2>
                      <button onClick={() => setAddIpModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="p-5 space-y-3">
                      {[
                        ['IP Address *',   'ip',      'e.g. 103.21.58.10'],
                        ['Subnet Mask *',  'subnet',  'e.g. 255.255.255.0'],
                        ['Gateway *',      'gateway', 'e.g. 103.21.58.1'],
                        ['DNS Primary',    'dns1',    'e.g. 8.8.8.8'],
                        ['DNS Secondary',  'dns2',    'e.g. 8.8.4.4'],
                      ].map(([label, key, placeholder]) => (
                        <div key={key}>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                          <input value={ipForm[key]} onChange={e => setIpForm(f => ({...f, [key]: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder={placeholder} />
                        </div>
                      ))}
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setAddIpModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                        <button onClick={() => {
                          if (!ipForm.ip) return
                          setStaticIps(prev => [...prev, { id: Date.now(), ...ipForm, status: 'Available', assignedTo: null, customer: null }])
                          setAddIpModal(false)
                          setIpForm({ ip: '', subnet: '', gateway: '', dns1: '', dns2: '', notes: '' })
                        }} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium">Add IP</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {bulkImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-800">Bulk Import IPs</h2>
                      <button onClick={() => setBulkImportModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="p-5 space-y-4">
                      <button className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-sm text-[#0A8DCD] hover:bg-blue-50">📥 Download Excel Template</button>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                        <p className="text-sm">Drop Excel file here or click to upload</p>
                        <p className="text-xs mt-1">Supports .xlsx, .csv</p>
                      </div>
                      <button onClick={() => setBulkImportModal(false)} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
