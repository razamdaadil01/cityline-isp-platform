import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save, Plus, Edit2, Trash2, Server, Key, Bell,
  Building2, Receipt, Shield, RefreshCw, Check,
  BookOpen, Webhook, MapPin, ClipboardCheck, ChevronRight, ChevronLeft,
  Layers, FileText, MoreVertical, Map,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { setSalesPermission } from '../data/salesPermissionStore'

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',             label: 'General',               icon: Building2 },
  { id: 'billing',             label: 'Billing',               icon: Receipt   },
  { id: 'notifications',       label: 'Notifications',         icon: Bell      },
  { id: 'jaze-servers',        label: 'Jaze Servers',          icon: Server    },
  { id: 'zoho-books',          label: 'Zoho Books',            icon: BookOpen  },
  { id: 'sales-configuration', label: 'Sales Configuration',   icon: Layers    },
  { id: 'roles',               label: 'Roles & Permissions',   icon: Shield    },
  { id: 'area-mapping',        label: 'Area Mapping',          icon: MapPin    },
  { id: 'zone',               label: 'Zone',                  icon: Map       },
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
  super_admin: { Dashboard: 'full', Customers: 'full', Sales: 'full',     Billing: 'full', Support: 'full', Network: 'full', Inventory: 'full', Reports: 'full', Settings: 'full' },
  admin:       { Dashboard: 'full', Customers: 'full', Sales: 'full',     Billing: 'full', Support: 'full', Network: 'full', Inventory: 'full', Reports: 'full', Settings: 'view' },
  billing:     { Dashboard: 'view', Customers: 'view', Sales: 'view_all', Billing: 'full', Support: 'none', Network: 'none', Inventory: 'view', Reports: 'view', Settings: 'none' },
  support:     { Dashboard: 'view', Customers: 'view', Sales: 'none',     Billing: 'view', Support: 'full', Network: 'view', Inventory: 'view', Reports: 'none', Settings: 'none' },
  engineer:    { Dashboard: 'view', Customers: 'view', Sales: 'view_my',  Billing: 'none', Support: 'view', Network: 'view', Inventory: 'full', Reports: 'none', Settings: 'none' },
  readonly:    { Dashboard: 'view', Customers: 'view', Sales: 'view_all', Billing: 'view', Support: 'view', Network: 'view', Inventory: 'view', Reports: 'view', Settings: 'none' },
}

const STD_OPTIONS = [
  { value: 'full', label: 'Full Access' },
  { value: 'view', label: 'View Only'   },
  { value: 'none', label: 'No Access'   },
]

const SALES_OPTIONS = [
  { value: 'full',     label: 'Full Access'        },
  { value: 'view_all', label: 'View All Leads'     },
  { value: 'view_my',  label: 'View My Leads Only' },
  { value: 'none',     label: 'No Access'          },
]

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
  const [perms, setPerms]           = useState(() => JSON.parse(JSON.stringify(PERMISSIONS)))
  const [saved, setSaved]           = useState(false)

  const role = ROLES.find(r => r.id === activeRole)

  function handleSave() {
    setSalesPermission(perms['admin']?.Sales ?? 'full')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleReset() {
    setPerms(JSON.parse(JSON.stringify(PERMISSIONS)))
  }

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
              const perm    = perms[activeRole]?.[mod] ?? 'none'
              const options = mod === 'Sales' ? SALES_OPTIONS : STD_OPTIONS
              return (
                <div key={mod} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-gray-700">{mod}</span>
                  <select
                    value={perm}
                    onChange={e => setPerms(prev => ({
                      ...prev,
                      [activeRole]: { ...prev[activeRole], [mod]: e.target.value },
                    }))}
                    className="text-sm border border-surface-border rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                  >
                    {options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-4 border-t border-surface-border flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleReset}>Reset</Button>
            <Button
              size="sm"
              icon={saved ? <Check size={14} /> : <Save size={14} />}
              onClick={handleSave}
            >
              {saved ? 'Saved!' : 'Save Permissions'}
            </Button>
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

      <div>
        <button
          onClick={() => navigate('/settings/area-mapping/manage')}
          className="flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-brand-blue/40 hover:bg-blue-50/30 transition-all group text-left w-full max-w-sm"
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
      </div>

      <div className="rounded-xl border border-surface-border bg-gray-50/50 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">How it works</p>
        <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
          <li>Add states, districts, areas, localities and sub-localities in <strong className="text-gray-700">Manage Area Mapping</strong>.</li>
          <li>When a lead is created, the address dropdowns are powered by this mapping.</li>
          <li>If a sub-locality isn&apos;t in the mapping, the agent can flag it as <strong className="text-gray-700">Feasibility Required</strong>.</li>
          <li>Feasibility requests can be reviewed under <strong className="text-gray-700">Sales &amp; Leads → Feasibility Requests</strong>.</li>
        </ol>
      </div>
    </div>
  )
}

// ── Sales Configuration Tab ───────────────────────────────────────────────────

function SalesConfigTab() {
  const navigate = useNavigate()
  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-gray-900">Sales Configuration</h2>
        <p className="text-xs text-gray-500 mt-1">Manage pipelines, stages and lead form fields</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/settings/sales-configuration/pipelines')}
          className="flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-brand-blue/40 hover:bg-blue-50/30 transition-all group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center shrink-0">
              <Layers size={18} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Pipeline Builder</p>
              <p className="text-xs text-gray-400 mt-0.5">Create and manage sales pipelines and stages</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-blue transition-colors" />
        </button>

        <button
          onClick={() => navigate('/settings/sales-configuration/stage-fields')}
          className="flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-brand-blue/40 hover:bg-blue-50/30 transition-all group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={18} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Stage Fields</p>
              <p className="text-xs text-gray-400 mt-0.5">Fields configured for each pipeline stage</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-blue transition-colors" />
        </button>
      </div>
    </div>
  )
}

// ── Zone Tab ──────────────────────────────────────────────────────────────────

const INIT_ZONES = [
  { id: 1, custType: 'Cityline', name: 'Andheri West', zoneId: 'ZN-001', url: 'https://ops.citylinenetworks.in/api/v1', username: 'citylinewest01',  password: 'Pass@1234',  addedDate: '10/01/2025' },
  { id: 2, custType: 'Partner',  name: 'Bandra East',  zoneId: 'ZN-002', url: 'https://ops.citylinenetworks.in/api/v1', username: 'partnerbandra',   password: 'Bandra@567', addedDate: '15/02/2025' },
  { id: 3, custType: 'Cityline', name: 'Versova',      zoneId: 'ZN-003', url: 'https://ops.citylinenetworks.in/api/v1', username: 'citylineversova', password: 'Vers@890',   addedDate: '20/03/2025' },
]

const EMPTY_ZONE_FORM = { custType: 'Cityline', name: '', zoneId: '', url: '', username: '', password: '' }

function ZoneTab() {
  const PER_PAGE = 10

  const [zones, setZones]         = useState(INIT_ZONES)
  const [showAdd, setShowAdd]     = useState(false)
  const [menuId, setMenuId]       = useState(null)
  const [menuPos, setMenuPos]     = useState({ top: 0, right: 0 })
  const menuRef                   = useRef(null)
  const [form, setForm]           = useState(EMPTY_ZONE_FORM)
  const [showPw, setShowPw]       = useState(false)
  const [revealId, setRevealId]   = useState(null)
  const [page, setPage]           = useState(1)

  const totalPages  = Math.max(1, Math.ceil(zones.length / PER_PAGE))
  const paginated   = zones.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const zf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openMenu(e, id) {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  useEffect(() => {
    if (!menuId) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuId])

  function handleRemove(id) {
    setZones(z => z.filter(x => x.id !== id))
    setMenuId(null)
  }

  function handleSave() {
    const next = { ...form, id: Date.now(), addedDate: new Date().toLocaleDateString('en-GB') }
    setZones(z => [...z, next])
    setShowAdd(false)
    setForm(EMPTY_ZONE_FORM)
    setShowPw(false)
    setPage(Math.ceil((zones.length + 1) / PER_PAGE))
  }

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Zone Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage service zones for your network</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setForm(EMPTY_ZONE_FORM); setShowPw(false); setShowAdd(true) }}>Add Zone</Button>
      </div>

      <div className="rounded-xl border border-surface-border min-w-0">
        <div className="overflow-x-auto">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: '1020px' }}>
          <colgroup>
            <col style={{ width: 50 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 70 }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              {['S.NO', 'CUSTOMER TYPE', 'ZONE NAME', 'ZONE ID', 'ZONE IP/URL', 'USERNAME', 'PASSWORD', 'ADDED DATE', 'ACTIONS'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {paginated.map((z, i) => (
              <tr key={z.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-3 py-3 text-gray-500 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    z.custType === 'Cityline' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>{z.custType}</span>
                </td>
                <td className="px-3 py-3 font-medium text-gray-900 truncate">{z.name}</td>
                <td className="px-3 py-3 font-mono text-xs text-gray-600 truncate">{z.zoneId}</td>
                <td className="px-3 py-3 text-xs text-gray-600 truncate" title={z.url}>{z.url}</td>
                <td className="px-3 py-3 text-xs text-gray-700 font-mono truncate">{z.username}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-gray-600 truncate">
                      {revealId === z.id ? z.password : '••••••••'}
                    </span>
                    <button
                      onClick={() => setRevealId(revealId === z.id ? null : z.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      {revealId === z.id
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-500 text-xs">{z.addedDate}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={e => openMenu(e, z.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
          <p className="text-xs text-gray-500">
            Showing {zones.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, zones.length)} of {zones.length} zones
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${p === page ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3-dot dropdown */}
      {menuId && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 50 }}
          className="w-52 bg-white rounded-xl shadow-lg border border-surface-border py-1 text-sm">
          <button
            onClick={() => setMenuId(null)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">
            Active
          </button>
          <button
            onClick={() => setMenuId(null)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">
            Edit
          </button>
          <button
            onClick={() => handleRemove(menuId)}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-500">
            Remove
          </button>
          <button
            onClick={() => setMenuId(null)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">
            Check Recharge Status
          </button>
        </div>
      )}

      {/* Add Zone Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Zone"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="sm" icon={<Save size={14} />} onClick={handleSave}>Save Zone</Button>
        </>}>
        <div className="space-y-4">
          <FormField label="Customer Type" required>
            <Select value={form.custType} onChange={e => zf('custType', e.target.value)}>
              <option value="Cityline">Cityline</option>
              <option value="Partner">Partner</option>
            </Select>
          </FormField>
          <FormField label="Zone Name" required>
            <Input placeholder="e.g. Andheri West" value={form.name} onChange={e => zf('name', e.target.value)} />
          </FormField>
          <FormField label="Zone ID" required>
            <Input placeholder="e.g. ZN-001" value={form.zoneId} onChange={e => zf('zoneId', e.target.value)} />
          </FormField>
          <FormField label="Zone IP/URL" required>
            <Input placeholder="https://zone.citylinenetworks.in" value={form.url} onChange={e => zf('url', e.target.value)} />
          </FormField>
          <FormField label="Username" required>
            <Input placeholder="username" value={form.username} onChange={e => zf('username', e.target.value)} />
          </FormField>
          <FormField label="Password" required>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="password"
                value={form.password}
                onChange={e => zf('password', e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw
                  ? <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = tab ?? 'general'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration, integrations and access control</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => navigate(`/settings/${id}`)}
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
          {activeTab === 'general'             && <GeneralTab />}
          {activeTab === 'billing'             && <BillingTab />}
          {activeTab === 'notifications'       && <NotificationsTab />}
          {activeTab === 'jaze-servers'        && <JazeServersTab />}
          {activeTab === 'zoho-books'          && <ZohoBooksTab />}
          {activeTab === 'sales-configuration' && <SalesConfigTab />}
          {activeTab === 'roles'               && <RolesTab />}
          {activeTab === 'area-mapping'        && <AreaMappingTab />}
          {activeTab === 'zone'               && <ZoneTab />}
        </div>
      </div>
    </div>
  )
}
