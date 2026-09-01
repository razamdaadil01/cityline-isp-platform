import { Boxes } from 'lucide-react'

// Shared Item / Requested Qty / Consumed Qty / Balance table for both HDD's
// and Site's Inventory tabs — the two project types aggregate "consumed"
// very differently (HDD matches segment ductsUsed/couplersUsed by name,
// Site sums DPR materialConsumed by item id), so that logic stays in each
// caller (projectStore.js's getHDDInventorySummary() / SiteProjectDetail.jsx's
// computeInventorySummary()), but the resulting {itemId, name, requested,
// consumed, balance} row shape and its rendering are identical, so only
// the rendering lives here.
export default function InventoryConsumptionTable({ rows, barcodesByLocation = {}, emptyText = 'No inventory recorded yet' }) {
  if (rows.length === 0) {
    return (
      <div className="py-14 text-center text-sm text-gray-400">
        <Boxes size={28} className="mx-auto mb-2 text-gray-200" />
        {emptyText}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumed Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map(r => (
              <tr key={r.itemId}>
                <td className="px-4 py-3 text-gray-800 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.requested}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.consumed}</td>
                <td className={`px-4 py-3 text-right font-semibold ${r.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.keys(barcodesByLocation).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scanned Serialized Equipment by Location</h4>
          <div className="space-y-1.5">
            {Object.entries(barcodesByLocation).map(([loc, codes]) => (
              <p key={loc} className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{loc}:</span> {codes.join(', ')}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
