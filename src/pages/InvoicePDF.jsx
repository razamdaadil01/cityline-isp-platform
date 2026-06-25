import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer } from 'lucide-react'
import Button from '../components/ui/Button'
import { MOCK_INVOICES, COMPANY_INFO, amountInWords } from '../data/billingData'

const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TERMS = [
  'Installation charges will be Non-refundable After Disconnection.',
  'Part Payment will not be accepted. Cheque/DD will be in favor of Cityline Networks Pvt Ltd.',
  'Rs. 250.00/- will be charged from customers in case of dishonor of cheque.',
  'Cityline Networks Pvt Ltd can withdraw the connection at their own discretion if the service renewal is not done in time.',
  'Complaint resolution shall be done within 48 hrs on all day of the month.',
  'The invoice doesn\'t require signature, as it is a system generated invoice.',
  'This invoice, the content shall be deemed to be read and understood by the recipient.',
]

const STATUS_BADGE = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 border border-emerald-300' },
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 border border-amber-300' },
  overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700 border border-red-300' },
}

export default function InvoicePDF() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inv = MOCK_INVOICES.find(i => i.invoiceNo === decodeURIComponent(id))

  if (!inv) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Invoice not found</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/billing')}>Back to Billing</Button>
      </div>
    )
  }

  const taxable    = inv.baseAmount
  const sgst       = Math.round(taxable * 0.09 * 100) / 100
  const cgst       = Math.round(taxable * 0.09 * 100) / 100
  const grandTotal = taxable + sgst + cgst
  const badge      = STATUS_BADGE[inv.status] ?? STATUS_BADGE.pending

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* Print button — top right, hidden on print */}
      <div className="max-w-4xl mx-auto flex justify-end mb-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      {/* A4-style card */}
      <div
        id="invoice-doc"
        className="max-w-4xl mx-auto bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >

        {/* ── HEADER ── */}
        <div className="px-8 pt-7 pb-5 border-b border-gray-200">
          {/* Title centered */}
          <h1 className="text-center text-lg font-black tracking-widest text-gray-800 mb-5 uppercase">Tax Invoice</h1>

          {/* Logo left | Invoice meta right */}
          <div className="flex items-start justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm">CL</span>
              </div>
              <div>
                <p className="font-black text-gray-900 text-base leading-tight">CITYLINE</p>
                <p className="text-brand-blue text-[10px] font-semibold tracking-widest uppercase">Networks Pvt Ltd</p>
              </div>
            </div>

            {/* Invoice meta */}
            <div className="text-right space-y-1">
              <div>
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Invoice No.: </span><span className="font-bold">{inv.invoiceNo}</span></p>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Invoice Date: </span><span className="font-semibold">{inv.issueDate}</span></p>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Due Date: </span><span className="font-semibold">{inv.dueDate}</span></p>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN INFO TABLE ── */}
        <div className="grid grid-cols-2 border-b border-gray-200">
          {/* Company details */}
          <div className="px-8 py-5 border-r border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Company Details</p>
            <p className="text-sm font-bold text-gray-900">Cityline Networks Pvt Ltd</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              310, Nebula Business Center,<br />
              nr. ACE CITY, Chauganpur, Knowledge Park V<br />
              Greater Noida, Uttar Pradesh - 201307
            </p>
            <p className="text-xs text-gray-600 mt-1.5">Contact No:- 9736858585</p>
            <p className="text-xs text-gray-600">GST No: 09AAGCC4479E2ZG</p>
          </div>

          {/* Customer details */}
          <div className="px-8 py-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Details</p>
            <div className="space-y-1 text-xs text-gray-700">
              <p><span className="text-gray-400 w-32 inline-block">Customer ID:</span> <span className="font-medium">{inv.customerId}</span></p>
              <p><span className="text-gray-400 w-32 inline-block">IPAct ID:</span> <span className="font-medium">{inv.customerId}</span></p>
              <p><span className="text-gray-400 w-32 inline-block">Customer Name:</span> <span className="font-semibold text-gray-900">{inv.customerName}</span></p>
              <p><span className="text-gray-400 w-32 inline-block">Customer Address:</span> <span className="font-medium">{inv.address}</span></p>
              <p><span className="text-gray-400 w-32 inline-block">Contact No:</span> <span className="font-medium">{inv.phone}</span></p>
              <p><span className="text-gray-400 w-32 inline-block">Customer Email:</span> <span className="font-medium">{inv.email ?? '—'}</span></p>
            </div>
          </div>
        </div>

        {/* ── SERVICES TABLE ── */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Service Details</p>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-12">SNo.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Description of Service</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inv.services.map((svc, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-xs text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                    {svc.name}
                    {inv.billingPeriod && (
                      <span className="text-gray-400 font-normal ml-1">({inv.billingPeriod})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-800">₹ {fmt(svc.rate * svc.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TOTALS ── */}
        <div className="px-8 py-5 border-b border-gray-200">
          <div className="ml-auto w-72 space-y-0 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Taxable Amount</span>
              <span className="font-mono text-gray-800">₹ {fmt(taxable)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">SGST (9%)</span>
              <span className="font-mono text-gray-800">₹ {fmt(sgst)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">CGST (9%)</span>
              <span className="font-mono text-gray-800">₹ {fmt(cgst)}</span>
            </div>
            <div className="flex justify-between py-2.5 bg-gray-50 px-3 rounded-b-lg">
              <span className="font-bold text-gray-900">Grand Total</span>
              <span className="font-black font-mono text-gray-900">₹ {fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Amount in words */}
          <p className="text-right text-xs text-gray-500 italic mt-3">
            {amountInWords(grandTotal)}
          </p>
        </div>

        {/* ── TERMS & CONDITIONS ── */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Terms &amp; Conditions</p>
          <ol className="list-decimal list-inside space-y-1.5">
            {TERMS.map((t, i) => (
              <li key={i} className="text-xs text-gray-600 leading-relaxed">{t}</li>
            ))}
          </ol>
        </div>

        {/* ── BACK BUTTON ── */}
        <div className="px-8 py-5 flex justify-center print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
          >
            Back
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-doc, #invoice-doc * { visibility: visible; }
          #invoice-doc { position: fixed; top: 0; left: 0; width: 100%; border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}
