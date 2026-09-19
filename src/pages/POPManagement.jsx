import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, MoreVertical, Edit2, Trash2, MapPin, Server } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { getPOPs, subscribePOPs, deletePOP } from '../data/popStore'

const STATUS_BADGE = { Active: 'green', Inactive: 'gray', 'Under Maintenance': 'yellow' }

function localityLabel(pop) {
  if (!pop.locality) return pop.address || '—'
  const { locality, area } = pop.locality
  return area && locality !== area ? `${locality}, ${area}` : locality
}

export default function POPManagement() {
  const navigate = useNavigate()
  const [pops, setPops] = useState(getPOPs)
  useEffect(() => subscribePOPs(setPops), [])

  const [search, setSearch] = useState('')

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return pops
    return pops.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q) ||
      (p.locality?.locality || '').toLowerCase().includes(q)
    )
  }, [pops, search])

  function confirmDelete() {
    if (!deleteTarget) return
    deletePOP(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POP Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {pops.length} points of presence</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/network/pops/new')}>Add POP</Button>
      </div>

      <div className="relative w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, address, locality…"
          className="pl-9 pr-8 py-1.5 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[180px]">POP Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Address / Locality</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Power Backup</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Equipment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Server size={32} className="mx-auto mb-2 text-gray-200" />
                    No POPs found
                  </td>
                </tr>
              ) : filtered.map(pop => (
                <tr
                  key={pop.id}
                  onClick={() => navigate(`/network/pops/${pop.id}`)}
                  className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{pop.name}</span>
                    <span className="block text-xs text-gray-400 font-mono">{pop.id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      {localityLabel(pop)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{pop.powerBackup}</td>
                  <td className="px-4 py-3 text-center text-gray-600 text-xs">{pop.equipment?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[pop.status] ?? 'gray'} dot size="sm">{pop.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-12 text-center">
                    <button
                      onClick={e => openMenu(e, pop.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === pop.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const pop = pops.find(p => p.id === menuId)
        if (!pop) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button
              onClick={() => { navigate(`/network/pops/${pop.id}`); setMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button
              onClick={() => { setDeleteTarget(pop); setMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} className="text-red-400 shrink-0" /> Delete
            </button>
          </div>
        )
      })()}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete POP?"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button size="sm" variant="danger" onClick={confirmDelete}>Delete</Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{deleteTarget?.name}</span> and its {deleteTarget?.equipment?.length ?? 0} equipment record{deleteTarget?.equipment?.length === 1 ? '' : 's'}? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
