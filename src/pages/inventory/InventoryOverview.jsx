import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, X, ChevronDown, Boxes, AlertTriangle, UserCog, Users,
  ShieldAlert, Trash2, Eye, ChevronRight, History, Package, Download, Flag, RefreshCw,
  ArrowLeftRight,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { FormField, Select, Input, Textarea } from '../../components/ui/FormInputs'
import ColumnManager, { useColumnPrefs } from '../../components/table/ColumnManager'
import { getProducts } from '../../data/productStore'
import { getStores } from '../../data/storeStore'
import {
  getStockBalances, getUnits, getDrums, getMovements, getUnitTrail, getEngineerAssignedQty,
  getProductAvailability, subscribeInventoryLedger,
} from '../../data/inventoryLedger'
import { saveReplacement } from '../../data/replacementStore'
import { getTickets } from '../../data/ticketsStore'
import { exportWorkbook } from '../../utils/excelExport'
import { logAudit } from '../../data/auditLogStore'

const CURRENT_USER = 'Admin User'

const OVERVIEW_TABLE_COLUMNS = [
  { key: 'name',       label: 'Product Name',        visible: true, defaultVisible: true, locked: true },
  { key: 'sku',        label: 'SKU',                 visible: true, defaultVisible: true },
  { key: 'productType',label: 'Product Type',        visible: true, defaultVisible: true },
  { key: 'brand',      label: 'Brand',                visible: true, defaultVisible: true },
  { key: 'available',  label: 'Available Qty',       visible: true, defaultVisible: true },
  { key: 'engineer',   label: 'Assigned to Engineer',visible: true, defaultVisible: true },
  { key: 'user',       label: 'Assigned to User',    visible: true, defaultVisible: true },
  { key: 'damage',     label: 'Faulty',               visible: true, defaultVisible: true },
  { key: 'scrap',      label: 'Scrap',                 visible: true, defaultVisible: true },
  { key: 'status',     label: 'Status',                visible: true, defaultVisible: true },
  { key: 'actions',    label: 'Actions',                visible: true, defaultVisible: true },
]

function formatAvailable(product, qty) {
  return product.productType === 'wire' ? `${qty.toLocaleString('en-IN')} m` : qty.toLocaleString('en-IN')
}

function productMatchesSearch(product, units, drums, q) {
  if (!q) return true
  if (product.name.toLowerCase().includes(q)) return true
  if (product.sku && product.sku.toLowerCase().includes(q)) return true
  if (units.some(u => u.value.toLowerCase().includes(q))) return true
  if (drums.some(d => d.drumNumber.toLowerCase().includes(q))) return true
  return false
}

// ── Product Detail slide-over ───────────────────────────────────────────────

function UnitRow({ unit, storeName }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const trail = expanded ? getUnitTrail(unit) : null
  const isAssigned = unit.status === 'Assigned to Engineer' || unit.status === 'Assigned to User'
  // No 'Installed' status exists in the current state model yet — treat
  // "out in the field" as "not currently Available", excluding 'Replaced'
  // itself so an already-replaced unit can't be replaced again.
  const canReplace = unit.status !== 'Available' && unit.status !== 'Replaced'
  // Only units still in stock at a store can be moved to another store —
  // the same window during which they could otherwise be assigned out.
  const canTransfer = unit.status === 'Available'

  return (
    <div className="rounded-lg border border-surface-border overflow-hidden">
      <button type="button" onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight size={13} className={`text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span className="font-mono text-xs font-semibold text-gray-800 truncate">{unit.value}</span>
          <span className="text-[10px] text-gray-400 uppercase">{unit.kind}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">{storeName}</span>
          <Badge variant={unit.status === 'Available' ? 'green' : unit.status === 'Replaced' ? 'red' : 'purple'} size="sm" dot>{unit.status}</Badge>
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-surface-border bg-gray-50/60 space-y-3">
          {isAssigned && (
            <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
              <span className="font-semibold">Currently assigned to:</span> {unit.engineerName ?? '—'}
              {unit.workOrderLabel && <> — Work Order <span className="font-mono">{unit.workOrderLabel}</span></>}
            </div>
          )}
          <div className="space-y-2">
            {trail.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1 shrink-0" />
                <div>
                  <span className="font-medium text-gray-700">{step.action}</span>
                  <span className="text-gray-400"> — {step.detail}</span>
                  <p className="text-[11px] text-gray-400">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {canReplace && (
              <button type="button" onClick={() => setReplaceOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark">
                <RefreshCw size={12} /> Mark as Replaced
              </button>
            )}
            {canTransfer && (
              <button type="button"
                onClick={() => navigate(`/inventory/store-transfer/new?storeFrom=${unit.storeId}&productId=${unit.productId}&unit=${encodeURIComponent(unit.value)}`)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark">
                <ArrowLeftRight size={12} /> Transfer
              </button>
            )}
          </div>
        </div>
      )}
      <MarkReplacedModal isOpen={replaceOpen} onClose={() => setReplaceOpen(false)} unit={unit} />
    </div>
  )
}

// Searchable ticket combobox for the Mark as Replaced form — requires
// picking a real ticket from ticketsStore.js's getTickets(); the value
// passed to onSelect is either a real ticket object or null, never
// free-typed text, so the caller can gate submit on it being non-null.
function TicketPicker({ value, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.toLowerCase().trim()
  const filtered = (q
    ? getTickets().filter(t => `${t.id} ${t.customerName} ${t.subject}`.toLowerCase().includes(q))
    : getTickets()
  ).slice(0, 20)

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={open ? query : (value ? `${value.id} · ${value.customerName}` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        placeholder="Search ticket number, customer or subject…"
        className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching tickets</p>
          ) : filtered.map(t => (
            <button key={t.id} type="button"
              onClick={() => { onSelect(t); setOpen(false); setQuery('') }}
              className="flex flex-col w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors border-b border-surface-border last:border-0">
              <span className="font-mono font-semibold text-brand-blue">{t.id}</span>
              <span className="text-gray-500 truncate">{t.customerName} — {t.subject}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// One-directional link only — this writes a replacement record on the
// Inventory side (replacementStore.js) referencing the ticket's own stable
// id; nothing is ever written back onto the Ticket record itself.
function MarkReplacedModal({ isOpen, onClose, unit }) {
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setSelectedTicket(null); setRemarks(''); setError('') }
  }, [isOpen])

  if (!isOpen) return null

  function handleSubmit() {
    if (!selectedTicket) { setError('Select a valid ticket from the list.'); return }
    saveReplacement({ unit, ticketNumber: selectedTicket.id, remarks }, CURRENT_USER)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-bold text-gray-900">Mark as Replaced</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 font-mono">{unit.value}</p>
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <FormField label="Ticket Number" required hint="Search and select an existing ticket">
            <TicketPicker value={selectedTicket} onSelect={setSelectedTicket} />
          </FormField>
          <FormField label="Remarks" hint="Optional">
            <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes about the replacement…" />
          </FormField>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-border bg-gray-50 rounded-b-2xl">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" icon={<RefreshCw size={14} />} onClick={handleSubmit}>Mark as Replaced</Button>
        </div>
      </div>
    </div>
  )
}

function DrumRow({ drum, storeName }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2.5">
      <div>
        <p className="text-xs font-semibold text-gray-800 font-mono">{drum.drumNumber}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{storeName} · Received {drum.receivedMeters.toLocaleString('en-IN')} m via {drum.purchaseNumber}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-gray-800">{drum.remainingMeters.toLocaleString('en-IN')} m left</p>
        <Badge variant="green" size="sm" dot>{drum.status}</Badge>
      </div>
    </div>
  )
}

function ProductDetailPanel({ product, stores, onClose }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('units')
  const storeName = id => stores.find(s => s.id === id)?.storeName ?? '—'

  const isWire = product.productType === 'wire'
  const isTracked = product.trackingType === 'serial' || product.trackingType === 'mac'
  const units = getUnits({ productId: product.id })
  const drums = getDrums({ productId: product.id })
  const balances = getStockBalances().filter(b => b.productId === product.id)
  const available = balances.reduce((s, b) => s + b.availableQty, 0)
  const engineerAssigned = getEngineerAssignedQty(product.id)
  const movements = getMovements({ productId: product.id })

  const breakdown = [
    { label: 'Total',    value: available + engineerAssigned, color: 'text-gray-900' },
    { label: 'Available',value: available,                    color: 'text-emerald-600' },
    { label: 'Engineer', value: engineerAssigned,              color: engineerAssigned > 0 ? 'text-purple-600' : 'text-gray-400' },
    { label: 'User',     value: 0,          color: 'text-gray-400' },
    { label: 'Faulty',   value: 0,          color: 'text-gray-400' },
    { label: 'Scrap',    value: 0,          color: 'text-gray-400' },
  ]

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-surface-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">{product.name}</h2>
              <Badge variant={isWire ? 'orange' : 'blue'} size="sm" className="capitalize">{product.productType}</Badge>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-1">{product.sku || '—'}</p>
        </div>

        <div className="px-5 py-4 border-b border-surface-border shrink-0">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {breakdown.map(b => (
              <div key={b.label} className="text-center px-2 py-2 rounded-lg border border-surface-border bg-surface">
                <p className="text-[10px] text-gray-400">{b.label}</p>
                <p className={`text-sm font-bold mt-0.5 ${b.color}`}>{isWire && b.label !== 'Engineer' && b.label !== 'User' && b.label !== 'Faulty' && b.label !== 'Scrap' ? `${b.value.toLocaleString('en-IN')}m` : b.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-surface-border shrink-0">
          {[
            { id: 'units', label: isWire ? 'Drums' : 'Units', icon: Package },
            { id: 'history', label: 'Movement History', icon: History },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors
                ${tab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {tab === 'units' && (
            isWire ? (
              drums.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No drums received yet.</p>
                : drums.map(d => <DrumRow key={`${d.purchaseId}-${d.drumNumber}`} drum={d} storeName={storeName(d.storeId)} />)
            ) : isTracked ? (
              units.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No tracked units received yet.</p>
                : units.map((u, i) => <UnitRow key={`${u.purchaseId}-${u.value}-${i}`} unit={u} storeName={storeName(u.storeId)} />)
            ) : (
              balances.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No stock received yet.</p>
                : (
                  <div className="rounded-lg border border-surface-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                          <th className="text-left px-3 py-2 font-semibold">Store</th>
                          <th className="text-right px-3 py-2 font-semibold">Available Qty</th>
                          <th className="text-right px-3 py-2 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {balances.map(b => (
                          <tr key={b.storeId}>
                            <td className="px-3 py-2 text-gray-700">{storeName(b.storeId)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">{b.availableQty.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right">
                              {b.availableQty > 0 && (
                                <button type="button"
                                  onClick={() => navigate(`/inventory/store-transfer/new?storeFrom=${b.storeId}&productId=${product.id}`)}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark">
                                  <ArrowLeftRight size={12} /> Transfer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
            )
          )}

          {tab === 'history' && (
            movements.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No movements recorded yet.</p>
              : (
                <div className="rounded-lg border border-surface-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                        <th className="text-left px-3 py-2 font-semibold">Date</th>
                        <th className="text-left px-3 py-2 font-semibold">Type</th>
                        <th className="text-right px-3 py-2 font-semibold">Qty</th>
                        <th className="text-left px-3 py-2 font-semibold">From</th>
                        <th className="text-left px-3 py-2 font-semibold">To</th>
                        <th className="text-left px-3 py-2 font-semibold">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {movements.map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{m.date}</td>
                          <td className="px-3 py-2"><Badge variant="blue" size="sm">{m.movementType}</Badge></td>
                          <td className="px-3 py-2 text-right text-gray-700">{m.qty.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-gray-600">{m.fromLabel}</td>
                          <td className="px-3 py-2 text-gray-600">{m.toLabel}</td>
                          <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap">
                            {m.reference}{m.poReference && <span className="text-gray-400"> · {m.poReference}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  )
}

// ── Report a Discrepancy ─────────────────────────────────────────────────────
// A v1 reconciliation stub, deliberately not touching stock: it only logs
// what a physical count found, for someone to investigate and correct
// manually later (via a real adjustment flow, a future phase). System Qty
// is read-only and always sourced live from inventoryLedger.js — never
// editable here, so this can never be mistaken for an adjustment tool.
function DiscrepancyModal({ isOpen, onClose, product, allProducts, stores }) {
  const [productId, setProductId] = useState(product?.id ?? '')
  const [storeId, setStoreId] = useState('')
  const [physicalCount, setPhysicalCount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setProductId(product?.id ?? '')
      setStoreId('')
      setPhysicalCount('')
      setNotes('')
      setError('')
    }
  }, [isOpen, product])

  if (!isOpen) return null

  const selectedProduct = allProducts.find(p => p.id === productId) ?? null
  const systemQty = selectedProduct && storeId ? getProductAvailability(productId, storeId) : null

  function handleSubmit() {
    if (!productId || !storeId || physicalCount === '') { setError('Product, Store and Physical Count are required.'); return }
    const store = stores.find(s => s.id === storeId)
    logAudit({
      action: 'Edit', module: 'Inventory',
      details: `Discrepancy reported: ${selectedProduct.name} at ${store?.storeName ?? storeId} — system ${systemQty}, physical ${physicalCount}`,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-bold text-gray-900">Report a Discrepancy</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <FormField label="Product" required>
            <Select value={productId} disabled={!!product} onChange={e => { setProductId(e.target.value); setStoreId('') }}>
              <option value="">Select product…</option>
              {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Store" required>
            <Select value={storeId} onChange={e => setStoreId(e.target.value)}>
              <option value="">Select store…</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
            </Select>
          </FormField>
          <FormField label="System Qty" hint="Read-only — the current Available Qty from Inventory Overview">
            <Input disabled value={systemQty == null ? '' : formatAvailable(selectedProduct, systemQty)} placeholder="Select a product and store" />
          </FormField>
          <FormField label="Physical Count" required>
            <Input type="number" min="0" value={physicalCount} onChange={e => setPhysicalCount(e.target.value)} placeholder="Counted quantity" />
          </FormField>
          <FormField label="Notes" hint="Optional — context for whoever investigates this">
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about the discrepancy…" />
          </FormField>
          <p className="text-[11px] text-gray-400">This only logs a report to the Audit Log for follow-up — it does not change any stock balance.</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-border bg-gray-50 rounded-b-2xl">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" icon={<Flag size={14} />} onClick={handleSubmit}>Submit Report</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryOverview() {
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeInventoryLedger(() => forceRerender(n => n + 1)), [])

  const allProducts = getProducts()
  const stores = getStores()

  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:inventoryOverviewTable', OVERVIEW_TABLE_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false)
  const [discrepancyProduct, setDiscrepancyProduct] = useState(null)

  const [filterBranch, setFilterBranch] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterProductType, setFilterProductType] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)

  const EMPTY_DRAFT = { branch: '', store: '', product: '', productType: '', brand: '', status: '', lowStock: false }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ branch: filterBranch, store: filterStore, product: filterProduct, productType: filterProductType, brand: filterBrand, status: filterStatus, lowStock: filterLowStock })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterBranch(draft.branch); setFilterStore(draft.store); setFilterProduct(draft.product)
    setFilterProductType(draft.productType); setFilterBrand(draft.brand); setFilterStatus(draft.status)
    setFilterLowStock(draft.lowStock)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  function setDraftField(k, v) { setDraft(prev => ({ ...prev, [k]: v })) }
  function clearAllFilters() {
    setFilterBranch(''); setFilterStore(''); setFilterProduct(''); setFilterProductType('')
    setFilterBrand(''); setFilterStatus(''); setFilterLowStock(false)
  }
  const activeFiltersCount = [filterBranch, filterStore, filterProduct, filterProductType, filterBrand, filterStatus].filter(Boolean).length + (filterLowStock ? 1 : 0)

  const branches = useMemo(() => [...new Set(stores.map(s => s.branchCode).filter(Boolean))].sort(), [stores])
  const storesInBranch = useMemo(() => filterBranch ? stores.filter(s => s.branchCode === filterBranch) : stores, [stores, filterBranch])
  const brands = useMemo(() => [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort(), [allProducts])

  // Store filter narrows to one store; Branch filter (without a specific
  // store) narrows to every store under that branch; neither set aggregates
  // across all stores — the PRD's "All Stores" default view.
  const scopedStoreIds = useMemo(() => {
    if (filterStore) return [filterStore]
    if (filterBranch) return storesInBranch.map(s => s.id)
    return null
  }, [filterStore, filterBranch, storesInBranch])

  const allBalances = getStockBalances()
  function scopedAvailability(productId) {
    return allBalances
      .filter(b => b.productId === productId && (!scopedStoreIds || scopedStoreIds.includes(b.storeId)))
      .reduce((sum, b) => sum + b.availableQty, 0)
  }
  // getEngineerAssignedQty takes a single storeId (or none, for every
  // store) — sum across each store in scope rather than passing the array
  // straight through, same "Branch aggregates its stores" scoping every
  // other stat on this page already applies.
  function scopedEngineerAssigned(productId) {
    if (!scopedStoreIds) return getEngineerAssignedQty(productId)
    return scopedStoreIds.reduce((sum, storeId) => sum + getEngineerAssignedQty(productId, storeId), 0)
  }

  const stats = useMemo(() => {
    const scoped = allBalances.filter(b => !scopedStoreIds || scopedStoreIds.includes(b.storeId))
    const totalInventoryItems = scoped.filter(b => b.availableQty > 0).length

    let hardwareAvailable = 0
    allProducts.filter(p => p.productType === 'hardware').forEach(p => {
      if (p.trackingType === 'serial' || p.trackingType === 'mac') {
        hardwareAvailable += getUnits({ productId: p.id, status: 'Available' })
          .filter(u => !scopedStoreIds || scopedStoreIds.includes(u.storeId)).length
      } else {
        hardwareAvailable += scoped.filter(b => b.productId === p.id).reduce((s, b) => s + b.availableQty, 0)
      }
    })

    const wireAvailable = getDrums({})
      .filter(d => !scopedStoreIds || scopedStoreIds.includes(d.storeId))
      .reduce((s, d) => s + d.remainingMeters, 0)

    const assignedToEngineers = allProducts.reduce((sum, p) => sum + scopedEngineerAssigned(p.id), 0)

    const lowStockCount = allProducts.filter(p => scopedAvailability(p.id) < (Number(p.reorderAlertQty) || 0)).length

    return { totalInventoryItems, hardwareAvailable, wireAvailable, assignedToEngineers, lowStockCount }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBalances, scopedStoreIds, allProducts])

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allProducts
      .filter(p => !filterProductType || p.productType === filterProductType)
      .filter(p => !filterBrand || p.brand === filterBrand)
      .filter(p => !filterStatus || p.status === filterStatus)
      .filter(p => !filterProduct || p.id === filterProduct)
      .filter(p => productMatchesSearch(p, getUnits({ productId: p.id }), getDrums({ productId: p.id }), q))
      .map(p => {
        const availableQty = scopedAvailability(p.id)
        const engineerQty = scopedEngineerAssigned(p.id)
        return { product: p, availableQty, engineerQty, lowStock: availableQty < (Number(p.reorderAlertQty) || 0) }
      })
      .filter(row => !filterLowStock || row.lowStock)
      .sort((a, b) => a.product.name.localeCompare(b.product.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, search, filterProductType, filterBrand, filterStatus, filterProduct, filterLowStock, scopedStoreIds, allBalances])

  const scopeLabel = filterStore
    ? stores.find(s => s.id === filterStore)?.storeName ?? 'Selected store'
    : filterBranch ? `Branch ${filterBranch}` : 'All Stores'

  const selectedProduct = selectedProductId ? allProducts.find(p => p.id === selectedProductId) : null

  // Exports exactly the currently-filtered table (search/filters/low-stock
  // toggle all already applied via `rows`) — "Store" reflects the active
  // Branch/Store scope rather than a per-row store, since a row's Available
  // Qty is itself an aggregate across whatever stores are in that scope.
  function handleExport() {
    exportWorkbook('Inventory_Overview.xlsx', [{
      name: 'Stock',
      rows: rows.map(({ product, availableQty, lowStock }) => ({
        Product: product.name, SKU: product.sku || '',
        'Available Qty': formatAvailable(product, availableQty),
        Store: scopeLabel, Status: lowStock ? 'Low Stock' : (product.status === 'active' ? 'Active' : 'Inactive'),
      })),
    }])
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} of {allProducts.length} products · Showing: {scopeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Flag size={14} />} onClick={() => { setDiscrepancyProduct(null); setDiscrepancyOpen(true) }}>Report a Discrepancy</Button>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>Export</Button>
          <ColumnManager columns={tableColumns} onChange={setTableColumns} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Inventory Items', value: stats.totalInventoryItems, icon: Boxes,      color: 'text-brand-blue',   bg: 'bg-brand-blue/10' },
          { label: 'Hardware Available',    value: stats.hardwareAvailable,   icon: Package,     color: 'text-emerald-600',  bg: 'bg-emerald-50' },
          { label: 'Wire Available (m)',    value: stats.wireAvailable,       icon: Package,     color: 'text-cyan-600',     bg: 'bg-cyan-50' },
          { label: 'Assigned to Engineers', value: stats.assignedToEngineers, icon: UserCog,      color: 'text-purple-600',   bg: 'bg-purple-50' },
          { label: 'Assigned to Users',     value: 0,                         icon: Users,        color: 'text-gray-400',     bg: 'bg-gray-100' },
          { label: 'Faulty',                value: 0,                         icon: ShieldAlert,  color: 'text-gray-400',     bg: 'bg-gray-100' },
          { label: 'Scrap',                 value: 0,                         icon: Trash2,       color: 'text-gray-400',     bg: 'bg-gray-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900">{s.value.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
        <button
          onClick={() => { setFilterLowStock(!filterLowStock) }}
          className={`rounded-xl border shadow-card px-4 py-3 flex items-center gap-3 transition-colors text-left ${
            filterLowStock ? 'bg-red-50 border-red-200' : 'bg-white border-surface-border hover:bg-gray-50'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${filterLowStock ? 'bg-red-100' : 'bg-red-50'}`}>
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900">{stats.lowStockCount}</p>
            <p className="text-[11px] text-gray-500 leading-tight">Low Stock</p>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product, SKU, serial, MAC, drum number…"
            className="pl-9 pr-8 py-1.5 text-sm w-96 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={openDrawer}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
            activeFiltersCount > 0 ? 'bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90' : 'bg-white text-gray-700 border-surface-border hover:bg-gray-50'
          }`}
        >
          <Filter size={13} /> Filters
          {activeFiltersCount > 0 && <span className="bg-white/25 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold leading-none">{activeFiltersCount}</span>}
        </button>

        {activeFiltersCount > 0 && (
          <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Filter Drawer ── */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {activeFiltersCount > 0 && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">{activeFiltersCount} active</span>}
            </div>
            <button onClick={() => setDrawerOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Branch</label>
              <div className="relative">
                <select value={draft.branch} onChange={e => { setDraftField('branch', e.target.value); setDraftField('store', '') }}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Store</label>
              <div className="relative">
                <select value={draft.store} onChange={e => setDraftField('store', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Stores</option>
                  {(draft.branch ? stores.filter(s => s.branchCode === draft.branch) : stores).map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product</label>
              <div className="relative">
                <select value={draft.product} onChange={e => setDraftField('product', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product Type</label>
              <div className="flex gap-4">
                {['', 'hardware', 'wire'].map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="draft-productType" value={v} checked={draft.productType === v}
                      onChange={() => setDraftField('productType', v)} className="accent-purple-600" />
                    <span className="text-sm text-gray-700 capitalize">{v || 'All'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brand</label>
              <div className="relative">
                <select value={draft.brand} onChange={e => setDraftField('brand', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="flex gap-4">
                {['', 'active', 'inactive'].map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="draft-status" value={v} checked={draft.status === v}
                      onChange={() => setDraftField('status', v)} className="accent-purple-600" />
                    <span className="text-sm text-gray-700 capitalize">{v || 'All'}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-surface-border px-3.5 py-3 cursor-pointer">
              <input type="checkbox" checked={draft.lowStock} onChange={e => setDraftField('lowStock', e.target.checked)} className="accent-purple-600" />
              <span className="text-sm text-gray-700">Low Stock only</span>
            </label>
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={resetDrawer} className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={applyDrawer} className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {visibleCols.has('name')        && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[180px]">Product Name</th>}
                {visibleCols.has('sku')         && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">SKU</th>}
                {visibleCols.has('productType') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>}
                {visibleCols.has('brand')       && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Brand</th>}
                {visibleCols.has('available')   && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Available Qty</th>}
                {visibleCols.has('engineer')    && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Engineer</th>}
                {visibleCols.has('user')        && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">User</th>}
                {visibleCols.has('damage')      && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Faulty</th>}
                {visibleCols.has('scrap')       && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Scrap</th>}
                {visibleCols.has('status')      && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>}
                {visibleCols.has('actions')     && <th className="px-4 py-3 w-20 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Boxes size={32} className="mx-auto mb-2 text-gray-200" />
                    No products found
                  </td>
                </tr>
              ) : rows.map(({ product, availableQty, engineerQty, lowStock }) => (
                <tr key={product.id} onClick={() => setSelectedProductId(product.id)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  {visibleCols.has('name') && (
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{product.name}</span>
                    </td>
                  )}
                  {visibleCols.has('sku')         && <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{product.sku || '—'}</td>}
                  {visibleCols.has('productType') && <td className="px-4 py-3 whitespace-nowrap"><Badge variant={product.productType === 'wire' ? 'orange' : 'blue'} size="sm" className="capitalize">{product.productType}</Badge></td>}
                  {visibleCols.has('brand')       && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{product.brand || '—'}</td>}
                  {visibleCols.has('available') && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`font-semibold text-xs ${lowStock ? 'text-red-600' : 'text-gray-800'}`}>{formatAvailable(product, availableQty)}</span>
                      {lowStock && <AlertTriangle size={12} className="inline-block ml-1.5 text-amber-500" />}
                    </td>
                  )}
                  {visibleCols.has('engineer') && <td className={`px-4 py-3 text-right text-xs ${engineerQty > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{engineerQty}</td>}
                  {visibleCols.has('user')     && <td className="px-4 py-3 text-right text-gray-400 text-xs">0</td>}
                  {visibleCols.has('damage')   && <td className="px-4 py-3 text-right text-gray-400 text-xs">0</td>}
                  {visibleCols.has('scrap')    && <td className="px-4 py-3 text-right text-gray-400 text-xs">0</td>}
                  {visibleCols.has('status') && (
                    <td className="px-4 py-3">
                      <Badge variant={product.status === 'active' ? 'green' : 'gray'} dot size="sm">{product.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                  )}
                  {visibleCols.has('actions') && (
                    <td className="px-4 py-3 w-20 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedProductId(product.id)} title="View" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => { setDiscrepancyProduct(product); setDiscrepancyOpen(true) }} title="Report a Discrepancy" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <Flag size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailPanel product={selectedProduct} stores={stores} onClose={() => setSelectedProductId(null)} />
      )}

      <DiscrepancyModal
        isOpen={discrepancyOpen}
        onClose={() => setDiscrepancyOpen(false)}
        product={discrepancyProduct}
        allProducts={allProducts}
        stores={stores}
      />
    </div>
  )
}
