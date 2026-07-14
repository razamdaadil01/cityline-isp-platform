import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  Ticket, MessageSquare, Ban, AlertTriangle, CheckCircle, Clock,
  Cpu, Activity, Download, FileText, ExternalLink, Plus, Wrench,
  Wifi, CheckCircle2, PackageSearch,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getInstallations, subscribeInstallations, INSTALLATION_ENGINEERS,
} from '../data/intercomInstallationsStore'
import { getHardware, subscribeHardware } from '../data/intercomHardwareStore'
import {
  getRecoveries, subscribeRecoveries, addRecovery, nextRecoveryId, RECOVERY_REASONS, RECOVERY_STATUS_CFG,
} from '../data/intercomRecoveryStore'
import { getLeads, saveLead as saveSalesLead, subscribeLeads, nextSalesLeadId } from '../data/leadsStore'

// ── Mock customer dataset ────────────────────────────────────────────────────

const MOCK_INTERCOM_CUSTOMERS = {
  'IC-CUST-2026-000001': {
    id: 'IC-CUST-2026-000001',
    name: 'Mohan Das',
    phone: '93456 78901',
    altPhone: '—',
    email: 'mohan.das@email.com',
    status: 'active',
    plan: 'Intercom Basic',
    billingAddress: 'Flat 302, Sai Darshan CHS, Four Bungalows Road, Andheri West',
    installationAddress: 'Flat 302, Sai Darshan CHS, Four Bungalows Road, Andheri West',
    zone: 'Andheri West',
    project: 'Sunrise Apartments',
    salesExecutive: 'Pradeep Kumar',
    createdOn: '20 Jun 2026',
    sourceLeadId: 'IL-2026-0003',
    installationId: 'IWO-2026-0001',
    linkedInternetCustomerId: 'RES-2026-0001',
    linkedInternetPackage: 'FTTH 100Mbps',
    linkedInternetStatus: 'Active',
    linkedInternetSince: '01 Jan 2023',
    kyc: { docType: 'Aadhaar', docNumber: 'XXXX-XXXX-4521', uploaded: true },
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
  'IC-CUST-2026-000002': {
    id: 'IC-CUST-2026-000002',
    name: 'Priya Nair',
    phone: '98765 43210',
    altPhone: '—',
    email: 'priya.nair@email.com',
    status: 'active',
    plan: 'Intercom Plus',
    billingAddress: 'B-204, Greenwood Residency, Bandra East',
    installationAddress: 'B-204, Greenwood Residency, Bandra East',
    zone: 'Bandra East',
    project: 'Greenwood Residency',
    salesExecutive: 'Anita Sharma',
    createdOn: '18 Jun 2026',
    sourceLeadId: 'IL-2026-0002',
    kyc: { docType: 'Aadhaar', docNumber: 'XXXX-XXXX-7788', uploaded: true },
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
  'IC-CUST-2026-000003': {
    id: 'IC-CUST-2026-000003',
    name: 'Suresh Patil',
    phone: '99887 76655',
    altPhone: '—',
    email: 'suresh.patil@email.com',
    status: 'suspended',
    plan: 'Intercom Basic',
    billingAddress: 'Shop 12, Metro Business Park, Goregaon',
    installationAddress: 'Shop 12, Metro Business Park, Goregaon',
    zone: 'Goregaon',
    project: 'Metro Business Park',
    salesExecutive: 'Vikram Patil',
    createdOn: '10 Jun 2026',
    sourceLeadId: 'IL-2026-0001',
    kyc: { docType: 'PAN', docNumber: 'ABCDE1234F', uploaded: true },
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
  'IC-CUST-2026-000004': {
    id: 'IC-CUST-2026-000004',
    name: 'Anita Desai',
    phone: '91234 56789',
    altPhone: '—',
    email: 'anita.desai@email.com',
    status: 'active',
    plan: 'Intercom Plus',
    billingAddress: 'C-501, Palm Grove Society, Versova',
    installationAddress: 'C-501, Palm Grove Society, Versova',
    zone: 'Versova',
    project: 'Palm Grove Society',
    salesExecutive: 'Pradeep Kumar',
    createdOn: '05 Jun 2026',
    sourceLeadId: 'IL-2026-0004',
    kyc: { docType: 'Aadhaar', docNumber: 'XXXX-XXXX-3345', uploaded: true },
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
  'IC-CUST-2026-000005': {
    id: 'IC-CUST-2026-000005',
    name: 'Rajesh Kumar',
    phone: '97654 32198',
    altPhone: '—',
    email: 'rajesh.kumar@email.com',
    status: 'terminated',
    plan: 'Intercom Basic',
    billingAddress: 'Flat 108, Sunrise Apartments, Andheri East',
    installationAddress: 'Flat 108, Sunrise Apartments, Andheri East',
    zone: 'Andheri East',
    project: 'Sunrise Apartments',
    salesExecutive: 'Anita Sharma',
    createdOn: '28 May 2026',
    sourceLeadId: 'IL-2026-0005',
    kyc: { docType: 'Voter ID', docNumber: 'ABC1234567', uploaded: false },
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
    status: 'inactive', plan: '—',
    billingAddress: '—', installationAddress: '—', zone: '—', project: '—',
    salesExecutive: '—', createdOn: '—', sourceLeadId: null, installationId: null,
    kyc: { docType: '—', docNumber: '—', uploaded: false },
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
  pending_termination: { variant: 'orange', label: 'Pending Termination' },
  terminated: { variant: 'red',   label: 'Terminated' },
}

const RECOVERY_TIME_SLOTS = ['Morning 9-12', 'Afternoon 12-3', 'Evening 3-6']

const KYC_STATUS = {
  uploaded: { icon: CheckCircle, color: 'text-brand-blue', label: 'Uploaded' },
  pending:  { icon: Clock,       color: 'text-amber-500',  label: 'Pending' },
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

const INSTALL_STATUS_CFG = {
  pending:    { variant: 'orange', label: 'Pending' },
  inprogress: { variant: 'blue',   label: 'In Progress' },
  completed:  { variant: 'green',  label: 'Completed' },
  cancelled:  { variant: 'red',    label: 'Cancelled' },
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

function statusDotColor(status) {
  const key = (status ?? '').toLowerCase()
  if (key === 'active') return 'bg-emerald-500'
  if (key === 'suspended') return 'bg-amber-400'
  return 'bg-gray-400'
}

function ServiceBadge({ label, colorClass, status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      {label}
      <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor(status)}`} />
    </span>
  )
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ customer }) {
  const navigate = useNavigate()
  const hasLinkedInternet = !!customer.linkedInternetCustomerId
  const intercomStatusCfg = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 space-y-5">
        <Card>
          <CardHeader title="Personal Details" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            <InfoField label="Full Name"     value={customer.name} />
            <InfoField label="Mobile (Primary)" value={customer.phone} />
            <InfoField label="Alternate Mobile" value={customer.altPhone} />
            <InfoField label="Email"         value={customer.email} />
            <InfoField label="Billing Address"      value={customer.billingAddress} wide />
            <InfoField label="Installation Address" value={customer.installationAddress} wide />
            <InfoField label="Project"       value={customer.project} />
            <InfoField label="Area/Zone"     value={customer.zone} />
            <InfoField label="Sales Executive" value={customer.salesExecutive} />
            <InfoField label="Intercom Circuit ID" value={customer.circuit.circuitId} mono />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Lead ID</p>
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

        <Card>
          <CardHeader title="Active Services" subtitle="Services linked to this customer account" />
          <div className={`grid grid-cols-1 ${hasLinkedInternet ? 'sm:grid-cols-2' : ''} gap-6`}>
            {hasLinkedInternet && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide">Internet Service</p>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <InfoField label="Service Type" value="Internet" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer ID</p>
                    <button
                      onClick={() => navigate(`/customers/${customer.linkedInternetCustomerId}/profile`)}
                      className="text-sm font-mono font-semibold text-brand-blue hover:underline mt-0.5"
                    >
                      {customer.linkedInternetCustomerId}
                    </button>
                  </div>
                  <InfoField label="Package" value={customer.linkedInternetPackage} />
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</p>
                    <Badge variant="green" size="sm">{customer.linkedInternetStatus}</Badge>
                  </div>
                  <InfoField label="Since" value={customer.linkedInternetSince} />
                </div>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Intercom Service</p>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <InfoField label="Service Type" value="Intercom" />
                <InfoField label="Customer ID" value={customer.id} mono />
                <InfoField label="Package" value={customer.plan} />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</p>
                  <Badge variant={intercomStatusCfg.variant} size="sm">{intercomStatusCfg.label}</Badge>
                </div>
                <InfoField label="Since" value={customer.createdOn} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="KYC Documents" />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-3">
            <InfoField label="Document Type"   value={customer.kyc.docType} />
            <InfoField label="Document Number" value={customer.kyc.docNumber} mono />
          </div>
          <div>
            <KycRow label="Uploaded Document" statusKey={customer.kyc.uploaded ? 'uploaded' : 'pending'} />
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

// ── Convert to Internet Modal ─────────────────────────────────────────────────

function ConvertToInternetModal({ isOpen, customer, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert to Internet Customer" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm & Create Lead</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This will create a new Internet Lead for <span className="font-semibold text-gray-800">{customer.name}</span>,
          linked to their existing Intercom service (<span className="font-mono font-semibold text-cyan-700">{customer.id}</span>).
          Their Intercom service will remain unchanged.
        </p>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 p-4 rounded-xl bg-gray-50 border border-surface-border">
          <InfoField label="Name" value={customer.name} />
          <InfoField label="Mobile" value={customer.phone} />
          <InfoField label="Area/Locality" value={customer.zone} />
          <InfoField label="Installation Address" value={customer.installationAddress} wide />
        </div>
      </div>
    </Modal>
  )
}

// ── Schedule Hardware Recovery Modal ──────────────────────────────────────────

function initRecoveryForm(customer, defaultReason) {
  return {
    reason: defaultReason,
    hardwareToRecover: (customer.hardware ?? []).map(h => `${h.device} (${h.serial})`).join(', '),
    technician: '', recoveryDate: '', timeSlot: '', visitNotes: '', accessInstructions: '', altNumber: '',
  }
}

function ScheduleHardwareRecoveryModal({ isOpen, customer, defaultReason, onClose, onSubmit }) {
  const [form, setForm] = useState(() => initRecoveryForm(customer, defaultReason))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm(initRecoveryForm(customer, defaultReason)); setErrors({}) }
  }, [isOpen, customer, defaultReason])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: '' })) }

  function handleSubmit() {
    const e = {}
    if (!form.technician) e.technician = 'Select a technician'
    if (!form.recoveryDate) e.recoveryDate = 'Recovery visit date is required'
    if (!form.timeSlot) e.timeSlot = 'Select a time slot'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Hardware Recovery" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Schedule Visit</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FormField label="Customer Name">
          <Input value={customer.name} disabled />
        </FormField>
        <FormField label="Intercom Customer ID">
          <Input value={customer.id} disabled className="font-mono" />
        </FormField>
        <FormField label="Reason for Recovery">
          <Select value={form.reason} onChange={e => set('reason', e.target.value)}>
            {RECOVERY_REASONS.map(r => <option key={r}>{r}</option>)}
          </Select>
        </FormField>
        <FormField label="Assigned Technician" required error={errors.technician}>
          <Select value={form.technician} onChange={e => set('technician', e.target.value)}>
            <option value="">Select technician…</option>
            {INSTALLATION_ENGINEERS.map(eng => <option key={eng.id} value={eng.name}>{eng.name}</option>)}
          </Select>
        </FormField>
        <div className="col-span-2">
          <FormField label="Installed Hardware to Recover">
            <Textarea value={form.hardwareToRecover} onChange={e => set('hardwareToRecover', e.target.value)} rows={2}
              placeholder="e.g. Intercom Panel Unit, Handset Unit…" />
          </FormField>
        </div>
        <FormField label="Recovery Visit Date" required error={errors.recoveryDate}>
          <Input type="date" value={form.recoveryDate} onChange={e => set('recoveryDate', e.target.value)} />
        </FormField>
        <FormField label="Time Slot" required error={errors.timeSlot}>
          <Select value={form.timeSlot} onChange={e => set('timeSlot', e.target.value)}>
            <option value="">Select slot…</option>
            {RECOVERY_TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <div className="col-span-2">
          <FormField label="Visit Notes">
            <Textarea value={form.visitNotes} onChange={e => set('visitNotes', e.target.value)} rows={2} placeholder="Any additional notes for the visit…" />
          </FormField>
        </div>
        <div className="col-span-2">
          <FormField label="Access Instructions">
            <Textarea value={form.accessInstructions} onChange={e => set('accessInstructions', e.target.value)} rows={2} placeholder="Gate code, floor access, etc…" />
          </FormField>
        </div>
        <FormField label="Contact Number">
          <Input value={customer.phone} disabled />
        </FormField>
        <FormField label="Alternative Number">
          <Input
            type="tel"
            value={form.altNumber}
            onChange={e => set('altNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
          />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function IntercomCustomerDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()

  const [overrides, setOverrides] = useState({})
  useEffect(() => setOverrides({}), [id])

  const customer = { ...(MOCK_INTERCOM_CUSTOMERS[id] ?? makeUnknownCustomer(id)), ...overrides }
  const activeTab = SLUG_TO_TAB[tab] ?? 'Profile'

  const [installations, setInstallations] = useState(getInstallations())
  useEffect(() => subscribeInstallations(setInstallations), [])
  const linkedInstallation = customer.installationId
    ? installations.find(o => o.id === customer.installationId) ?? null
    : null

  const [hardware, setHardware] = useState(getHardware())
  useEffect(() => subscribeHardware(setHardware), [])
  const linkedHardware = linkedInstallation?.assignedHardware?.length
    ? hardware.filter(h => linkedInstallation.assignedHardware.includes(h.serial))
    : []

  const [salesLeads, setSalesLeads] = useState(getLeads())
  useEffect(() => subscribeLeads(setSalesLeads), [])
  const linkedInternetLead = overrides.internetLeadId
    ? salesLeads.find(l => l.id === overrides.internetLeadId) ?? null
    : null

  const [recoveries, setRecoveries] = useState(getRecoveries())
  useEffect(() => subscribeRecoveries(setRecoveries), [])
  const existingRecovery = recoveries.find(r => r.customerId === customer.id) ?? null

  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => setSuccessMessage(''), 4000)
    return () => clearTimeout(t)
  }, [successMessage])

  if (!tab) return <Navigate to={`/intercom/customers/${id}/profile`} replace />

  function setActiveTab(tabName) {
    const slug = TAB_SLUGS[tabName]
    if (slug === 'billing') {
      navigate(`/intercom/customers/${id}/billing/invoices`)
    } else {
      navigate(`/intercom/customers/${id}/${slug}`)
    }
  }

  function handleConvertToInternet() {
    if (overrides.internetLeadId) { setConvertModalOpen(false); return }
    const today = new Date().toISOString().slice(0, 10)
    const leadId = nextSalesLeadId()
    saveSalesLead({
      id: leadId,
      pipeline: 'B2C',
      leadName: `${customer.name} — Internet Conversion`,
      name: customer.name,
      phone: (customer.phone ?? '').replace(/\D/g, ''),
      email: customer.email,
      area: customer.zone,
      address: customer.installationAddress,
      source: 'Intercom Conversion',
      sourceType: 'Intercom Conversion',
      convertedFromIntercomId: customer.id,
      stage: 'New Inquiry',
      plan: '',
      assigned: customer.salesExecutive ?? '',
      assignedInitials: '??',
      assignedColor: 'bg-gray-400',
      daysInStage: 0,
      lastActivity: 'Converted from Intercom',
      followUp: '',
      priority: 'medium',
      ekycStatus: null,
      hwAssigned: null,
      createdAt: today,
      createdBy: 'Admin User',
      notes: '',
    })
    setOverrides(o => ({ ...o, internetLeadId: leadId }))
    setConvertModalOpen(false)
    setSuccessMessage(`Internet Lead created! Lead ID: ${leadId}`)
  }

  function handleScheduleRecovery(form) {
    if (existingRecovery) { setRecoveryModalOpen(false); return }
    const now = new Date()
    const createdDate = now.toLocaleDateString('en-GB').split('/').join('-')
    const [y, m, d] = form.recoveryDate.split('-')
    const workOrderId = nextRecoveryId()
    addRecovery({
      id: workOrderId,
      customerId: customer.id,
      customer: customer.name,
      phone: customer.phone,
      reason: form.reason,
      hardwareToRecover: form.hardwareToRecover,
      technician: form.technician,
      scheduledDate: `${d}-${m}-${y}`,
      timeSlot: form.timeSlot,
      accessInstructions: form.accessInstructions,
      altNumber: form.altNumber,
      createdDate,
      notes: form.visitNotes,
      status: 'pending',
    })
    setRecoveryModalOpen(false)
    setSuccessMessage(`Hardware Recovery Visit scheduled! Work Order: ${workOrderId}`)
  }

  const statusCfg = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive
  const canConvertToInternet = !customer.linkedInternetCustomerId && !overrides.internetLeadId
  const isTerminated = customer.status === 'terminated'
  const isConvertedToInternet = !!overrides.internetLeadId
  const canScheduleRecovery = (isTerminated || isConvertedToInternet) && !existingRecovery
  const recoveryDefaultReason = isTerminated ? RECOVERY_REASONS[0] : RECOVERY_REASONS[1]

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
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
                <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {customer.linkedInternetCustomerId && (
                  <ServiceBadge label="Internet Service" colorClass="bg-brand-blue/10 text-brand-blue" status={customer.linkedInternetStatus} />
                )}
                <ServiceBadge label="Intercom Service" colorClass="bg-cyan-100 text-cyan-700" status={customer.status} />
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
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-surface-border">
            <Button variant="secondary" size="sm" icon={<Ticket size={13} />}>Raise Ticket</Button>
            <Button variant="secondary" size="sm" icon={<MessageSquare size={13} />}>Send SMS</Button>
            {canConvertToInternet && (
              <Button size="sm" icon={<Wifi size={13} />} onClick={() => setConvertModalOpen(true)}>
                Convert to Internet
              </Button>
            )}
            {linkedInstallation && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/5 border border-brand-blue/20" title={linkedHardware.map(h => `${h.deviceType} (${h.serial})`).join(', ')}>
                <Wrench size={13} className="text-brand-blue shrink-0" />
                <span className="text-xs text-gray-700">
                  Installation Work Order:{' '}
                  <button
                    onClick={() => navigate(`/intercom/installations/${linkedInstallation.id}`)}
                    className="font-mono font-semibold text-brand-blue hover:underline"
                  >
                    {linkedInstallation.id}
                  </button>
                  {linkedHardware.length > 0 && (
                    <span className="text-gray-400"> · {linkedHardware.map(h => h.deviceType).join(', ')}</span>
                  )}
                </span>
                <Badge variant={(INSTALL_STATUS_CFG[linkedInstallation.status] ?? INSTALL_STATUS_CFG.pending).variant} size="sm" dot>
                  {(INSTALL_STATUS_CFG[linkedInstallation.status] ?? INSTALL_STATUS_CFG.pending).label}
                </Badge>
              </div>
            )}
            {linkedInternetLead && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200">
                <Wifi size={13} className="text-cyan-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  Internet Lead Created:{' '}
                  <button
                    onClick={() => navigate(`/sales/leads/${linkedInternetLead.id}`)}
                    className="font-mono font-semibold text-cyan-700 hover:underline"
                  >
                    {linkedInternetLead.id}
                  </button>
                  {' '}→
                </span>
                <Badge variant="blue" size="sm" dot>{linkedInternetLead.stage}</Badge>
              </div>
            )}
            {canScheduleRecovery && (
              <Button size="sm" icon={<PackageSearch size={13} />} onClick={() => setRecoveryModalOpen(true)}>
                Schedule Hardware Recovery
              </Button>
            )}
            {existingRecovery && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
                <PackageSearch size={13} className="text-purple-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  Hardware Recovery Scheduled:{' '}
                  <button
                    onClick={() => navigate('/intercom/hardware-recovery')}
                    className="font-mono font-semibold text-purple-700 hover:underline"
                  >
                    {existingRecovery.id}
                  </button>
                </span>
                <Badge variant={(RECOVERY_STATUS_CFG[existingRecovery.status] ?? RECOVERY_STATUS_CFG.pending).variant} size="sm" dot>
                  {(RECOVERY_STATUS_CFG[existingRecovery.status] ?? RECOVERY_STATUS_CFG.pending).label}
                </Badge>
              </div>
            )}
            <Button variant="orange"    size="sm" icon={<Ban size={13} />}>Suspend</Button>
            <Button variant="danger"    size="sm" icon={<AlertTriangle size={13} />}>Terminate</Button>
          </div>

          {successMessage && (
            <div className="mt-4 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              {successMessage}
            </div>
          )}
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

      <ConvertToInternetModal
        isOpen={convertModalOpen}
        customer={customer}
        onClose={() => setConvertModalOpen(false)}
        onConfirm={handleConvertToInternet}
      />
      <ScheduleHardwareRecoveryModal
        isOpen={recoveryModalOpen}
        customer={customer}
        defaultReason={recoveryDefaultReason}
        onClose={() => setRecoveryModalOpen(false)}
        onSubmit={handleScheduleRecovery}
      />
    </div>
  )
}
