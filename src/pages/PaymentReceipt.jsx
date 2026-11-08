import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer, ArrowLeft } from 'lucide-react'
import { amountInWords } from '../data/billingData'
import { getCompanyEntity } from '../data/companyEntities'
import { getPayments } from '../data/paymentsStore'
import { getInvoices } from '../data/invoicesStore'
import { CUSTOMERS } from '../data/customersData'
import { normalizeMode } from '../data/paymentModes'

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(d) {
  if (!d) return '—'
  const str = String(d).split(' ')[0]
  const parts = str.includes('-') ? str.split('-') : str.split('/')
  if (parts.length === 3 && parts[0].length === 2) {
    // DD-MM-YYYY
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function PaymentReceipt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const payment = getPayments().find(p => p.id === decodeURIComponent(id))

  if (!payment) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Payment receipt not found</p>
        <button
          onClick={() => navigate('/payments')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> Back to Payments
        </button>
      </div>
    )
  }

  // Resolve entity from the invoice this payment is against, so both invoice
  // and receipt always show the same entity, even when payment.entityId is unset.
  const invoiceNo = payment.invoiceNos?.[0] || payment.invoiceNo
  const invoice = invoiceNo ? getInvoices().find(i => i.no === invoiceNo) : null
  const entityId = invoice?.entityId ?? payment.entityId ?? 1
  const entity = getCompanyEntity(entityId)
  const cust = CUSTOMERS.find(c => c.id === payment.customerId)

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      <style>{`
        @media print {
          aside, header { display: none !important; }
          body > #root > div { overflow: visible !important; height: auto !important; }
          body > #root > div > div { margin-left: 0 !important; }
        }
      `}</style>

      {/* Action buttons */}
      <div className="max-w-2xl mx-auto flex justify-between gap-2 mb-3 print:hidden">
        <button
          onClick={() => navigate('/payments')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
        >
          <Printer size={14} /> Print / Download
        </button>
      </div>

      {/* Receipt */}
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-xl print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{entity?.name || 'Cityline Networks Pvt Ltd'}</h1>
              {entity?.address && <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{entity.address}</p>}
              {entity?.gstin && <p className="text-xs text-gray-500 mt-0.5">GSTIN: {entity.gstin}</p>}
              {entity?.phone && <p className="text-xs text-gray-500 mt-0.5">{entity.phone}</p>}
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide mb-1">
                Payment Receipt
              </span>
              <p className="text-sm font-bold text-gray-900">{payment.receiptNo}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtDate(payment.paymentDate || payment.date)}</p>
            </div>
          </div>
        </div>

        {/* Customer & Payment Info */}
        <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Received From</p>
            <p className="font-semibold text-gray-900">{cust?.name || payment.customerId}</p>
            {cust?.phone && <p className="text-xs text-gray-500 mt-0.5">{cust.phone}</p>}
            {(cust?.address?.billingAddress || cust?.address?.installAddress) && (
              <p className="text-xs text-gray-500 mt-0.5">{cust.address.billingAddress || cust.address.installAddress}</p>
            )}
            {cust?.gstNo && <p className="text-xs text-gray-500 mt-0.5">GSTIN: {cust.gstNo}</p>}
            <p className="text-xs text-gray-400 mt-0.5">ID: {payment.customerId}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment Details</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span className="font-medium text-gray-800">{normalizeMode(payment.mode)}</span>
              </div>
              {payment.orderNo && payment.orderNo !== '—' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-medium text-gray-800 font-mono text-xs">{payment.orderNo}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold ${payment.status === 'Complete' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {payment.status}
                </span>
              </div>
              {payment.addBy && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Recorded by</span>
                  <span className="text-gray-700">{payment.addBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="px-8 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Amount Received</p>
              <p className="text-3xl font-extrabold text-gray-900">{fmt(payment.paid || payment.total || 0)}</p>
              <p className="text-xs text-gray-500 mt-1 italic">{amountInWords(payment.paid || payment.total || 0)}</p>
            </div>
          </div>
        </div>

        {/* Allocated Invoices */}
        {(payment.invoiceNos?.length > 0 || payment.invoiceNo) && (
          <div className="px-8 py-5 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Applied Against Invoices</p>
            <div className="flex flex-wrap gap-2">
              {(payment.invoiceNos?.length > 0 ? payment.invoiceNos : (payment.invoiceNo ? [payment.invoiceNo] : []))
                .filter(n => n && n !== '—').map(no => (
                <span key={no} className="px-3 py-1 text-xs font-mono font-semibold bg-blue-50 text-brand-blue border border-blue-200 rounded-lg">
                  {no}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 rounded-b-xl print:rounded-none text-center">
          <p className="text-xs text-gray-400">This is a system-generated receipt and does not require a signature.</p>
          {entity?.email && <p className="text-xs text-gray-400 mt-0.5">{entity.email}</p>}
        </div>
      </div>
    </div>
  )
}
