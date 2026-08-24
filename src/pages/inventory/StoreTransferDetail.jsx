import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getStoreTransfer, subscribeStoreTransfers } from '../../data/storeTransferStore'

const STATUS_BADGE = { Completed: 'green' }

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

export default function StoreTransferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribeStoreTransfers(() => forceRerender(n => n + 1)), [])

  const transfer = getStoreTransfer(id)

  if (!transfer) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/store-transfer')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Store Transfer
        </button>
        <p className="text-sm text-gray-400 mt-4">Transfer {id} was not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inventory/store-transfer')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{transfer.transferNumber}</h1>
            <Badge variant={STATUS_BADGE[transfer.status] ?? 'gray'} size="sm" dot>{transfer.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            {transfer.storeFromName} <ArrowRight size={12} /> {transfer.storeToName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT: items */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Items Transferred</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                    <th className="text-left px-3 py-2 font-semibold">Serial / MAC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {transfer.items.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">No items</td></tr>
                  ) : transfer.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{it.productName}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{it.serials.length + it.macs.length || it.qty}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">
                        {it.serials.length ? `Serials: ${it.serials.join(', ')}`
                          : it.macs.length ? `MACs: ${it.macs.join(', ')}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: transfer info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Transfer Information</p>
            <InfoRow label="Transfer Number" value={<span className="font-mono text-brand-blue">{transfer.transferNumber}</span>} />
            <InfoRow label="Status" value={<Badge variant={STATUS_BADGE[transfer.status] ?? 'gray'} size="sm" dot>{transfer.status}</Badge>} />
            <InfoRow label="Store From" value={transfer.storeFromName} />
            <InfoRow label="Store To" value={transfer.storeToName} />
            <InfoRow label="Assigned By" value={transfer.assignedBy} />
            <InfoRow label="Date" value={(transfer.date || '').slice(0, 16).replace('T', ' ')} />
          </div>
        </div>
      </div>
    </div>
  )
}
