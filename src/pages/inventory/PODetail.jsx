import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Printer, Edit2, ShieldCheck, AlertTriangle, ExternalLink,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getPurchaseOrder, subscribePurchaseOrders } from '../../data/purchaseOrderStore'
import { getVendor } from '../../data/vendorStore'
import { getStore } from '../../data/storeStore'
import { getCompanyEntity } from '../../data/companyEntities'
import { getApproval, subscribeApprovals } from '../../data/approvalsStore'

const STATUS_BADGE = {
  Draft: 'gray',
  'Approval Request': 'yellow',
  'Correction Required': 'red',
  Approved: 'blue',
  Sent: 'indigo',
  'Partially Received': 'orange',
  'Fully Received': 'green',
  Closed: 'slate',
  Cancelled: 'red',
}

const APPROVAL_STATUS_BADGE = { Pending: 'yellow', Approved: 'green', Rejected: 'red' }

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">
        {value === undefined || value === null || value === '' ? <span className="text-gray-300">—</span> : value}
      </span>
    </div>
  )
}

export default function PODetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribePurchaseOrders(() => forceRerender(n => n + 1)), [])
  useEffect(() => subscribeApprovals(() => forceRerender(n => n + 1)), [])

  const po = getPurchaseOrder(id)

  if (!po) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/purchase-orders')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Purchase Orders
        </button>
        <p className="text-sm text-gray-400 mt-4">Purchase order {id} was not found.</p>
      </div>
    )
  }

  const vendor = getVendor(po.vendorId)
  const store = getStore(po.storeId)
  const entity = getCompanyEntity(po.companyEntityId)
  const approval = po.approvalId ? getApproval(po.approvalId) : null

  const canEdit = ['Draft', 'Correction Required'].includes(po.status)
  const canApprove = po.status === 'Approval Request' && po.approvalId

  return (
    <div className="p-6 space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory/purchase-orders')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{po.poNumber}</h1>
              <Badge variant={STATUS_BADGE[po.status] ?? 'gray'} size="sm" dot>{po.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {vendor?.companyName ?? '—'} · Deliver to {store?.storeName ?? '—'}
              {entity && <span className="text-gray-400"> · {entity.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} disabled title="Coming soon">
            Download PO
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} disabled title="Coming soon">
            Print
          </Button>
          {canEdit && (
            <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => navigate(`/inventory/purchase-orders/${po.id}/edit`)}>
              Edit
            </Button>
          )}
          {canApprove && (
            <Button size="sm" icon={<ShieldCheck size={14} />} onClick={() => navigate(`/approvals/${po.approvalId}`)}>
              Approve
            </Button>
          )}
        </div>
      </div>

      {po.status === 'Correction Required' && approval?.decisionComment && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Correction requested</p>
            <p className="text-amber-700 mt-0.5">{approval.decisionComment}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT: order details */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-left px-3 py-2 font-semibold">SKU</th>
                    <th className="text-left px-3 py-2 font-semibold">Unit / Drum</th>
                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold">Price</th>
                    <th className="text-right px-3 py-2 font-semibold">GST %</th>
                    <th className="text-right px-3 py-2 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {po.items.map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-gray-700">{it.productName}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{it.sku || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{it.type === 'wire' ? (it.drum || '—') : it.unit}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{it.qty}</td>
                      <td className="px-3 py-2 text-right text-gray-600">₹{it.price.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{it.gstPercent}%</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{it.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(po.notes || po.terms) && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-800">Notes &amp; Terms</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {po.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.notes}</p>
                  </div>
                )}
                {po.terms && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Terms &amp; Conditions</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: order info + summary + approval */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Order Information</p>
            <InfoRow label="PO Number" value={<span className="font-mono text-brand-blue">{po.poNumber}</span>} />
            <InfoRow label="Status" value={<Badge variant={STATUS_BADGE[po.status] ?? 'gray'} size="sm" dot>{po.status}</Badge>} />
            <InfoRow label="Vendor" value={vendor?.companyName} />
            <InfoRow label="Delivery Store" value={store?.storeName} />
            <InfoRow label="Order Date" value={po.orderDate} />
            <InfoRow label="Estimated Delivery" value={po.estimatedDeliveryDate} />
            <InfoRow label="Created By" value={po.createdBy} />
          </div>

          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Commercial Summary</p>
            <InfoRow label="Subtotal" value={`₹${po.subtotal.toLocaleString('en-IN')}`} />
            <InfoRow label="Discount" value={`₹${po.discount.toLocaleString('en-IN')}`} />
            <InfoRow label="Taxable Amount" value={`₹${po.taxableAmount.toLocaleString('en-IN')}`} />
            <InfoRow label="GST" value={`₹${po.gstAmount.toLocaleString('en-IN')}`} />
            <InfoRow label="Other Charges" value={`₹${po.otherCharges.toLocaleString('en-IN')}`} />
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-surface-border">
              <span className="text-sm font-bold text-gray-900">Grand Total</span>
              <span className="text-lg font-extrabold text-brand-blue">₹{po.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {approval && (
            <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Approval Status</p>
              <InfoRow label="Request ID" value={<span className="font-mono text-brand-blue">{approval.id}</span>} />
              <InfoRow label="Status" value={<Badge variant={APPROVAL_STATUS_BADGE[approval.status]} size="sm" dot>{approval.status}</Badge>} />
              <InfoRow label="Requested By" value={approval.requestedBy} />
              {approval.decidedBy && <InfoRow label="Decided By" value={approval.decidedBy} />}
              {approval.decisionComment && <InfoRow label="Comment" value={approval.decisionComment} />}
              <button
                onClick={() => navigate(`/approvals/${approval.id}`)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-brand-blue border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors"
              >
                View in Approvals <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
