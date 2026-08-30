const variants = {
  blue: 'bg-brand-blue/10 text-brand-blue',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-brand-orange/10 text-brand-orange',
  yellow: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  navy: 'bg-navy/10 text-navy',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  slate: 'bg-slate-100 text-slate-700',
  // Reserved for 'Lost' — deliberately a dark/black tone rather than red,
  // so it reads as visually distinct from Expired warranty (red) and
  // Missing kit components (red) at a glance.
  black: 'bg-gray-900 text-white',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function Badge({ children, variant = 'blue', size = 'md', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  )
}
