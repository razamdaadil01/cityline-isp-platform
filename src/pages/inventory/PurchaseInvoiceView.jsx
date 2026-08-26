import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer } from 'lucide-react'
import Button from '../../components/ui/Button'
import { getPurchase } from '../../data/purchaseStore'
import { getVendor, getContacts } from '../../data/vendorStore'
import { getStore } from '../../data/storeStore'
import { getCompanyEntity } from '../../data/companyEntities'

// No invoice/attachment field exists anywhere on a Purchase record (see
// purchaseStore.js) — there's nothing uploaded to open. This is a generated,
// print-style summary of the purchase's own data instead, following the
// same A4-card + print button + print-only CSS pattern as InvoicePDF.jsx
// (the only other "open a document" page in this app; PO Detail's own
// Download PO/Print buttons are still disabled "Coming soon" stubs, so
// there's nothing working there to reuse).

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const STATUS_BADGE = {
  Draft:     'bg-gray-100 text-gray-600 border border-gray-300',
  Received:  'bg-indigo-100 text-indigo-700 border border-indigo-300',
  Confirmed: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  Cancelled: 'bg-red-100 text-red-700 border border-red-300',
}

export default function PurchaseInvoiceView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const purchase = getPurchase(id)

  if (!purchase) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">Purchase {id} was not found</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/purchases')}>Back to Purchases</Button>
      </div>
    )
  }

  const vendor = getVendor(purchase.vendorId)
  const store = getStore(purchase.storeId)
  const entity = getCompanyEntity(purchase.companyEntityId)
  const vendorContact = vendor ? getContacts(vendor)[0] : null
  const receivedItems = purchase.items.filter(it => Number(it.receivedQty) > 0)
  const badge = STATUS_BADGE[purchase.status] ?? STATUS_BADGE.Draft

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* Print button — top right, hidden on print */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-brand-blue hover:underline"
        >
          ← Back
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
        id="purchase-invoice-doc"
        className="max-w-4xl mx-auto bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >

        {/* ── HEADER ── */}
        <div className="px-8 pt-7 pb-5 border-b border-gray-200">
          <h1 className="text-center text-lg font-black tracking-widest text-gray-800 mb-5 uppercase">Purchase Invoice</h1>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm">CL</span>
              </div>
              <div>
                <p className="font-black text-gray-900 text-base leading-tight">{entity?.name ?? 'Cityline'}</p>
                {entity?.gstin && <p className="text-brand-blue text-[10px] font-semibold tracking-widest uppercase">GST: {entity.gstin}</p>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${badge}`}>
                  {purchase.status}
                </span>
              </div>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Purchase No.: </span><span className="font-bold font-mono">{purchase.purchaseNumber}</span></p>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Purchase Date: </span><span className="font-semibold">{purchase.purchaseDate}</span></p>
              <p className="text-sm text-gray-700">
                <span className="text-gray-400 font-medium">PO Reference: </span>
                <span className="font-semibold font-mono">{purchase.poNumber ?? 'Outside PO'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN INFO TABLE ── */}
        <div className="grid grid-cols-2 border-b border-gray-200">
          <div className="px-8 py-5 border-r border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Vendor Details</p>
            <p className="text-sm font-bold text-gray-900">{vendor?.companyName ?? '—'}</p>
            {vendor?.gstNumber && <p className="text-xs text-gray-600 mt-1">GST No: {vendor.gstNumber}</p>}
            {vendor?.address && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{vendor.address}</p>}
            {vendorContact && (
              <p className="text-xs text-gray-600 mt-1.5">
                {vendorContact.name}{vendorContact.phone ? ` · ${vendorContact.phone}` : ''}
              </p>
            )}
          </div>

          <div className="px-8 py-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Received At</p>
            <div className="space-y-1 text-xs text-gray-700">
              <p><span className="text-gray-400 w-28 inline-block">Store:</span> <span className="font-semibold text-gray-900">{store?.storeName ?? purchase.storeName ?? '—'}</span></p>
              {store?.branchCode && <p><span className="text-gray-400 w-28 inline-block">Branch:</span> <span className="font-medium">{store.branchCode}</span></p>}
              <p><span className="text-gray-400 w-28 inline-block">Purchase ID:</span> <span className="font-medium font-mono">{purchase.id}</span></p>
            </div>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Items Received</p>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-12">SNo.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-24">Qty</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-24">Price</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-20">GST %</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receivedItems.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-xs text-gray-400">No items received on this purchase.</td></tr>
              ) : receivedItems.map((it, idx) => (
                <tr key={it.id}>
                  <td className="px-4 py-3 text-xs text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                    {it.productName}
                    <span className="text-gray-400 font-normal ml-1 capitalize">({it.type})</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">{it.receivedQty}{it.unit ? ` ${it.unit}` : ''}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">{fmt(it.price)}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">{it.gstPercent}%</td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-800">{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TOTALS ── */}
        <div className="px-8 py-5 border-b border-gray-200">
          <div className="ml-auto w-72 space-y-0 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Received Value</span>
              <span className="font-mono text-gray-800">{fmt(purchase.receivedValue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Extra Item Value</span>
              <span className="font-mono text-gray-800">{fmt(purchase.extraItemValue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">GST</span>
              <span className="font-mono text-gray-800">{fmt(purchase.gstAmount)}</span>
            </div>
            <div className="flex justify-between py-2.5 bg-gray-50 px-3 rounded-b-lg">
              <span className="font-bold text-gray-900">Grand Total</span>
              <span className="font-black font-mono text-gray-900">{fmt(purchase.totalPurchaseValue)}</span>
            </div>
          </div>
        </div>

        {purchase.remarks && (
          <div className="px-8 py-5 border-b border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Remarks</p>
            <p className="text-xs text-gray-600 leading-relaxed">{purchase.remarks}</p>
          </div>
        )}

        <p className="px-8 py-4 text-center text-[11px] text-gray-400">
          This is a system-generated purchase invoice summary — no signature required.
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
          #purchase-invoice-doc, #purchase-invoice-doc * { visibility: visible; }
          #purchase-invoice-doc { position: fixed; top: 0; left: 0; width: 100%; border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}
