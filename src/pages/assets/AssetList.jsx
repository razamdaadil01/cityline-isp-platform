import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, X, ChevronDown, Eye, Boxes } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getAssets, subscribeAssets, assetDisplayName, ASSET_STATUSES } from '../../data/assetStore'
import { ASSET_CATEGORIES, getAssetCategory } from '../../data/assetTaxonomy'

const STATUS_BADGE = { Draft: 'gray', 'PO Raised': 'indigo' }

export default function AssetList() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState(getAssets)
  useEffect(() => subscribeAssets(setAssets), [])

  const [search, setSearch] = useState('')

  // ── Filter Drawer — same slide-in panel + Apply/Clear pattern already
  // used across this app's other list pages (e.g. Inventory's Assign to
  // Engineer list). ────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const EMPTY_DRAFT = { category: '', type: '', status: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ category: filterCategory, type: filterType, status: filterStatus })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterCategory(draft.category); setFilterType(draft.type); setFilterStatus(draft.status)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  // Changing Category invalidates whatever Type was drafted (types are
  // scoped to one category), same cascading-clear idea CreateAssignment.jsx's
  // own Store→Engineer selection uses.
  function setDraftCategory(v) { setDraft(prev => ({ ...prev, category: v, type: '' })) }
  function setDraftField(k, v) { setDraft(prev => ({ ...prev, [k]: v })) }
  function clearAllFilters() { setFilterCategory(''); setFilterType(''); setFilterStatus('') }

  const activeFiltersCount = [filterCategory, filterType, filterStatus].filter(Boolean).length
  const draftTypes = draft.category ? (getAssetCategory(draft.category)?.types ?? []) : []

  const allRows = useMemo(() => assets.map(a => ({ ...a, name: assetDisplayName(a) })), [assets])
  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allRows.filter(a => {
      if (filterCategory && a.categoryId !== filterCategory) return false
      if (filterType && a.typeId !== filterType) return false
      if (filterStatus && a.status !== filterStatus) return false
      if (q) {
        const haystack = `${a.id} ${a.name} ${a.typeLabel} ${a.categoryLabel}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [allRows, search, filterCategory, filterType, filterStatus])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} of {allRows.length} assets</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/assets/new')}>Add Asset</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search asset ID, name, type…"
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
              <div className="relative">
                <select value={draft.category} onChange={e => setDraftCategory(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {ASSET_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</label>
              <div className="relative">
                <select
                  value={draft.type} onChange={e => setDraftField('type', e.target.value)}
                  disabled={!draft.category}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">{draft.category ? 'All' : 'Select a category first'}</option>
                  {draftTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
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
                  {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Warranty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 w-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Boxes size={32} className="mx-auto mb-2 text-gray-200" />
                    No assets found
                  </td>
                </tr>
              ) : rows.map(a => (
                <tr key={a.id} onClick={() => navigate(`/assets/${a.id}`)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-brand-blue">{a.id}</span></td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{a.categoryLabel}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{a.typeLabel}</td>
                  <td className="px-4 py-3 text-gray-800 text-xs font-medium">{a.name}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[a.status] ?? 'gray'} size="sm" dot>{a.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 w-16 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/assets/${a.id}`)}
                      title="View"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors mx-auto"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
