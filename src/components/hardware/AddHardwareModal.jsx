import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Minus, Plus } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { HARDWARE_CATALOG } from '../../data/hardwareCatalog'

const HARDWARE_CATEGORIES = [
  { key: 'chargeable', label: 'Chargeable' },
  { key: 'non-chargeable', label: 'Non-Chargeable' },
]

// Shared Chargeable/Non-Chargeable multi-select hardware picker — originally
// built for Support Ticket Detail's Hardware tab, reused as-is anywhere else
// hardware needs to be added against a record (e.g. Feasibility Detail).
// Submits via onAdd(items) where each item is
// { name, chargeable, unitPrice, quantity }; the caller owns what happens
// next (create an approval, append to a list, etc).
export default function AddHardwareModal({ open, onClose, onAdd }) {
  const [searchParams, setSearchParams] = useSearchParams()
  // The Chargeable/Non-Chargeable sub-tab is deep-linkable via
  // ?category= on top of whatever ?modal= value the host page uses to open
  // this modal — same merge-safe setSearchParams(prev => new
  // URLSearchParams(prev)) pattern used by ?modal= itself. Switching the
  // tab pushes a new history entry.
  const category = searchParams.get('category') === 'non-chargeable' ? 'non-chargeable' : 'chargeable'
  const [search, setSearch] = useState('')
  // Keyed by item name so the same selection set carries across switching
  // Chargeable/Non-Chargeable — a single submit can add items from both.
  const [selected, setSelected] = useState({})

  // On open, pre-check the first 2 Chargeable + first 2 Non-Chargeable
  // catalog items (both categories at once, since selection is shared
  // across the tab toggle) rather than starting from an empty selection.
  // Also reset the sub-tab back to its ?category=chargeable default.
  useEffect(() => {
    if (!open) { setSelected({}); return }
    setSearch('')
    const defaultItems = [
      ...HARDWARE_CATALOG.filter(h => h.chargeable).slice(0, 2),
      ...HARDWARE_CATALOG.filter(h => !h.chargeable).slice(0, 2),
    ]
    setSelected(Object.fromEntries(defaultItems.map(h =>
      [h.name, { name: h.name, chargeable: h.chargeable, unitPrice: h.unitPrice, quantity: 1 }])))
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('category', 'chargeable')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function switchCategory(key) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('category', key)
      return next
    })
  }

  const filtered = HARDWARE_CATALOG.filter(h =>
    h.chargeable === (category === 'chargeable') && h.name.toLowerCase().includes(search.toLowerCase()))

  function toggleItem(h) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[h.name]) delete next[h.name]
      else next[h.name] = { name: h.name, chargeable: h.chargeable, unitPrice: h.unitPrice, quantity: 1 }
      return next
    })
  }

  function setPrice(name, value) {
    setSelected(prev => prev[name] ? { ...prev, [name]: { ...prev[name], unitPrice: Number(value) || 0 } } : prev)
  }

  function stepQty(name, delta) {
    setSelected(prev => {
      const item = prev[name]
      if (!item) return prev
      const quantity = Math.max(1, item.quantity + delta)
      return { ...prev, [name]: { ...item, quantity } }
    })
  }

  const selectedItems = Object.values(selected)

  function handleSubmit() {
    if (selectedItems.length === 0) return
    onAdd(selectedItems)
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Hardware" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={selectedItems.length === 0}>
            {category === 'non-chargeable' ? 'Send for approval' : 'Add Hardware'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1">
          {HARDWARE_CATEGORIES.map(c => (
            <button key={c.key} type="button" onClick={() => switchCategory(c.key)}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                category === c.key ? 'bg-brand-blue text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hardware item…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
          />
        </div>

        <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No items found</p>
          ) : filtered.map(h => {
            const sel = selected[h.name]
            return (
              <div key={h.name} className="flex items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!!sel}
                  onChange={() => toggleItem(h)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 shrink-0"
                />
                <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{h.name}</span>
                {h.chargeable && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={sel ? sel.unitPrice : h.unitPrice}
                      onChange={e => setPrice(h.name, e.target.value)}
                      disabled={!sel}
                      className="w-16 text-xs border border-surface-border rounded-md px-1.5 py-1 text-right focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                )}
                {sel && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => stepQty(h.name, -1)}
                      className="w-6 h-6 rounded-md border border-surface-border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold text-gray-700">{sel.quantity}</span>
                    <button type="button" onClick={() => stepQty(h.name, 1)}
                      className="w-6 h-6 rounded-md border border-surface-border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                      <Plus size={11} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
