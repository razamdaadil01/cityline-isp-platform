import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Download, Search, ChevronDown, Receipt, History,
  CheckCircle, Clock, AlertTriangle, TrendingUp, Filter, X,
  MoreVertical, CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Mock data ────────────────────────────────────────────────────────────────

const ZONES = ['Andheri West', 'Bandra East', 'Goregaon']
const AREAS = ['Andheri', 'Bandra', 'Goregaon']

const INTERCOM_RECHARGE_ROWS = [
  {
    id: 1, customerId: 'INC-2026-0001', userLink: 'CNPL_INC', customerName: 'Mohan Das',
    package: 'Intercom Basic', amount: 199, invoiceDate: '01-06-2026',
    durationFrom: '01-06-2026', durationTo: '30-06-2026', addedBy: 'INC-2026-0001', comment: '',
    zone: 'Andheri West', area: 'Andheri', status: 'paid', rechargeStatus: 'success',
  },
  {
    id: 2, customerId: 'INC-2026-0002', userLink: 'CNPL_INC', customerName: 'Priya Nair',
    package: 'Intercom Plus', amount: 299, invoiceDate: '01-06-2026',
    durationFrom: '01-06-2026', durationTo: '30-06-2026', addedBy: 'INC-2026-0002', comment: '',
    zone: 'Bandra East', area: 'Bandra', status: 'paid', rechargeStatus: 'success',
  },
  {
    id: 3, customerId: 'INC-2026-0003', userLink: 'CNPL_INC', customerName: 'Suresh Patil',
    package: 'Intercom Basic', amount: 199, invoiceDate: '01-06-2026',
    durationFrom: '01-06-2026', durationTo: '30-06-2026', addedBy: 'INC-2026-0003', comment: '',
    zone: 'Goregaon', area: 'Goregaon', status: 'paid', rechargeStatus: 'success',
  },
]

// Separate invoice-level dataset (drives the 5 stat cards, spans Paid/Pending/Overdue)
const INTERCOM_INVOICES = [
  { customer: 'Mohan Das',    amount: 199, status: 'paid',    cgst: 9,    sgst: 9    },
  { customer: 'Priya Nair',   amount: 299, status: 'paid',    cgst: 13.5, sgst: 13.5 },
  { customer: 'Suresh Patil', amount: 199, status: 'pending', cgst: 9,    sgst: 9    },
  { customer: 'Anita Desai',  amount: 199, status: 'paid',    cgst: 9,    sgst: 9    },
  { customer: 'Rajesh Kumar', amount: 199, status: 'overdue', cgst: 9,    sgst: 9    },
]

const INTERCOM_PAYMENT_HISTORY = [
  { id: 'IPAY001', invoiceNo: 'INC/26-27/0001', customerName: 'Mohan Das',   amount: 199, mode: 'UPI',  txnId: 'UPI260601001',  date: '01-06-2026', recordedBy: 'Admin' },
  { id: 'IPAY002', invoiceNo: 'INC/26-27/0002', customerName: 'Priya Nair',  amount: 299, mode: 'NEFT', txnId: 'NEFT260601002', date: '01-06-2026', recordedBy: 'Admin' },
  { id: 'IPAY003', invoiceNo: 'INC/26-27/0004', customerName: 'Anita Desai', amount: 199, mode: 'Cash', txnId: '—',             date: '05-06-2026', recordedBy: 'Admin' },
]

const MODE_VARIANT = { Cash: 'green', UPI: 'blue', NEFT: 'navy', IMPS: 'purple', Cheque: 'orange', Razorpay: 'cyan' }

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function toISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('-')
  return `${y}-${m}-${d}`
}

// ── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg text-brand-blue hover:bg-brand-blue/10 transition-colors">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 bg-white border border-surface-border rounded-xl shadow-lg py-1 text-sm">
          {['View Invoice', 'Remove', 'Email Invoice'].map(action => (
            <button key={action} onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-xs">
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Payment History Tab ──────────────────────────────────────────────────────

function PaymentHistory({ payments, allPayments, page, totalPages, pageSize, setPage, setPageSize }) {
  const totals = useMemo(() => {
    const byMode = {}
    let total = 0
    allPayments.forEach(p => { byMode[p.mode] = (byMode[p.mode] || 0) + p.amount; total += p.amount })
    return { byMode, total }
  }, [allPayments])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Object.entries(totals.byMode).map(([mode, amt]) => (
          <div key={mode} className="bg-white rounded-xl p-3 border border-surface-border text-center shadow-card">
            <Badge variant={MODE_VARIANT[mode] || 'gray'} size="sm">{mode}</Badge>
            <p className="text-sm font-bold text-gray-900 mt-2">{fmt(amt)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Payment Ledger</h3>
          <span className="text-xs text-gray-500 font-medium">
            Total Collected: <span className="text-emerald-600 font-bold">{fmt(totals.total)}</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Pay ID', 'Invoice No', 'Customer', 'Amount', 'Mode', 'Transaction ID', 'Date', 'Recorded By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold">{p.invoiceNo}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{p.customerName}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{fmt(p.amount)}</td>
                  <td className="px-4 py-3"><Badge variant={MODE_VARIANT[p.mode] || 'gray'} size="sm">{p.mode}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.txnId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Records per page</span>
            <select value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} &nbsp;|&nbsp; Total {allPayments.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  p === page ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                }`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomBilling() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = location.pathname.includes('payments') ? 'payments' : 'recharge'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickStatus, setQuickStatus] = useState('All')
  const [search, setSearch] = useState('')

  const [prPage, setPrPage] = useState(1)
  const [prPageSize, setPrPageSize] = useState(10)
  const [phPage, setPhPage] = useState(1)
  const [phPageSize, setPhPageSize] = useState(10)

  const [fRechargeStatus, setFRechargeStatus] = useState('')
  const [fArea, setFArea] = useState('')
  const [fZone, setFZone] = useState('')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')
  const [fStatus, setFStatus] = useState('')

  const EMPTY_DRAFT = { rechargeStatus: '', area: '', zone: '', dateFrom: '', dateTo: '', status: '' }
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ rechargeStatus: fRechargeStatus, area: fArea, zone: fZone, dateFrom: fDateFrom, dateTo: fDateTo, status: fStatus })
    setDrawerOpen(true)
  }

  function applyDrawer() {
    setFRechargeStatus(draft.rechargeStatus)
    setFArea(draft.area)
    setFZone(draft.zone)
    setFDateFrom(draft.dateFrom)
    setFDateTo(draft.dateTo)
    setFStatus(draft.status)
    setPrPage(1)
    setDrawerOpen(false)
  }

  function clearAllFilters() {
    setFRechargeStatus(''); setFArea(''); setFZone('')
    setFDateFrom(''); setFDateTo(''); setFStatus('')
    setDraft(EMPTY_DRAFT)
    setPrPage(1)
  }

  const filterCount = [fRechargeStatus, fArea, fZone, fStatus, fDateFrom || fDateTo].filter(Boolean).length

  const stats = useMemo(() => ({
    total:     INTERCOM_INVOICES.reduce((s, i) => s + i.amount, 0),
    collected: INTERCOM_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
    pending:   INTERCOM_INVOICES.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0),
    overdue:   INTERCOM_INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
    gst:       INTERCOM_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.cgst + i.sgst, 0),
  }), [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return INTERCOM_RECHARGE_ROWS.filter(r => {
      if (q && !r.customerName.toLowerCase().includes(q) && !r.customerId.toLowerCase().includes(q)) return false
      if (quickStatus !== 'All' && r.status !== quickStatus.toLowerCase()) return false
      if (fRechargeStatus && r.rechargeStatus !== fRechargeStatus.toLowerCase()) return false
      if (fArea && r.area !== fArea) return false
      if (fZone && r.zone !== fZone) return false
      if (fStatus && r.status !== fStatus.toLowerCase()) return false
      if (fDateFrom && toISO(r.invoiceDate) < fDateFrom) return false
      if (fDateTo && toISO(r.invoiceDate) > fDateTo) return false
      return true
    })
  }, [search, quickStatus, fRechargeStatus, fArea, fZone, fStatus, fDateFrom, fDateTo])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / prPageSize))
  const safePage    = Math.min(prPage, totalPages)
  const pagedRows   = filteredRows.slice((safePage - 1) * prPageSize, safePage * prPageSize)

  const phTotalPages  = Math.max(1, Math.ceil(INTERCOM_PAYMENT_HISTORY.length / phPageSize))
  const phSafePage    = Math.min(phPage, phTotalPages)
  const pagedPayments = INTERCOM_PAYMENT_HISTORY.slice((phSafePage - 1) * phPageSize, phSafePage * phPageSize)

  const adminTotal = filteredRows.reduce((s, r) => s + r.amount, 0)

  const drawerSelectCls = 'w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer'
  const drawerInputCls  = 'w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700'

  const statusTabs = ['All', 'Paid', 'Pending', 'Overdue']

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Intercom Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage intercom billing and payments</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          <Button size="sm" icon={<Plus size={14} />}>New Invoice</Button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: 'Total Billed',   value: fmt(stats.total),     icon: <Receipt size={16} />,        color: 'text-gray-900',    bg: 'bg-gray-50'      },
          { label: 'Collected',      value: fmt(stats.collected), icon: <CheckCircle size={16} />,     color: 'text-emerald-600', bg: 'bg-emerald-50'   },
          { label: 'Pending',       value: fmt(stats.pending),   icon: <Clock size={16} />,           color: 'text-amber-600',   bg: 'bg-amber-50'     },
          { label: 'Overdue',        value: fmt(stats.overdue),   icon: <AlertTriangle size={16} />,   color: 'text-red-500',     bg: 'bg-red-50'       },
          { label: 'GST Collected',  value: fmt(stats.gst),       icon: <TrendingUp size={16} />,      color: 'text-brand-blue',  bg: 'bg-brand-blue/5' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <span className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-surface-border">
        {[
          { key: 'recharge', label: 'Package Recharge', path: '/intercom/billing/recharge', icon: <Receipt size={13} /> },
          { key: 'payments', label: 'Payment History',  path: '/intercom/billing/payments', icon: <History size={13} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => navigate(t.path)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'payments' ? (
        <PaymentHistory
          payments={pagedPayments}
          allPayments={INTERCOM_PAYMENT_HISTORY}
          page={phSafePage} totalPages={phTotalPages} pageSize={phPageSize}
          setPage={setPhPage} setPageSize={setPhPageSize}
        />
      ) : (
        <>
          {/* ── Totals ── */}
          <div className="text-xs text-gray-700 font-medium">
            Admin Total: <span className="text-gray-900 font-bold">{fmt(adminTotal)}</span>
            <span className="mx-3 text-gray-300">|</span>
            Reseller Total: <span className="text-gray-900 font-bold">₹0.00</span>
          </div>

          {/* ── Search + Quick filters ── */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPrPage(1) }}
                placeholder="Search by customer name or ID..."
                className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
              />
            </div>
            <div className="flex gap-1 shrink-0">
              {statusTabs.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuickStatus(s); setPrPage(1) }}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    quickStatus === s ? 'bg-brand-blue text-white shadow-sm' : 'bg-white border border-surface-border text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={openDrawer}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all shrink-0 ${
                filterCount > 0 ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={14} />
              Filters
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-brand-blue text-white text-[10px] font-bold rounded-full">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    {['Recharge Status', 'User/Link ID', 'Package', 'Amount', 'Invoice Date', 'Duration', 'Added', 'Comment', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {pagedRows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-14 text-center text-gray-400 text-sm">No recharge records found</td></tr>
                  ) : pagedRows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 size={11} className="text-emerald-500" /> Intercom
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-brand-blue font-semibold">{row.customerId}({row.userLink})</span>
                        <p className="text-xs text-gray-500 mt-0.5">{row.customerName}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 max-w-[160px]">
                        <span className="line-clamp-2">{row.package}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">₹{row.amount}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{row.invoiceDate}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {row.durationFrom}<br />{row.durationTo}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{row.addedBy}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{row.comment || '—'}</td>
                      <td className="px-3 py-3">
                        <ActionsDropdown />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Records per page</span>
                <select value={prPageSize}
                  onChange={e => { setPrPageSize(Number(e.target.value)); setPrPage(1) }}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <span className="text-xs text-gray-500">
                Page {safePage} of {totalPages} &nbsp;|&nbsp; Total {filteredRows.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPrPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPrPage(p)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                      p === safePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPrPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Filter Drawer ──────────────────────────────────────────────────── */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-brand-blue" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Recharge Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recharge Status</label>
              <div className="relative">
                <select value={draft.rechargeStatus} onChange={e => setDraft(d => ({ ...d, rechargeStatus: e.target.value }))} className={drawerSelectCls}>
                  <option value="">All</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Area</label>
              <div className="relative">
                <select value={draft.area} onChange={e => setDraft(d => ({ ...d, area: e.target.value }))} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Zone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Zone</label>
              <div className="relative">
                <select value={draft.zone} onChange={e => setDraft(d => ({ ...d, zone: e.target.value }))} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date From</label>
              <input type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))} className={drawerInputCls} />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date To</label>
              <input type="date" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))} className={drawerInputCls} />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))} className={drawerSelectCls}>
                  <option value="">All</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

          </div>

          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={applyDrawer}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
