import { Check } from 'lucide-react'

// Generalized copy of TicketCreate's step tracker (same visual language,
// parameterized with a `steps` prop) so both Customer Creation wizards share it.
export default function StepProgress({ steps, current, isReachable, onSelect }) {
  return (
    <div className="flex items-start">
      {steps.map((s, i) => {
        const done = s.id < current
        const active = s.id === current
        const reachable = isReachable(s.id)
        const Icon = s.icon
        return (
          <div key={s.id} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => reachable && onSelect(s.id)}
                disabled={!reachable}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  reachable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                } ${
                  done   ? 'bg-brand-blue text-white' :
                  active ? 'bg-navy text-white ring-4 ring-navy/20' :
                           'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <Check size={15} /> : <Icon size={15} />}
              </button>
              <button
                type="button"
                onClick={() => reachable && onSelect(s.id)}
                disabled={!reachable}
                className={`text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${
                  reachable ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${
                  active ? 'text-navy' : done ? 'text-brand-blue' : 'text-gray-400'
                }`}
              >
                {s.label}
              </button>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[18px] mx-2 transition-all ${
                done ? 'bg-brand-blue' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
