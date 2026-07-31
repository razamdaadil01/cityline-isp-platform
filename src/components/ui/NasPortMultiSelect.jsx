import { useState } from 'react'
import { Router, X, Search } from 'lucide-react'

// Searchable, flat multi-select for picking NAS Port IDs — the same
// chips + search + scrollable checkbox-list pattern as AreaMultiSelect,
// used by Create Outage and Outage Detail's "edit affected ports" flow.
// `ports` is the [{ id, area, branch }] shape from ticketsStore's NAS_PORTS.
export default function NasPortMultiSelect({ selected, onChange, ports }) {
  const [search, setSearch] = useState('')

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter(p => p !== id) : [...selected, id])
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? ports.filter(p => p.id.toLowerCase().includes(q) || p.area.toLowerCase().includes(q))
    : ports

  return (
    <div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500 mb-1.5">{selected.length} port{selected.length !== 1 ? 's' : ''} selected</p>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(id => (
            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-mono font-medium">
              {id}
              <button type="button" onClick={() => toggle(id)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search NAS Port ID or area..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
        />
      </div>

      <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[220px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No NAS Ports found</p>
        ) : filtered.map(p => {
          const isSelected = selected.includes(p.id)
          return (
            <label key={p.id}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(p.id)}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
              <Router size={12} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 font-mono">{p.id}</span>
              <span className="text-xs text-gray-400 ml-auto shrink-0">{p.area}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
