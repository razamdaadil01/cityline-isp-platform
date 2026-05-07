import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Download, CheckCircle, AlertTriangle } from 'lucide-react'
import Button from '../components/ui/Button'
import { MOCK_INVOICES, COMPANY_INFO, amountInWords } from '../data/billingData'

const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

  const handlePrint = () => window.print()

  const STATUS_COLOR = { paid: 'text-emerald-600', pending: 'text-amber-600', overdue: 'text-red-600' }
  const STATUS_LABEL = { paid: 'PAID', pending: 'PENDING', overdue: 'OVERDUE' }

  return (
    <div className="p-6 max-w-[1000px]">
      {/* Toolbar – hidden on print */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/billing')}>
          Back to Billing
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Download PDF</Button>
          <Button size="sm" icon={<Printer size={14} />} onClick={handlePrint}>Print Invoice</Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div
        id="invoice-doc"
        className="bg-white rounded-2xl shadow-xl border border-surface-border overflow-hidden"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Header band */}
        <div className="bg-navy px-8 pt-7 pb-6">
          <div className="flex items-start justify-between">
            {/* Logo & company */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-brand-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-sm">CL</span>
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-tight">CITYLINE</p>
                  <p className="text-brand-blue text-xs font-semibold tracking-widest">INTERNET SERVICES</p>
                </div>
              </div>
              <div className="text-gray-300 text-xs space-y-0.5 max-w-xs">
                <p>{COMPANY_INFO.address}</p>
                <p>GSTIN: {COMPANY_INFO.gstin} &nbsp;·&nbsp; PAN: {COMPANY_INFO.pan}</p>
                <p>CIN: {COMPANY_INFO.cin}</p>
                <p>{COMPANY_INFO.phone} &nbsp;·&nbsp; {COMPANY_INFO.email}</p>
              </div>
            </div>
            {/* Invoice title */}
            <div className="text-right">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Tax Invoice</p>
              <p className="text-white text-2xl font-black">{inv.invoiceNo}</p>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-gray-400 text-xs">Issue Date:</span>
                  <span className="text-white text-xs font-semibold">{inv.issueDate}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-gray-400 text-xs">Due Date:</span>
                  <span className="text-white text-xs font-semibold">{inv.dueDate}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-gray-400 text-xs">Billing Period:</span>
                  <span className="text-white text-xs font-semibold">{inv.billingPeriod}</span>
                </div>
              </div>
              <div className={`mt-3 inline-block border-2 rounded-lg px-4 py-1.5 ${
                inv.status === 'paid' ? 'border-emerald-400 text-emerald-400' :
                inv.status === 'overdue' ? 'border-red-400 text-red-400' : 'border-amber-400 text-amber-400'
              }`}>
                <span className="text-sm font-black tracking-widest">{STATUS_LABEL[inv.status]}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Bill To */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="text-base font-bold text-gray-900">{inv.customerName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{inv.address}</p>
              <p className="text-sm text-gray-600 mt-0.5">{inv.phone}</p>
              {inv.email && <p className="text-sm text-gray-600 mt-0.5">{inv.email}</p>}
              <p className="text-xs text-gray-400 mt-1">Customer ID: {inv.customerId}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill From</p>
              <p className="text-base font-bold text-gray-900">{COMPANY_INFO.name}</p>
              <p className="text-sm text-gray-600 mt-0.5">{COMPANY_INFO.address}</p>
              <p className="text-sm text-gray-600 mt-0.5">State: {COMPANY_INFO.stateName} ({COMPANY_INFO.stateCode})</p>
              <p className="text-xs text-gray-400 mt-1">GSTIN: {COMPANY_INFO.gstin}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-border" />

          {/* Services Table */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Services</p>
            <div className="rounded-xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    {['#', 'Description', 'HSN', 'Period', 'Qty', 'Rate (₹)', 'Amount (₹)'].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-left ${h === 'Qty' || h === 'Rate (₹)' || h === 'Amount (₹)' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {inv.services.map((svc, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{svc.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{svc.hsn}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{inv.billingPeriod}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{svc.qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(svc.rate)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmt(svc.rate * svc.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GST Summary */}
          <div className="flex justify-end">
            <div className="w-72 space-y-0 rounded-xl border border-surface-border overflow-hidden">
              <div className="flex justify-between items-center px-5 py-2.5 bg-gray-50/80 border-b border-surface-border">
                <span className="text-sm text-gray-600">Sub-Total</span>
                <span className="text-sm font-semibold text-gray-900 font-mono">₹{fmt(inv.baseAmount)}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-2.5 border-b border-surface-border">
                <div>
                  <span className="text-sm text-gray-600">CGST @ 9%</span>
                  <span className="text-xs text-gray-400 ml-1.5">(HSN {inv.services[0]?.hsn})</span>
                </div>
                <span className="text-sm text-gray-700 font-mono">₹{fmt(inv.cgst)}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-2.5 border-b border-surface-border">
                <div>
                  <span className="text-sm text-gray-600">SGST @ 9%</span>
                  <span className="text-xs text-gray-400 ml-1.5">(HSN {inv.services[0]?.hsn})</span>
                </div>
                <span className="text-sm text-gray-700 font-mono">₹{fmt(inv.sgst)}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3 bg-navy">
                <span className="text-sm font-bold text-white">Grand Total</span>
                <span className="text-lg font-black text-white font-mono">₹{fmt(inv.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl px-5 py-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount in Words: </span>
            <span className="text-sm font-semibold text-gray-800">{amountInWords(inv.totalAmount)}</span>
          </div>

          {/* Security Deposit */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Security Deposit</p>
              <p className="text-xs text-amber-600 mt-0.5">Refundable upon service termination (subject to conditions)</p>
            </div>
            <p className="text-base font-bold text-amber-700 font-mono">₹{fmt(inv.securityDeposit)}</p>
          </div>

          {/* Payment info (if paid) */}
          {inv.status === 'paid' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Payment Received</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  ₹{fmt(inv.totalAmount)} paid via {inv.paymentMode} on {inv.paidOn}
                  {inv.txnId && inv.txnId !== '—' && <> · Txn: <span className="font-mono">{inv.txnId}</span></>}
                </p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-surface-border" />

          {/* Terms & Conditions */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Payment is due by the date mentioned above. Late payments may incur a reconnection fee of ₹100.</li>
              <li>Services are subject to fair usage policy (FUP) as per the subscribed plan terms.</li>
              <li>In case of any billing discrepancy, please raise a support ticket within 30 days of the invoice date.</li>
              <li>This is a computer-generated invoice and does not require a physical signature.</li>
              <li>GSTIN of the customer is required for input tax credit (ITC) claims. Provide GSTIN to billing@cityline.in.</li>
              <li>Cityline Internet Services Pvt. Ltd. reserves the right to suspend services on non-payment of dues.</li>
              <li>Security deposit is refundable within 30 working days of service termination, post equipment return.</li>
            </ol>
          </div>

          {/* Bank Details */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-gray-50 rounded-xl border border-surface-border px-5 py-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bank Transfer Details</p>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">Bank:</span><span>HDFC Bank Ltd.</span></div>
                <div className="flex justify-between"><span className="text-gray-400">A/C Name:</span><span>Cityline Internet Services Pvt. Ltd.</span></div>
                <div className="flex justify-between"><span className="text-gray-400">A/C No:</span><span className="font-mono">50200012345678</span></div>
                <div className="flex justify-between"><span className="text-gray-400">IFSC:</span><span className="font-mono">HDFC0001234</span></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl border border-surface-border px-5 py-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">UPI / Quick Pay</p>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">UPI ID:</span><span className="font-mono">cityline@hdfcbank</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Razorpay:</span><span>{COMPANY_INFO.website}/pay</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Support:</span><span>{COMPANY_INFO.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span>{COMPANY_INFO.email}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-navy px-8 py-4 flex items-center justify-between">
          <p className="text-gray-400 text-xs">
            © 2026 {COMPANY_INFO.name} · {COMPANY_INFO.website}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-brand-blue rounded flex items-center justify-center">
              <span className="text-white font-black text-[8px]">CL</span>
            </div>
            <p className="text-gray-300 text-xs font-medium">Powered by Cityline</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-doc, #invoice-doc * { visibility: visible; }
          #invoice-doc { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
