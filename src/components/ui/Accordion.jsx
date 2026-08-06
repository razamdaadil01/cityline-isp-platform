import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Accordion({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-surface-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4 space-y-4 border-t border-surface-border">{children}</div>}
    </div>
  )
}
