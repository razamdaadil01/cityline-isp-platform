import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeftRight, CalendarDays, Store as StoreIcon } from 'lucide-react'
import Button from '../../components/ui/Button'
import { getStoreTransfers, subscribeStoreTransfers } from '../../data/storeTransferStore'
import { usePermission } from '../../data/rolesStore'

// Flattens { transfer, items: [...] } into one row per (transfer × item
// line) — Date/Store From/Store To/Assigned By repeat per line, Product
// Name and Serial Number (or qty) vary per line, matching the table shape
// the PRD asks for.
function flattenRows(transfers) {
  const rows = []
  transfers.forEach(t => {
    t.items.forEach((it, i) => {
      rows.push({
        key: `${t.id}-${i}`, transferId: t.id, date: t.date,
        storeFromName: t.storeFromName, storeToName: t.storeToName,
        productName: it.productName,
        serialLabel: it.serials.length ? it.serials.join(', ') : it.macs.length ? it.macs.join(', ') : String(it.qty),
        assignedBy: t.assignedBy,
      })
    })
  })
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export default function StoreTransfer() {
  const canCreate = usePermission('Inventory', 'Create')
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState(getStoreTransfers)
  useEffect(() => subscribeStoreTransfers(setTransfers), [])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: transfers.length,
      today: transfers.filter(t => (t.date || '').slice(0, 10) === today).length,
    }
  }, [transfers])

  const [search, setSearch] = useState('')

  const allRows = useMemo(() => flattenRows(transfers), [transfers])
  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allRows
    return allRows.filter(r =>
      r.productName.toLowerCase().includes(q) ||
      r.storeFromName.toLowerCase().includes(q) ||
      r.storeToName.toLowerCase().includes(q) ||
      r.serialLabel.toLowerCase().includes(q) ||
      r.assignedBy.toLowerCase().includes(q)
    )
  }, [allRows, search])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Transfer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} of {allRows.length} transfer lines</p>
        </div>
        {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/inventory/store-transfer/new')}>Transfer Product</Button>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Transfers',   value: stats.total, icon: ArrowLeftRight, color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: "Today's Transfers", value: stats.today, icon: CalendarDays,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product, store, serial, assigned by…"
          className="pl-9 pr-3 py-1.5 text-sm w-96 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Store From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Store To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Product Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serial Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Assigned By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-400">
                    <StoreIcon size={32} className="mx-auto mb-2 text-gray-200" />
                    No store transfers found
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.key} onClick={() => navigate(`/inventory/store-transfer/${r.transferId}`)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{(r.date || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{r.storeFromName}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{r.storeToName}</td>
                  <td className="px-4 py-3 text-gray-800 text-xs font-medium whitespace-nowrap">{r.productName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">{r.serialLabel}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.assignedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
