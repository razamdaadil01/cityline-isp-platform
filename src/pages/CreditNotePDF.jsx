import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer, ArrowLeft } from 'lucide-react'
import { amountInWords } from '../data/billingData'
import { getCompanyEntity } from '../data/companyEntities'
import { getCreditNote } from '../data/invoicesStore'
import { CUSTOMERS } from '../data/customersData'

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function CreditNotePDF() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cn = getCreditNote(decodeURIComponent(id))

  if (!cn) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Credit note not found</p>
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> Back to Billing
        </button>
      </div>
    )
  }

  const entity = getCompanyEntity(cn.entityId ?? 1)
  const cust = CUSTOMERS.find(c => c.id === cn.customerId)

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
          onClick={() => navigate(-1)}
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

      {/* Credit Note */}
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
              <span className="inline-block px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full uppercase tracking-wide mb-1">
                Credit Note
              </span>
              <p className="text-sm font-bold text-gray-900">{cn.no}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtDate(cn.issuedOn)}</p>
            </div>
          </div>
        </div>

        {/* Customer & CN Details */}
        <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Issued To</p>
            <p className="font-semibold text-gray-900">{cust?.name || cn.customerId}</p>
            {cust?.phone && <p className="text-xs text-gray-500 mt-0.5">{cust.phone}</p>}
            {(cust?.address?.billingAddress || cust?.address?.installAddress) && (
              <p className="text-xs text-gray-500 mt-0.5">{cust.address.billingAddress || cust.address.installAddress}</p>
            )}
            {cust?.gstNo && <p className="text-xs text-gray-500 mt-0.5">GSTIN: {cust.gstNo}</p>}
            <p className="text-xs text-gray-400 mt-0.5">ID: {cn.customerId}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Credit Note Details</p>
            <div className="space-y-1.5 text-sm">
              {cn.invoiceNo && cn.invoiceNo !== '—' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Against Invoice</span>
                  <span className="font-medium text-gray-800 font-mono text-xs">{cn.invoiceNo}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Reason</span>
                <span className="font-medium text-gray-800 max-w-[150px] text-right text-xs">{cn.reason || '—'}</span>
              </div>
              {cn.issuedBy && cn.issuedBy !== '—' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Issued By</span>
                  <span className="text-gray-700">{cn.issuedBy}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-orange-600 capitalize">{cn.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* GST Breakdown */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Amount Breakdown</p>
          <div className="space-y-1.5 text-sm max-w-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Taxable Amount</span>
              <span className="font-medium text-gray-800">{fmt(cn.taxableAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">CGST (9%)</span>
              <span className="font-medium text-gray-800">{fmt(cn.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">SGST (9%)</span>
              <span className="font-medium text-gray-800">{fmt(cn.sgst)}</span>
            </div>
            {cn.igst > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">IGST (18%)</span>
                <span className="font-medium text-gray-800">{fmt(cn.igst)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-gray-200">
              <span className="font-semibold text-gray-700">Total Credit</span>
              <span className="font-extrabold text-2xl text-gray-900">{fmt(cn.amount)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">{amountInWords(cn.amount)}</p>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 rounded-b-xl print:rounded-none text-center">
          <p className="text-xs text-gray-400">This is a system-generated credit note and does not require a signature.</p>
          {entity?.email && <p className="text-xs text-gray-400 mt-0.5">{entity.email}</p>}
        </div>
      </div>
    </div>
  )
}
