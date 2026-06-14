import React, { useState } from 'react'
import { Search, Plus, X, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { CPA_INVOICES, CPA_CLIENTS } from '../../data/cpaData'

const fmt = (n) => '₦' + n.toLocaleString()

const TABS = ['All', 'Paid', 'Sent', 'Overdue', 'Draft']

const StatusBadge = ({ status }) => {
  const map = {
    Paid: 'bg-green-100 text-green-700',
    Sent: 'bg-blue-100 text-blue-700',
    Overdue: 'bg-red-100 text-red-700',
    Draft: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

export default function CPAInvoices() {
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [invoices, setInvoices] = useState(CPA_INVOICES)
  const [form, setForm] = useState({ clientId: '', service: '', amount: '' })

  const filtered = invoices.filter(inv => {
    const mt = tab === 'All' || inv.status === tab
    const ms = inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.service.toLowerCase().includes(search.toLowerCase())
    return mt && ms
  })

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0)
  const totalOutstanding = invoices.filter(i => i.status === 'Sent').reduce((s, i) => s + i.total, 0)
  const totalOverdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.total, 0)
  const totalDraft = invoices.filter(i => i.status === 'Draft').reduce((s, i) => s + i.total, 0)

  const createInvoice = () => {
    const client = CPA_CLIENTS.find(c => c.id === form.clientId)
    if (!client || !form.service || !form.amount) return
    const amount = parseFloat(form.amount)
    const vat = Math.round(amount * 0.075)
    const inv = {
      id: `INV-CPA-${String(invoices.length + 1).padStart(3, '0')}`,
      clientId: form.clientId, clientName: client.name,
      service: form.service, amount, vat, total: amount + vat,
      issued: new Date().toISOString().slice(0, 10),
      due: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'Draft', avatar: client.avatar,
    }
    setInvoices(prev => [inv, ...prev])
    setShowCreateModal(false)
    setForm({ clientId: '', service: '', amount: '' })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A5C]">Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">{invoices.length} invoices total</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#E8541A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          <Plus size={15} /> Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), icon: CheckCircle, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
          { label: 'Outstanding', value: fmt(totalOutstanding), icon: Clock, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
          { label: 'Overdue', value: fmt(totalOverdue), icon: AlertCircle, color: 'bg-red-50 text-red-600', border: 'border-red-100' },
          { label: 'Draft', value: fmt(totalDraft), icon: DollarSign, color: 'bg-gray-50 text-gray-500', border: 'border-gray-100' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border ${s.border} shadow-sm p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`p-1.5 rounded-lg ${s.color}`}><s.icon size={14} /></span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-[#1B3A5C]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#1B3A5C] shadow-sm' : 'text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none w-56" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              {['Invoice', 'Client', 'Service', 'Amount', 'VAT', 'Total', 'Issued', 'Due', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(inv)}>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{inv.id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold">{inv.avatar}</div>
                      <span className="font-medium text-gray-800">{inv.clientName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{inv.service}</td>
                  <td className="px-5 py-3 text-gray-700">{fmt(inv.amount)}</td>
                  <td className="px-5 py-3 text-gray-500">{fmt(inv.vat)}</td>
                  <td className="px-5 py-3 font-bold text-[#1B3A5C]">{fmt(inv.total)}</td>
                  <td className="px-5 py-3 text-gray-500">{inv.issued}</td>
                  <td className="px-5 py-3 text-gray-500">{inv.due}</td>
                  <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3 text-[#2E75B6] text-xs hover:underline">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-[#1B3A5C] flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs font-mono">{selected.id}</p>
                <h2 className="text-white font-semibold">Invoice Detail</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Billed To</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold">{selected.avatar}</div>
                    <p className="font-semibold text-[#1B3A5C]">{selected.clientName}</p>
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 grid grid-cols-3 text-xs text-gray-400 font-medium">
                  <span>Description</span><span className="text-center">Qty</span><span className="text-right">Amount</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 text-sm">
                  <span className="text-gray-800">{selected.service}</span>
                  <span className="text-center text-gray-500">1</span>
                  <span className="text-right font-medium">{fmt(selected.amount)}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(selected.amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">VAT (7.5%)</span><span>{fmt(selected.vat)}</span></div>
                <div className="flex justify-between font-bold text-[#1B3A5C] border-t border-gray-200 pt-2 text-base">
                  <span>Total</span><span>{fmt(selected.total)}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Issue Date</span><span>{selected.issued}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{selected.due}</span></div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              {selected.status === 'Draft' && (
                <button className="flex-1 py-2 bg-[#2E75B6] text-white rounded-lg text-sm font-medium">Send Invoice</button>
              )}
              {selected.status === 'Sent' && (
                <button className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Mark as Paid</button>
              )}
              <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">Download PDF</button>
            </div>
          </div>
        </>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#1B3A5C]">Create New Invoice</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Client</label>
                <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select client...</option>
                  {CPA_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Service Description</label>
                <input value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  placeholder="e.g. Tax Filing Q2 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (₦)</label>
                <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  type="number" placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              {form.amount && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Amount</span><span>{fmt(parseFloat(form.amount) || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VAT (7.5%)</span><span>{fmt(Math.round((parseFloat(form.amount) || 0) * 0.075))}</span></div>
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{fmt(Math.round((parseFloat(form.amount) || 0) * 1.075))}</span></div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button onClick={createInvoice} className="flex-1 py-2 bg-[#E8541A] text-white rounded-lg text-sm font-medium hover:bg-orange-600">Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
