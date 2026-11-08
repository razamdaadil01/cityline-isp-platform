import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer, Download, FileMinus } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { amountInWords } from '../data/billingData'
import { getCompanyEntity } from '../data/companyEntities'
import { getInvoices, issueCreditNote } from '../data/invoicesStore'
import { CUSTOMERS } from '../data/customersData'

const CN_REASONS = ['Billing Error', 'Service Downgrade', 'Promotional Adjustment', 'Service Cancellation', 'Other']
const fmtCur = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
  const rawInv = getInvoices().find(i => i.no === decodeURIComponent(id))
  const [cnModal, setCnModal] = useState(false)
  const [cnAmount, setCnAmount] = useState('')
  const [cnReasonType, setCnReasonType] = useState(CN_REASONS[0])
  const [cnReasonText, setCnReasonText] = useState('')

  if (!rawInv) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Invoice not found</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/billing')}>Back to Billing</Button>
      </div>
    )
  }

  // Normalise invoicesStore format to InvoicePDF rendering shape
  const cust = CUSTOMERS.find(c => c.id === rawInv.customerId)
  const inv = {
    invoiceNo:       rawInv.no,
    customerId:      rawInv.customerId,
    customerName:    cust?.name ?? rawInv.customerName ?? '—',
    address:         cust?.address?.billingAddress ?? cust?.address?.installAddress ?? '—',
    phone:           cust?.phone ?? '—',
    email:           cust?.email ?? null,
    issueDate:       rawInv.date || rawInv.issueDate,
    dueDate:         rawInv.dueDate,
    status:          rawInv.status,
    companyEntityId: rawInv.entityId,
    discountAmount:  rawInv.discountAmount || 0,
    baseAmount:      (rawInv.taxableAmount || 0) + (rawInv.discountAmount || 0),
    couponCode:      rawInv.couponCode,
    billingPeriod:   rawInv.billingPeriod,
    services: (rawInv.lines || []).map(l => ({
      name: l.description,
      hsn:  l.hsnSac || '998422',
      rate: l.unitPrice,
      qty:  l.quantity,
    })),
  }

  const discountAmt = inv.discountAmount || 0
  const taxable    = (inv.baseAmount || 0) - discountAmt
  const igst       = rawInv.igst ?? 0
  const sgst       = rawInv.sgst ?? (igst > 0 ? 0 : Math.round(taxable * 0.09 * 100) / 100)
  const cgst       = rawInv.cgst ?? (igst > 0 ? 0 : Math.round(taxable * 0.09 * 100) / 100)
  const grandTotal = rawInv.totalAmount || (taxable + (igst > 0 ? igst : sgst + cgst))
  const igstRate   = taxable > 0 ? Math.round((igst / taxable) * 100 * 100) / 100 : 18
  const sgstRate   = taxable > 0 ? Math.round((sgst / taxable) * 100 * 100) / 100 : 9
  const cgstRate   = taxable > 0 ? Math.round((cgst / taxable) * 100 * 100) / 100 : 9
  const badge      = STATUS_BADGE[inv.status] ?? STATUS_BADGE.pending
  // showPackageNameOnInvoice controls whether the HSN Code column appears
  const entity        = getCompanyEntity(inv.companyEntityId)
  const showHsnColumn = !(entity?.showPackageNameOnInvoice ?? true)

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Print CSS — hides the app sidebar and header so only the invoice renders */}
      <style>{`
        @media print {
          aside, header { display: none !important; }
          body > #root > div { overflow: visible !important; height: auto !important; }
          body > #root > div > div { margin-left: 0 !important; }
        }
      `}</style>

      {/* Action buttons — top right, hidden on print */}
      <div className="max-w-4xl mx-auto flex justify-end gap-2 mb-3 print:hidden">
        {rawInv && rawInv.status !== 'paid' && rawInv.status !== 'cancelled' && (
          <button
            onClick={() => { setCnAmount(''); setCnReasonType(CN_REASONS[0]); setCnReasonText(''); setCnModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg shadow-sm hover:bg-orange-700 transition-colors"
          >
            <FileMinus size={14} /> Issue Credit Note
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg shadow-sm hover:bg-brand-blue/90 transition-colors"
        >
          <Download size={14} /> Download PDF
        </button>
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
                {showHsnColumn && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-28">HSN Code</th>
                )}
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
                  {showHsnColumn && (
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{svc.hsn}</td>
                  )}
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
              <span className="text-gray-600">Base Amount</span>
              <span className="font-mono text-gray-800">₹ {fmt(inv.baseAmount || taxable + discountAmt)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">
                  Discount{inv.couponCode ? ` (${inv.couponCode})` : ''}
                </span>
                <span className="font-mono text-emerald-600">-₹ {fmt(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Taxable Amount</span>
              <span className="font-mono text-gray-800">₹ {fmt(taxable)}</span>
            </div>
            {igst > 0 ? (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">IGST ({igstRate}%)</span>
                <span className="font-mono text-gray-800">₹ {fmt(igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">SGST ({sgstRate}%)</span>
                  <span className="font-mono text-gray-800">₹ {fmt(sgst)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">CGST ({cgstRate}%)</span>
                  <span className="font-mono text-gray-800">₹ {fmt(cgst)}</span>
                </div>
              </>
            )}
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

      {/* Issue Credit Note Modal */}
      {cnModal && rawInv && (() => {
        const maxCredit = (rawInv.totalAmount || 0) - (rawInv.cnApplied || 0)
        const parsed = parseFloat(cnAmount) || 0
        const valid = parsed > 0 && parsed <= maxCredit
        const reason = cnReasonType === 'Other' ? cnReasonText.trim() : cnReasonType
        function handleIssueCn() {
          if (!valid || !reason) return
          const cn = issueCreditNote({
            invoiceNo: rawInv.no,
            reason,
            amount: parsed,
            entityId: rawInv.entityId ?? 1,
            customerId: rawInv.customerId,
            issuedBy: 'Admin User',
          })
          setCnModal(false)
          navigate(`/billing/credit-note/${encodeURIComponent(cn.no)}`)
        }
        return (
          <Modal isOpen onClose={() => setCnModal(false)} title="Issue Credit Note">
            <div className="space-y-4 py-1">
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                Against invoice <span className="font-mono font-semibold">{rawInv.no}</span>
                {' '}— max credit: <span className="font-semibold">{fmtCur(maxCredit)}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Credit Amount (₹)</label>
                <input
                  type="number" min="1" max={maxCredit} step="0.01"
                  value={cnAmount}
                  onChange={e => setCnAmount(e.target.value)}
                  placeholder={`Up to ${fmtCur(maxCredit)}`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <select value={cnReasonType} onChange={e => setCnReasonType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2">
                  {CN_REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
                {cnReasonType === 'Other' && (
                  <input value={cnReasonText} onChange={e => setCnReasonText(e.target.value)}
                    placeholder="Describe reason…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => setCnModal(false)} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={handleIssueCn}
                  disabled={!valid || !reason}
                  className="flex-1 !bg-orange-600 hover:!bg-orange-700 !border-orange-600 disabled:opacity-50">
                  Issue Credit Note
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
