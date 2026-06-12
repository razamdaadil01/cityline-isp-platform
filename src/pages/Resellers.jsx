import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Download, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  Users, Wallet, TrendingUp, AlertCircle
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'

// ── Mock data ────────────────────────────────────────────────────────────────

const PRICE_BOOKS = ['Standard', 'Premium', 'Enterprise', 'Wholesale', 'Budget']
const SERVERS = ['JAZE-MUM-01', 'JAZE-MUM-02', 'JAZE-THN-01', 'JAZE-PUN-01']

const RESELLERS = [
  { id: 'RS-001', name: 'Raj Networks',       username: 'rajnet',    phone: '98765 43210', priceBook: 'Standard',   profit: 15, wallet: 25000, dues: 5000,  server: 'JAZE-MUM-01', customers: 48, status: 'active' },
  { id: 'RS-002', name: 'Skylink Broadband',  username: 'skylink',   phone: '97654 32109', priceBook: 'Premium',    profit: 18, wallet: 62000, dues: 0,     server: 'JAZE-MUM-02', customers: 112, status: 'active' },
  { id: 'RS-003', name: 'Metro ISP',          username: 'metroisp',  phone: '96543 21098', priceBook: 'Wholesale',  profit: 22, wallet: 8500,  dues: 12000, server: 'JAZE-MUM-01', customers: 76, status: 'active' },
  { id: 'RS-004', name: 'FastNet Services',   username: 'fastnet',   phone: '95432 10987', priceBook: 'Enterprise', profit: 20, wallet: 45000, dues: 2000,  server: 'JAZE-THN-01', customers: 93, status: 'active' },
  { id: 'RS-005', name: 'Connect India',      username: 'connectin', phone: '94321 09876', priceBook: 'Standard',   profit: 12, wallet: 3200,  dues: 8500,  server: 'JAZE-MUM-02', customers: 31, status: 'suspended' },
  { id: 'RS-006', name: 'AlphaWave Net',      username: 'alphawave', phone: '93210 98765', priceBook: 'Premium',    profit: 17, wallet: 18000, dues: 0,     server: 'JAZE-PUN-01', customers: 57, status: 'active' },
  { id: 'RS-007', name: 'DigiLink Pvt Ltd',   username: 'digilink',  phone: '92109 87654', priceBook: 'Wholesale',  profit: 25, wallet: 91000, dues: 0,     server: 'JAZE-MUM-01', customers: 204, status: 'active' },
  { id: 'RS-008', name: 'Nexus Telecom',      username: 'nexustele', phone: '91098 76543', priceBook: 'Budget',     profit: 10, wallet: 1200,  dues: 18000, server: 'JAZE-THN-01', customers: 19, status: 'inactive' },
  { id: 'RS-009', name: 'GreenNet ISP',       username: 'greennet',  phone: '90987 65432', priceBook: 'Standard',   profit: 14, wallet: 33000, dues: 4000,  server: 'JAZE-MUM-02', customers: 67, status: 'active' },
  { id: 'RS-010', name: 'OmniConnect',        username: 'omniconn',  phone: '89876 54321', priceBook: 'Enterprise', profit: 21, wallet: 72000, dues: 0,     server: 'JAZE-PUN-01', customers: 138, status: 'active' },
]

const STATUS_CFG = {
  active:    { variant: 'green',  label: 'Active' },
  suspended: { variant: 'yellow', label: 'Suspended' },
  inactive:  { variant: 'gray',   label: 'Inactive' },
}

const PAGE_SIZE = 10
const STATUS_TABS = ['All', 'Active', 'Suspended', 'Inactive']

const EMPTY_FORM = {
  name: '', username: '', phone: '', email: '', priceBook: 'Standard',
  profit: '', wallet: '', server: 'JAZE-MUM-01', address: '', notes: '',
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-brand-blue/10 text-brand-blue',
    orange: 'bg-brand-orange/10 text-brand-orange',
    green:  'bg-emerald-100 text-emerald-600',
    red:    'bg-red-100 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Resellers() {
  const navigate = useNavigate()
  const [search,      setSearch]      = useState('')
  const [statusTab,   setStatusTab]   = useState('All')
  const [page,        setPage]        = useState(1)
  const [showModal,   setShowModal]   = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [resellers,   setResellers]   = useState(RESELLERS)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return resellers.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !r.username.includes(q) && !r.phone.includes(q)) return false
      if (statusTab !== 'All' && r.status !== statusTab.toLowerCase()) return false
      return true
    })
  }, [search, statusTab, resellers])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    total:      resellers.length,
    active:     resellers.filter(r => r.status === 'active').length,
    totalWallet: resellers.reduce((s, r) => s + r.wallet, 0),
    totalDues:   resellers.reduce((s, r) => s + r.dues, 0),
    customers:   resellers.reduce((s, r) => s + r.customers, 0),
  }), [resellers])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleAdd() {
    if (!form.name.trim() || !form.username.trim()) return
    const newR = {
      id:         `RS-${String(resellers.length + 1).padStart(3, '0')}`,
      name:       form.name,
      username:   form.username,
      phone:      form.phone,
      priceBook:  form.priceBook,
      profit:     parseFloat(form.profit) || 0,
      wallet:     parseFloat(form.wallet) || 0,
      dues:       0,
      server:     form.server,
      customers:  0,
      status:     'active',
    }
    setResellers(prev => [newR, ...prev])
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reseller Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {resellers.length} resellers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setShowModal(true)}>Add Reseller</Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Resellers"   value={stats.total}                                   sub={`${stats.active} active`}        color="blue"   />
        <StatCard icon={TrendingUp}   label="Total Customers"   value={stats.customers.toLocaleString()}              sub="via all resellers"               color="green"  />
        <StatCard icon={Wallet}       label="Total Wallet"      value={`₹${stats.totalWallet.toLocaleString()}`}      sub="combined balance"                color="blue"   />
        <StatCard icon={AlertCircle}  label="Outstanding Dues"  value={`₹${stats.totalDues.toLocaleString()}`}        sub="across all resellers"            color="red"    />
      </div>

      {/* ── Search + Tabs ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, username, phone…"
            className="pl-9 pr-8 py-1.5 text-sm w-64 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1 ml-auto bg-gray-100 rounded-lg p-0.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setStatusTab(tab); setPage(1) }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${statusTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reseller</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price Book</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Profit %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Dues</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Server</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-gray-200" />
                    No resellers found
                  </td>
                </tr>
              ) : paginated.map(r => {
                const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.inactive
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/resellers/${r.id}`)}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 whitespace-nowrap">{r.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{r.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{r.username}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{r.phone}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-navy/10 text-navy">{r.priceBook}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 font-semibold text-sm">{r.profit}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-800">₹{r.wallet.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.dues > 0
                        ? <span className="font-semibold text-red-500">₹{r.dues.toLocaleString()}</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 font-mono">{r.server}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700">{r.customers}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/resellers/${r.id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 rounded transition-colors"
                        >
                          View
                        </button>
                        <button className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
          <p className="text-xs text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${p === page ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Reseller Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_FORM) }}
        title="Add New Reseller"
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!form.name.trim() || !form.username.trim()}>Add Reseller</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Business Name" required>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Raj Networks" />
          </FormField>
          <FormField label="Username" required>
            <Input value={form.username} onChange={e => set('username', e.target.value)} placeholder="e.g. rajnet" />
          </FormField>
          <FormField label="Phone Number" required>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="98765 43210" />
          </FormField>
          <FormField label="Email Address">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@rajnetworks.com" />
          </FormField>
          <FormField label="Price Book" required>
            <Select value={form.priceBook} onChange={e => set('priceBook', e.target.value)}>
              {PRICE_BOOKS.map(pb => <option key={pb}>{pb}</option>)}
            </Select>
          </FormField>
          <FormField label="Profit Margin (%)" required>
            <Input type="number" min="0" max="100" value={form.profit} onChange={e => set('profit', e.target.value)} placeholder="e.g. 15" />
          </FormField>
          <FormField label="Initial Wallet Top-up (₹)">
            <Input type="number" min="0" value={form.wallet} onChange={e => set('wallet', e.target.value)} placeholder="e.g. 10000" />
          </FormField>
          <FormField label="Jaze Server" required>
            <Select value={form.server} onChange={e => set('server', e.target.value)}>
              {SERVERS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <div className="col-span-2">
            <FormField label="Address">
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Notes">
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  )
}
