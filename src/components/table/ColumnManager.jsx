import { useState, useRef, useEffect } from 'react'
import { Settings, ChevronDown, RotateCcw } from 'lucide-react'
import Button from '../ui/Button'

// Generic, table-agnostic column show/hide control (Zoho Projects-style).
// A column entry looks like: { key, label, visible, defaultVisible, locked }
// - visible: current shown/hidden state (owned by the caller, e.g. via useColumnPrefs)
// - defaultVisible: what "Reset to Default" restores it to (defaults to true)
// - locked: true to always keep it visible and unclickable — used to guarantee
//   at least one identifying column (e.g. Customer Name) can't be hidden
export default function ColumnManager({ columns, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function toggle(key) {
    onChange(columns.map(c => (c.key === key && !c.locked) ? { ...c, visible: !c.visible } : c))
  }

  function resetToDefault() {
    onChange(columns.map(c => ({ ...c, visible: c.locked ? true : (c.defaultVisible ?? true) })))
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <Button variant="secondary" size="sm" icon={<Settings size={14} />} onClick={() => setOpen(o => !o)}>
        Columns <ChevronDown size={12} className="ml-1" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-surface-border rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-surface-border">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Show / Hide Columns</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {columns.map(c => (
              <label
                key={c.key}
                className={`flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                  c.locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={c.visible}
                  disabled={c.locked}
                  onChange={() => toggle(c.key)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-gray-700">{c.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={resetToDefault}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 transition-colors border-t border-surface-border"
          >
            <RotateCcw size={12} /> Reset to Default
          </button>
        </div>
      )}
    </div>
  )
}

// Column visibility state + localStorage persistence, scoped per table via
// `storageKey` (e.g. 'columnPrefs:salesLeadsTable') — kept separate from the
// ColumnManager UI so other tables can reuse it by passing their own
// storageKey and default columns array, without ColumnManager itself needing
// to know anything about storage.
export function useColumnPrefs(storageKey, defaultColumns) {
  const [columns, setColumns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (Array.isArray(saved)) {
        // Merge saved visibility onto the current default column list by key,
        // so columns added to the table later (not present in an older saved
        // preference) still show up instead of silently disappearing.
        return defaultColumns.map(dc => {
          const match = saved.find(s => s.key === dc.key)
          return match ? { ...dc, visible: dc.locked ? true : match.visible } : dc
        })
      }
    } catch {
      // Ignore malformed/inaccessible localStorage — fall back to defaults.
    }
    return defaultColumns
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns.map(c => ({ key: c.key, visible: c.visible }))))
    } catch {
      // Ignore storage write failures (e.g. private browsing quota) — the
      // preference just won't persist across reloads.
    }
  }, [storageKey, columns])

  return [columns, setColumns]
}
