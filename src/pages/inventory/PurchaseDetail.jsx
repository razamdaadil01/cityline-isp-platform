import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, CheckCircle2, AlertTriangle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getPurchase, subscribePurchases, savePurchase } from '../../data/purchaseStore'
import { getVendor } from '../../data/vendorStore'
import { getStore } from '../../data/storeStore'
import { getCompanyEntity } from '../../data/companyEntities'
import { getProduct } from '../../data/productStore'

const STATUS_BADGE = { Draft: 'gray', Received: 'indigo', Confirmed: 'green', Cancelled: 'red' }
const MAC_RE = /^[0-9A-Fa-f]{2}([:-]?[0-9A-Fa-f]{2}){5}$/

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

function isConfirmable(purchase) {
  if (!purchase.companyEntityId || !purchase.vendorId || !purchase.storeId || !purchase.purchaseDate) return false
  const receivedItems = purchase.items.filter(it => it.receivedQty > 0)
  if (receivedItems.length === 0) return false
  return receivedItems.every(it => {
    if (it.type === 'wire') return !!it.drumNumber?.trim()
    const product = getProduct(it.productId)
    const serialsOk = !product?.trackedBySerial || (it.serials.length === it.receivedQty && it.serials.every(s => s.trim()))
    const macsOk = !product?.trackedByMac || (it.macs.length === it.receivedQty && it.macs.every(m => MAC_RE.test(m.trim())))
    return serialsOk && macsOk
  })
}

export default function PurchaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribePurchases(() => forceRerender(n => n + 1)), [])

  const purchase = getPurchase(id)

  if (!purchase) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/purchases')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Purchases
        </button>
        <p className="text-sm text-gray-400 mt-4">Purchase {id} was not found.</p>
      </div>
    )
  }

  const vendor = getVendor(purchase.vendorId)
  const store = getStore(purchase.storeId)
  const entity = getCompanyEntity(purchase.companyEntityId)

  const canEdit = purchase.status === 'Draft'
  const canConfirm = purchase.status === 'Draft'
  const confirmable = canConfirm && isConfirmable(purchase)

  function handleConfirm() {
    if (!confirmable) return
    savePurchase({
      poId: purchase.poId, poNumber: purchase.poNumber,
      vendorId: purchase.vendorId, vendorName: purchase.vendorName,
      storeId: purchase.storeId, storeName: purchase.storeName,
      companyEntityId: purchase.companyEntityId, purchaseDate: purchase.purchaseDate,
      items: purchase.items, remarks: purchase.remarks,
    }, { editingId: purchase.id, action: 'confirm' })
  }

  return (
    <div className="p-6 space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory/purchases')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{purchase.purchaseNumber}</h1>
              <Badge variant={STATUS_BADGE[purchase.status] ?? 'gray'} size="sm" dot>{purchase.status}</Badge>
              {purchase.poId ? (
                <button onClick={() => navigate(`/inventory/purchase-orders/${purchase.poId}`)} className="font-mono text-xs font-semibold text-brand-blue hover:underline">
                  {purchase.poNumber}
                </button>
              ) : (
                <Badge variant="purple" size="sm">Outside PO</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {vendor?.companyName ?? '—'} · Store: {store?.storeName ?? '—'}
              {entity && <span className="text-gray-400"> · {entity.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit && (
            <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => navigate(`/inventory/purchases/${purchase.id}/edit`)}>
              Edit
            </Button>
          )}
          {canConfirm && (
            <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleConfirm} disabled={!confirmable}
              title={confirmable ? undefined : 'Complete all received-line tracking details (edit this purchase) before confirming'}>
              Confirm Purchase
            </Button>
          )}
        </div>
      </div>

      {canConfirm && !confirmable && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">This draft isn't ready to confirm yet</p>
            <p className="text-amber-700 mt-0.5">
              At least one received line, with its Drum Number / Serial / MAC fields fully filled in, is required. Edit this purchase to complete it.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT: receipt table + remarks */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Product Receipt</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-right px-3 py-2 font-semibold">PO Qty</th>
                    <th className="text-right px-3 py-2 font-semibold">Received</th>
                    <th className="text-right px-3 py-2 font-semibold">Short</th>
                    <th className="text-right px-3 py-2 font-semibold">Extra</th>
                    <th className="text-left px-3 py-2 font-semibold">Tracking</th>
                    <th className="text-right px-3 py-2 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {purchase.items.map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-gray-700">
                        {it.productName}
                        {it.source === 'outside' && <Badge variant="purple" size="sm" className="ml-1.5">Outside PO</Badge>}
                        {it.reason && <p className="text-[11px] text-gray-400 mt-0.5">{it.reason}</p>}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{it.poQty}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{it.receivedQty}</td>
                      <td className="px-3 py-2 text-right">{it.shortQty > 0 ? <span className="text-red-600 font-medium">{it.shortQty}</span> : <span className="text-gray-300">0</span>}</td>
                      <td className="px-3 py-2 text-right">{it.extraQty > 0 ? <span className="text-emerald-600 font-medium">{it.extraQty}</span> : <span className="text-gray-300">0</span>}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {it.type === 'wire' ? (it.drumNumber ? `Drum: ${it.drumNumber}` : '—')
                          : it.serials?.length ? `Serials: ${it.serials.join(', ')}`
                          : it.macs?.length ? `MACs: ${it.macs.join(', ')}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{it.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kit Components Received — only for a Splicing Machine asset's
              own line item (item.kitComponents is only ever populated for
              that case, see CreatePurchase.jsx's requestedKitComponents());
              every other item never has a non-empty kitComponents array, so
              this whole card is skipped for a purchase with none. Read-only
              — this is a view page, confirmation happens in the GRN wizard. */}
          {purchase.items.some(it => it.kitComponents?.length > 0) && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-800">Kit Components Received</h3>
              </div>
              <div className="divide-y divide-surface-border">
                {purchase.items.filter(it => it.kitComponents?.length > 0).map(it => (
                  <div key={it.id} className="overflow-x-auto">
                    <p className="px-5 pt-3 pb-1 text-xs font-medium text-gray-500">{it.productName}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                          <th className="text-left px-3 py-2 font-semibold">Component Type</th>
                          <th className="text-left px-3 py-2 font-semibold">Component Name</th>
                          <th className="text-left px-3 py-2 font-semibold">Serial Number</th>
                          <th className="text-left px-3 py-2 font-semibold">Condition</th>
                          <th className="text-left px-3 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {it.kitComponents.map(c => (
                          <tr key={c.id}>
                            <td className="px-3 py-2 text-gray-700">{c.componentType || <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-2 text-gray-700">{c.componentName || <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono">{c.serialNumber || <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-2 text-gray-700">{c.condition || <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-2">
                              {/* purchase.items[i].kitComponents only ever carries the
                                  `received` boolean captured in CreatePurchase.jsx —
                                  `receivedStatus` ('Received'/'Missing') is computed and
                                  written only onto the linked Asset record, by
                                  confirmKitComponentsForAsset() in assetStore.js, not
                                  back onto the Purchase record itself. */}
                              {c.received === false ? (
                                <Badge variant="red" size="sm" dot>Missing</Badge>
                              ) : c.received === true ? (
                                <Badge variant="green" size="sm" dot>Received</Badge>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {purchase.remarks && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-800">Remarks</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{purchase.remarks}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: order info + calculation */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Purchase Information</p>
            <InfoRow label="Purchase Number" value={<span className="font-mono text-brand-blue">{purchase.purchaseNumber}</span>} />
            <InfoRow label="Status" value={<Badge variant={STATUS_BADGE[purchase.status] ?? 'gray'} size="sm" dot>{purchase.status}</Badge>} />
            <InfoRow label="Linked PO" value={purchase.poId
              ? <button onClick={() => navigate(`/inventory/purchase-orders/${purchase.poId}`)} className="font-mono text-brand-blue hover:underline">{purchase.poNumber}</button>
              : <Badge variant="purple" size="sm">Outside PO</Badge>} />
            <InfoRow label="Vendor" value={vendor?.companyName} />
            <InfoRow label="Store" value={store?.storeName} />
            <InfoRow label="Purchase Date" value={purchase.purchaseDate} />
            <InfoRow label="Created By" value={purchase.createdBy} />
          </div>

          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Purchase Calculation</p>
            <InfoRow label="PO Subtotal (excl. GST)" value={`₹${purchase.poAmount.toLocaleString('en-IN')}`} />
            <InfoRow label="Received Value" value={`₹${purchase.receivedValue.toLocaleString('en-IN')}`} />
            <InfoRow label="Extra Item Value" value={`₹${purchase.extraItemValue.toLocaleString('en-IN')}`} />
            <InfoRow label="GST" value={`₹${purchase.gstAmount.toLocaleString('en-IN')}`} />
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-surface-border">
              <span className="text-sm font-bold text-gray-900">Total Purchase Value</span>
              <span className="text-lg font-extrabold text-brand-blue">₹{purchase.totalPurchaseValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
