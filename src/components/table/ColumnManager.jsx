import { useState, useEffect } from 'react'
import { Columns3, X, GripVertical, Lock, RotateCcw } from 'lucide-react'

// Generic, table-agnostic column show/hide control (Zoho Projects-style).
// A column entry looks like: { key, label, visible, defaultVisible, locked }
// - visible: current shown/hidden state (owned by the caller, e.g. via useColumnPrefs)
// - defaultVisible: what "Reset to Default" restores it to (defaults to true)
// - locked: true to always keep it visible and unclickable — used to guarantee
//   at least one identifying column (e.g. Customer Name) can't be hidden
//
// Trigger is a small icon button (same w-9 h-9 bordered-icon shape/size as
// the toolbar's Filter button); the panel itself is the exact same right-side
// slide-in drawer pattern used by the page's Filter drawer — same overlay,
// width, transition, and header/close-button layout — just with a column
// checklist instead of filter fields.
export default function ColumnManager({ columns, onChange }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  function toggle(key) {
    onChange(columns.map(c => (c.key === key && !c.locked) ? { ...c, visible: !c.visible } : c))
  }

  function resetToDefault() {
    onChange(columns.map(c => ({ ...c, visible: c.locked ? true : (c.defaultVisible ?? true) })))
  }

  const visibleCount = columns.filter(c => c.visible).length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-surface-border bg-white text-gray-500 hover:border-brand-blue/30 hover:text-brand-blue hover:bg-brand-blue/5 transition-all shrink-0"
        title="Manage Columns"
      >
        <Columns3 size={15} />
      </button>

      {/* Overlay + panel — always in DOM for smooth CSS transition, same
          pattern as the page's Filter drawer. */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

        {/* Drawer panel */}
        <div
          className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns3 size={15} className="text-brand-blue" />
                <h2 className="text-sm font-bold text-gray-900">Manage Columns</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Choose which columns to display in the table</p>
            <p className="text-[11px] font-semibold text-brand-blue mt-1.5">{visibleCount} of {columns.length} columns visible</p>
          </div>

          {/* Scrollable body — locked columns (e.g. Customer Name) are always
              visible; they show a lock icon and dimmed text instead of a toggle. */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              {columns.map(c => (
                <button
                  key={c.key}
                  type="button"
                  disabled={c.locked}
                  onClick={() => toggle(c.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg border py-2.5 px-3 text-left transition-colors ${
                    c.locked
                      ? 'border-gray-100 opacity-60 cursor-not-allowed'
                      : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <GripVertical size={14} className="text-gray-300 shrink-0" />
                  <span className={`flex-1 min-w-0 truncate text-sm ${c.locked ? 'text-gray-400' : 'text-gray-700'}`}>{c.label}</span>
                  {c.locked ? (
                    <Lock size={13} className="text-gray-300 shrink-0" />
                  ) : (
                    <span
                      role="switch"
                      aria-checked={c.visible}
                      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${c.visible ? 'bg-brand-blue' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${c.visible ? 'translate-x-4' : 'translate-x-0'}`} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50">
            <button
              type="button"
              onClick={resetToDefault}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <RotateCcw size={13} /> Reset to Default
            </button>
          </div>
        </div>
      </div>
    </>
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
