import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Save, Plus, Edit2, Trash2, Server, Key, Bell,
  Building2, Receipt, Shield, RefreshCw, Check,
  BookOpen, Webhook, MapPin, ClipboardCheck, ChevronRight,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',       label: 'General',               icon: Building2      },
  { id: 'billing',       label: 'Billing',               icon: Receipt        },
  { id: 'notifications', label: 'Notifications',         icon: Bell           },
  { id: 'jaze',          label: 'Jaze Servers',          icon: Server         },
  { id: 'zoho',          label: 'Zoho Books',            icon: BookOpen       },
  { id: 'roles',         label: 'Roles & Permissions',   icon: Shield         },
  { id: 'area-mapping',  label: 'Area Mapping',          icon: MapPin         },
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

// ── Area Mapping Tab ──────────────────────────────────────────────────────────

function AreaMappingTab() {
  const navigate = useNavigate()
  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Area Mapping</h2>
        <p className="text-xs text-gray-500 mt-1">Manage service areas, localities and feasibility settings for lead address selection</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/settings/area-mapping')}
          className="flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-brand-blue/40 hover:bg-blue-50/30 transition-all group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Manage Area Mapping</p>
              <p className="text-xs text-gray-400 mt-0.5">States, districts, areas, localities &amp; sub localities</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-blue transition-colors" />
        </button>

        <button
          onClick={() => navigate('/settings/feasibility-requests')}
          className="flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-brand-orange/40 hover:bg-orange-50/30 transition-all group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardCheck size={18} className="text-brand-orange" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Feasibility Requests</p>
              <p className="text-xs text-gray-400 mt-0.5">Review and update pending feasibility checks</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-orange transition-colors" />
        </button>
      </div>

      <div className="rounded-xl border border-surface-border bg-gray-50/50 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">How it works</p>
        <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
          <li>Add states, districts, areas, localities and sub-localities in <strong className="text-gray-700">Manage Area Mapping</strong>.</li>
          <li>When a lead is created, the address dropdowns are powered by this mapping.</li>
          <li>If a sub-locality isn&apos;t in the mapping, the agent can flag it as <strong className="text-gray-700">Feasibility Required</strong>.</li>
          <li>Admin reviews and updates those requests in <strong className="text-gray-700">Feasibility Requests</strong>.</li>
        </ol>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

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
              <button key={id} onClick={() => setActiveTab(id)}
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
          {activeTab === 'jaze'          && <JazeServersTab />}
          {activeTab === 'zoho'          && <ZohoBooksTab />}
          {activeTab === 'roles'         && <RolesTab />}
          {activeTab === 'area-mapping'  && <AreaMappingTab />}
        </div>
      </div>
    </div>
  )
}
