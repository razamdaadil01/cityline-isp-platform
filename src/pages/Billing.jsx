import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Download, Search, ChevronDown, FileText, MessageCircle,
  CreditCard, CheckCircle, Clock, AlertTriangle, X, Receipt,
  TrendingUp, Filter, Calendar, History, IndianRupee, AlertCircle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { MOCK_INVOICES, PAYMENT_HISTORY } from '../data/billingData'

const STATUS_VARIANT = { paid: 'green', pending: 'yellow', overdue: 'red' }
const STATUS_LABELS = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }
const MODE_VARIANT = { Cash: 'green', UPI: 'blue', NEFT: 'navy', IMPS: 'purple', Cheque: 'orange', Razorpay: 'cyan' }
const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'IMPS', 'Cheque', 'Razorpay']
const SERVICE_TYPES = ['All', 'FTTH', 'FTTB', 'Wireless', 'P2P', 'ILL']
const NETWORKS = ['All', 'OLT-ANW-01', 'OLT-ANW-02', 'OLT-BNW-01', 'OLT-MNW-01']

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Record Payment Modal ───────────────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    amount: invoice.totalAmount,
    mode: 'UPI',
    txnId: '',
    date: today,
    notes: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (Number(form.amount) < invoice.totalAmount) {
      setError(`Partial payment not allowed. Full amount ₹${invoice.totalAmount.toLocaleString('en-IN')} must be paid at once.`)
      return
    }
    if (!form.txnId && form.mode !== 'Cash') {
      setError('Transaction ID is required for ' + form.mode + ' payments.')
      return
    }
    setError('')
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Payment Recorded</h3>
        <p className="text-sm text-gray-500 mb-1">
          {fmt(form.amount)} received via <span className="font-medium">{form.mode}</span>
        </p>
        <p className="text-xs text-gray-400 mb-6">Invoice {invoice.invoiceNo} marked as Paid</p>
        <Button onClick={onClose} size="sm">Close</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Invoice summary */}
      <div className="bg-surface rounded-xl p-4 border border-surface-border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 font-medium">Invoice</p>
            <p className="text-sm font-mono font-semibold text-brand-blue mt-0.5">{invoice.invoiceNo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Customer</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{invoice.customerName}</p>
          </div>
        </div>
        <div className="flex justify-between mt-3 pt-3 border-t border-surface-border">
          <div>
            <p className="text-xs text-gray-500">Due Date</p>
            <p className="text-sm text-gray-700 mt-0.5">{invoice.dueDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Amount Due</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(invoice.totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Partial payment error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input
            type="number"
            value={form.amount}
            onChange={e => { set('amount', e.target.value); setError('') }}
            className="w-full pl-7 pr-4 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertTriangle size={11} /> Partial payment is not accepted. Full amount required.
        </p>
      </div>

      {/* Mode */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Payment Mode <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_MODES.map(m => (
            <button
              key={m}
              onClick={() => set('mode', m)}
              className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                form.mode === m
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                  : 'bg-white text-gray-600 border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction ID */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Transaction ID {form.mode !== 'Cash' && <span className="text-red-500">*</span>}
          {form.mode === 'Cash' && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
        </label>
        <input
          type="text"
          placeholder={form.mode === 'Cash' ? 'N/A' : 'Enter transaction / reference ID'}
          value={form.txnId}
          onChange={e => set('txnId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Payment Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={form.date}
          max={today}
          onChange={e => set('date', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
        <textarea
          rows={2}
          placeholder="Optional notes..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={handleSubmit} icon={<CheckCircle size={14} />} className="flex-1">
          Record Payment
        </Button>
      </div>
    </div>
  )
}

// ─── Payment History Tab ────────────────────────────────────────────────────
function PaymentHistory({ payments }) {
  const totals = useMemo(() => {
    const byMode = {}
    let total = 0
    payments.forEach(p => {
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount
      total += p.amount
    })
    return { byMode, total }
  }, [payments])

  return (
    <div className="space-y-4">
      {/* Mode-wise summary */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Object.entries(totals.byMode).map(([mode, amt]) => (
          <div key={mode} className="bg-white rounded-xl p-3 border border-surface-border text-center shadow-card">
            <Badge variant={MODE_VARIANT[mode] || 'gray'} size="sm">{mode}</Badge>
            <p className="text-sm font-bold text-gray-900 mt-2">{fmt(amt)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
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
      </div>
    </div>
  )
}

// ─── Main Billing Page ──────────────────────────────────────────────────────
export default function Billing() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('invoices')
  const [statusFilter, setStatusFilter] = useState('All')
  const [serviceFilter, setServiceFilter] = useState('All')
  const [networkFilter, setNetworkFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [paymentModal, setPaymentModal] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_INVOICES.filter(inv => {
      if (statusFilter !== 'All' && inv.status !== statusFilter.toLowerCase()) return false
      if (serviceFilter !== 'All' && inv.serviceType !== serviceFilter) return false
      if (networkFilter !== 'All' && inv.network !== networkFilter) return false
      if (dateFrom && inv.issueDate < dateFrom) return false
      if (dateTo && inv.issueDate > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        if (!inv.invoiceNo.toLowerCase().includes(q) &&
            !inv.customerName.toLowerCase().includes(q) &&
            !inv.phone.includes(q)) return false
      }
      return true
    })
  }, [statusFilter, serviceFilter, networkFilter, dateFrom, dateTo, search])

  const stats = useMemo(() => {
    const all = MOCK_INVOICES
    return {
      total: all.reduce((s, i) => s + i.totalAmount, 0),
      collected: all.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0),
      pending: all.filter(i => i.status === 'pending').reduce((s, i) => s + i.totalAmount, 0),
      overdue: all.filter(i => i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0),
      gst: all.filter(i => i.status === 'paid').reduce((s, i) => s + i.cgst + i.sgst, 0),
    }
  }, [])

  const statusTabs = ['All', 'Paid', 'Pending', 'Overdue']

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage invoices, collections and payment records</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          <Button size="sm" icon={<Plus size={14} />}>New Invoice</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: 'Total Billed (May)', value: fmt(stats.total), icon: <Receipt size={16} />, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Collected', value: fmt(stats.collected), icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending', value: fmt(stats.pending), icon: <Clock size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Overdue', value: fmt(stats.overdue), icon: <AlertTriangle size={16} />, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'GST Collected', value: fmt(stats.gst), icon: <TrendingUp size={16} />, color: 'text-brand-blue', bg: 'bg-brand-blue/5' },
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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-surface-border">
        {[
          { key: 'invoices', label: 'Invoice Register', icon: <FileText size={13} /> },
          { key: 'payments', label: 'Payment History', icon: <History size={13} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'payments' ? (
        <PaymentHistory payments={PAYMENT_HISTORY} />
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice, customer, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            {/* Status pills */}
            <div className="flex gap-1">
              {statusTabs.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-white border border-surface-border text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showFilters ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue' : 'bg-white border-surface-border text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Filter size={12} /> Filters
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-surface-border shadow-card">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">From</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-2 py-1 text-xs border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-2 py-1 text-xs border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
              <div className="relative">
                <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
                  {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
                  {NETWORKS.map(n => <option key={n}>{n}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {(dateFrom || dateTo || serviceFilter !== 'All' || networkFilter !== 'All') && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); setServiceFilter('All'); setNetworkFilter('All') }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Invoice table */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800">Invoice Register</h3>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{filtered.length}</span>
              </div>
              <p className="text-xs text-gray-400">Billing Period: May 2026 · FY 2026-27</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    {['Invoice No', 'Customer', 'Services', 'Base Amt', 'CGST 9%', 'SGST 9%', 'Total', 'Status', 'Due Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                        No invoices match your filters.
                      </td>
                    </tr>
                  ) : filtered.map(inv => (
                    <tr key={inv.invoiceNo} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-brand-blue font-bold">{inv.invoiceNo}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.billingPeriod}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 whitespace-nowrap">{inv.customerName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {inv.services.map((s, i) => (
                            <span key={i} className="text-xs bg-navy/8 text-navy px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                              {s.name.split(' ').slice(0, 2).join(' ')}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{inv.network}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{fmt(inv.baseAmount)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{fmt(inv.cgst)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{fmt(inv.sgst)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 font-mono whitespace-nowrap">{fmt(inv.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[inv.status]} dot size="sm">
                          {STATUS_LABELS[inv.status]}
                        </Badge>
                        {inv.status === 'paid' && inv.paymentMode && (
                          <p className="text-xs text-gray-400 mt-0.5">{inv.paymentMode}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {inv.dueDate}
                        {inv.status === 'overdue' && (
                          <p className="text-xs text-red-500 font-medium mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} /> Overdue
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/billing/invoice/${encodeURIComponent(inv.invoiceNo)}`)}
                            title="View PDF"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            title="Send WhatsApp"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <MessageCircle size={14} />
                          </button>
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => setPaymentModal(inv)}
                              title="Record Payment"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-orange hover:bg-brand-orange/10 transition-colors"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-surface-border bg-gray-50/40 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {filtered.length} of {MOCK_INVOICES.length} invoices
                </p>
                <p className="text-xs font-semibold text-gray-700">
                  Filtered Total: {fmt(filtered.reduce((s, i) => s + i.totalAmount, 0))}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Record Payment"
        size="md"
      >
        {paymentModal && <RecordPaymentModal invoice={paymentModal} onClose={() => setPaymentModal(null)} />}
      </Modal>
    </div>
  )
}
