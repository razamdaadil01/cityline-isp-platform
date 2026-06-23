import { useState, useRef, useEffect } from 'react'
import { Tv2, Plus, MoreVertical, X, Search } from 'lucide-react'

const INIT_OTT = [
  { id: 1, name: 'Bengal special_365',   amount: 1320, validity: '365 days', provider: 'Play Box', packages: ['DistroTV','DiscoveryPlus','PlayboxTV','Fancode','SonyLIV','Hoichoi','JioHotstar (A)','Zee5','Shemaroo','Hungama'], status: 'Active' },
  { id: 2, name: 'Bengal special_180',   amount: 660,  validity: '180 days', provider: 'Play Box', packages: ['DistroTV','DiscoveryPlus','PlayboxTV','Fancode','SonyLIV','Hoichoi','JioHotstar (A)','Zee5','Shemaroo','Hungama'], status: 'Active' },
  { id: 3, name: 'Bengal special_90',    amount: 330,  validity: '90 days',  provider: 'Play Box', packages: ['DistroTV','DiscoveryPlus','PlayboxTV','Fancode','SonyLIV','Hoichoi','JioHotstar (A)','Zee5','Shemaroo','Hungama'], status: 'Active' },
  { id: 4, name: 'Bengal special_30',    amount: 110,  validity: '30 days',  provider: 'Play Box', packages: ['DistroTV','DiscoveryPlus','PlayboxTV','Fancode','SonyLIV','Hoichoi','JioHotstar (A)','Zee5','Shemaroo','Hungama'], status: 'Active' },
  { id: 5, name: 'Cityline_Plus (HY)',   amount: 799,  validity: '180 days', provider: 'Play Box', packages: ['SonyLIV','Zee5','Shemaroo','PlayboxTV','Hungama','DiscoveryPlus','AaoNxt','OM TV','Fancode','JioHotstar (A)','DistroTV','Hubhopper','1OTT','iTap','Stage','Kanccha Lannka','Chana Jor','Amazon'], status: 'Active' },
  { id: 6, name: 'Asia cup special_(Y)', amount: 240,  validity: '365 days', provider: 'Play Box', packages: ['SonyLIV','Shemaroo','PlayboxTV','Hungama','OM TV','Fancode','DistroTV','Stage','Shorts Tv','RunnTV','Shucae Flim','Dangal Play','Waves'], status: 'Active' },
  { id: 7, name: 'Asia cup special_(HY)',amount: 120,  validity: '180 days', provider: 'Play Box', packages: ['SonyLIV','Shemaroo','PlayboxTV','Hungama','OM TV','Fancode','DistroTV','Stage','Shorts Tv','RunnTV','Shucae Flim','Dangal Play','Waves'], status: 'Active' },
  { id: 8, name: 'Asia cup special_(Q)', amount: 60,   validity: '90 days',  provider: 'Play Box', packages: ['SonyLIV','Shemaroo','PlayboxTV','Hungama','OM TV','Fancode','DistroTV','Stage','Shorts Tv','RunnTV','Shucae Flim','Dangal Play','Waves'], status: 'Active' },
]

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"

function PackagesList({ packages }) {
  const SHOW = 3
  if (packages.length <= SHOW) {
    return <span className="text-gray-600 text-xs">{packages.join(', ')}</span>
  }
  const shown = packages.slice(0, SHOW).join(', ')
  const rest  = packages.slice(SHOW)
  return (
    <span className="text-gray-600 text-xs">
      {shown},{' '}
      <span className="relative group cursor-default">
        <span className="text-[#0A8DCD] font-medium">+{rest.length} more</span>
        <span className="absolute left-0 top-full mt-1 z-30 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed">
          {rest.join(', ')}
        </span>
      </span>
    </span>
  )
}

function ThreeDotMenu({ onEdit, onDeactivate, onRemove }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
          <button onClick={() => { onEdit(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
          <button onClick={() => { onDeactivate(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50">Deactivate</button>
          <button onClick={() => { onRemove(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Remove</button>
        </div>
      )}
    </div>
  )
}

export default function OTTManagement() {
  const [packages, setPackages] = useState(INIT_OTT)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ providerType: 'Play Box', name: '', url: '', apiKey: '' })

  const total     = packages.length
  const active    = packages.filter(p => p.status === 'Active').length
  const providers = [...new Set(packages.map(p => p.provider))].length

  const openAdd = () => {
    setForm({ providerType: 'Play Box', name: '', url: '', apiKey: '' })
    setModal(true)
  }

  const handleSave = () => {
    if (!form.name || !form.url) return
    setPackages(prev => [...prev, {
      id: Date.now(), name: form.name, amount: 0, validity: '—',
      provider: form.providerType, packages: [], status: 'Active',
    }])
    setModal(false)
  }

  const deactivate = (id) => setPackages(prev => prev.map(p => p.id === id ? { ...p, status: 'Inactive' } : p))
  const remove     = (id) => setPackages(prev => prev.filter(p => p.id !== id))

  const filtered = packages.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2744]">OTT Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage OTT platform packages and integrations</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0878b0] transition-colors">
          <Plus size={15} /> Add OTT Package
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Packages', value: total,     color: 'text-[#0A8DCD]', bg: 'bg-blue-50'   },
          { label: 'Active',         value: active,    color: 'text-green-600', bg: 'bg-green-50'  },
          { label: 'Providers',      value: providers,  color: 'text-purple-600',bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
              <Tv2 size={18} className={card.color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search OTT packages..."
          className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full max-w-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['S.No', 'Package Name', 'Amount', 'Validity', 'Provider', 'Packages Included', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((pkg, idx) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{pkg.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">₹{pkg.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{pkg.validity}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{pkg.provider}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <PackagesList packages={pkg.packages} />
                  </td>
                  <td className="px-4 py-3">
                    <ThreeDotMenu
                      onEdit={() => { setForm({ providerType: pkg.provider, name: pkg.name, url: '', apiKey: '' }); setModal(true) }}
                      onDeactivate={() => deactivate(pkg.id)}
                      onRemove={() => remove(pkg.id)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No OTT packages found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Add OTT Package</h2>
              <button onClick={() => setModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Provider Type *</label>
                <select value={form.providerType} onChange={e => setForm(f => ({ ...f, providerType: e.target.value }))} className={inp}>
                  <option>Play Box</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ott Provider Name" className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">URL *</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="Ott Url" className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">API Key</label>
                <textarea value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="Api Key" rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave}
                  className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0]">Generate Package</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
