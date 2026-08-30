import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer, Download } from 'lucide-react'
import Button from '../../components/ui/Button'
import { getDeliveryChallanByTransferId } from '../../data/deliveryChallanStore'

// Print-friendly Delivery Challan document — same A4-card + print button +
// print-only CSS pattern as PurchaseInvoiceView.jsx (this app's one
// existing "generate a printable document from a record" page). PODetail.jsx's
// own "Download PO"/"Print" buttons are still disabled "Coming soon" stubs
// (see that file), so there's nothing actually working there to reuse —
// PurchaseInvoiceView.jsx is the real precedent. Route is
// /inventory/store-transfer/:id/challan, where `:id` is the STORE
// TRANSFER's own id — the challan itself is looked up by that link, not by
// its own id, since every entry point into this page (StoreTransfer.jsx's
// 3-dot menu) only ever knows the transfer.
//
// No PDF-generation library exists anywhere in this codebase (confirmed —
// PurchaseInvoiceView.jsx only ever offers Print, never a separate
// Download). "Download" here reuses that same window.print() call — the
// browser's own "Save as PDF" destination in the print dialog is this
// app's only real download mechanism — rather than a second, disabled
// "Coming soon" stub like PODetail.jsx's.
export default function DeliveryChallanView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const challan = getDeliveryChallanByTransferId(id)

  if (!challan) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">No Delivery Challan found for transfer {id}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/store-transfer')}>Back to Store Transfer</Button>
      </div>
    )
  }

  const { consignor, consignee } = challan

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* Back/Print/Download — hidden on print */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-3 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-brand-blue hover:underline">
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* A4-style card */}
      <div
        id="delivery-challan-doc"
        className="max-w-4xl mx-auto bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >

        {/* ── HEADER ── */}
        <div className="px-8 pt-7 pb-5 border-b border-gray-200">
          <h1 className="text-center text-lg font-black tracking-widest text-gray-800 mb-5 uppercase">Delivery Challan</h1>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Challan No.: </span><span className="font-bold font-mono">{challan.challanNumber}</span></p>
              <p className="text-sm text-gray-700 mt-1"><span className="text-gray-400 font-medium">Challan Date: </span><span className="font-semibold">{(challan.challanDate || '').slice(0, 10)}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-700">
                <span className="text-gray-400 font-medium">Store Transfer Ref.: </span>
                <span className="font-semibold font-mono">{challan.transferNumber}</span>
              </p>
              {challan.reason && (
                <p className="text-xs text-gray-500 mt-1 max-w-xs">Reason: {challan.reason}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── CONSIGNOR / CONSIGNEE ── */}
        <div className="grid grid-cols-2 border-b border-gray-200">
          <div className="px-8 py-5 border-r border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Consignor (Store From)</p>
            <p className="text-sm font-bold text-gray-900">{consignor.storeName}</p>
            {consignor.branchCode && <p className="text-xs text-gray-600 mt-1">Branch: {consignor.branchCode}</p>}
            <p className="text-xs text-gray-500 mt-1">GSTIN: {consignor.gstin ?? <span className="text-gray-300">—</span>}</p>
            <p className="text-xs text-gray-500 mt-1">Address: {consignor.address ?? <span className="text-gray-300">—</span>}</p>
            {consignor.contactName && (
              <p className="text-xs text-gray-600 mt-1.5">
                {consignor.contactName}{consignor.contactPhone ? ` · ${consignor.contactPhone}` : ''}
              </p>
            )}
          </div>

          <div className="px-8 py-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Consignee (Store To)</p>
            <p className="text-sm font-bold text-gray-900">{consignee.storeName}</p>
            {consignee.branchCode && <p className="text-xs text-gray-600 mt-1">Branch: {consignee.branchCode}</p>}
            <p className="text-xs text-gray-500 mt-1">GSTIN: {consignee.gstin ?? <span className="text-gray-300">—</span>}</p>
            <p className="text-xs text-gray-500 mt-1">Address: {consignee.address ?? <span className="text-gray-300">—</span>}</p>
            {consignee.contactName && (
              <p className="text-xs text-gray-600 mt-1.5">
                {consignee.contactName}{consignee.contactPhone ? ` · ${consignee.contactPhone}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* ── PLACE OF SUPPLY ── */}
        <div className="px-8 py-3 border-b border-gray-200">
          <p className="text-xs text-gray-500">
            <span className="text-gray-400 font-medium">Place of Supply: </span>
            {challan.placeOfSupply ?? <span className="text-gray-300">—</span>}
          </p>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Description of Goods</p>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-12">SNo.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Description of Goods</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-28">HSN Code</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-24">Quantity</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-20">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {challan.items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-xs text-gray-400">No items on this challan.</td></tr>
              ) : challan.items.map((it, idx) => (
                <tr key={`${it.productId}-${idx}`}>
                  <td className="px-4 py-3 text-xs text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                    {it.productName}
                    {it.identifier && <span className="block text-[11px] text-gray-400 font-mono font-normal mt-0.5">{it.identifier}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{it.hsnCode ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">{it.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{it.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── SIGNATURE ── */}
        <div className="px-8 py-8 border-b border-gray-200">
          <div className="ml-auto w-64">
            <div className="border-t border-gray-400 pt-2 text-center">
              <p className="text-xs text-gray-500">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <p className="px-8 py-4 text-center text-[11px] text-gray-400">
          Note: this is an internal document — verify GST/legal formatting requirements before external use.
        </p>

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
          #delivery-challan-doc, #delivery-challan-doc * { visibility: visible; }
          #delivery-challan-doc { position: fixed; top: 0; left: 0; width: 100%; border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}
