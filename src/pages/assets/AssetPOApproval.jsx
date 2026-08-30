import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import AssetModuleTabs from './AssetModuleTabs'
import { getPurchaseOrders, subscribePurchaseOrders, getPoStatusLabel } from '../../data/purchaseOrderStore'
import { getAssets, subscribeAssets, assetDisplayName } from '../../data/assetStore'

// Same status→color mapping PurchaseOrders.jsx's own list page uses —
// duplicated rather than imported since neither file exports it, matching
// this codebase's existing convention of a small per-page STATUS_BADGE
// constant (AssetList.jsx/AssetDetail.jsx each keep their own too).
const STATUS_BADGE = {
  Draft: 'gray',
  'Approval Request': 'yellow',
  'Correction Required': 'red',
  Sent: 'indigo',
  'Partially Received': 'orange',
  'Fully Received': 'green',
  Closed: 'slate',
  Cancelled: 'red',
}

// This page is a filtered VIEW ONLY over purchaseOrderStore.js — no
// approval action UI lives here. A row click navigates straight into
// PODetail.jsx, the exact same detail page the Inventory module's own
// Purchase Orders list uses; PODetail.jsx already has its own "View
// Approval Request" link into ApprovalDetail.jsx when the PO is at that
// stage, so this page never needs to know about approvals directly.
export default function AssetPOApproval() {
  const navigate = useNavigate()
  const [pos, setPos] = useState(getPurchaseOrders)
  useEffect(() => subscribePurchaseOrders(setPos), [])
  const [assets, setAssets] = useState(getAssets)
  useEffect(() => subscribeAssets(setAssets), [])

  const rows = useMemo(() => {
    return pos
      .filter(po => po.poType === 'Asset Purchase')
      .map(po => ({
        po,
        linkedAssets: assets.filter(a => a.poId === po.id),
      }))
      .sort((a, b) => new Date(b.po.createdAt) - new Date(a.po.createdAt))
  }, [pos, assets])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} asset-originated purchase order{rows.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <AssetModuleTabs />

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">PO Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Asset(s)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2 text-gray-200" />
                    No asset purchase orders found
                  </td>
                </tr>
              ) : rows.map(({ po, linkedAssets }) => (
                <tr
                  key={po.id}
                  onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-brand-blue">{po.poNumber}</span></td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {linkedAssets.length === 0
                      ? <span className="text-gray-300">—</span>
                      : linkedAssets.map(a => `${a.id} · ${assetDisplayName(a)}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 font-medium text-xs whitespace-nowrap">₹{po.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[po.status] ?? 'gray'} size="sm" dot>{getPoStatusLabel(po.status)}</Badge></td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{(po.createdAt || '').slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
