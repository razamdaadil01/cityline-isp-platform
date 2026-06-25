import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"
const disabledInp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed"

export default function AddPayment() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({ mode: 'Cash', amount: '0', txn: '', comment: '', sms: true, fullAmount: false, proof: null })

  const goBack = () => navigate(`/customers/${customerId}/finance/payments`)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
        <button onClick={() => navigate('/customers')} className="hover:text-[#0A8DCD] transition-colors">Customers</button>
        <ChevronRight size={14} className="text-gray-400" />
        <button onClick={() => navigate(`/customers/${customerId}`)} className="hover:text-[#0A8DCD] transition-colors">{customerId}</button>
        <ChevronRight size={14} className="text-gray-400" />
        <button onClick={() => navigate(`/customers/${customerId}/finance/invoices`)} className="hover:text-[#0A8DCD] transition-colors">Finance</button>
        <ChevronRight size={14} className="text-gray-400" />
        <button onClick={goBack} className="hover:text-[#0A8DCD] transition-colors">Payments</button>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="text-gray-800 font-medium">Add Payment</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F2744]">Add Payment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a new payment for customer {customerId}</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Row 1: Receipt No | User Id */}
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: 'Receipt No', value: 'Auto-generated' },
            { label: 'User Id',    value: customerId || '' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
              <input defaultValue={f.value} disabled className={disabledInp} />
            </div>
          ))}
        </div>

        {/* Row 2: Total Amount | Payment Date */}
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: 'Total Amount', value: '35400' },
            { label: 'Payment Date', value: today   },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
              <input defaultValue={f.value} disabled className={disabledInp} />
            </div>
          ))}
        </div>

        {/* Row 3: Payment Mode | Amount to be paid */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Mode</label>
            <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} className={inp}>
              <option>Cash</option>
              <option>Online</option>
              <option>Cheque</option>
              <option>Android App</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount to be paid</label>
            <input type="number" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value, fullAmount: false }))}
              className={inp} />
            <label className="flex items-center gap-1.5 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.fullAmount}
                onChange={e => setForm(f => ({ ...f, fullAmount: e.target.checked, amount: e.target.checked ? '35400' : f.amount }))}
                className="w-3.5 h-3.5 accent-[#0A8DCD]" />
              <span className="text-xs text-gray-500">Full Amount To be Paid</span>
            </label>
          </div>
        </div>

        {/* Row 4: Due Amount | Transaction No */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Amount</label>
            <input value="35400" disabled className={disabledInp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Transaction No.</label>
            <input value={form.txn} onChange={e => setForm(f => ({ ...f, txn: e.target.value }))}
              placeholder="Transaction / Cheque No." className={inp} />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Comment</label>
          <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            rows={3} placeholder="Add a comment..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 resize-none" />
        </div>

        {/* Payment Proof */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Proof</label>
          <input type="file" onChange={e => setForm(f => ({ ...f, proof: e.target.files[0] }))}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200" />
        </div>

        {/* SMS checkbox */}
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input type="checkbox" checked={form.sms} onChange={e => setForm(f => ({ ...f, sms: e.target.checked }))}
            className="w-4 h-4 accent-[#0A8DCD]" />
          <span className="text-sm text-gray-700">SMS</span>
        </label>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={goBack}
            className="px-7 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Skip</button>
          <button className="px-7 py-2.5 bg-[#0A8DCD] hover:bg-[#0878b0] text-white rounded-lg text-sm font-medium transition-colors">Submit</button>
        </div>
      </div>

      {/* Settle Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Settle invoices with this payment</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Settle Invoice','Date','Invoice Number','Invoice Amount','Balance Amount','Amount Paid'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="w-4 h-4 accent-[#0A8DCD]" />
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">2026-06-24</td>
                <td className="px-4 py-3 text-xs text-gray-500">—</td>
                <td className="px-4 py-3 text-xs font-medium text-gray-800">₹35,400.00</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-800 mr-1.5">₹35,400.00</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Unpaid</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
