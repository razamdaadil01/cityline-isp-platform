import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, CheckCircle, Wifi, Box, Plus, Search, Filter, MoreVertical, X, Info } from 'lucide-react'
import {
  MOCK_BW_PACKAGES, MOCK_OTHER_PACKAGES,
} from '../data/packagesStore'
import ColumnManager, { useColumnPrefs } from '../components/table/ColumnManager'

// ── Shared UI ────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{status}</span>
)

const YN = ({ value, yesClass }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${value ? yesClass : 'bg-gray-100 text-gray-500'}`}>{value ? 'Yes' : 'No'}</span>
)

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors ${value ? 'bg-[#0A8DCD]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

function ThreeDotMenu({ items }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-gray-100">
        <MoreVertical size={15} className="text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-44 text-sm">
            {items.map(item => (
              <button key={item.label} onClick={() => { item.onClick(); setOpen(false) }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${item.danger ? 'text-red-600' : 'text-gray-700'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const FLD = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    {children}
  </div>
)

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"

// ── Filter Drawer ─────────────────────────────────────────────────────────────

const EMPTY_BW_FILTERS  = { status: 'All', ott: 'All', editable: 'All', landline: 'All' }
const EMPTY_OTH_FILTERS = { status: 'All' }

function FilterDrawer({ open, onClose, filters, onChange, onApply, onReset, tab }) {
  const ref = useRef(null)
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const Row = ({ label, filterKey, options }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(filterKey, opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filters[filterKey] === opt
                ? 'bg-[#0A8DCD] border-[#0A8DCD] text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-[#0A8DCD] hover:text-[#0A8DCD]'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )

  const activeCount = Object.values(filters).filter(v => v !== 'All').length

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div ref={ref} className="fixed right-0 top-0 h-full w-72 bg-white z-40 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#0A8DCD]" />
            <span className="font-semibold text-gray-800">Filters</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#0A8DCD] text-white text-xs flex items-center justify-center">{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          <Row label="Status" filterKey="status" options={['All', 'Active', 'Inactive']} />
          {tab === 'Bandwidth Packages' && <>
            <Row label="OTT" filterKey="ott" options={['All', 'With OTT', 'Without OTT']} />
            <Row label="Editable" filterKey="editable" options={['All', 'Yes', 'No']} />
            <Row label="Landline" filterKey="landline" options={['All', 'Yes', 'No']} />
          </>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button onClick={onReset}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Reset
          </button>
          <button onClick={onApply}
            className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0]">
            Apply
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Bandwidth Packages', 'Other Packages']

// Manageable columns for the primary (Bandwidth Packages) list table.
const PACKAGE_TABLE_COLUMNS = [
  { key: 'packageId',   label: 'Package ID',   visible: true, defaultVisible: true },
  { key: 'packageName', label: 'Package Name', visible: true, defaultVisible: true, locked: true },
  { key: 'type',        label: 'Type',         visible: true, defaultVisible: true },
  { key: 'speedValue',  label: 'Speed/Value',  visible: true, defaultVisible: true },
  { key: 'price',       label: 'Price',        visible: true, defaultVisible: true },
  { key: 'validity',    label: 'Validity',     visible: true, defaultVisible: true },
  { key: 'status',      label: 'Status',       visible: true, defaultVisible: true },
  { key: 'actions',     label: 'Actions',      visible: true, defaultVisible: true },
]

export default function Packages() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'other' ? 'Other Packages' : 'Bandwidth Packages'

  // Bandwidth packages state
  const [bwPkgs, setBwPkgs] = useState(MOCK_BW_PACKAGES)
  const [bwSearch, setBwSearch] = useState('')
  const [bwZone, setBwZone] = useState('All')
  const [bwFilters, setBwFilters]         = useState(EMPTY_BW_FILTERS)
  const [bwPendingFilters, setBwPending]  = useState(EMPTY_BW_FILTERS)
  const [bwDrawer, setBwDrawer]           = useState(false)

  // Column visibility (Bandwidth Packages table — the primary list view)
  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:packageTable', PACKAGE_TABLE_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  // Other packages state
  const [othPkgs, setOthPkgs] = useState(MOCK_OTHER_PACKAGES)
  const [othSearch, setOthSearch] = useState('')
  const [othZone, setOthZone] = useState('All')
  const [othFilters, setOthFilters]       = useState(EMPTY_OTH_FILTERS)
  const [othPendingFilters, setOthPending]= useState(EMPTY_OTH_FILTERS)
  const [othDrawer, setOthDrawer]         = useState(false)

  // Reset filters when switching tabs
  useEffect(() => {
    setBwSearch(''); setBwZone('All'); setBwFilters(EMPTY_BW_FILTERS); setBwPending(EMPTY_BW_FILTERS); setBwDrawer(false)
    setOthSearch(''); setOthZone('All'); setOthFilters(EMPTY_OTH_FILTERS); setOthPending(EMPTY_OTH_FILTERS); setOthDrawer(false)
  }, [activeTab])

  const totalPkgs = bwPkgs.length + othPkgs.length
  const activePkgs = bwPkgs.filter(p => p.status === 'Active').length + othPkgs.filter(p => p.status === 'Active').length

  const filteredBw = bwPkgs.filter(p => {
    if (bwZone !== 'All' && p.zone !== bwZone) return false
    if (bwFilters.status !== 'All' && p.status !== bwFilters.status) return false
    if (bwFilters.editable !== 'All' && (bwFilters.editable === 'Yes') !== !!p.editable) return false
    if (bwFilters.landline !== 'All' && (bwFilters.landline === 'Yes') !== !!p.landline) return false
    if (bwFilters.ott === 'With OTT'    && !p.rows.some(r => r.ott && r.ott !== 'None')) return false
    if (bwFilters.ott === 'Without OTT' &&  p.rows.some(r => r.ott && r.ott !== 'None')) return false
    if (bwSearch) {
      const q = bwSearch.toLowerCase()
      const nameMatch = p.name.toLowerCase().includes(q)
      const jazeMatch = p.rows.some(r => String(r.jazeId).toLowerCase().includes(q))
      if (!nameMatch && !jazeMatch) return false
    }
    return true
  })

  const filteredOth = othPkgs.filter(p => {
    if (othZone !== 'All' && p.zone !== othZone) return false
    if (othFilters.status !== 'All' && p.status !== othFilters.status) return false
    if (othSearch) {
      const q = othSearch.toLowerCase()
      if (!p.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const bwActiveFilters = Object.values(bwFilters).filter(v => v !== 'All').length
  const othActiveFilters = Object.values(othFilters).filter(v => v !== 'All').length

  // Pagination
  const PKG_PAGE_SIZE = 10
  const [bwPage,  setBwPage]  = useState(1)
  const [othPage, setOthPage] = useState(1)

  // Reset pages when filters/search change
  useEffect(() => { setBwPage(1) }, [bwSearch, bwZone, bwFilters])
  useEffect(() => { setOthPage(1) }, [othSearch, othZone, othFilters])

  const bwTotalPages  = Math.max(1, Math.ceil(filteredBw.length  / PKG_PAGE_SIZE))
  const othTotalPages = Math.max(1, Math.ceil(filteredOth.length / PKG_PAGE_SIZE))
  const pagedBw  = filteredBw.slice( (bwPage  - 1) * PKG_PAGE_SIZE, bwPage  * PKG_PAGE_SIZE)
  const pagedOth = filteredOth.slice((othPage - 1) * PKG_PAGE_SIZE, othPage * PKG_PAGE_SIZE)

  function PkgPagination({ page, setPage, total, totalPages }) {
    const from = total === 0 ? 0 : (page - 1) * PKG_PAGE_SIZE + 1
    const to   = Math.min(page * PKG_PAGE_SIZE, total)
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/40">
        <p className="text-xs text-gray-500">Showing {from}–{to} of {total} package{total !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                p === page ? 'bg-[#0A8DCD] text-white' : 'border border-gray-200 hover:bg-white text-gray-600'
              }`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2744]">Package &amp; Plan Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage service plans and configurations</p>
        </div>
        <button onClick={() => navigate('/packages/add')}
          className="flex items-center gap-2 bg-[#E8541A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
          <Plus size={16} /> Add Package
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Packages',     value: totalPkgs,      icon: Package,     bg: 'bg-blue-50',   ic: 'text-blue-600' },
          { label: 'Active',             value: activePkgs,     icon: CheckCircle, bg: 'bg-green-50',  ic: 'text-green-600' },
          { label: 'Bandwidth Packages', value: bwPkgs.length,  icon: Wifi,        bg: 'bg-indigo-50', ic: 'text-indigo-600' },
          { label: 'Other Packages',     value: othPkgs.length, icon: Box,         bg: 'bg-orange-50', ic: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
            <span className={`p-2.5 rounded-xl ${s.bg}`}><s.icon size={18} className={s.ic} /></span>
            <div>
              <p className="text-2xl font-bold text-[#0F2744]">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar + filters — single row */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
        {/* Tabs */}
        <div className="flex gap-1 shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setSearchParams({ tab: t === 'Bandwidth Packages' ? 'bandwidth' : 'other' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === t ? 'bg-white shadow-sm text-[#0F2744]' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-300 shrink-0" />

        {/* Zone + Search + Filter — right side */}
        {activeTab === 'Bandwidth Packages' && (
          <>
            <select value={bwZone} onChange={e => setBwZone(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none shrink-0">
              <option value="All">All Zones</option>
              <option>Residential</option>
              <option>Enterprise</option>
              <option>Both</option>
            </select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={bwSearch} onChange={e => setBwSearch(e.target.value)}
                placeholder="Search by name, Jaze ID..."
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full bg-white focus:outline-none" />
            </div>
            <button onClick={() => { setBwPending(bwFilters); setBwDrawer(true) }}
              className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                bwActiveFilters > 0
                  ? 'border-[#0A8DCD] bg-blue-50 text-[#0A8DCD]'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <Filter size={14} /> Filter
              {bwActiveFilters > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0A8DCD] text-white text-[10px] flex items-center justify-center">{bwActiveFilters}</span>
              )}
            </button>
            {bwActiveFilters > 0 && (
              <button onClick={() => { setBwFilters(EMPTY_BW_FILTERS); setBwPending(EMPTY_BW_FILTERS) }}
                className="text-xs text-[#0A8DCD] hover:underline shrink-0">Clear</button>
            )}
            <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          </>
        )}
        {activeTab === 'Other Packages' && (
          <>
            <select value={othZone} onChange={e => setOthZone(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none shrink-0">
              <option value="All">All Zones</option>
              <option>Residential</option>
              <option>Enterprise</option>
              <option>Both</option>
            </select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={othSearch} onChange={e => setOthSearch(e.target.value)}
                placeholder="Search packages..."
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full bg-white focus:outline-none" />
            </div>
            <button onClick={() => { setOthPending(othFilters); setOthDrawer(true) }}
              className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                othActiveFilters > 0
                  ? 'border-[#0A8DCD] bg-blue-50 text-[#0A8DCD]'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <Filter size={14} /> Filter
              {othActiveFilters > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0A8DCD] text-white text-[10px] flex items-center justify-center">{othActiveFilters}</span>
              )}
            </button>
            {othActiveFilters > 0 && (
              <button onClick={() => { setOthFilters(EMPTY_OTH_FILTERS); setOthPending(EMPTY_OTH_FILTERS) }}
                className="text-xs text-[#0A8DCD] hover:underline shrink-0">Clear</button>
            )}
          </>
        )}
      </div>

      {/* ── TAB 1: BANDWIDTH PACKAGES ── */}
      {activeTab === 'Bandwidth Packages' && (
        <div className="space-y-4">
          <FilterDrawer
            open={bwDrawer} onClose={() => setBwDrawer(false)}
            filters={bwPendingFilters}
            onChange={(k, v) => setBwPending(f => ({ ...f, [k]: v }))}
            onApply={() => { setBwFilters(bwPendingFilters); setBwDrawer(false) }}
            onReset={() => { setBwPending(EMPTY_BW_FILTERS); setBwFilters(EMPTY_BW_FILTERS) }}
            tab="Bandwidth Packages"
          />

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {visibleCols.has('packageId') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Package ID</th>}
                    {visibleCols.has('packageName') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Package Name</th>}
                    {visibleCols.has('type') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Zone</th>
                    {visibleCols.has('speedValue') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Bandwidth</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Jaze ID</th>
                    {visibleCols.has('validity') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Tenure</th>}
                    {visibleCols.has('price') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Price</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">OTT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Editable</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Landline</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Offer</th>
                    {visibleCols.has('status') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>}
                    {visibleCols.has('actions') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBw.length === 0 ? (
                    <tr><td colSpan={6 + visibleCols.size} className="text-center py-10 text-gray-400">No packages found</td></tr>
                  ) : pagedBw.map(pkg =>
                    pkg.rows.map((row, ri) => (
                      <tr key={`${pkg.id}-${ri}`} className="hover:bg-gray-50">
                        {ri === 0 && visibleCols.has('packageId') && <td rowSpan={pkg.rows.length} className="px-4 py-3 font-mono text-xs text-gray-600 align-top border-r border-gray-100">{pkg.id}</td>}
                        {ri === 0 && visibleCols.has('packageName') && <td rowSpan={pkg.rows.length} className="px-4 py-3 font-semibold text-[#0F2744] align-top border-r border-gray-100">
                          <button onClick={() => navigate(`/packages/${pkg.id}`)} className="hover:text-[#0A8DCD] hover:underline text-left">{pkg.name}</button>
                        </td>}
                        {ri === 0 && visibleCols.has('type') && <td rowSpan={pkg.rows.length} className="px-4 py-3 text-gray-600 align-top border-r border-gray-100">{pkg.type}</td>}
                        {ri === 0 && <td rowSpan={pkg.rows.length} className="px-4 py-3 text-gray-600 align-top border-r border-gray-100">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{pkg.zone}</span>
                        </td>}
                        {visibleCols.has('speedValue') && <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.bandwidth}</td>}
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.jazeId}</td>
                        {visibleCols.has('validity') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.tenure}</td>}
                        {visibleCols.has('price') && <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">&#8377;{row.price.toLocaleString('en-IN')}</td>}
                        <td className="px-4 py-3 text-gray-600 text-xs">{row.ott !== 'None' ? row.ott : <span className="text-gray-400">&mdash;</span>}</td>
                        {ri === 0 && <td rowSpan={pkg.rows.length} className="px-4 py-3 align-top"><YN value={pkg.editable} yesClass="bg-amber-100 text-amber-700" /></td>}
                        {ri === 0 && <td rowSpan={pkg.rows.length} className="px-4 py-3 align-top"><YN value={pkg.landline} yesClass="bg-blue-100 text-blue-700" /></td>}
                        {ri === 0 && <td rowSpan={pkg.rows.length} className="px-4 py-3 align-top"><YN value={pkg.offer} yesClass="bg-orange-100 text-orange-700" /></td>}
                        {ri === 0 && visibleCols.has('status') && <td rowSpan={pkg.rows.length} className="px-4 py-3 align-top"><StatusBadge status={pkg.status} /></td>}
                        {ri === 0 && visibleCols.has('actions') && <td rowSpan={pkg.rows.length} className="px-4 py-3 align-top">
                          <ThreeDotMenu items={[
                            { label: 'View Details', onClick: () => navigate(`/packages/${pkg.id}`) },
                            { label: 'Edit Package', onClick: () => navigate(`/packages/${pkg.id}/edit`) },
                            { label: pkg.status === 'Active' ? 'Deactivate' : 'Activate', onClick: () => setBwPkgs(prev => prev.map(p => p.id === pkg.id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p)) },
                            { label: 'Delete', danger: true, onClick: () => setBwPkgs(prev => prev.filter(p => p.id !== pkg.id)) },
                          ]} />
                        </td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PkgPagination page={bwPage} setPage={setBwPage} total={filteredBw.length} totalPages={bwTotalPages} />
          </div>
        </div>
      )}

      {/* ── TAB 2: OTHER PACKAGES ── */}
      {activeTab === 'Other Packages' && (
        <div className="space-y-4">
          <FilterDrawer
            open={othDrawer} onClose={() => setOthDrawer(false)}
            filters={othPendingFilters}
            onChange={(k, v) => setOthPending(f => ({ ...f, [k]: v }))}
            onApply={() => { setOthFilters(othPendingFilters); setOthDrawer(false) }}
            onReset={() => { setOthPending(EMPTY_OTH_FILTERS); setOthFilters(EMPTY_OTH_FILTERS) }}
            tab="Other Packages"
          />

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Package Name','Zone','Bind Package','Price','Separate Invoice','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedOth.map(pkg => (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-[#0F2744]">{pkg.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{pkg.zone}</span>
                      </td>
                      <td className="px-4 py-3">
                        {pkg.bindPackage
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{pkg.bindPackage}</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Standalone</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">&#8377;{pkg.price.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><YN value={pkg.separateInvoice} yesClass="bg-orange-100 text-orange-700" /></td>
                      <td className="px-4 py-3"><StatusBadge status={pkg.status} /></td>
                      <td className="px-4 py-3">
                        <ThreeDotMenu items={[
                          { label: 'View Details', onClick: () => navigate(`/packages/${pkg.id}`) },
                          { label: 'Edit Package', onClick: () => navigate(`/packages/${pkg.id}/edit`) },
                          { label: pkg.status === 'Active' ? 'Deactivate' : 'Activate', onClick: () => setOthPkgs(prev => prev.map(p => p.id === pkg.id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p)) },
                          { label: 'Delete', danger: true, onClick: () => setOthPkgs(prev => prev.filter(p => p.id !== pkg.id)) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PkgPagination page={othPage} setPage={setOthPage} total={filteredOth.length} totalPages={othTotalPages} />
          </div>
        </div>
      )}

      {/* ── REMOVED: Tenure/BW/OTT Management tabs moved to Settings > Master Configuration ── */}
      {false && activeTab === 'Tenure Management' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0F2744]">Tenure Management</h2>
              <p className="text-sm text-gray-500">Define billing tenure options</p>
            </div>
            <button onClick={() => setTenureModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              <Plus size={14} /> Add Tenure
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Tenure Name','Months','Description','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenures.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.months}</td>
                    <td className="px-4 py-3 text-gray-500">{t.description}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      <ThreeDotMenu items={[
                        { label: 'Edit', onClick: () => {} },
                        { label: 'Delete', danger: true, onClick: () => setTenures(prev => prev.filter(x => x.id !== t.id)) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal open={tenureModal} onClose={() => setTenureModal(false)} title="Add Tenure">
            <div className="space-y-4">
              <FLD label="Tenure Name *"><input value={tenureForm.name} onChange={e => setTenureForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="e.g. 12+1" /></FLD>
              <FLD label="Total Months *"><input type="number" value={tenureForm.months} onChange={e => setTenureForm(f => ({...f, months: e.target.value}))} className={inp} placeholder="e.g. 13" /></FLD>
              <FLD label="Description"><input value={tenureForm.description} onChange={e => setTenureForm(f => ({...f, description: e.target.value}))} className={inp} /></FLD>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <Toggle value={tenureForm.status} onChange={v => setTenureForm(f => ({...f, status: v}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTenureModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addTenure} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add Tenure</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {false && activeTab === 'Bandwidth Management' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0F2744]">Bandwidth Management</h2>
              <p className="text-sm text-gray-500">Define available bandwidth options</p>
            </div>
            <button onClick={() => setBwModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              <Plus size={14} /> Add Bandwidth
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Bandwidth','Unit','Description','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bandwidths.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.speed} {b.unit}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{b.unit}</span></td>
                    <td className="px-4 py-3 text-gray-500">{b.description}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <ThreeDotMenu items={[
                        { label: 'Edit', onClick: () => {} },
                        { label: 'Delete', danger: true, onClick: () => setBandwidths(prev => prev.filter(x => x.id !== b.id)) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal open={bwModal} onClose={() => setBwModal(false)} title="Add Bandwidth">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FLD label="Speed *"><input type="number" value={bwForm.speed} onChange={e => setBwForm(f => ({...f, speed: e.target.value}))} className={inp} placeholder="e.g. 100" /></FLD>
                <FLD label="Unit *">
                  <select value={bwForm.unit} onChange={e => setBwForm(f => ({...f, unit: e.target.value}))} className={inp}>
                    <option>Mbps</option><option>Gbps</option>
                  </select>
                </FLD>
              </div>
              <FLD label="Description"><input value={bwForm.description} onChange={e => setBwForm(f => ({...f, description: e.target.value}))} className={inp} /></FLD>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <Toggle value={bwForm.status} onChange={v => setBwForm(f => ({...f, status: v}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setBwModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addBw} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add Bandwidth</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {false && activeTab === 'OTT Management' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">Playbox API integration will be configured by the backend team</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0F2744]">OTT Management</h2>
              <p className="text-sm text-gray-500">Manage OTT platform packages</p>
            </div>
            <button onClick={() => setOttModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              <Plus size={14} /> Add OTT Package
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['OTT Name','Provider','Description','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otts.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{o.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{o.provider}</span></td>
                    <td className="px-4 py-3 text-gray-500">{o.description}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      <ThreeDotMenu items={[
                        { label: 'Edit', onClick: () => {} },
                        { label: 'Delete', danger: true, onClick: () => setOtts(prev => prev.filter(x => x.id !== o.id)) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal open={ottModal} onClose={() => setOttModal(false)} title="Add OTT Package">
            <div className="space-y-4">
              <FLD label="OTT Package Name *"><input value={ottForm.name} onChange={e => setOttForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="e.g. Cityline TV Premium" /></FLD>
              <FLD label="Provider">
                <select value={ottForm.provider} onChange={e => setOttForm(f => ({...f, provider: e.target.value}))} className={inp}>
                  <option>Playbox</option><option>Other</option>
                </select>
              </FLD>
              <FLD label="Description"><input value={ottForm.description} onChange={e => setOttForm(f => ({...f, description: e.target.value}))} className={inp} /></FLD>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <Toggle value={ottForm.status} onChange={v => setOttForm(f => ({...f, status: v}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setOttModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addOtt} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add OTT Package</button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
