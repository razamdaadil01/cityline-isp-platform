import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Wallet, TrendingUp, AlertCircle, Plus,
  CreditCard, BookOpen, BarChart3, Download, RefreshCw
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'

// ── Mock data ────────────────────────────────────────────────────────────────

const RESELLER_MAP = {
  'RS-001': { id: 'RS-001', name: 'Raj Networks',       username: 'rajnet',    phone: '98765 43210', email: 'admin@rajnetworks.com', priceBook: 'Standard',   profit: 15, wallet: 25000, dues: 5000,  server: 'JAZE-MUM-01', status: 'active',    address: 'Shop 4, Andheri West, Mumbai' },
  'RS-002': { id: 'RS-002', name: 'Skylink Broadband',  username: 'skylink',   phone: '97654 32109', email: 'info@skylink.net',      priceBook: 'Premium',    profit: 18, wallet: 62000, dues: 0,     server: 'JAZE-MUM-02', status: 'active',    address: 'Plot 12, Bandra East, Mumbai' },
  'RS-003': { id: 'RS-003', name: 'Metro ISP',          username: 'metroisp',  phone: '96543 21098', email: 'ops@metroisp.in',       priceBook: 'Wholesale',  profit: 22, wallet: 8500,  dues: 12000, server: 'JAZE-MUM-01', status: 'active',    address: 'Office 7, Goregaon East, Mumbai' },
  'RS-004': { id: 'RS-004', name: 'FastNet Services',   username: 'fastnet',   phone: '95432 10987', email: 'contact@fastnet.co',    priceBook: 'Enterprise', profit: 20, wallet: 45000, dues: 2000,  server: 'JAZE-THN-01', status: 'active',    address: 'Unit 3, Thane West' },
  'RS-005': { id: 'RS-005', name: 'Connect India',      username: 'connectin', phone: '94321 09876', email: 'hello@connectin.com',   priceBook: 'Standard',   profit: 12, wallet: 3200,  dues: 8500,  server: 'JAZE-MUM-02', status: 'suspended', address: 'Kurla West, Mumbai' },
  'RS-006': { id: 'RS-006', name: 'AlphaWave Net',      username: 'alphawave', phone: '93210 98765', email: 'admin@alphawave.net',   priceBook: 'Premium',    profit: 17, wallet: 18000, dues: 0,     server: 'JAZE-PUN-01', status: 'active',    address: 'Sector 15, Pune' },
  'RS-007': { id: 'RS-007', name: 'DigiLink Pvt Ltd',   username: 'digilink',  phone: '92109 87654', email: 'ops@digilink.in',       priceBook: 'Wholesale',  profit: 25, wallet: 91000, dues: 0,     server: 'JAZE-MUM-01', status: 'active',    address: 'Malad West, Mumbai' },
  'RS-008': { id: 'RS-008', name: 'Nexus Telecom',      username: 'nexustele', phone: '91098 76543', email: 'info@nexustelecom.in',  priceBook: 'Budget',     profit: 10, wallet: 1200,  dues: 18000, server: 'JAZE-THN-01', status: 'inactive',  address: 'Kalyan, Thane' },
  'RS-009': { id: 'RS-009', name: 'GreenNet ISP',       username: 'greennet',  phone: '90987 65432', email: 'admin@greennet.in',     priceBook: 'Standard',   profit: 14, wallet: 33000, dues: 4000,  server: 'JAZE-MUM-02', status: 'active',    address: 'Kandivali East, Mumbai' },
  'RS-010': { id: 'RS-010', name: 'OmniConnect',        username: 'omniconn',  phone: '89876 54321', email: 'hello@omniconnect.net', priceBook: 'Enterprise', profit: 21, wallet: 72000, dues: 0,     server: 'JAZE-PUN-01', status: 'active',    address: 'Baner, Pune' },
}

const genCustomers = (resellerId) => Array.from({ length: 12 }, (_, i) => ({
  id:      `CL-R${resellerId.slice(-3)}-${String(i + 1).padStart(3, '0')}`,
  name:    ['Amit Shah', 'Riya Patel', 'Mohan Das', 'Sunita Rao', 'Kiran Joshi', 'Priya Verma', 'Ramesh Nair', 'Seema Khan', 'Ajay Mehta', 'Lata Gupta', 'Suresh Iyer', 'Neha Singh'][i],
  plan:    ['FTTH 50Mbps', 'FTTH 100Mbps', 'FTTB 50Mbps', 'FTTH 200Mbps', 'Wireless 25Mbps'][i % 5],
  amount:  [499, 699, 999, 1299, 1499, 1999][i % 6],
  expiry:  `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i * 3 % 28) + 1).padStart(2, '0')}`,
  status:  i % 7 === 0 ? 'suspended' : i % 9 === 0 ? 'expired' : 'active',
}))

const genPayments = (resellerId) => Array.from({ length: 8 }, (_, i) => ({
  id:      `PAY-${resellerId.slice(-3)}-${String(i + 1).padStart(4, '0')}`,
  date:    `2026-${String(5 - Math.floor(i / 2)).padStart(2, '0')}-${String(28 - (i * 3 % 20)).padStart(2, '0')}`,
  amount:  [10000, 25000, 15000, 5000, 20000, 8000, 30000, 12000][i],
  mode:    ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'NEFT'][i % 5],
  ref:     `REF${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  note:    i % 3 === 0 ? 'Wallet top-up' : i % 3 === 1 ? 'Monthly settlement' : 'Advance payment',
}))

const genTopups = (resellerId) => Array.from({ length: 10 }, (_, i) => ({
  id:      `TU-${resellerId.slice(-3)}-${String(i + 1).padStart(4, '0')}`,
  date:    `2026-${String(5 - Math.floor(i / 3)).padStart(2, '0')}-${String(20 - i * 2).padStart(2, '0')}`,
  customer: ['Amit Shah', 'Riya Patel', 'Mohan Das', 'Sunita Rao', 'Kiran Joshi', 'Priya Verma', 'Ramesh Nair', 'Seema Khan', 'Ajay Mehta', 'Lata Gupta'][i],
  plan:    ['FTTH 50Mbps', 'FTTH 100Mbps', 'FTTB 50Mbps', 'FTTH 200Mbps', 'Wireless 25Mbps'][i % 5],
  amount:  [499, 699, 999, 1299, 1499][i % 5],
  commission: [75, 126, 200, 260, 255][i % 5],
}))

const PRICE_BOOK_PLANS = [
  { id: 'PL-01', name: 'FTTH 50Mbps',      mrp: 599,  resellerPrice: 499,  speed: '50 Mbps',  validity: '30 days' },
  { id: 'PL-02', name: 'FTTH 100Mbps',     mrp: 799,  resellerPrice: 649,  speed: '100 Mbps', validity: '30 days' },
  { id: 'PL-03', name: 'FTTH 200Mbps',     mrp: 1199, resellerPrice: 949,  speed: '200 Mbps', validity: '30 days' },
  { id: 'PL-04', name: 'FTTB 50Mbps',      mrp: 699,  resellerPrice: 569,  speed: '50 Mbps',  validity: '30 days' },
  { id: 'PL-05', name: 'Wireless 25Mbps',  mrp: 449,  resellerPrice: 379,  speed: '25 Mbps',  validity: '30 days' },
  { id: 'PL-06', name: 'FTTH 500Mbps',     mrp: 1999, resellerPrice: 1549, speed: '500 Mbps', validity: '30 days' },
]

const STATUS_CFG = {
  active:    { variant: 'green',  label: 'Active' },
  suspended: { variant: 'yellow', label: 'Suspended' },
  inactive:  { variant: 'gray',   label: 'Inactive' },
  expired:   { variant: 'red',    label: 'Expired' },
}

const TABS = [
  { key: 'customers',  label: 'Customers',       icon: Users },
  { key: 'commission', label: 'Commission',       icon: TrendingUp },
  { key: 'payments',   label: 'Payment History',  icon: CreditCard },
  { key: 'dues',       label: 'Outstanding Dues', icon: AlertCircle },
  { key: 'topup',      label: 'Topup Report',     icon: BarChart3 },
  { key: 'pricebook',  label: 'Price Book',       icon: BookOpen },
]

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ label, value, sub, color = 'default' }) {
  const colors = {
    default: 'text-gray-900',
    green:   'text-emerald-600',
    red:     'text-red-500',
    blue:    'text-brand-blue',
  }
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold leading-tight ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {action}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ResellerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('customers')
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupNote, setTopupNote] = useState('')

  const reseller = RESELLER_MAP[id]

  const customers  = useMemo(() => genCustomers(id),  [id])
  const payments   = useMemo(() => genPayments(id),   [id])
  const topups     = useMemo(() => genTopups(id),     [id])

  if (!reseller) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Reseller not found.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/resellers')}>
          Back to Resellers
        </Button>
      </div>
    )
  }

  const totalCommission = topups.reduce((s, t) => s + t.commission, 0)
  const statusCfg = STATUS_CFG[reseller.status] ?? STATUS_CFG.inactive

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/resellers')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center text-white text-base font-bold">
              {reseller.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{reseller.name}</h1>
                <Badge variant={statusCfg.variant} dot size="sm">{statusCfg.label}</Badge>
              </div>
              <p className="text-sm text-gray-500">@{reseller.username} · {reseller.phone} · {reseller.server}</p>
            </div>
          </div>
        </div>
        <Button
          variant="orange"
          size="sm"
          icon={<Wallet size={14} />}
          onClick={() => setShowTopupModal(true)}
        >
          Wallet Top-up
        </Button>
        <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <InfoCard label="Price Book"        value={reseller.priceBook}                              />
        <InfoCard label="Profit Margin"     value={`${reseller.profit}%`}         color="green"    />
        <InfoCard label="Wallet Balance"    value={`₹${reseller.wallet.toLocaleString()}`} color="blue" />
        <InfoCard label="Outstanding Dues"  value={reseller.dues > 0 ? `₹${reseller.dues.toLocaleString()}` : '₹0'} color={reseller.dues > 0 ? 'red' : 'green'} />
        <InfoCard label="Total Customers"   value={customers.length} sub="currently active"        />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-surface-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── Customers Tab ── */}
          {activeTab === 'customers' && (
            <div>
              <SectionHeader title={`${customers.length} Customers`} action={
                <Button size="xs" variant="secondary" icon={<Download size={12} />}>Export</Button>
              } />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-gray-50/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer ID</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly (₹)</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {customers.map(c => {
                      const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.inactive
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-brand-blue">{c.id}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{c.plan}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-700">₹{c.amount}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{c.expiry}</td>
                          <td className="px-4 py-2.5"><Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Commission Tab ── */}
          {activeTab === 'commission' && (
            <div>
              <SectionHeader title="Commission Earned" />
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Total Commission (This Month)</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">₹{totalCommission.toLocaleString()}</p>
                </div>
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-brand-blue font-medium">Profit Margin</p>
                  <p className="text-2xl font-bold text-brand-blue mt-1">{reseller.profit}%</p>
                </div>
                <div className="bg-navy/5 border border-navy/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-navy font-medium">Active Topups (Month)</p>
                  <p className="text-2xl font-bold text-navy mt-1">{topups.length}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-gray-50/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Amount (₹)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {topups.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{t.date}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{t.customer}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{t.plan}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">₹{t.amount}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">₹{t.commission}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={4} className="px-4 py-2.5 text-sm text-gray-700 text-right">Total Commission</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">₹{totalCommission.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Payment History Tab ── */}
          {activeTab === 'payments' && (
            <div>
              <SectionHeader title="Payment History" action={
                <Button size="xs" variant="secondary" icon={<Download size={12} />}>Export</Button>
              } />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-gray-50/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment ID</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₹)</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mode</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-brand-blue">{p.id}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{p.date}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">₹{p.amount.toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-brand-blue/10 text-brand-blue font-medium">{p.mode}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.ref}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{p.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Outstanding Dues Tab ── */}
          {activeTab === 'dues' && (
            <div>
              <SectionHeader title="Outstanding Dues" />
              {reseller.dues === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle size={24} className="text-emerald-500" />
                  </div>
                  <p className="text-gray-600 font-medium">No Outstanding Dues</p>
                  <p className="text-sm text-gray-400 mt-1">This reseller has a clear balance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-700">Total Outstanding Amount</p>
                      <p className="text-3xl font-bold text-red-600 mt-1">₹{reseller.dues.toLocaleString()}</p>
                    </div>
                    <Button variant="danger" size="sm" icon={<CreditCard size={14} />}>Record Payment</Button>
                  </div>
                  <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border bg-gray-50/60">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₹)</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ageing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-700">Monthly settlement – April 2026</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">2026-04-30</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-red-500">₹{Math.floor(reseller.dues * 0.6).toLocaleString()}</td>
                          <td className="px-4 py-2.5"><span className="text-xs font-medium text-red-500">7 days overdue</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-700">Pending top-up charges – May 2026</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">2026-05-15</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-amber-500">₹{Math.floor(reseller.dues * 0.4).toLocaleString()}</td>
                          <td className="px-4 py-2.5"><span className="text-xs font-medium text-amber-500">Due in 8 days</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Topup Report Tab ── */}
          {activeTab === 'topup' && (
            <div>
              <SectionHeader title="Topup Report" action={
                <Button size="xs" variant="secondary" icon={<Download size={12} />}>Export</Button>
              } />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-gray-50/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Topup ID</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₹)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {topups.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-brand-blue">{t.id}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{t.date}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{t.customer}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{t.plan}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-700">₹{t.amount}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">₹{t.commission}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={4} className="px-4 py-2.5 text-sm text-gray-700 text-right">Totals</td>
                      <td className="px-4 py-2.5 text-right text-gray-800">₹{topups.reduce((s, t) => s + t.amount, 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">₹{totalCommission.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Price Book Tab ── */}
          {activeTab === 'pricebook' && (
            <div>
              <SectionHeader title={`Price Book: ${reseller.priceBook}`} action={
                <Button size="xs" icon={<Plus size={12} />}>Add Plan</Button>
              } />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-gray-50/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Speed</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Validity</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">MRP (₹)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Reseller Price (₹)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin (₹)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {PRICE_BOOK_PLANS.map(plan => {
                      const margin = plan.mrp - plan.resellerPrice
                      const pct    = ((margin / plan.mrp) * 100).toFixed(1)
                      return (
                        <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{plan.name}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{plan.speed}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{plan.validity}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">₹{plan.mrp}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-brand-blue">₹{plan.resellerPrice}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">₹{margin}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{pct}%</span>
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
      </div>

      {/* ── Wallet Top-up Modal ── */}
      <Modal
        isOpen={showTopupModal}
        onClose={() => { setShowTopupModal(false); setTopupAmount(''); setTopupNote('') }}
        title="Wallet Top-up"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowTopupModal(false)}>Cancel</Button>
            <Button variant="orange" size="sm" disabled={!topupAmount} onClick={() => setShowTopupModal(false)}>
              Add ₹{topupAmount || '0'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-navy/5 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Current Wallet Balance</p>
            <p className="text-2xl font-bold text-navy">₹{reseller.wallet.toLocaleString()}</p>
          </div>
          <FormField label="Top-up Amount (₹)" required>
            <Input
              type="number" min="0"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </FormField>
          <FormField label="Note">
            <Input value={topupNote} onChange={e => setTopupNote(e.target.value)} placeholder="Optional note" />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
