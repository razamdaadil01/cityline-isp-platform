import { useState, useEffect, useRef } from 'react'
import { getAssetCategory, getAssetType } from '../../data/assetTaxonomy'

// Lightweight searchable Asset Model picker — mirrors ProductPicker.jsx's
// own structure/UX exactly (same `position: fixed` floating dropdown to
// escape a table/form's own overflow clipping, same onSelect/getHint API
// shape) so Asset PO creation's "Select from Asset Master" step feels like
// the same picker Product PO creation already has, not a second bespoke
// pattern. Filters live by name/brand/model; each suggestion also shows its
// Category — Type so a "Splicing Machine" model isn't confused with a
// "Laptop" model that happens to share a brand.
//
// `getHint` is optional — a (model) => ReactNode|null callback for a small
// muted line under each suggestion (e.g. AddAsset.jsx shows the model's own
// Default Price there, same role ProductPicker's last-purchase-price hint
// plays for products).
export default function AssetModelPicker({ assetModels, value, onSelect, placeholder, getHint }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 260 })
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) })
    setOpen(true)
  }

  const q = query.toLowerCase()
  const filtered = assetModels.filter(m =>
    m.name.toLowerCase().includes(q) || (m.brand || '').toLowerCase().includes(q) || (m.model || '').toLowerCase().includes(q)
  )

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={inputRef}
        value={open ? query : (value || '')}
        onChange={e => { setQuery(e.target.value); openDropdown() }}
        onFocus={() => { setQuery(''); openDropdown() }}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
      {open && (
        <div
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, zIndex: 9999 }}
          className="max-h-56 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching asset models</p>
          ) : filtered.map(m => {
            const category = getAssetCategory(m.categoryId)
            const type = getAssetType(m.categoryId, m.typeId)
            const hint = getHint?.(m)
            return (
              <button
                key={m.id} type="button"
                onClick={() => { onSelect(m); setOpen(false); setQuery('') }}
                className="flex flex-col w-full text-left px-3 py-2 gap-0.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>
                  {m.name} {(m.brand || m.model) && <span className="text-gray-400">· {[m.brand, m.model].filter(Boolean).join(' ')}</span>}
                </span>
                <span className="text-gray-400">{category?.label}{type ? ` — ${type.label}` : ''}</span>
                {hint && <span className="text-gray-400">{hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
