import { useState, useEffect, useRef } from 'react'

// Lightweight searchable product picker — a text input that filters
// `products` live and shows matches in a dropdown; picking one fills the
// caller's row via onSelect. No new UI primitive/library — just plain input
// styling plus a small floating list. Shared by Create PO's product rows and
// Create Purchase's "Add Hardware Outside PO" row.
//
// `getHint` is optional — a (product) => ReactNode|null callback a caller
// can pass to show a small muted secondary line below a suggestion row's
// product name (e.g. Create PO's "Last: ₹1,800 (Vendor Name)"
// last-purchase-price reference — a plain string works fine too, or the
// caller can return richer JSX to style part of it, like that vendor name,
// differently). Returning null/undefined omits the hint line for that row
// entirely; callers that don't pass it get no hint at all.
//
// The dropdown is positioned with `position: fixed` (computed from the
// input's own bounding rect) rather than `absolute` — callers typically sit
// inside a table's `overflow-x-auto` wrapper, and setting overflow-x on a
// container forces the browser to also compute overflow-y as `auto` (a
// CSS-spec rule: an element can't have one axis "visible" and the other
// not), which silently clips an absolutely-positioned dropdown even though
// it's still correctly rendered in the DOM. `fixed` escapes that clipping,
// matching the same pattern the 3-dot row-action menus use elsewhere in
// Inventory (e.g. ProductList.jsx).
export default function ProductPicker({ products, value, onSelect, placeholder, getHint }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 240 })
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) })
    setOpen(true)
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

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
          className="max-h-48 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching products</p>
          ) : filtered.map(p => {
            const hint = getHint?.(p)
            return (
              <button
                key={p.id} type="button"
                onClick={() => { onSelect(p); setOpen(false); setQuery('') }}
                className="flex flex-col w-full text-left px-3 py-2 gap-0.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>
                  {p.name} {p.sku && <span className="text-gray-400">· {p.sku}</span>}
                </span>
                {hint && <span className="text-gray-400">{hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
