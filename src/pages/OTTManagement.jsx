import { useState, useRef, useEffect } from 'react'
import { Tv2, Plus, MoreVertical, X, Info } from 'lucide-react'

const INIT_OTT = [
  { id: 1, name: 'Cityline TV Gold',   provider: 'Playbox', description: 'Premium OTT bundle',  status: 'Active' },
  { id: 2, name: 'Cityline TV Silver', provider: 'Playbox', description: 'Standard OTT bundle', status: 'Active' },
  { id: 3, name: 'Cityline TV Basic',  provider: 'Playbox', description: 'Basic OTT bundle',    status: 'Active' },
]

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"

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
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', provider: 'Playbox', description: '', status: 'Active' })

  const total    = packages.length
  const active   = packages.filter(p => p.status === 'Active').length
  const providers = [...new Set(packages.map(p => p.provider))].length

  const openAdd = () => {
    setForm({ name: '', provider: 'Playbox', description: '', status: 'Active' })
    setModal(true)
  }

  const handleSave = () => {
    if (!form.name) return
    setPackages(prev => [...prev, { id: Date.now(), ...form }])
    setModal(false)
  }

  const deactivate = (id) => setPackages(prev => prev.map(p => p.id === id ? { ...p, status: 'Inactive' } : p))
  const remove     = (id) => setPackages(prev => prev.filter(p => p.id !== id))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={15} className="text-[#0A8DCD] mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">Playbox API integration will be configured by backend team</p>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['OTT Name', 'Provider', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map(pkg => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{pkg.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{pkg.provider}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{pkg.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pkg.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {pkg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ThreeDotMenu
                      onEdit={() => { setForm({ name: pkg.name, provider: pkg.provider, description: pkg.description, status: pkg.status }); setModal(true) }}
                      onDeactivate={() => deactivate(pkg.id)}
                      onRemove={() => remove(pkg.id)}
                    />
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No OTT packages found.</td>
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
                <label className="text-xs font-medium text-gray-500 mb-1 block">OTT Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cityline TV Premium" className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Provider *</label>
                <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} className={inp}>
                  <option>Playbox</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description" className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave}
                  className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0]">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
