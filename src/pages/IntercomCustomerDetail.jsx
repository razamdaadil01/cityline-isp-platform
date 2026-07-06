import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  Ticket, MessageSquare, Ban, AlertTriangle, CheckCircle, Clock,
  Cpu, Activity, Download, FileText, ExternalLink, Plus,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'

// ── Mock customer dataset ────────────────────────────────────────────────────

const MOCK_INTERCOM_CUSTOMERS = {
  'INC-2026-0001': {
    id: 'INC-2026-0001',
    name: 'Mohan Das',
    phone: '93456 78901',
    altPhone: '—',
    email: 'mohan.das@email.com',
    dob: '12 Apr 1978',
    gender: 'Male',
    sonOf: 'Ram Das',
    customerType: 'Individual',
    gstNo: '—',
    status: 'active',
    plan: 'Intercom Basic',
    billingAddress: 'Flat 302, Sai Darshan CHS, Four Bungalows Road, Andheri West',
    installationAddress: 'Flat 302, Sai Darshan CHS, Four Bungalows Road, Andheri West',
    area: 'Andheri',
    zone: 'Andheri West',
    project: 'Sunrise Apartments',
    salesExecutive: 'Pradeep Kumar',
    createdOn: '20 Jun 2026',
    sourceLeadId: 'IL-2026-0003',
    kyc: { idProofType: 'Aadhaar Card', idProof: 'verified', addressProof: 'verified', photo: 'uploaded' },
    circuit: {
      circuitId: 'IC-2026-0001',
      landlineNumber: '022-2678 9012',
      serviceStatus: 'Active',
      activationDate: '20 Jun 2026',
      installationBy: 'Suresh Babu',
      sourceBookingId: 'IL-2026-0003',
      remarks: 'Standard intercom installation, no issues reported.',
    },
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0001', assignedDate: '19 Jun 2026', status: 'active' },
      { device: 'Handset Unit',        serial: 'ICH-2026-0001', assignedDate: '19 Jun 2026', status: 'active' },
    ],
    tickets: [
      { id: 'TKT-INC-0001', subject: 'Intercom panel not ringing', priority: 'P2', status: 'resolved', created: '25 Jun 2026' },
    ],
  },
  'INC-2026-0002': {
    id: 'INC-2026-0002',
    name: 'Priya Nair',
    phone: '98765 43210',
    altPhone: '—',
    email: 'priya.nair@email.com',
    dob: '05 Sep 1990',
    gender: 'Female',
    sonOf: 'D/o Ravi Nair',
    customerType: 'Individual',
    gstNo: '—',
    status: 'active',
    plan: 'Intercom Plus',
    billingAddress: 'B-204, Greenwood Residency, Bandra East',
    installationAddress: 'B-204, Greenwood Residency, Bandra East',
    area: 'Bandra',
    zone: 'Bandra East',
    project: 'Greenwood Residency',
    salesExecutive: 'Anita Sharma',
    createdOn: '18 Jun 2026',
    sourceLeadId: 'IL-2026-0002',
    kyc: { idProofType: 'Aadhaar Card', idProof: 'verified', addressProof: 'verified', photo: 'uploaded' },
    circuit: {
      circuitId: 'IC-2026-0002',
      landlineNumber: '022-2678 4321',
      serviceStatus: 'Active',
      activationDate: '18 Jun 2026',
      installationBy: 'Neha Gupta',
      sourceBookingId: 'IL-2026-0002',
      remarks: 'Plus plan with extended handset range.',
    },
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0002', assignedDate: '17 Jun 2026', status: 'active' },
    ],
    tickets: [],
  },
  'INC-2026-0003': {
    id: 'INC-2026-0003',
    name: 'Suresh Patil',
    phone: '99887 76655',
    altPhone: '—',
    email: 'suresh.patil@email.com',
    dob: '22 Nov 1975',
    gender: 'Male',
    sonOf: 'Anand Patil',
    customerType: 'Individual',
    gstNo: '—',
    status: 'suspended',
    plan: 'Intercom Basic',
    billingAddress: 'Shop 12, Metro Business Park, Goregaon',
    installationAddress: 'Shop 12, Metro Business Park, Goregaon',
    area: 'Goregaon',
    zone: 'Goregaon',
    project: 'Metro Business Park',
    salesExecutive: 'Vikram Patil',
    createdOn: '10 Jun 2026',
    sourceLeadId: 'IL-2026-0001',
    kyc: { idProofType: 'Aadhaar Card', idProof: 'verified', addressProof: 'pending', photo: 'uploaded' },
    circuit: {
      circuitId: 'IC-2026-0003',
      landlineNumber: '022-2678 5566',
      serviceStatus: 'Suspended',
      activationDate: '10 Jun 2026',
      installationBy: 'Suresh Babu',
      sourceBookingId: 'IL-2026-0001',
      remarks: 'Suspended due to non-payment of dues.',
    },
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0003', assignedDate: '09 Jun 2026', status: 'inactive' },
    ],
    tickets: [
      { id: 'TKT-INC-0002', subject: 'Requesting reactivation after payment', priority: 'P1', status: 'open', created: '01 Jul 2026' },
    ],
  },
  'INC-2026-0004': {
    id: 'INC-2026-0004',
    name: 'Anita Desai',
    phone: '91234 56789',
    altPhone: '—',
    email: 'anita.desai@email.com',
    dob: '30 Jan 1988',
    gender: 'Female',
    sonOf: 'D/o Kishore Desai',
    customerType: 'Individual',
    gstNo: '—',
    status: 'active',
    plan: 'Intercom Plus',
    billingAddress: 'C-501, Palm Grove Society, Versova',
    installationAddress: 'C-501, Palm Grove Society, Versova',
    area: 'Andheri',
    zone: 'Versova',
    project: 'Palm Grove Society',
    salesExecutive: 'Pradeep Kumar',
    createdOn: '05 Jun 2026',
    sourceLeadId: 'IL-2026-0004',
    kyc: { idProofType: 'Aadhaar Card', idProof: 'verified', addressProof: 'verified', photo: 'uploaded' },
    circuit: {
      circuitId: 'IC-2026-0004',
      landlineNumber: '022-2678 7788',
      serviceStatus: 'Active',
      activationDate: '05 Jun 2026',
      installationBy: 'Neha Gupta',
      sourceBookingId: 'IL-2026-0004',
      remarks: 'No issues reported since installation.',
    },
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0004', assignedDate: '04 Jun 2026', status: 'active' },
      { device: 'Handset Unit',        serial: 'ICH-2026-0004', assignedDate: '04 Jun 2026', status: 'active' },
    ],
    tickets: [],
  },
  'INC-2026-0005': {
    id: 'INC-2026-0005',
    name: 'Rajesh Kumar',
    phone: '97654 32198',
    altPhone: '—',
    email: 'rajesh.kumar@email.com',
    dob: '14 Jul 1982',
    gender: 'Male',
    sonOf: 'Mahesh Kumar',
    customerType: 'Individual',
    gstNo: '—',
    status: 'inactive',
    plan: 'Intercom Basic',
    billingAddress: 'Flat 108, Sunrise Apartments, Andheri East',
    installationAddress: 'Flat 108, Sunrise Apartments, Andheri East',
    area: 'Andheri',
    zone: 'Andheri East',
    project: 'Sunrise Apartments',
    salesExecutive: 'Anita Sharma',
    createdOn: '28 May 2026',
    sourceLeadId: 'IL-2026-0005',
    kyc: { idProofType: 'Aadhaar Card', idProof: 'pending', addressProof: 'pending', photo: 'pending' },
    circuit: {
      circuitId: 'IC-2026-0005',
      landlineNumber: '022-2678 9900',
      serviceStatus: 'Inactive',
      activationDate: '28 May 2026',
      installationBy: 'Suresh Babu',
      sourceBookingId: 'IL-2026-0005',
      remarks: 'Customer requested temporary hold.',
    },
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0005', assignedDate: '27 May 2026', status: 'inactive' },
    ],
    tickets: [],
  },
}

function makeUnknownCustomer(id) {
  return {
    id, name: 'Unknown Customer', phone: '—', altPhone: '—', email: '—',
    dob: '—', gender: '—', sonOf: '—', customerType: '—', gstNo: '—',
    status: 'inactive', plan: '—',
    billingAddress: '—', installationAddress: '—', area: '—', zone: '—', project: '—',
    salesExecutive: '—', createdOn: '—', sourceLeadId: null,
    kyc: { idProofType: 'Aadhaar Card', idProof: 'pending', addressProof: 'pending', photo: 'pending' },
    circuit: { circuitId: '—', landlineNumber: '—', serviceStatus: '—', activationDate: '—', installationBy: '—', sourceBookingId: null, remarks: '—' },
    hardware: [],
    tickets: [],
  }
}

// ── Shared config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { variant: 'green',  label: 'Active' },
  suspended: { variant: 'orange', label: 'Suspended' },
  inactive:  { variant: 'gray',   label: 'Inactive' },
}

const KYC_STATUS = {
  verified: { icon: CheckCircle, color: 'text-emerald-600', label: 'Verified' },
  uploaded: { icon: CheckCircle, color: 'text-brand-blue',  label: 'Uploaded' },
  pending:  { icon: Clock,       color: 'text-amber-500',   label: 'Pending' },
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

const TABS = ['Profile', 'Circuit Details', 'Billing', 'Tickets', 'Hardware', 'Activity Logs']

const TAB_SLUGS = {
  'Profile':         'profile',
  'Circuit Details': 'circuit-details',
  'Billing':         'billing',
  'Tickets':         'tickets',
  'Hardware':        'hardware',
  'Activity Logs':   'activity-logs',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

const BILLING_SUB_TABS = [
  { label: 'Invoices',       slug: 'invoices' },
  { label: 'Payments',       slug: 'payments' },
  { label: 'Account Ledger', slug: 'ledger'   },
]

const PLAN_AMOUNT = { 'Intercom Basic': 199, 'Intercom Plus': 349 }

function buildFinance(customer) {
  const amount = PLAN_AMOUNT[customer.plan] ?? 199
  const months = ['May 2026', 'Apr 2026', 'Mar 2026']
  const invoices = months.map((m, i) => ({
    no: `INV-INC-2026-${String(51 - i).padStart(4, '0')}`,
    pkg: customer.plan,
    date: `01 ${m}`,
    amount,
    status: customer.status === 'suspended' && i === 0 ? 'pending' : 'paid',
  }))
  const payments = invoices.filter(inv => inv.status === 'paid').map((inv, i) => ({
    receiptNo: `RC-${1000 + i}`,
    invoiceNo: inv.no,
    date: inv.date,
    mode: 'UPI',
    amount: inv.amount,
    status: 'Complete',
  }))
  let balance = 0
  const ledger = invoices.slice().reverse().flatMap(inv => {
    const rows = [{ date: inv.date, description: `Invoice #${inv.no}`, type: 'debit', amount: inv.amount }]
    if (inv.status === 'paid') rows.push({ date: inv.date, description: 'Payment received — UPI', type: 'credit', amount: inv.amount })
    return rows
  }).map(row => {
    balance += row.type === 'credit' ? row.amount : -row.amount
    return { ...row, balance }
  }).reverse()
  return { invoices, payments, ledger }
}

// ── InfoField ────────────────────────────────────────────────────────────────

function InfoField({ label, value, mono, wide }) {
  return (
    <div className={wide ? 'col-span-full' : ''}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

function KycRow({ label, statusKey }) {
  const cfg = KYC_STATUS[statusKey] ?? KYC_STATUS.pending
  const Icon = cfg.icon
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-border last:border-b-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon size={13} />{cfg.label}</span>
    </div>
  )
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ customer }) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 space-y-5">
        <Card>
          <CardHeader title="Personal Details" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            <InfoField label="Full Name"     value={customer.name} />
            <InfoField label="S/o (Son of)"  value={customer.sonOf} />
            <InfoField label="Date of Birth" value={customer.dob} />
            <InfoField label="Gender"        value={customer.gender} />
            <InfoField label="Customer Type" value={customer.customerType} />
            <InfoField label="GST No."       value={customer.gstNo} mono />
            <InfoField label="Mobile (Primary)" value={customer.phone} />
            <InfoField label="Alternate Mobile" value={customer.altPhone} />
            <InfoField label="Email"         value={customer.email} />
            <InfoField label="Billing Address"      value={customer.billingAddress} wide />
            <InfoField label="Installation Address" value={customer.installationAddress} wide />
            <InfoField label="Area"          value={customer.area} />
            <InfoField label="Zone"          value={customer.zone} />
            <InfoField label="Project"       value={customer.project} />
            <InfoField label="Sales Executive" value={customer.salesExecutive} />
            <InfoField label="Created Date"  value={customer.createdOn} />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Source Lead ID</p>
              {customer.sourceLeadId ? (
                <button
                  onClick={() => navigate(`/intercom/leads/${customer.sourceLeadId}`)}
                  className="flex items-center gap-1 text-sm text-brand-blue font-mono font-semibold hover:underline mt-0.5"
                >
                  {customer.sourceLeadId} <ExternalLink size={12} />
                </button>
              ) : (
                <p className="text-sm text-gray-800 font-medium mt-0.5">—</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="KYC Documents" />
          <div>
            <KycRow label={`ID Proof — ${customer.kyc.idProofType}`} statusKey={customer.kyc.idProof} />
            <KycRow label="Address Proof" statusKey={customer.kyc.addressProof} />
            <KycRow label="Customer Photo" statusKey={customer.kyc.photo} />
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab: Circuit Details ─────────────────────────────────────────────────────

function CircuitDetailsTab({ customer }) {
  const circuit = customer.circuit
  const isActive = circuit.serviceStatus === 'Active'
  const navigate = useNavigate()
  return (
    <Card>
      <CardHeader title="Circuit Details" subtitle="Intercom circuit and landline provisioning info" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
        <InfoField label="Circuit ID" value={circuit.circuitId} mono />
        <InfoField label="Landline Number" value={circuit.landlineNumber} mono />
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Service Status</p>
          <span className={`flex items-center gap-1.5 mt-0.5 text-sm font-semibold ${isActive ? 'text-emerald-600' : 'text-amber-500'}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            {circuit.serviceStatus}
          </span>
        </div>
        <InfoField label="Activation Date" value={circuit.activationDate} />
        <InfoField label="Installation By" value={circuit.installationBy} />
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Source Booking</p>
          {circuit.sourceBookingId ? (
            <button
              onClick={() => navigate(`/intercom/leads/${circuit.sourceBookingId}`)}
              className="flex items-center gap-1 text-sm text-brand-blue font-mono font-semibold hover:underline mt-0.5"
            >
              {circuit.sourceBookingId} <ExternalLink size={12} />
            </button>
          ) : (
            <p className="text-sm text-gray-800 font-medium mt-0.5">—</p>
          )}
        </div>
        <InfoField label="Remarks" value={circuit.remarks} wide />
      </div>
    </Card>
  )
}

// ── Tab: Billing ─────────────────────────────────────────────────────────────

function BillingTab({ customer }) {
  const { id: customerId, subTab: subTabParam } = useParams()
  const navigate = useNavigate()
  const finance = buildFinance(customer)

  if (!subTabParam) {
    return <Navigate to={`/intercom/customers/${customerId}/billing/invoices`} replace />
  }
  const activeSlug = BILLING_SUB_TABS.find(t => t.slug === subTabParam)?.slug ?? 'invoices'
  const goTo = slug => navigate(`/intercom/customers/${customerId}/billing/${slug}`)

  return (
    <div className="space-y-5">
      <div className="flex border-b border-surface-border gap-6">
        {BILLING_SUB_TABS.map(t => (
          <button
            key={t.slug}
            onClick={() => goTo(t.slug)}
            className={`pb-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeSlug === t.slug ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
                {finance.invoices.map(inv => (
                  <tr key={inv.no} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold whitespace-nowrap">{inv.no}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{inv.pkg}</td>
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
        </Card>
      )}

      {activeSlug === 'payments' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-gray-800">Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  {['Receipt No', 'Invoice No', 'Date', 'Mode', 'Amount', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {finance.payments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No payments found.</td></tr>
                ) : finance.payments.map(pay => (
                  <tr key={pay.receiptNo} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold whitespace-nowrap">{pay.receiptNo}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.invoiceNo}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.date}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.mode}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">₹{pay.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{pay.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
                {finance.ledger.map((entry, i) => (
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
      )}
    </div>
  )
}

// ── Tab: Tickets ─────────────────────────────────────────────────────────────

function TicketsTab({ customer }) {
  const tickets = customer.tickets
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        <Button size="sm" icon={<Plus size={13} />}>Raise Ticket</Button>
      </div>
      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-card py-14 text-center">
          <Ticket size={28} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">No tickets found for this customer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => {
            const sc = TICKET_STATUS_CFG[t.status] ?? TICKET_STATUS_CFG.closed
            return (
              <Card key={t.id} className="hover:shadow-card-hover transition-shadow cursor-pointer" padding={false}>
                <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_CFG[t.priority]}`}>{t.priority}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{t.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.id} · Raised {t.created}</p>
                  </div>
                  <Badge variant={sc.variant} size="sm" dot>{sc.label}</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Hardware ────────────────────────────────────────────────────────────

function HardwareTab({ customer }) {
  const hardware = customer.hardware
  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">Assigned Hardware</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              {['Device Name', 'Serial No.', 'Assigned Date', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {hardware.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No hardware assigned.</td></tr>
            ) : hardware.map((h, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
                      <Cpu size={15} />
                    </div>
                    <span className="font-medium text-gray-800 whitespace-nowrap">{h.device}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{h.serial}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{h.assignedDate}</td>
                <td className="px-4 py-3">
                  <Badge variant={h.status === 'active' ? 'green' : 'gray'} size="sm" dot>
                    {h.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Tab: Activity Logs ───────────────────────────────────────────────────────

function ActivityTab({ customer }) {
  const activity = [
    { time: customer.circuit.activationDate, actor: customer.circuit.installationBy, event: 'Intercom circuit activated', meta: customer.circuit.circuitId },
    { time: customer.createdOn, actor: customer.salesExecutive, event: 'Customer account created', meta: customer.sourceLeadId ? `Converted from ${customer.sourceLeadId}` : null },
  ]
  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">Audit Trail</h3>
      </div>
      <div className="divide-y divide-surface-border">
        {activity.map((entry, i) => (
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

export default function IntercomCustomerDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()

  const customer = MOCK_INTERCOM_CUSTOMERS[id] ?? makeUnknownCustomer(id)
  const activeTab = SLUG_TO_TAB[tab] ?? 'Profile'

  if (!tab) return <Navigate to={`/intercom/customers/${id}/profile`} replace />

  function setActiveTab(tabName) {
    const slug = TAB_SLUGS[tabName]
    if (slug === 'billing') {
      navigate(`/intercom/customers/${id}/billing/invoices`)
    } else {
      navigate(`/intercom/customers/${id}/${slug}`)
    }
  }

  const statusCfg = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive

  return (
    <div className="p-6 space-y-5">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />

        {/* Breadcrumb */}
        <div className="px-5 lg:px-6 xl:px-7 2xl:px-8 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <span className="text-gray-400">Intercom</span>
          <span className="text-gray-300">›</span>
          <button onClick={() => navigate('/intercom/customers')} className="text-gray-400 hover:underline transition-colors">
            Customers
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{customer.id}</span>
        </div>
        <div className="border-t border-surface-border" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md">
              {customer.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
                <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
                <Badge variant="cyan" size="sm">Intercom</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-mono font-semibold text-cyan-700">{customer.id}</span>
                <span className="mx-2 text-gray-300">·</span>
                {customer.phone}
                <span className="mx-2 text-gray-300">·</span>
                {customer.email}
              </p>
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
        <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                ${activeTab === t
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'Profile'         && <ProfileTab        customer={customer} />}
          {activeTab === 'Circuit Details' && <CircuitDetailsTab customer={customer} />}
          {activeTab === 'Billing'         && <BillingTab        customer={customer} />}
          {activeTab === 'Tickets'         && <TicketsTab        customer={customer} />}
          {activeTab === 'Hardware'        && <HardwareTab       customer={customer} />}
          {activeTab === 'Activity Logs'   && <ActivityTab       customer={customer} />}
        </div>
      </div>
    </div>
  )
}
