import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Wifi, WifiOff, Phone, Mail, MapPin, Eye, EyeOff,
  Ticket, MessageSquare, Ban, AlertTriangle, FileText, Download,
  CheckCircle, XCircle, Clock, Cpu, Activity, Radio,
  ChevronRight, Edit2, Plus, Signal, Network, Server, Copy,
  LayoutGrid, List,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'
import { CUSTOMERS as BASE_CUSTOMERS } from '../data/customersData'

// ── Mock customer dataset ────────────────────────────────────────────────────

const MOCK_CUSTOMERS = {
  'RES-2026-0001': {
    id: 'RES-2026-0001',
    name: 'Rajan Mehta',
    phone: '98765 43210',
    altPhone: '22 2678 9012',
    email: 'rajan.mehta@gmail.com',
    dob: '15 Mar 1982',
    gender: 'Male',
    status: 'active',
    online: true,
    services: ['Broadband', 'Landline', 'OTT'],
    outstandingDues: 1200,
    ekyc: 'verified',
    accountManager: 'Pradeep Kumar',
    createdOn: '10 Jan 2023',
    address: {
      area: 'Andheri',
      subArea: 'Lokhandwala',
      box: 'BOX-AW-14',
      street: 'Four Bungalows Road',
      building: 'Sai Darshan CHS, Flat 302',
      zone: 'Andheri West',
    },
    payment: {
      mode: 'NEFT / Bank Transfer',
      advanceDeposit: 2000,
      creditLimit: 5000,
      billingCycle: '1st of every month',
    },
    radius: {
      jazeUserId: 'rajan_mehta_cl1001',
      pppoeUsername: 'CL1001@cityline',
      pppoePassword: 'Rj@1001#Pass',
      nas: 'NAS-AW-01',
      interface: 'ge-0/0/2.0',
      ipAddress: '10.14.22.45',
      macAddress: 'A4:C3:F0:11:22:33',
    },
    kyc: {
      aadhaar: 'verified',
      pan: 'verified',
      photo: 'uploaded',
      agreementSigned: true,
    },
    notes: 'Customer prefers SMS reminders 3 days before renewal. Known contact - referred by CL-0892.',
  },
}

// Build a customer record from base data when full mock data is unavailable
function makeCustomerFromBase(id) {
  const base = BASE_CUSTOMERS.find(c => c.id === id)
  if (!base) {
    return {
      id, name: 'Unknown Customer', phone: '—', altPhone: '—', email: '—',
      dob: '—', gender: '—', status: 'inactive', online: false,
      services: [], outstandingDues: 0, ekyc: 'pending', accountManager: '—',
      createdOn: '—',
      address: { area: '—', subArea: '—', box: '—', street: '—', building: '—', zone: '—' },
      payment: { mode: '—', advanceDeposit: 0, creditLimit: 0, billingCycle: '—' },
      radius: { jazeUserId: '—', pppoeUsername: '—', pppoePassword: '—', nas: '—', interface: '—', ipAddress: '—', macAddress: '—' },
      kyc: { aadhaar: 'pending', pan: 'pending', photo: 'pending', agreementSigned: false },
      notes: '',
    }
  }
  const slug = base.name.toLowerCase().replace(/\s+/g, '.')
  const idSlug = base.id.replace('-', '').toLowerCase()
  return {
    id: base.id,
    name: base.name,
    phone: base.phone.replace(/(\d{5})(\d{5})/, '$1 $2'),
    altPhone: '—',
    email: `${slug}@email.com`,
    dob: '—',
    gender: '—',
    status: base.status,
    online: base.status === 'active',
    services: [],
    outstandingDues: 0,
    ekyc: base.status === 'active' ? 'verified' : 'pending',
    accountManager: 'Admin User',
    createdOn: '01 Jan 2023',
    address: { area: '—', subArea: '—', box: '—', street: '—', building: '—', zone: '—' },
    payment: { mode: 'UPI', advanceDeposit: 1000, creditLimit: 3000, billingCycle: '1st of every month' },
    radius: {
      jazeUserId: idSlug,
      pppoeUsername: `${base.id.replace('-', '')}@cityline`,
      pppoePassword: '—',
      nas: 'NAS-01',
      interface: '—',
      ipAddress: '—',
      macAddress: '—',
    },
    kyc: {
      aadhaar: base.status === 'active' ? 'verified' : 'pending',
      pan: base.status === 'active' ? 'verified' : 'pending',
      photo: base.status === 'active' ? 'uploaded' : 'pending',
      agreementSigned: base.status === 'active',
    },
    notes: '',
  }
}

// ── Per-tab mock data ────────────────────────────────────────────────────────

const PACKAGES = [
  {
    type: 'Broadband', icon: Wifi, iconBg: 'bg-brand-blue/10', iconColor: 'text-brand-blue',
    plan: 'FTTH 100Mbps', speed: '100 / 100 Mbps', validity: 30, daysUsed: 22, amount: 899,
    startDate: '01 May 2026', endDate: '31 May 2026', jazePkgId: 'JPKG-BB-100-M',
    status: 'active',
  },
  {
    type: 'Landline', icon: Phone, iconBg: 'bg-navy/10', iconColor: 'text-navy',
    plan: 'Unlimited Local + STD', speed: '—', validity: 30, daysUsed: 22, amount: 299,
    startDate: '01 May 2026', endDate: '31 May 2026', jazePkgId: 'JPKG-LL-UNL-M',
    status: 'active',
  },
  {
    type: 'OTT', icon: Activity, iconBg: 'bg-purple-100', iconColor: 'text-purple-700',
    plan: 'OTT Premium (Netflix + Prime)', speed: '4K Streaming', validity: 30, daysUsed: 22, amount: 199,
    startDate: '01 May 2026', endDate: '31 May 2026', jazePkgId: 'JPKG-OTT-PREM-M',
    status: 'active',
  },
]

const INVOICES = [
  { no: 'INV-2026-0451', pkg: 'Broadband + Landline + OTT', date: '01 May 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0312', pkg: 'Broadband + Landline + OTT', date: '01 Apr 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0189', pkg: 'Broadband + Landline + OTT', date: '01 Mar 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0088', pkg: 'Broadband + Landline + OTT', date: '01 Feb 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0052', pkg: 'Broadband',                   date: '01 Jan 2026', amount: 999,  status: 'paid' },
  { no: 'INV-2025-0987', pkg: 'Broadband',                   date: '01 Dec 2025', amount: 999,  status: 'paid' },
]

const LEDGER = [
  { date: '01 May 2026', description: 'Invoice #INV-2026-0451',     type: 'debit',  amount: 1499, balance: 1200 },
  { date: '28 Apr 2026', description: 'Payment received — NEFT',    type: 'credit', amount: 1499, balance: 2699 },
  { date: '01 Apr 2026', description: 'Invoice #INV-2026-0312',     type: 'debit',  amount: 1499, balance: 1200 },
  { date: '30 Mar 2026', description: 'Payment received — NEFT',    type: 'credit', amount: 1499, balance: 2699 },
  { date: '01 Mar 2026', description: 'Invoice #INV-2026-0189',     type: 'debit',  amount: 1499, balance: 1200 },
  { date: '27 Feb 2026', description: 'Advance deposit adjustment', type: 'credit', amount: 500,  balance: 2699 },
]

const TICKETS = [
  { id: 'TKT-2026-0812', subject: 'Slow speeds during evening hours', priority: 'P2', status: 'open',     created: '04 May 2026', otpPending: true },
  { id: 'TKT-2026-0634', subject: 'Landline not working',             priority: 'P1', status: 'resolved', created: '18 Apr 2026', otpPending: false },
  { id: 'TKT-2026-0441', subject: 'OTT app login issue',             priority: 'P3', status: 'closed',   created: '02 Mar 2026', otpPending: false },
  { id: 'TKT-2025-1201', subject: 'Router replacement request',      priority: 'P3', status: 'closed',   created: '10 Dec 2025', otpPending: false },
]

const INVENTORY = [
  { type: 'ONU / ONT', model: 'ZTE F670L',   serial: 'ZTEGCB3A12F4', mac: 'A4:C3:F0:11:22:33', signalRx: -18.4, signalTx: 2.1, port: 'OLT-AW-01 / PON-3 / Port-12', status: 'online' },
  { type: 'Router',    model: 'TP-Link C6',   serial: 'TPL2024WR0091', mac: 'D4:AD:BD:00:11:22', signalRx: null,  signalTx: null, port: 'LAN port of ONU',             status: 'online' },
]

const ACTIVITY = [
  { time: '06 May 2026 09:14', actor: 'System',          event: 'PPPoE session started',            meta: 'IP: 10.14.22.45' },
  { time: '05 May 2026 23:58', actor: 'System',          event: 'PPPoE session terminated',         meta: 'Duration: 14h 32m' },
  { time: '01 May 2026 10:00', actor: 'Billing Engine',  event: 'Invoice INV-2026-0451 generated',  meta: '₹1,499' },
  { time: '28 Apr 2026 15:33', actor: 'Pradeep Kumar',   event: 'Payment recorded',                 meta: '₹1,499 via NEFT' },
  { time: '04 May 2026 11:20', actor: 'Support Agent',   event: 'Ticket TKT-2026-0812 raised',      meta: 'Priority P2' },
  { time: '18 Apr 2026 14:05', actor: 'Support Agent',   event: 'Ticket TKT-2026-0634 resolved',    meta: 'Resolution: technician visit' },
  { time: '10 Jan 2023 10:00', actor: 'Admin',           event: 'Customer account created',         meta: 'By: Pradeep Kumar' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { variant: 'green',  label: 'Active' },
  suspended: { variant: 'yellow', label: 'Suspended' },
  inactive:  { variant: 'gray',   label: 'Inactive' },
  expired:   { variant: 'red',    label: 'Expired' },
}

const SERVICE_STYLE = {
  'Broadband':   'bg-brand-blue/10 text-brand-blue',
  'Landline':    'bg-navy/10 text-navy',
  'OTT':         'bg-purple-100 text-purple-700',
  'ILL':         'bg-brand-orange/10 text-brand-orange',
  'Intercom':    'bg-cyan-100 text-cyan-700',
  'Business BB': 'bg-emerald-100 text-emerald-700',
}

const PRIORITY_CFG = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-amber-100 text-amber-700',
  P3: 'bg-gray-100 text-gray-600',
}

const TICKET_STATUS_CFG = {
  open:     { variant: 'blue',  label: 'Open' },
  resolved: { variant: 'green', label: 'Resolved' },
  closed:   { variant: 'gray',  label: 'Closed' },
}

const KYC_STATUS = {
  verified: { icon: CheckCircle, color: 'text-emerald-600', label: 'Verified' },
  pending:  { icon: Clock,       color: 'text-amber-500',   label: 'Pending' },
  uploaded: { icon: CheckCircle, color: 'text-brand-blue',  label: 'Uploaded' },
}

const TABS = ['Profile', 'Package Details', 'Finance', 'Tickets', 'Inventory', 'Network Map', 'Activity Logs']

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ customer, notes, setNotes }) {
  const [showPass, setShowPass] = useState(false)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

      {/* Left col */}
      <div className="xl:col-span-2 space-y-5">

        {/* Personal details */}
        <Card>
          <CardHeader title="Personal Details" action={<Button variant="ghost" size="xs" icon={<Edit2 size={12} />}>Edit</Button>} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            {[
              ['Full Name',   customer.name],
              ['Phone',       customer.phone],
              ['Alt. Phone',  customer.altPhone],
              ['Email',       customer.email],
              ['Date of Birth', customer.dob],
              ['Gender',      customer.gender],
              ['Account Manager', customer.accountManager],
              ['Customer Since',  customer.createdOn],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-800 font-medium mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 6-level address */}
        <Card>
          <CardHeader title="Service Address" subtitle="6-level hierarchy" action={<Button variant="ghost" size="xs" icon={<Edit2 size={12} />}>Edit</Button>} />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[
              ['Area',     customer.address.area],
              ['Sub-Area', customer.address.subArea],
              ['Box',      customer.address.box],
              ['Street',   customer.address.street],
              ['Building', customer.address.building],
              ['Zone',     customer.address.zone],
            ].map(([level, val], i, arr) => (
              <span key={level} className="flex items-center gap-2">
                <span className="flex flex-col">
                  <span className="text-xs text-gray-400">{level}</span>
                  <span className="text-sm font-medium text-gray-800">{val}</span>
                </span>
                {i < arr.length - 1 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2 p-3 bg-surface rounded-lg border border-surface-border text-sm text-gray-600">
            <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <span>{customer.address.building}, {customer.address.street}, {customer.address.subArea}, {customer.address.area}, {customer.address.zone}</span>
          </div>
        </Card>

        {/* RADIUS / Jaze config */}
        <div className="rounded-xl overflow-hidden border border-navy/30">
          <div className="bg-navy px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={15} className="text-brand-blue" />
              <span className="text-sm font-semibold text-white">RADIUS / Jaze Configuration</span>
            </div>
            <Badge variant="blue" size="sm">Active Session</Badge>
          </div>
          <div className="bg-[#0c1f38] px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            {[
              ['Jaze User ID',    customer.radius.jazeUserId],
              ['PPPoE Username',  customer.radius.pppoeUsername],
              ['NAS',            customer.radius.nas],
              ['Interface',      customer.radius.interface],
              ['IP Address',     customer.radius.ipAddress],
              ['MAC Address',    customer.radius.macAddress],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 font-medium tracking-wide">{label}</p>
                <p className="text-sm text-white font-mono mt-0.5">{val}</p>
              </div>
            ))}
            {/* PPPoE password with show/hide */}
            <div className="col-span-full">
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-0.5">PPPoE Password</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-mono">
                  {showPass ? customer.radius.pppoePassword : '••••••••••••'}
                </span>
                <button
                  onClick={() => setShowPass(v => !v)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(customer.radius.pppoePassword)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & deposit */}
        <Card>
          <CardHeader title="Payment & Deposit Info" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Payment Mode',   customer.payment.mode],
              ['Advance Deposit','₹' + customer.payment.advanceDeposit.toLocaleString('en-IN')],
              ['Credit Limit',  '₹' + customer.payment.creditLimit.toLocaleString('en-IN')],
              ['Billing Cycle',  customer.payment.billingCycle],
            ].map(([label, val]) => (
              <div key={label} className="p-3 bg-surface rounded-lg border border-surface-border">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{val}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right col */}
      <div className="space-y-5">

        {/* KYC documents */}
        <Card>
          <CardHeader title="KYC Documents" />
          <div className="space-y-3">
            {[
              ['Aadhaar Card',      customer.kyc.aadhaar],
              ['PAN Card',          customer.kyc.pan],
              ['Customer Photo',    customer.kyc.photo],
              ['Agreement Signed',  customer.kyc.agreementSigned ? 'verified' : 'pending'],
            ].map(([doc, status]) => {
              const cfg = KYC_STATUS[status] ?? KYC_STATUS.pending
              const Icon = cfg.icon
              return (
                <div key={doc} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                  <span className="text-sm text-gray-700">{doc}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                    <Icon size={13} />
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" icon={<Ticket size={13} />} className="w-full justify-start">Raise Ticket</Button>
            <Button variant="secondary" size="sm" icon={<MessageSquare size={13} />} className="w-full justify-start">Send SMS</Button>
            <Button variant="secondary" size="sm" icon={<FileText size={13} />} className="w-full justify-start">View Invoice</Button>
            <Button variant="secondary" size="sm" icon={<Edit2 size={13} />} className="w-full justify-start">Edit Profile</Button>
          </div>
        </Card>

        {/* Internal notes */}
        <Card>
          <CardHeader title="Internal Notes" subtitle="Only visible to staff" />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="Add internal notes…"
            className="w-full text-sm text-gray-700 bg-surface border border-surface-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          <div className="flex justify-end mt-2">
            <Button size="xs">Save Note</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab: Package Details ─────────────────────────────────────────────────────

function PackagesTab() {
  const [view, setView] = useState('card')

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{PACKAGES.length} active subscription{PACKAGES.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          {/* Card / Table toggle */}
          <div className="flex items-center border border-surface-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('card')}
              className={`p-2 transition-colors ${view === 'card' ? 'bg-brand-blue text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-2 transition-colors ${view === 'table' ? 'bg-brand-blue text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <List size={14} />
            </button>
          </div>
          <Button size="sm" icon={<Plus size={13} />}>Add Service</Button>
        </div>
      </div>

      {/* ── Card View ── */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PACKAGES.map(pkg => {
            const Icon = pkg.icon
            const pct = Math.round((pkg.daysUsed / pkg.validity) * 100)
            const daysLeft = pkg.validity - pkg.daysUsed
            return (
              <Card key={pkg.type} className="flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${pkg.iconBg} ${pkg.iconColor} flex items-center justify-center`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{pkg.type}</p>
                      <p className="text-sm font-bold text-gray-900">{pkg.plan}</p>
                    </div>
                  </div>
                  <Badge variant="green" size="sm" dot>Active</Badge>
                </div>
                <div className="space-y-3 flex-1">
                  {pkg.speed !== '—' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Speed</span>
                      <span className="font-semibold text-gray-800">{pkg.speed}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tenure</span>
                    <span className="font-semibold text-gray-800">{pkg.validity} days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-800">₹{pkg.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500">{pkg.daysUsed} days used</span>
                      <span className={`font-semibold ${daysLeft <= 5 ? 'text-red-500' : daysLeft <= 10 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {daysLeft} days left
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-surface rounded-lg border border-surface-border">
                      <p className="text-gray-400">Start</p>
                      <p className="font-medium text-gray-700">{pkg.startDate}</p>
                    </div>
                    <div className="p-2 bg-surface rounded-lg border border-surface-border">
                      <p className="text-gray-400">End</p>
                      <p className="font-medium text-gray-700">{pkg.endDate}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-surface rounded-lg border border-surface-border text-xs">
                    <span className="text-gray-400">Jaze B/W Package ID: </span>
                    <span className="font-mono font-semibold text-navy">{pkg.jazePkgId}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-surface-border">
                  <Button variant="secondary" size="xs" className="flex-1">Renew</Button>
                  <Button variant="ghost"     size="xs" className="flex-1">Modify</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-surface-border text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {['Service','Package Name','Bandwidth / Speed','Tenure','Amount','Start Date','End Date','Status','Actions'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-5' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {PACKAGES.map(pkg => {
                  const Icon = pkg.icon
                  return (
                    <tr key={pkg.type} className="hover:bg-gray-50/60 transition-colors">
                      {/* Service */}
                      <td className="pl-5 pr-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${pkg.iconBg} ${pkg.iconColor} flex items-center justify-center shrink-0`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{pkg.type}</span>
                        </div>
                      </td>
                      {/* Package Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-800">{pkg.plan}</span>
                      </td>
                      {/* Bandwidth / Speed */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{pkg.speed}</span>
                      </td>
                      {/* Tenure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{pkg.validity} days</span>
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-800">₹{pkg.amount.toLocaleString('en-IN')}</span>
                      </td>
                      {/* Start Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{pkg.startDate}</span>
                      </td>
                      {/* End Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{pkg.endDate}</span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="green" size="sm" dot>Active</Badge>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Button variant="secondary" size="xs">Renew</Button>
                          <Button variant="ghost" size="xs">Modify</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Finance ─────────────────────────────────────────────────────────────

function FinanceTab({ customer }) {
  const totalPaid = INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid (YTD)', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Outstanding Dues', value: `₹${customer.outstandingDues.toLocaleString('en-IN')}`, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          { label: 'Advance Deposit',  value: `₹${customer.payment.advanceDeposit.toLocaleString('en-IN')}`, color: 'text-brand-blue', bg: 'bg-brand-blue/5 border-brand-blue/10' },
          { label: 'Credit Limit',    value: `₹${customer.payment.creditLimit.toLocaleString('en-IN')}`, color: 'text-navy', bg: 'bg-navy/5 border-navy/10' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 border ${c.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Invoices</h3>
          <Button variant="secondary" size="xs" icon={<Download size={12} />}>Export</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Invoice No', 'Package', 'Date', 'Amount', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {INVOICES.map(inv => (
                <tr key={inv.no} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold">{inv.no}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{inv.pkg}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{inv.date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inv.status === 'paid' ? 'green' : 'yellow'} size="sm" dot>
                      {inv.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-brand-blue hover:underline flex items-center gap-1 ml-auto">
                      <FileText size={12} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Ledger */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Account Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Date', 'Description', 'Type', 'Amount', 'Balance'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {LEDGER.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{entry.date}</td>
                  <td className="px-4 py-3 text-gray-700 text-sm">{entry.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${entry.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {entry.type === 'credit' ? '▲' : '▼'} {entry.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold text-sm ${entry.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800 text-sm">₹{entry.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Tab: Tickets ─────────────────────────────────────────────────────────────

function TicketsTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{TICKETS.length} tickets</p>
        <Button size="sm" icon={<Plus size={13} />}>Raise Ticket</Button>
      </div>
      <div className="space-y-3">
        {TICKETS.map(t => {
          const sc = TICKET_STATUS_CFG[t.status] ?? TICKET_STATUS_CFG.closed
          return (
            <Card key={t.id} className="hover:shadow-card-hover transition-shadow cursor-pointer" padding={false}>
              <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_CFG[t.priority]}`}>{t.priority}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.id} · Raised {t.created}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.otpPending && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Clock size={11} /> OTP Pending
                    </span>
                  )}
                  <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Inventory ───────────────────────────────────────────────────────────

function InventoryTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{INVENTORY.length} deployed device{INVENTORY.length !== 1 ? 's' : ''}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INVENTORY.map((item, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
                  <Cpu size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{item.type}</p>
                  <p className="text-sm font-bold text-gray-900">{item.model}</p>
                </div>
              </div>
              <Badge variant={item.status === 'online' ? 'green' : 'red'} dot size="sm">
                {item.status === 'online' ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ['Serial No.',   item.serial],
                ['MAC Address',  item.mac],
                ['Port / Path',  item.port],
              ].map(([label, val]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-gray-400 text-xs shrink-0">{label}</span>
                  <span className="text-gray-700 font-mono text-xs text-right">{val}</span>
                </div>
              ))}
              {item.signalRx !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Signal Rx</span>
                    <span className={`font-semibold text-xs ${item.signalRx < -25 ? 'text-red-500' : item.signalRx < -20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {item.signalRx} dBm
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Signal Tx</span>
                    <span className="font-semibold text-xs text-gray-700">{item.signalTx} dBm</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Network Map ─────────────────────────────────────────────────────────

function NetworkMapTab({ customer }) {
  const nodes = [
    { label: 'Customer CPE',    sub: customer.radius.macAddress, icon: Wifi,    color: 'text-brand-blue', bg: 'bg-brand-blue/10', active: true },
    { label: 'ONU / ONT',       sub: 'ZTE F670L · ZTEGCB3A12F4', icon: Radio,   color: 'text-emerald-600', bg: 'bg-emerald-50', active: true },
    { label: 'Splitter',        sub: '1×8 · BOX-AW-14',          icon: Network, color: 'text-amber-600',  bg: 'bg-amber-50',  active: true },
    { label: 'OLT',             sub: 'OLT-AW-01 / PON-3',        icon: Server,  color: 'text-navy',       bg: 'bg-navy/10',   active: true },
    { label: 'Jaze RADIUS',     sub: 'NAS-AW-01 · 10.14.22.45',  icon: Signal,  color: 'text-purple-600', bg: 'bg-purple-100', active: true },
  ]
  return (
    <Card>
      <CardHeader title="Network Path" subtitle="Signal flow: Customer → Core" />
      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto py-4">
        {nodes.map((node, i) => {
          const Icon = node.icon
          return (
            <div key={node.label} className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl ${node.bg} ${node.color} flex items-center justify-center mb-2 shadow-sm`}>
                  <Icon size={22} />
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-tight">{node.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 max-w-[100px] leading-tight">{node.sub}</p>
                {node.active && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Online
                  </span>
                )}
              </div>
              {i < nodes.length - 1 && (
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <div className="w-10 h-px bg-gray-200 relative">
                    <ChevronRight size={12} className="absolute -right-1.5 -top-1.5 text-gray-300" />
                  </div>
                  <span className="text-xs text-gray-300 mt-0.5">Fiber</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Mobile: vertical */}
      <div className="flex md:hidden flex-col gap-0">
        {nodes.map((node, i) => {
          const Icon = node.icon
          return (
            <div key={node.label}>
              <div className="flex items-center gap-3 py-3">
                <div className={`w-10 h-10 rounded-xl ${node.bg} ${node.color} flex items-center justify-center shrink-0`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{node.label}</p>
                  <p className="text-xs text-gray-400">{node.sub}</p>
                </div>
                {node.active && <Badge variant="green" size="sm" dot className="ml-auto">Online</Badge>}
              </div>
              {i < nodes.length - 1 && <div className="ml-5 w-px h-4 bg-gray-200" />}
            </div>
          )
        })}
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Signal Rx',   value: '-18.4 dBm', color: 'text-emerald-600' },
          { label: 'Signal Tx',   value: '+2.1 dBm',  color: 'text-emerald-600' },
          { label: 'Session Time',value: '9h 14m',     color: 'text-brand-blue' },
          { label: 'IP Address',  value: customer.radius.ipAddress, color: 'text-navy' },
        ].map(m => (
          <div key={m.label} className="p-3 bg-surface rounded-lg border border-surface-border text-center">
            <p className="text-xs text-gray-400">{m.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Tab: Activity Logs ───────────────────────────────────────────────────────

function ActivityTab() {
  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">Audit Trail</h3>
      </div>
      <div className="divide-y divide-surface-border">
        {ACTIVITY.map((entry, i) => (
          <div key={i} className="px-5 py-3.5 flex items-start gap-4 hover:bg-gray-50/50">
            <div className="shrink-0 w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center mt-0.5">
              <Activity size={10} className="text-brand-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-gray-800">{entry.event}</span>
                {entry.meta && <span className="text-xs text-gray-400">— {entry.meta}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{entry.time}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs font-medium text-gray-500">{entry.actor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const customer = MOCK_CUSTOMERS[id] ?? makeCustomerFromBase(id)

  const [activeTab, setActiveTab] = useState('Profile')
  const [notes, setNotes]         = useState(customer.notes)

  const statusCfg = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive

  return (
    <div className="p-6 max-w-[1400px] space-y-5">

      {/* ── Back nav ── */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors"
      >
        <ArrowLeft size={15} /> Back to Customers
      </button>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        {/* Navy accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md">
              {customer.name.charAt(0)}
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
                <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
                <span className={`flex items-center gap-1 text-xs font-medium ${customer.online ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {customer.online ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {customer.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-mono font-semibold text-brand-blue">{customer.id}</span>
                <span className="mx-2 text-gray-300">·</span>
                {customer.phone}
                <span className="mx-2 text-gray-300">·</span>
                {customer.email}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customer.services.map(s => (
                  <span key={s} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SERVICE_STYLE[s] ?? 'bg-gray-100 text-gray-600'}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats + actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Outstanding dues */}
              <div className="text-center px-4 py-2 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">Outstanding</p>
                <p className={`text-base font-bold ${customer.outstandingDues > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ₹{customer.outstandingDues.toLocaleString('en-IN')}
                </p>
              </div>
              {/* eKYC */}
              <div className="text-center px-4 py-2 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">eKYC</p>
                <p className={`text-sm font-bold capitalize ${customer.ekyc === 'verified' ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {customer.ekyc}
                </p>
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-border">
            <Button variant="secondary" size="sm" icon={<Ticket size={13} />}>Raise Ticket</Button>
            <Button variant="secondary" size="sm" icon={<MessageSquare size={13} />}>Send SMS</Button>
            <Button variant="orange"    size="sm" icon={<Ban size={13} />}>Suspend</Button>
            <Button variant="danger"    size="sm" icon={<AlertTriangle size={13} />}>Terminate</Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        {/* Tab nav */}
        <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                ${activeTab === tab
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 sm:p-6">
          {activeTab === 'Profile'         && <ProfileTab  customer={customer} notes={notes} setNotes={setNotes} />}
          {activeTab === 'Package Details' && <PackagesTab />}
          {activeTab === 'Finance'         && <FinanceTab  customer={customer} />}
          {activeTab === 'Tickets'         && <TicketsTab />}
          {activeTab === 'Inventory'       && <InventoryTab />}
          {activeTab === 'Network Map'     && <NetworkMapTab customer={customer} />}
          {activeTab === 'Activity Logs'   && <ActivityTab />}
        </div>
      </div>
    </div>
  )
}
