import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  ArrowLeft, Wifi, WifiOff, Phone, Mail, MapPin, Eye, EyeOff,
  Ticket, MessageSquare, Ban, AlertTriangle, FileText, Download,
  CheckCircle, XCircle, Clock, Cpu, Activity, Radio,
  ChevronRight, Edit2, Plus, Signal, Network, Server, Copy,
  LayoutGrid, List, RotateCcw, AlertOctagon, Zap, RefreshCw, MoreVertical, X,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { getAllCustomers } from '../data/customersData'

// ── Mock customer dataset ────────────────────────────────────────────────────

const MOCK_CUSTOMERS = {
  'RES-2026-0001': {
    id: 'RES-2026-0001',
    name: 'Rajan Mehta',
    phone: '98765 43210',
    altPhone: '22 2678 9012',
    telephone: '022-26789012',
    email: 'rajan.mehta@gmail.com',
    dob: '15 Mar 1982',
    gender: 'Male',
    sonOf: 'Mohan Mehta',
    gstNo: '27AABCM1234D1Z5',
    panCard: 'AABCM1234D',
    customerType: 'Individual',
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
      olt: 'OLT-AW-02',
      splitter: 'SPL-14-B',
      port: 'Port 06',
      billingState: 'Maharashtra',
      billingCity: 'Mumbai',
      billingPincode: '400053',
      billingLandmark: 'Near D-Mart',
      billingAddress: 'Sai Darshan CHS, Flat 302, Four Bungalows Road',
      installState: 'Maharashtra',
      installCity: 'Mumbai',
      installPincode: '400053',
      installLandmark: 'Near D-Mart',
      installAddress: 'Sai Darshan CHS, Flat 302, Four Bungalows Road',
    },
    connection: {
      type: 'FTTH',
      serverType: 'CNPL_B2C',
      ipacctId: '704341139412544',
      nasInterface: 'BNG:ANDHERIWEST:166:1031',
      url: 'https://portal.citylinenetworks.in/u/rajan_mehta_cl1001',
      sbtNo: 'SBT-2023-0014',
      circuitId: 'CKT-AW-14-0302',
      vcNo: 'VC-AW-0301',
      macId: 'A4:C3:F0:11:22:33',
      serialNo: 'ONU-AW14-20230110',
      aEnd: 'Andheri West OLT',
      bEnd: 'Customer Premises',
      prorataBilling: 'No',
    },
    payment: {
      mode: 'NEFT / Bank Transfer',
      advanceDeposit: 2000,
      creditLimit: 5000,
      billingCycle: '1st of every month',
      installationAmount: 1000,
      securityDeposit: 1000,
      installHardware: 'ONU + Router',
      invoiceDueDays: 7,
      refundTerms: '30 days after termination',
      refundSecurity: 'Yes',
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
    sales: {
      executive: 'Pradeep Kumar',
      areaSalesManager: 'Vikram Patil',
      billingAccountManager: 'Anita Sharma',
      installationBy: 'Suresh Babu',
      registrationDate: '10-01-2023 10:35 AM',
      dueDays: 1,
      leadSource: 'Referral',
      remark: 'Customer referred by existing subscriber CL-0892. Prefers SMS reminders.',
    },
    kyc: {
      aadhaar: 'verified',
      pan: 'verified',
      photo: 'uploaded',
      agreementSigned: true,
      idProofType: 'Aadhaar Card',
      addressProofType: 'Utility Bill',
      signatureUploaded: true,
      docVerified: true,
      docComment: 'All documents verified on 12-01-2023 by Admin.',
    },
    notes: 'Customer prefers SMS reminders 3 days before renewal. Known contact - referred by CL-0892.',
  },
}

// Build a customer record from base data when full mock data is unavailable
function makeCustomerFromBase(id) {
  const base = getAllCustomers().find(c => c.id === id)
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
  const idSlug = base.id.replace('-', '').toLowerCase()
  // ENT- customers are Corporate accounts and carry a GST No. + verification
  // status (customersData.js); Residential (RES-) customers have neither, so
  // customerType/gstNo/gstVerified are left unset for them — unchanged from
  // today's behavior (Customer Type/GST No. fields render as "—"). Customers
  // converted from a Won lead (leadConversion.js) carry their own
  // customerType ('Individual'/'Corporate') directly on the base record.
  const isCorporate = base.id.startsWith('ENT') || base.customerType === 'Corporate'
  return {
    id: base.id,
    name: base.name,
    phone: base.phone.replace(/(\d{5})(\d{5})/, '$1 $2'),
    altPhone: base.altPhone ?? '—',
    // Was silently fabricating a fake "<name-slug>@email.com" when the
    // record had no real email — the 29 static RES- seed records never
    // set one, so every one of them showed a made-up address as if it
    // were real. Falls back to "—" now, consistent with every other
    // missing field on this page.
    email: base.email ?? '—',
    dob: base.dob ?? '—',
    gender: base.gender ?? '—',
    sonOf: base.sonOf,
    panCard: base.panCard,
    profilePicture: base.profilePicture,
    sourceLeadId: base.sourceLeadId ?? null,
    ...(isCorporate
      ? {
          customerType: 'Corporate',
          gstNo: base.gstNo ?? '—',
          gstVerified: !!base.gstVerified,
          // Legal Company Name/Contact Person/GST Type/Accounts & Technical
          // Contact — only ever present on customers converted from a Won
          // Corporate lead (leadConversion.js) or a base record that's had
          // them added directly; passed through as-is like address/
          // connection/sales below, since InfoField already renders a
          // missing value as "—".
          companyName: base.companyName,
          contactPersonName: base.contactPersonName,
          contactPersonEmail: base.contactPersonEmail,
          gstType: base.gstType,
          accountsContact: base.accountsContact,
          technicalContact: base.technicalContact,
        }
      : (base.customerType ? { customerType: base.customerType } : {})),
    status: base.status,
    online: base.status === 'active',
    services: base.services ?? [],
    circuit: base.circuit ?? null,
    outstandingDues: 0,
    ekyc: base.status === 'active' ? 'verified' : 'pending',
    accountManager: base.accountManager ?? 'Admin User',
    createdOn: base.createdOn ?? '01 Jan 2023',
    // Customers converted from a lead (leadConversion.js) carry a real
    // address object — pass it through as-is; base-only customersData.js
    // rows never have one, so the placeholder defaults below are unchanged
    // for them. `zone` is handled separately: the raw record's top-level
    // `zone` (customersData.js, e.g. used by the Customers List table) was
    // never actually read onto the returned customer object here, so it
    // silently went unused on this page even though it's real, non-fake
    // data — and buildCustomerFromLead sets a top-level `zone` on converted
    // customers too, but never an `address.zone`. Chosen fix: fall back to
    // it explicitly (base.address?.zone, then base.zone, then "—") rather
    // than leave it dead — low risk since it only affects this one field,
    // and an explicit address.zone (if one's ever set) still wins.
    address: {
      area: '—', subArea: '—', box: '—', street: '—', building: '—',
      ...base.address,
      zone: base.address?.zone ?? base.zone ?? '—',
    },
    connection: base.connection ?? {},
    ownership: base.ownership ?? {},
    sales: base.sales ?? {},
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
    notes: base.notes ?? '',
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

const TABS = ['Profile', 'Package Details', 'Finance', 'Tickets', 'Inventory', 'Network Map', 'TR-069', 'Recordings', 'Activity Logs']

const TAB_SLUGS = {
  'Profile':         'profile',
  'Package Details': 'packages',
  'Finance':         'finance',
  'Tickets':         'tickets',
  'Inventory':       'inventory',
  'Network Map':     'network-map',
  'TR-069':          'tr-069',
  'Circuit Details': 'circuit-details',
  'Recordings':      'recordings',
  'Activity Logs':   'activity-logs',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

// ── Inline edit helpers ──────────────────────────────────────────────────────

const ALL_SERVICES = ['Broadband', 'Landline', 'OTT', 'ILL', 'Intercom', 'Business BB']

function EF({ label, value, onChange, type = 'text', mono, wide }) {
  return (
    <div className={wide ? 'col-span-full' : ''}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full text-sm border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

function ESelect({ label, value, onChange, options }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ETextarea({ label, value, onChange }) {
  return (
    <div className="col-span-full">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className="w-full text-sm border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white resize-none"
      />
    </div>
  )
}

function EditActions({ onSave, onCancel }) {
  return (
    <div className="flex gap-2 mt-4 pt-3 border-t border-surface-border">
      <button onClick={onSave} className="px-3 py-1.5 text-xs font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors">Save</button>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold border border-surface-border text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
    </div>
  )
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function InfoField({ label, value, mono, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
      {children}
    </div>
  )
}

function ProfileTab({ customer: initCustomer, notes, setNotes }) {
  const [cust, setCust] = useState(initCustomer)
  const [showPass, setShowPass] = useState(false)

  const [p1, setP1] = useState({ editing: false, draft: null })
  const [p2, setP2] = useState({ editing: false, draft: null })
  const [p3, setP3] = useState({ editing: false, draft: null })
  const [p4, setP4] = useState({ editing: false, draft: null })
  const [p5, setP5] = useState({ editing: false, draft: null })
  const [p7, setP7] = useState({ editing: false, draft: null })

  function startEdit(setter, draft) { setter({ editing: true, draft }) }
  function cancelEdit(setter) { setter({ editing: false, draft: null }) }

  const conn  = cust.connection ?? {}
  const sales = cust.sales ?? {}
  const kyc   = cust.kyc ?? {}
  // Lead's Own/Partner ownership/billing-party data (leadConversion.js) —
  // distinct from Connection Details' Connection Type above (physical
  // provisioning technology); see the note near that field.
  const ownership = cust.ownership ?? {}
  const isCorporate = cust.customerType === 'Corporate'

  /* ── Save helpers ── */
  function saveP1() {
    setCust(c => ({ ...c, ...p1.draft }))
    cancelEdit(setP1)
  }
  function saveP2() {
    setCust(c => ({ ...c, ...p2.draft }))
    cancelEdit(setP2)
  }
  function saveP3() {
    setCust(c => ({ ...c, connection: { ...c.connection, ...p3.draft.conn }, radius: { ...c.radius, ...p3.draft.radius }, services: p3.draft.services }))
    cancelEdit(setP3)
  }
  function saveP4() {
    setCust(c => ({ ...c, address: { ...c.address, ...p4.draft } }))
    cancelEdit(setP4)
  }
  function saveP5() {
    const { ownershipType, ownershipEntity, ownershipPartner, ownershipBillingTo, ...salesDraft } = p5.draft
    setCust(c => ({
      ...c,
      sales: { ...c.sales, ...salesDraft },
      ownership: { ...c.ownership, type: ownershipType, entity: ownershipEntity, partner: ownershipPartner, billingTo: ownershipBillingTo },
    }))
    cancelEdit(setP5)
  }
  function saveP7() {
    setCust(c => ({ ...c, kyc: { ...c.kyc, ...p7.draft } }))
    cancelEdit(setP7)
  }

  /* ── Reusable edit button row ── */
  function editBtn(onClick) {
    return <Button variant="ghost" size="xs" icon={<Edit2 size={12} />} onClick={onClick}>Edit</Button>
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

      {/* ── Left / Main col ── */}
      <div className="xl:col-span-2 space-y-5">

        {/* SECTION 1 — Personal Details */}
        <Card>
          <CardHeader title="Personal Details" action={
            !p1.editing
              ? editBtn(() => startEdit(setP1, {
                  name: cust.name, sonOf: cust.sonOf, dob: cust.dob, gender: cust.gender,
                  customerType: cust.customerType, gstNo: cust.gstNo, panCard: cust.panCard, createdOn: cust.createdOn,
                  companyName: cust.companyName, contactPersonName: cust.contactPersonName,
                  contactPersonEmail: cust.contactPersonEmail, gstType: cust.gstType,
                }))
              : null
          } />
          {!p1.editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              {isCorporate ? (
                <>
                  <InfoField label="Legal Company Name" value={cust.companyName} />
                  <InfoField label="Contact Person Name"  value={cust.contactPersonName} />
                  <InfoField label="Contact Person Email" value={cust.contactPersonEmail} />
                </>
              ) : (
                <>
                  <InfoField label="Full Name"      value={cust.name} />
                  <InfoField label="S/o (Son of)"   value={cust.sonOf} />
                  <InfoField label="Date of Birth"  value={cust.dob} />
                  <InfoField label="Gender"         value={cust.gender} />
                </>
              )}
              <InfoField label="Customer Type"  value={cust.customerType} />
              <InfoField label="GST No." value={cust.gstNo} mono>
                {cust.customerType === 'Corporate' && (
                  <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    cust.gstVerified ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {cust.gstVerified ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {cust.gstVerified ? 'GST Verified' : 'GST Not Verified'}
                  </span>
                )}
              </InfoField>
              {isCorporate && <InfoField label="GST Type" value={cust.gstType} />}
              <InfoField label="PAN Card"       value={cust.panCard} mono />
              <InfoField label="Customer Since" value={cust.createdOn} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                {isCorporate ? (
                  <>
                    <EF label="Legal Company Name"    value={p1.draft.companyName}         onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, companyName: v } }))} />
                    <EF label="Contact Person Name"    value={p1.draft.contactPersonName}   onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, contactPersonName: v } }))} />
                    <EF label="Contact Person Email"   value={p1.draft.contactPersonEmail}  onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, contactPersonEmail: v } }))} type="email" />
                  </>
                ) : (
                  <>
                    <EF label="Full Name"     value={p1.draft.name}         onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, name: v } }))} />
                    <EF label="S/o (Son of)" value={p1.draft.sonOf}        onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, sonOf: v } }))} />
                    <EF label="Date of Birth" value={p1.draft.dob}         onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, dob: v } }))} />
                    <ESelect label="Gender"   value={p1.draft.gender}       onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, gender: v } }))} options={['Male', 'Female', 'Other']} />
                  </>
                )}
                <ESelect label="Customer Type" value={p1.draft.customerType} onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, customerType: v } }))} options={['Individual', 'Corporate']} />
                <EF label="GST No."       value={p1.draft.gstNo}        onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, gstNo: v } }))} mono />
                {isCorporate && (
                  <ESelect label="GST Type" value={p1.draft.gstType} onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, gstType: v } }))} options={['Regular', 'Composition']} />
                )}
                <EF label="PAN Card"      value={p1.draft.panCard}      onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, panCard: v } }))} mono />
                <EF label="Customer Since" value={p1.draft.createdOn}   onChange={v => setP1(s => ({ ...s, draft: { ...s.draft, createdOn: v } }))} />
              </div>
              <EditActions onSave={saveP1} onCancel={() => cancelEdit(setP1)} />
            </>
          )}
        </Card>

        {/* SECTION 2 — Contact Details */}
        <Card>
          <CardHeader title="Contact Details" action={
            !p2.editing
              ? editBtn(() => startEdit(setP2, { phone: cust.phone, altPhone: cust.altPhone, telephone: cust.telephone, email: cust.email }))
              : null
          } />
          {!p2.editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              <InfoField label="Mobile (Primary)"  value={cust.phone} />
              <InfoField label="Alternate Mobile"  value={cust.altPhone} />
              <InfoField label="Telephone"         value={cust.telephone} />
              <InfoField label="Email"             value={cust.email} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                <EF label="Mobile (Primary)"  value={p2.draft.phone}     onChange={v => setP2(s => ({ ...s, draft: { ...s.draft, phone: v } }))} />
                <EF label="Alternate Mobile"  value={p2.draft.altPhone}  onChange={v => setP2(s => ({ ...s, draft: { ...s.draft, altPhone: v } }))} />
                <EF label="Telephone"         value={p2.draft.telephone} onChange={v => setP2(s => ({ ...s, draft: { ...s.draft, telephone: v } }))} />
                <EF label="Email"             value={p2.draft.email}     onChange={v => setP2(s => ({ ...s, draft: { ...s.draft, email: v } }))} type="email" />
              </div>
              <EditActions onSave={saveP2} onCancel={() => cancelEdit(setP2)} />
            </>
          )}
        </Card>

        {/* Business Contacts — Corporate customers only */}
        {isCorporate && (
          <Card>
            <CardHeader title="Business Contacts" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Accounts Contact</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 mb-5">
              <InfoField label="Name"  value={cust.accountsContact?.name} />
              <InfoField label="Email" value={cust.accountsContact?.email} />
              <InfoField label="Phone" value={cust.accountsContact?.phone} />
            </div>
            <div className="border-t border-surface-border my-4" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Technical Contact</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              <InfoField label="Name"  value={cust.technicalContact?.name} />
              <InfoField label="Email" value={cust.technicalContact?.email} />
              <InfoField label="Phone" value={cust.technicalContact?.phone} />
            </div>
          </Card>
        )}

        {/* SECTION 3 — Connection Details */}
        <Card>
          <CardHeader title="Connection Details" action={
            !p3.editing
              ? editBtn(() => startEdit(setP3, {
                  conn: { ...conn },
                  radius: { jazeUserId: cust.radius.jazeUserId, pppoePassword: cust.radius.pppoePassword },
                  services: [...(cust.services ?? [])],
                }))
              : null
          } />
          {!p3.editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              {/* Note: this is physical provisioning type (FTTH/Sector/Village) —
                  not to be confused with the Lead's Own/Partner ownership type,
                  see "Ownership Type" in Sales & Account Info below. No current
                  Lead form field maps to this one; it's filled in manually here,
                  post-conversion (installation-stage), like the rest of this card. */}
              <InfoField label="Connection Type" value={conn.type} />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Service Opted</p>
                <div className="flex flex-wrap gap-1.5">
                  {(cust.services ?? []).map(s => (
                    <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20">{s}</span>
                  ))}
                </div>
              </div>
              <InfoField label="Server Type"   value={conn.serverType} mono />
              <InfoField label="IPACCT ID"     value={conn.ipacctId} mono />
              <InfoField label="Jaze User ID"  value={cust.radius.jazeUserId} mono />
              <InfoField label="NAS/Interface" value={conn.nasInterface} mono />
              <div className="col-span-full">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">PPPoE Password</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-800">{showPass ? cust.radius.pppoePassword : '••••••••'}</span>
                  <button onClick={() => setShowPass(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => navigator.clipboard?.writeText(cust.radius.pppoePassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">URL</p>
                {conn.url ? <a href={conn.url} target="_blank" rel="noreferrer" className="text-sm text-brand-blue hover:underline font-medium">View URL</a> : <p className="text-sm text-gray-800">—</p>}
              </div>
              <InfoField label="SBT No."    value={conn.sbtNo} mono />
              <InfoField label="Circuit ID" value={conn.circuitId} mono />
              <InfoField label="VC No."     value={conn.vcNo} mono />
              <InfoField label="MAC ID"     value={conn.macId} mono />
              <InfoField label="Serial No." value={conn.serialNo} mono />
              <InfoField label="A End"      value={conn.aEnd} />
              <InfoField label="B End"      value={conn.bEnd} />
              <InfoField label="Prorata Billing" value={conn.prorataBilling} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                {/* Physical provisioning type — see the display-mode note above */}
                <ESelect label="Connection Type" value={p3.draft.conn.type} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, type: v } } }))} options={['FTTH', 'Sector', 'Village']} />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Service Opted</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SERVICES.map(svc => (
                      <label key={svc} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p3.draft.services.includes(svc)}
                          onChange={e => setP3(s => ({
                            ...s,
                            draft: { ...s.draft, services: e.target.checked ? [...s.draft.services, svc] : s.draft.services.filter(x => x !== svc) }
                          }))}
                          className="w-3.5 h-3.5 accent-brand-blue"
                        />
                        <span className="text-xs text-gray-700">{svc}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <EF label="Server Type"   value={p3.draft.conn.serverType} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, serverType: v } } }))} mono />
                <EF label="IPACCT ID"     value={p3.draft.conn.ipacctId}   onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, ipacctId: v } } }))} mono />
                <EF label="Jaze User ID"  value={p3.draft.radius.jazeUserId} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, radius: { ...s.draft.radius, jazeUserId: v } } }))} mono />
                <EF label="NAS/Interface" value={p3.draft.conn.nasInterface} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, nasInterface: v } } }))} mono />
                <EF label="PPPoE Password" value={p3.draft.radius.pppoePassword} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, radius: { ...s.draft.radius, pppoePassword: v } } }))} mono type="password" />
                <EF label="SBT No."    value={p3.draft.conn.sbtNo}     onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, sbtNo: v } } }))} mono />
                <EF label="Circuit ID" value={p3.draft.conn.circuitId} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, circuitId: v } } }))} mono />
                <EF label="VC No."     value={p3.draft.conn.vcNo}      onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, vcNo: v } } }))} mono />
                <EF label="MAC ID"     value={p3.draft.conn.macId}     onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, macId: v } } }))} mono />
                <EF label="Serial No." value={p3.draft.conn.serialNo}  onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, serialNo: v } } }))} mono />
                <EF label="A End"      value={p3.draft.conn.aEnd}      onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, aEnd: v } } }))} />
                <EF label="B End"      value={p3.draft.conn.bEnd}      onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, bEnd: v } } }))} />
                <ESelect label="Prorata Billing" value={p3.draft.conn.prorataBilling} onChange={v => setP3(s => ({ ...s, draft: { ...s.draft, conn: { ...s.draft.conn, prorataBilling: v } } }))} options={['Yes', 'No']} />
              </div>
              <EditActions onSave={saveP3} onCancel={() => cancelEdit(setP3)} />
            </>
          )}
        </Card>

        {/* SECTION 4 — Address Details */}
        <Card>
          <CardHeader title="Address Details" action={
            !p4.editing
              ? editBtn(() => startEdit(setP4, { ...cust.address }))
              : null
          } />
          {!p4.editing ? (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Billing Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 mb-5">
                <InfoField label="State"    value={cust.address.billingState} />
                <InfoField label="City"     value={cust.address.billingCity} />
                <InfoField label="Pincode"  value={cust.address.billingPincode} mono />
                <InfoField label="Landmark" value={cust.address.billingLandmark} />
                <div className="col-span-2"><InfoField label="Address" value={cust.address.billingAddress} /></div>
              </div>
              <div className="border-t border-surface-border my-4" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Installation Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 mb-5">
                <InfoField label="State"    value={cust.address.installState} />
                <InfoField label="City"     value={cust.address.installCity} />
                <InfoField label="Pincode"  value={cust.address.installPincode} mono />
                <InfoField label="Landmark" value={cust.address.installLandmark} />
                <div className="col-span-2"><InfoField label="Address" value={cust.address.installAddress} /></div>
              </div>
              <div className="border-t border-surface-border my-4" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Area Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                <InfoField label="Area"        value={cust.address.area} />
                <InfoField label="Sub Area"    value={cust.address.subArea} />
                <InfoField label="Locality"    value={cust.address.locality} />
                <InfoField label="District"    value={cust.address.district} />
                <InfoField label="Box"         value={cust.address.box} mono />
                <InfoField label="Street"      value={cust.address.street} />
                <InfoField label="OLT"         value={cust.address.olt} mono />
                <InfoField label="Splitter"    value={cust.address.splitter} mono />
                <InfoField label="Port"        value={cust.address.port} />
                <InfoField label="Building"    value={cust.address.building} />
                <InfoField label="Zone"        value={cust.address.zone} />
                <InfoField label="Branch Code" value={cust.address.branchCode} mono />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Billing Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 mb-4">
                <EF label="State"    value={p4.draft.billingState}    onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, billingState: v } }))} />
                <EF label="City"     value={p4.draft.billingCity}     onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, billingCity: v } }))} />
                <EF label="Pincode"  value={p4.draft.billingPincode}  onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, billingPincode: v } }))} mono />
                <EF label="Landmark" value={p4.draft.billingLandmark} onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, billingLandmark: v } }))} />
                <div className="col-span-2">
                  <EF label="Address" value={p4.draft.billingAddress} onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, billingAddress: v } }))} />
                </div>
              </div>
              <div className="border-t border-surface-border my-4" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Installation Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 mb-4">
                <EF label="State"    value={p4.draft.installState}    onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, installState: v } }))} />
                <EF label="City"     value={p4.draft.installCity}     onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, installCity: v } }))} />
                <EF label="Pincode"  value={p4.draft.installPincode}  onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, installPincode: v } }))} mono />
                <EF label="Landmark" value={p4.draft.installLandmark} onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, installLandmark: v } }))} />
                <div className="col-span-2">
                  <EF label="Address" value={p4.draft.installAddress} onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, installAddress: v } }))} />
                </div>
              </div>
              <div className="border-t border-surface-border my-4" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Area Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                <EF label="Area"        value={p4.draft.area}       onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, area: v } }))} />
                <EF label="Sub Area"    value={p4.draft.subArea}    onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, subArea: v } }))} />
                <EF label="Locality"    value={p4.draft.locality}   onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, locality: v } }))} />
                <EF label="District"    value={p4.draft.district}   onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, district: v } }))} />
                <EF label="Box"         value={p4.draft.box}        onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, box: v } }))} mono />
                <EF label="Street"      value={p4.draft.street}     onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, street: v } }))} />
                <EF label="OLT"         value={p4.draft.olt}        onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, olt: v } }))} mono />
                <EF label="Splitter"    value={p4.draft.splitter}   onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, splitter: v } }))} mono />
                <EF label="Port"        value={p4.draft.port}       onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, port: v } }))} />
                <EF label="Building"    value={p4.draft.building}   onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, building: v } }))} />
                <EF label="Zone"        value={p4.draft.zone}       onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, zone: v } }))} />
                <EF label="Branch Code" value={p4.draft.branchCode} onChange={v => setP4(s => ({ ...s, draft: { ...s.draft, branchCode: v } }))} mono />
              </div>
              <EditActions onSave={saveP4} onCancel={() => cancelEdit(setP4)} />
            </>
          )}
        </Card>

        {/* SECTION 5 — Sales & Account Info */}
        <Card>
          <CardHeader title="Sales & Account Info" action={
            !p5.editing
              ? editBtn(() => startEdit(setP5, {
                  ...sales,
                  ownershipType: ownership.type, ownershipEntity: ownership.entity,
                  ownershipPartner: ownership.partner, ownershipBillingTo: ownership.billingTo,
                }))
              : null
          } />
          {!p5.editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              <InfoField label="Sales Executive"         value={sales.executive} />
              <InfoField label="Area Sales Manager"      value={sales.areaSalesManager} />
              <InfoField label="Billing Account Manager" value={sales.billingAccountManager} />
              <InfoField label="Installation By"         value={sales.installationBy} />
              <InfoField label="Registration Date/Time"  value={sales.registrationDate} />
              <InfoField label="Due Days"                value={sales.dueDays != null ? `${sales.dueDays} day${sales.dueDays !== 1 ? 's' : ''}` : '—'} />
              <InfoField label="Lead Source"             value={sales.leadSource} />
              {/* Note: this is the Lead's Own/Partner ownership & billing-party
                  data (leadConversion.js) — not to be confused with Connection
                  Details' "Connection Type" above (FTTH/Sector/Village physical
                  provisioning technology). */}
              <InfoField label="Ownership Type" value={ownership.type} />
              {ownership.type === 'Own' && <InfoField label="Entity" value={ownership.entity} />}
              {ownership.type === 'Partner' && (
                <>
                  <InfoField label="Partner"     value={ownership.partner} />
                  <InfoField label="Billing To"  value={ownership.billingTo} />
                </>
              )}
              <div className="col-span-full"><InfoField label="Remark" value={sales.remark} /></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                <EF label="Sales Executive"         value={p5.draft.executive}            onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, executive: v } }))} />
                <EF label="Area Sales Manager"      value={p5.draft.areaSalesManager}     onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, areaSalesManager: v } }))} />
                <EF label="Billing Account Manager" value={p5.draft.billingAccountManager} onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, billingAccountManager: v } }))} />
                <EF label="Installation By"         value={p5.draft.installationBy}       onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, installationBy: v } }))} />
                <EF label="Registration Date/Time"  value={p5.draft.registrationDate}     onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, registrationDate: v } }))} />
                <EF label="Due Days"                value={p5.draft.dueDays}              onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, dueDays: v } }))} type="number" />
                <EF label="Lead Source"             value={p5.draft.leadSource}           onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, leadSource: v } }))} />
                {/* Ownership type — see the display-mode note above */}
                <ESelect label="Ownership Type" value={p5.draft.ownershipType} onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, ownershipType: v } }))} options={['Own', 'Partner']} />
                {p5.draft.ownershipType === 'Own' && (
                  <EF label="Entity" value={p5.draft.ownershipEntity} onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, ownershipEntity: v } }))} />
                )}
                {p5.draft.ownershipType === 'Partner' && (
                  <>
                    <EF label="Partner"    value={p5.draft.ownershipPartner}    onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, ownershipPartner: v } }))} />
                    <EF label="Billing To" value={p5.draft.ownershipBillingTo} onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, ownershipBillingTo: v } }))} />
                  </>
                )}
                <ETextarea label="Remark"           value={p5.draft.remark}               onChange={v => setP5(s => ({ ...s, draft: { ...s.draft, remark: v } }))} />
              </div>
              <EditActions onSave={saveP5} onCancel={() => cancelEdit(setP5)} />
            </>
          )}
        </Card>

      </div>

      {/* ── Right col ── */}
      <div className="space-y-5">

        {/* SECTION 7 — KYC Documents */}
        <Card>
          <CardHeader title="KYC Documents" action={
            !p7.editing
              ? editBtn(() => startEdit(setP7, { docVerified: kyc.docVerified, docComment: kyc.docComment }))
              : null
          } />
          <div className="space-y-3">
            {/* ID Proof */}
            <div className="py-2 border-b border-surface-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700">ID Proof — {kyc.idProofType ?? 'Aadhaar Card'}</span>
                <div className="flex gap-1.5">
                  <button className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">Front</button>
                  <button className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">Back</button>
                </div>
              </div>
              {(() => { const cfg = KYC_STATUS[cust.kyc.aadhaar] ?? KYC_STATUS.pending; const Icon = cfg.icon; return (
                <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon size={12} />{cfg.label}</span>
              ) })()}
            </div>
            {/* Address Proof */}
            <div className="py-2 border-b border-surface-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700">Address Proof — {kyc.addressProofType ?? 'Utility Bill'}</span>
                <button className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">View</button>
              </div>
              {(() => { const cfg = KYC_STATUS[cust.kyc.pan] ?? KYC_STATUS.pending; const Icon = cfg.icon; return (
                <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon size={12} />{cfg.label}</span>
              ) })()}
            </div>
            {/* Photo */}
            <div className="flex items-center justify-between py-2 border-b border-surface-border">
              <span className="text-sm text-gray-700">Customer Photo</span>
              {(() => { const cfg = KYC_STATUS[cust.kyc.photo] ?? KYC_STATUS.pending; const Icon = cfg.icon; return (
                <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon size={13} />{cfg.label}</span>
              ) })()}
            </div>
            {/* Signature */}
            <div className="flex items-center justify-between py-2 border-b border-surface-border">
              <span className="text-sm text-gray-700">Signature</span>
              {(() => { const s = kyc.signatureUploaded ? 'uploaded' : 'pending'; const cfg = KYC_STATUS[s] ?? KYC_STATUS.pending; const Icon = cfg.icon; return (
                <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon size={13} />{cfg.label}</span>
              ) })()}
            </div>
            {/* Agreement */}
            <div className="flex items-center justify-between py-2 border-b border-surface-border">
              <span className="text-sm text-gray-700">Agreement Signed</span>
              {(() => { const cfg = KYC_STATUS[cust.kyc.agreementSigned ? 'verified' : 'pending']; const Icon = cfg.icon; return (
                <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon size={13} />{cfg.label}</span>
              ) })()}
            </div>
            {/* Doc Verified — editable */}
            <div className="flex items-center justify-between py-2 border-b border-surface-border">
              <span className="text-sm text-gray-700">Doc Verified</span>
              {!p7.editing ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${kyc.docVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {kyc.docVerified ? 'Yes' : 'No'}
                </span>
              ) : (
                <button
                  onClick={() => setP7(s => ({ ...s, draft: { ...s.draft, docVerified: !s.draft.docVerified } }))}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${p7.draft.docVerified ? 'bg-brand-blue' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${p7.draft.docVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              )}
            </div>
            {/* Comment */}
            {!p7.editing ? (
              kyc.docComment && (
                <div className="pt-1">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Comment</p>
                  <p className="text-xs text-gray-600">{kyc.docComment}</p>
                </div>
              )
            ) : (
              <div className="pt-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Comment</p>
                <textarea
                  value={p7.draft.docComment ?? ''}
                  onChange={e => setP7(s => ({ ...s, draft: { ...s.draft, docComment: e.target.value } }))}
                  rows={3}
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
                />
                <EditActions onSave={saveP7} onCancel={() => cancelEdit(setP7)} />
              </div>
            )}
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

const SERVICE_PACKAGES = {
  Broadband:    [{ label: 'FTTH 100Mbps', amount: 899 }, { label: 'FTTH 200Mbps', amount: 1299 }, { label: 'FTTH 500Mbps', amount: 1799 }, { label: 'Wireless 25Mbps', amount: 499 }],
  Landline:     [{ label: 'Unlimited Local + STD', amount: 299 }, { label: 'Local Only', amount: 149 }, { label: 'Premium Voice Bundle', amount: 399 }],
  OTT:          [{ label: 'OTT Premium (Netflix + Prime)', amount: 199 }, { label: 'Basic OTT', amount: 99 }, { label: 'Sports Pack', amount: 149 }],
  ILL:          [{ label: 'ILL 10Mbps', amount: 4999 }, { label: 'ILL 50Mbps', amount: 9999 }, { label: 'ILL 100Mbps', amount: 14999 }],
  Intercom:     [{ label: 'Intercom Basic', amount: 199 }, { label: 'Intercom Unlimited', amount: 349 }],
  'Business BB':[{ label: 'Business 100Mbps', amount: 1499 }, { label: 'Business 200Mbps', amount: 2499 }, { label: 'Business 500Mbps', amount: 3999 }],
}

const SERVICE_ICONS = { Broadband: Wifi, Landline: Phone, OTT: Activity, ILL: Activity, Intercom: Phone, 'Business BB': Wifi }
const SERVICE_STYLES = {
  Broadband:    { iconBg: 'bg-brand-blue/10', iconColor: 'text-brand-blue' },
  Landline:     { iconBg: 'bg-navy/10',        iconColor: 'text-navy' },
  OTT:          { iconBg: 'bg-purple-100',     iconColor: 'text-purple-700' },
  ILL:          { iconBg: 'bg-orange-100',     iconColor: 'text-orange-600' },
  Intercom:     { iconBg: 'bg-cyan-100',       iconColor: 'text-cyan-700' },
  'Business BB':{ iconBg: 'bg-emerald-100',    iconColor: 'text-emerald-700' },
}

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_SVC_FORM = { serviceType: 'Broadband', packageLabel: '', amount: '', startDate: TODAY, notes: '' }

function PackagesTab() {
  const [view, setView] = useState('table')
  const [packages, setPackages] = useState(PACKAGES)
  const [pkgMenu, setPkgMenu] = useState(null)
  const pkgMenuRef = useRef(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_SVC_FORM)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    if (!pkgMenu) return
    function handle(e) { if (pkgMenuRef.current && !pkgMenuRef.current.contains(e.target)) setPkgMenu(null) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pkgMenu])

  function sf(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleServiceTypeChange(val) {
    const firstPkg = SERVICE_PACKAGES[val]?.[0]
    setForm(f => ({ ...f, serviceType: val, packageLabel: firstPkg?.label ?? '', amount: firstPkg?.amount ?? '' }))
  }

  function handlePackageChange(label) {
    const pkg = SERVICE_PACKAGES[form.serviceType]?.find(p => p.label === label)
    setForm(f => ({ ...f, packageLabel: label, amount: pkg?.amount ?? '' }))
  }

  function handleAddService() {
    const style = SERVICE_STYLES[form.serviceType] ?? SERVICE_STYLES.Broadband
    const Icon  = SERVICE_ICONS[form.serviceType] ?? Wifi
    const start = new Date(form.startDate)
    const end   = new Date(start); end.setDate(end.getDate() + 30)
    const fmt   = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const newPkg = {
      type: form.serviceType,
      icon: Icon,
      iconBg: style.iconBg,
      iconColor: style.iconColor,
      plan: form.packageLabel,
      speed: '—',
      validity: 30,
      daysUsed: 0,
      amount: Number(form.amount),
      startDate: fmt(start),
      endDate: fmt(end),
      jazePkgId: `JPKG-${form.serviceType.toUpperCase().replace(/\s/g, '-')}-${Date.now()}`,
      status: 'active',
    }
    setPackages(p => [...p, newPkg])
    setShowAddModal(false)
    setForm(EMPTY_SVC_FORM)
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  // initialise package select when modal opens
  useEffect(() => {
    if (showAddModal) {
      const firstPkg = SERVICE_PACKAGES[EMPTY_SVC_FORM.serviceType]?.[0]
      setForm({ ...EMPTY_SVC_FORM, packageLabel: firstPkg?.label ?? '', amount: firstPkg?.amount ?? '' })
    }
  }, [showAddModal])

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <CheckCircle size={15} /> Service added successfully
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{packages.length} active subscription{packages.length !== 1 ? 's' : ''}</p>
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
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowAddModal(true)}>Add Service</Button>
        </div>
      </div>

      {/* ── Card View ── */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map(pkg => {
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
                    <p className="text-sm font-bold text-gray-900">{pkg.plan}</p>
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
                  {['Package Name','Bandwidth / Speed','Tenure','Amount','Start Date','End Date','Status','Actions'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-5' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {packages.map(pkg => {
                  const Icon = pkg.icon
                  return (
                    <tr key={pkg.type} className="hover:bg-gray-50/60 transition-colors">
                      {/* Package Name */}
                      <td className="pl-5 pr-4 py-3 whitespace-nowrap">
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
                      <td className="px-4 py-3 whitespace-nowrap relative">
                        <button
                          onClick={e => { e.stopPropagation(); setPkgMenu(pkgMenu === pkg.type ? null : pkg.type) }}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${pkgMenu === pkg.type ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                          <MoreVertical size={15} />
                        </button>
                        {pkgMenu === pkg.type && (
                          <div
                            ref={pkgMenuRef}
                            className="absolute right-4 top-10 z-20 bg-white rounded-xl border border-surface-border shadow-xl py-1 w-36"
                          >
                            <button onClick={() => setPkgMenu(null)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                              Renew
                            </button>
                            <button onClick={() => setPkgMenu(null)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                              Modify
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Service Modal ── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Service"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={handleAddService} disabled={!form.packageLabel}>
            Add Service
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type <span className="text-red-500">*</span></label>
            <select
              value={form.serviceType}
              onChange={e => handleServiceTypeChange(e.target.value)}
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            >
              {Object.keys(SERVICE_PACKAGES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package <span className="text-red-500">*</span></label>
            <select
              value={form.packageLabel}
              onChange={e => handlePackageChange(e.target.value)}
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            >
              {(SERVICE_PACKAGES[form.serviceType] ?? []).map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => sf('startDate', e.target.value)}
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => sf('amount', e.target.value)}
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={e => sf('notes', e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Tab: Finance ─────────────────────────────────────────────────────────────

const FINANCE_SUB_TABS = [
  { label: 'Invoices',       slug: 'invoices'  },
  { label: 'Payments',       slug: 'payments'  },
  { label: 'Account Ledger', slug: 'ledger'    },
]

const MOCK_PAYMENTS = [
  { id: 1, receiptNo: '117644', invoiceNo: 'B2C/26-27/5523', paymentDate: '23-06-2026', date: '23-06-2026 14:45:08', mode: 'Android App', total: 2360.00, paid: 2360.00, status: 'Complete', orderNo: '1fb368b6934f7839488a', chequeBCh: 0, addBy: '5000022335',  comment: 'Complete' },
  { id: 2, receiptNo: '117637', invoiceNo: '—',               paymentDate: '23-06-2026', date: '23-06-2026 09:55:46', mode: 'Online',      total: 1000.00, paid: 1000.00, status: 'Complete', orderNo: '94e4f91a9ab212b92cff', chequeBCh: 0, addBy: 'Preeti_TCNPL125', comment: 'Complete' },
]

function FinanceTab({ customer }) {
  const { id: customerId, subTab: subTabParam } = useParams()
  const navigate = useNavigate()
  const [invPage, setInvPage] = useState(1)
  const [payPage, setPayPage] = useState(1)
  const [ledPage, setLedPage] = useState(1)
  const [showFailed, setShowFailed] = useState(false)
  const PER_PAGE = 5

  // Resolve active sub-tab from URL param; default to 'invoices'
  const activeSlug = FINANCE_SUB_TABS.find(t => t.slug === subTabParam)?.slug ?? 'invoices'

  // If URL has no subTab param at all, redirect to /invoices
  if (!subTabParam) {
    return <Navigate to={`/customers/${customerId}/finance/invoices`} replace />
  }

  const goTo = (slug) => navigate(`/customers/${customerId}/finance/${slug}`)

  const invTotal = INVOICES.length
  const invPages = Math.ceil(invTotal / PER_PAGE)
  const invRows  = INVOICES.slice((invPage - 1) * PER_PAGE, invPage * PER_PAGE)

  const filteredPayments = showFailed ? MOCK_PAYMENTS.filter(p => p.status === 'Failed') : MOCK_PAYMENTS
  const payTotal = filteredPayments.length
  const payPages = Math.max(1, Math.ceil(payTotal / PER_PAGE))
  const payRows  = filteredPayments.slice((payPage - 1) * PER_PAGE, payPage * PER_PAGE)

  const ledTotal = LEDGER.length
  const ledPages = Math.ceil(ledTotal / PER_PAGE)
  const ledRows  = LEDGER.slice((ledPage - 1) * PER_PAGE, ledPage * PER_PAGE)

  function Pagination({ page, total, pages, onPage, label }) {
    const from = (page - 1) * PER_PAGE + 1
    const to   = Math.min(page * PER_PAGE, total)
    return (
      <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-gray-500">Showing {from}–{to} of {total} {label}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs rounded border border-surface-border text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >Prev</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`px-2.5 py-1 text-xs rounded border ${p === page ? 'bg-brand-blue text-white border-brand-blue' : 'border-surface-border text-gray-600 hover:bg-gray-50'}`}
            >{p}</button>
          ))}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === pages}
            className="px-2.5 py-1 text-xs rounded border border-surface-border text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >Next</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Sub-tab bar */}
      <div className="flex border-b border-surface-border gap-6">
        {FINANCE_SUB_TABS.map(t => (
          <button
            key={t.slug}
            onClick={() => goTo(t.slug)}
            className={`pb-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeSlug === t.slug
                ? 'text-brand-blue border-b-2 border-brand-blue'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Invoices */}
      {activeSlug === 'invoices' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Invoices</h3>
            <Button variant="secondary" size="xs" icon={<Download size={12} />}>Export</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  {['Invoice No', 'Package', 'Date', 'Amount', 'Status', 'PDF'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {invRows.map(inv => (
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
                    <td className="px-4 py-3">
                      <button className="text-xs text-brand-blue hover:underline flex items-center gap-1">
                        <FileText size={12} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={invPage} total={invTotal} pages={invPages} onPage={setInvPage} label="invoices" />
        </Card>
      )}

      {/* Payments */}
      {activeSlug === 'payments' && (
        <Card padding={false}>
          {/* Top row */}
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={showFailed} onChange={e => { setShowFailed(e.target.checked); setPayPage(1) }}
                className="w-4 h-4 accent-[#0A8DCD]" />
              Display Failed Payments
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 font-medium">Total Due: <span className="text-gray-800">0</span></span>
              <button onClick={() => navigate(`/customers/${customerId}/finance/payments/add`)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <span>+</span> Add Payment
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  {['Receipt No','Invoice No','Payment Date','Date','Mode','Total','Paid','Payment Status','Order No / Cheque No','Cheque B CH','Add By','Comment','Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {payRows.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-mono text-xs text-brand-blue font-semibold whitespace-nowrap">{pay.receiptNo}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.invoiceNo}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.paymentDate}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.date}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.mode}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.total.toFixed(2)}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.paid.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        pay.status === 'Complete' ? 'bg-green-100 text-green-700' :
                        pay.status === 'Failed'   ? 'bg-red-100 text-red-600'    :
                        'bg-orange-100 text-orange-600'
                      }`}>{pay.status}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{pay.orderNo}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{pay.chequeBCh}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.addBy}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{pay.comment}</td>
                    <td className="px-3 py-3">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {payRows.length === 0 && (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400 text-sm">No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination row */}
          <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Records per page</label>
              <select className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none">
                <option>10</option><option>25</option><option>50</option>
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Page {payPage} of {payPages}</span>
              <span className="text-gray-400">|</span>
              <span>Total {payTotal}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage === 1}
                className="px-2.5 py-1 text-xs rounded border border-surface-border text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
              {Array.from({ length: payPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPayPage(p)}
                  className={`px-2.5 py-1 text-xs rounded border ${p === payPage ? 'bg-brand-blue text-white border-brand-blue' : 'border-surface-border text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPayPage(p => Math.min(payPages, p + 1))} disabled={payPage === payPages}
                className="px-2.5 py-1 text-xs rounded border border-surface-border text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        </Card>
      )}

      {/* Account Ledger */}
      {activeSlug === 'ledger' && (
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
                {ledRows.map((entry, i) => (
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
          <Pagination page={ledPage} total={ledTotal} pages={ledPages} onPage={setLedPage} label="entries" />
        </Card>
      )}
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
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{node.sub}</p>
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

// ── Tab: TR-069 ──────────────────────────────────────────────────────────────

const TR069_DEVICE = {
  model: 'TP-Link Archer C6',
  firmware: '3.20.1 Build 210601',
  hardware: 'TR069_v1',
  serial: 'TPL2024WR0091',
  mac: 'D4:AD:BD:00:11:22',
  lastSeen: '11 Jun 2026, 10:42 AM',
  status: 'Connected',
  uptime: '9h 14m',
}

const TR069_WAN = {
  ip: '10.14.22.45',
  gateway: '10.14.0.1',
  dnsPrimary: '8.8.8.8',
  dnsSecondary: '8.8.4.4',
  connectionType: 'PPPoE',
  status: 'Connected',
}

const TR069_LAN = {
  ip: '192.168.0.1',
  subnet: '255.255.255.0',
  dhcp: 'Enabled',
  connectedDevices: 4,
  wifi24: 'Enabled',
  wifi5: 'Enabled',
}

function TR069Tab() {
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const actions = [
    {
      label: 'Reboot Device',
      icon: <RotateCcw size={14} />,
      style: 'bg-amber-500 hover:bg-amber-600 text-white',
      confirm: 'Reboot command sent to device.',
    },
    {
      label: 'Re-push PPPoE Config',
      icon: <RefreshCw size={14} />,
      style: 'bg-brand-blue hover:bg-blue-700 text-white',
      confirm: 'PPPoE config re-pushed successfully.',
    },
    {
      label: 'Factory Reset',
      icon: <AlertOctagon size={14} />,
      style: 'bg-red-500 hover:bg-red-600 text-white',
      confirm: 'Factory reset command sent. Device will reboot.',
    },
    {
      label: 'Fetch Live Stats',
      icon: <Zap size={14} />,
      style: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      confirm: 'Live stats fetched successfully.',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle size={15} className="text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Section 1 — Device Info */}
      <div className="rounded-xl overflow-hidden border border-navy/30">
        <div className="bg-navy px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={15} className="text-brand-blue" />
            <span className="text-sm font-semibold text-white">TR-069 Device Status</span>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Connected
          </span>
        </div>
        <div className="bg-[#0c1f38] px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
          {[
            ['Device Model',        TR069_DEVICE.model],
            ['Firmware Version',    TR069_DEVICE.firmware],
            ['Hardware Version',    TR069_DEVICE.hardware],
            ['Serial Number',       TR069_DEVICE.serial],
            ['MAC Address',         TR069_DEVICE.mac],
            ['Last Seen',           TR069_DEVICE.lastSeen],
            ['Connection Status',   null],
            ['Uptime',              TR069_DEVICE.uptime],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 font-medium tracking-wide">{label}</p>
              {label === 'Connection Status' ? (
                <span className="flex items-center gap-1.5 mt-0.5 text-sm text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  {TR069_DEVICE.status}
                </span>
              ) : (
                <p className="text-sm text-white font-mono mt-0.5">{val}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 — WAN / LAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WAN */}
        <Card>
          <CardHeader title="WAN Status" />
          <div className="space-y-3">
            {[
              ['WAN IP',          TR069_WAN.ip],
              ['Gateway',         TR069_WAN.gateway],
              ['DNS Primary',     TR069_WAN.dnsPrimary],
              ['DNS Secondary',   TR069_WAN.dnsSecondary],
              ['Connection Type', TR069_WAN.connectionType],
              ['Status',          null],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between border-b border-surface-border pb-2.5 last:border-0 last:pb-0">
                <span className="text-xs text-gray-400">{label}</span>
                {label === 'Status' ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {TR069_WAN.status}
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold text-gray-800">{val}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* LAN */}
        <Card>
          <CardHeader title="LAN Status" />
          <div className="space-y-3">
            {[
              ['LAN IP',             TR069_LAN.ip],
              ['Subnet Mask',        TR069_LAN.subnet],
              ['DHCP Status',        TR069_LAN.dhcp],
              ['Connected Devices',  String(TR069_LAN.connectedDevices)],
              ['WiFi 2.4GHz',        TR069_LAN.wifi24],
              ['WiFi 5GHz',          TR069_LAN.wifi5],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between border-b border-surface-border pb-2.5 last:border-0 last:pb-0">
                <span className="text-xs text-gray-400">{label}</span>
                <span className={`text-xs font-semibold ${
                  val === 'Enabled' ? 'text-emerald-600' :
                  label === 'Connected Devices' ? 'text-brand-blue' :
                  'text-gray-800'
                } font-mono`}>{val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Section 3 — Remote Actions */}
      <Card>
        <CardHeader title="Remote Actions" subtitle="Commands sent directly to the CPE via TR-069" />
        <div className="flex flex-wrap gap-3">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => showToast(action.confirm)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.style}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Tab: Circuit Details (Intercom) ───────────────────────────────────────────

function CircuitDetailsTab({ customer }) {
  const circuit = customer.circuit ?? {}
  const isActive = circuit.serviceStatus === 'Active'

  return (
    <Card>
      <CardHeader title="Circuit Details" subtitle="Intercom circuit and landline provisioning info" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
        {[
          ['Circuit ID',      circuit.circuitId],
          ['Landline Number',  circuit.landlineNumber],
          ['Activation Date',  circuit.activationDate],
          ['Service Status',   null],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-xs text-gray-400 font-medium tracking-wide">{label}</p>
            {label === 'Service Status' ? (
              <span className={`flex items-center gap-1.5 mt-0.5 text-sm font-semibold ${isActive ? 'text-emerald-600' : 'text-amber-500'}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                {circuit.serviceStatus || '—'}
              </span>
            ) : (
              <p className="text-sm text-gray-800 font-mono mt-0.5">{val || '—'}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Tab: Recordings ──────────────────────────────────────────────────────────

const RECORDINGS = [
  { date: '10 Jun 2026', type: 'Inbound',  duration: '3m 42s', agent: 'Salim Khan',     status: 'Completed' },
  { date: '05 Jun 2026', type: 'Outbound', duration: '1m 15s', agent: 'Pradeep Kumar',  status: 'Completed' },
  { date: '01 Jun 2026', type: 'Inbound',  duration: '5m 20s', agent: 'Salim Khan',     status: 'Completed' },
  { date: '25 May 2026', type: 'Outbound', duration: '0m 45s', agent: 'Neha Gupta',     status: 'Missed'    },
  { date: '18 May 2026', type: 'Inbound',  duration: '2m 10s', agent: 'Pradeep Kumar',  status: 'Completed' },
]

const CALL_TYPE_STYLE = {
  Inbound:  'bg-brand-blue/10 text-brand-blue',
  Outbound: 'bg-purple-100 text-purple-700',
  Missed:   'bg-red-100 text-red-600',
}

function RecordingsTab() {
  const [filter, setFilter] = useState('All Calls')

  const filtered = filter === 'All Calls'
    ? RECORDINGS
    : RECORDINGS.filter(r => r.type === filter || (filter === 'Inbound' && r.type === 'Inbound') || (filter === 'Outbound' && r.type === 'Outbound'))

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Call Recordings</h3>
          <p className="text-xs text-gray-400 mt-0.5">IVR call recordings via Tata Smartflo</p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm border border-surface-border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option>All Calls</option>
          <option>Inbound</option>
          <option>Outbound</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {['Call Date', 'Call Type', 'Duration', 'Agent', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-5' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((rec, i) => {
                const canPlay = rec.status !== 'Missed'
                return (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="pl-5 pr-4 py-3 text-xs text-gray-600 whitespace-nowrap">{rec.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CALL_TYPE_STYLE[rec.type]}`}>
                        {rec.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-mono">{rec.duration}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{rec.agent}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant={rec.status === 'Completed' ? 'green' : 'red'}
                        size="sm"
                        dot
                      >
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!canPlay}
                          title={canPlay ? 'Play recording' : 'No recording available'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                            ${canPlay
                              ? 'border-brand-blue/40 text-brand-blue hover:bg-blue-50'
                              : 'border-gray-200 text-gray-300 cursor-not-allowed'
                            }`}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,1 9,5 2,9"/></svg>
                          Play
                        </button>
                        <button
                          disabled={!canPlay}
                          title={canPlay ? 'Download recording' : 'No recording available'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                            ${canPlay
                              ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                              : 'border-gray-200 text-gray-300 cursor-not-allowed'
                            }`}
                        >
                          <Download size={11} />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center">
        Recordings are stored for 90 days.&nbsp;&nbsp;Powered by Tata Smartflo IVR.
      </p>
    </div>
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
  const { id, tab, subTab } = useParams()
  const navigate = useNavigate()

  const customer = MOCK_CUSTOMERS[id] ?? makeCustomerFromBase(id)
  const isIntercom = id.startsWith('INC')
  const tabs = isIntercom ? TABS.map(t => t === 'TR-069' ? 'Circuit Details' : t) : TABS

  const activeTab = SLUG_TO_TAB[tab] ?? 'Profile'
  const [notes, setNotes] = useState(customer.notes)

  useEffect(() => {
    if (!tab) navigate(`/customers/${id}/profile`, { replace: true })
  }, [id, tab, navigate])

  function setActiveTab(tabName) {
    const slug = TAB_SLUGS[tabName]
    if (slug === 'finance') {
      navigate(`/customers/${id}/finance/invoices`)
    } else {
      navigate(`/customers/${id}/${slug}`)
    }
  }

  const statusCfg = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive

  return (
    <div className="p-6 space-y-5">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        {/* Navy accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
        {/* Breadcrumb */}
        <div className="px-5 lg:px-6 xl:px-7 2xl:px-8 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <button onClick={() => navigate('/customers')} className="text-gray-400 hover:underline transition-colors">
            Customers
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{customer.id}</span>
        </div>
        <div className="border-t border-surface-border" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            {/* Avatar — shows the profile picture captured at lead creation
                (customer.profilePicture.preview, a data URL, carried over by
                leadConversion.js) when present, else falls back to the
                existing colored-initials treatment. */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md overflow-hidden">
              {customer.profilePicture?.preview
                ? <img src={customer.profilePicture.preview} alt="" className="w-full h-full object-cover" />
                : customer.name.charAt(0)}
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
          {tabs.map(tab => (
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
          {activeTab === 'TR-069'          && !isIntercom && <TR069Tab />}
          {activeTab === 'Circuit Details' && isIntercom  && <CircuitDetailsTab customer={customer} />}
          {activeTab === 'Recordings'      && <RecordingsTab />}
          {activeTab === 'Activity Logs'   && <ActivityTab />}
        </div>
      </div>
    </div>
  )
}
