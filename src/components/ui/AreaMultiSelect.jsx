import { useState } from 'react'
import { MapPin, X, Search, ChevronDown } from 'lucide-react'

// Searchable, zone-grouped multi-select for picking area/locality names — shared by
// Create Outage and Outage Detail's "edit affected area" flow. `groups` is the
// [{ area, localities: [...] }] shape returned by areaMappingStore's getAllLocalitiesGrouped().
export default function AreaMultiSelect({ selected, onChange, groups }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(new Set())

  function toggle(locality) {
    onChange(selected.includes(locality) ? selected.filter(a => a !== locality) : [...selected, locality])
  }

  function toggleGroup(localities) {
    const allSelected = localities.every(l => selected.includes(l))
    onChange(allSelected
      ? selected.filter(a => !localities.includes(a))
      : [...new Set([...selected, ...localities])])
  }

  function toggleCollapsed(area) {
    setCollapsed(c => {
      const next = new Set(c)
      next.has(area) ? next.delete(area) : next.add(area)
      return next
    })
  }

  const q = search.trim().toLowerCase()
  const filteredGroups = groups
    .map(g => ({
      ...g,
      localities: q
        ? g.localities.filter(l => l.toLowerCase().includes(q) || g.area.toLowerCase().includes(q))
        : g.localities,
    }))
    .filter(g => g.localities.length > 0)

  return (
    <div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500 mb-1.5">{selected.length} area{selected.length !== 1 ? 's' : ''} selected</p>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(area => (
            <span key={area} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
              {area}
              <button type="button" onClick={() => toggle(area)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
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
          placeholder="Search area/locality..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
        />
      </div>

      <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[220px] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No areas found</p>
        ) : filteredGroups.map(g => {
          const isCollapsed = collapsed.has(g.area)
          const allSelected = g.localities.every(l => selected.includes(l))
          return (
            <div key={g.area}>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(g.localities)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                <button type="button" onClick={() => toggleCollapsed(g.area)}
                  className="flex items-center gap-1.5 flex-1 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <ChevronDown size={12} className={`transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`} />
                  {g.area} Zone
                  <span className="text-gray-400 font-normal normal-case">({g.localities.length})</span>
                </button>
              </div>
              {!isCollapsed && g.localities.map(locality => {
                const isSelected = selected.includes(locality)
                return (
                  <label key={locality}
                    className={`flex items-center gap-3 pl-8 pr-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(locality)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                    <MapPin size={12} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">{locality}</span>
                  </label>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
