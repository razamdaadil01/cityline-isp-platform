import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, MoreVertical, Eye, ClipboardList,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ColumnManager, { useColumnPrefs } from '../../components/table/ColumnManager'
import { getPurchaseOrders, subscribePurchaseOrders, PO_STATUSES } from '../../data/purchaseOrderStore'
import { getVendors } from '../../data/vendorStore'
import { getStores } from '../../data/storeStore'

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

const PO_TABLE_COLUMNS = [
  { key: 'poNumber',      label: 'PO Number',    visible: true, defaultVisible: true, locked: true },
  { key: 'vendor',        label: 'Vendor',       visible: true, defaultVisible: true },
  { key: 'orderDate',     label: 'Order Date',   visible: true, defaultVisible: true },
  { key: 'deliveryDate',  label: 'Delivery Date',visible: true, defaultVisible: true },
  { key: 'store',         label: 'Store',        visible: true, defaultVisible: true },
  { key: 'amount',        label: 'Amount',       visible: true, defaultVisible: true },
  { key: 'status',        label: 'Status',       visible: true, defaultVisible: true },
  { key: 'createdBy',     label: 'Created By',   visible: true, defaultVisible: true },
  { key: 'actions',       label: 'Actions',      visible: true, defaultVisible: true },
]

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const [pos, setPos] = useState(getPurchaseOrders)
  useEffect(() => subscribePurchaseOrders(setPos), [])

  const vendors = getVendors()
  const stores = getStores()
  const vendorName = id => vendors.find(v => v.id === id)?.companyName ?? '—'
  const storeInfo = id => stores.find(s => s.id === id) ?? null

  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:inventoryPOTable', PO_TABLE_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  const [search, setSearch] = useState('')

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPoNumber, setFilterPoNumber] = useState('')

  const EMPTY_DRAFT = { from: '', to: '', vendor: '', branch: '', store: '', status: '', poNumber: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ from: filterFrom, to: filterTo, vendor: filterVendor, branch: filterBranch, store: filterStore, status: filterStatus, poNumber: filterPoNumber })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterFrom(draft.from); setFilterTo(draft.to); setFilterVendor(draft.vendor)
    setFilterBranch(draft.branch); setFilterStore(draft.store); setFilterStatus(draft.status)
    setFilterPoNumber(draft.poNumber)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  function setDraftField(k, v) { setDraft(prev => ({ ...prev, [k]: v })) }

  function clearAllFilters() {
    setFilterFrom(''); setFilterTo(''); setFilterVendor(''); setFilterBranch('')
    setFilterStore(''); setFilterStatus(''); setFilterPoNumber('')
  }

  const activeFiltersCount = [filterFrom, filterTo, filterVendor, filterBranch, filterStore, filterStatus, filterPoNumber].filter(Boolean).length

  const branches = useMemo(() => [...new Set(stores.map(s => s.branchCode).filter(Boolean))].sort(), [stores])
  const storesInBranch = useMemo(() => filterBranch ? stores.filter(s => s.branchCode === filterBranch) : stores, [stores, filterBranch])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return pos.filter(po => {
      if (q && !po.poNumber.toLowerCase().includes(q) && !vendorName(po.vendorId).toLowerCase().includes(q)) return false
      if (filterFrom && po.orderDate < filterFrom) return false
      if (filterTo && po.orderDate > filterTo) return false
      if (filterVendor && po.vendorId !== filterVendor) return false
      if (filterBranch && storeInfo(po.storeId)?.branchCode !== filterBranch) return false
      if (filterStore && po.storeId !== filterStore) return false
      if (filterStatus && po.status !== filterStatus) return false
      if (filterPoNumber && !po.poNumber.toLowerCase().includes(filterPoNumber.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, search, filterFrom, filterTo, filterVendor, filterBranch, filterStore, filterStatus, filterPoNumber])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {pos.length} purchase orders</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/inventory/purchase-orders/new')}>Add Purchase Order</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PO number, vendor…"
            className="pl-9 pr-8 py-1.5 text-sm w-72 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">PO Number</label>
              <input value={draft.poNumber} onChange={e => setDraftField('poNumber', e.target.value)} placeholder="e.g. CITY/PO/2026/00001"
                className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={draft.from} onChange={e => setDraftField('from', e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={draft.to} onChange={e => setDraftField('to', e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vendor</label>
              <div className="relative">
                <select value={draft.vendor} onChange={e => setDraftField('vendor', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

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
                  <option value="">All</option>
                  {storesInBranch.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={draft.status} onChange={e => setDraftField('status', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {PO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
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
                {visibleCols.has('poNumber')     && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[170px]">PO Number</th>}
                {visibleCols.has('vendor')       && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Vendor</th>}
                {visibleCols.has('orderDate')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Order Date</th>}
                {visibleCols.has('deliveryDate') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Delivery Date</th>}
                {visibleCols.has('store')        && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Store</th>}
                {visibleCols.has('amount')       && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Amount</th>}
                {visibleCols.has('status')       && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>}
                {visibleCols.has('createdBy')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Created By</th>}
                {visibleCols.has('actions')      && <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size} className="px-4 py-14 text-center text-sm text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2 text-gray-200" />
                    No purchase orders found
                  </td>
                </tr>
              ) : filtered.map(po => (
                <tr
                  key={po.id}
                  onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                >
                  {visibleCols.has('poNumber') && (
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-brand-blue">{po.poNumber}</span>
                    </td>
                  )}
                  {visibleCols.has('vendor')        && <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{vendorName(po.vendorId)}</td>}
                  {visibleCols.has('orderDate')     && <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{po.orderDate}</td>}
                  {visibleCols.has('deliveryDate')  && <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{po.estimatedDeliveryDate || '—'}</td>}
                  {visibleCols.has('store')         && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{storeInfo(po.storeId)?.storeName ?? '—'}</td>}
                  {visibleCols.has('amount')        && <td className="px-4 py-3 text-right text-gray-800 font-medium text-xs whitespace-nowrap">₹{po.grandTotal.toLocaleString('en-IN')}</td>}
                  {visibleCols.has('status') && (
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[po.status] ?? 'gray'} dot size="sm">{po.status}</Badge>
                    </td>
                  )}
                  {visibleCols.has('createdBy')     && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{po.createdBy}</td>}
                  {visibleCols.has('actions') && (
                    <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => openMenu(e, po.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === po.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const po = pos.find(p => p.id === menuId)
        if (!po) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button onClick={() => { navigate(`/inventory/purchase-orders/${po.id}`); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye size={13} className="text-brand-blue shrink-0" /> View Details
            </button>
          </div>
        )
      })()}
    </div>
  )
}
