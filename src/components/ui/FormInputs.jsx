export function FormField({ label, error, hint, children, required, dense = false }) {
  return (
    <div className={dense ? 'space-y-1' : 'space-y-1.5'}>
      {label && (
        <label className={`block font-medium text-gray-700 ${dense ? 'text-xs' : 'text-sm'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Input({ className = '', error, ...props }) {
  return (
    <input
      className={`
        w-full px-3 py-2 text-sm border rounded-lg bg-white
        placeholder-gray-400 text-gray-800
        focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
        disabled:bg-gray-50 disabled:text-gray-500
        ${error ? 'border-red-400' : 'border-surface-border'}
        ${className}
      `}
      {...props}
    />
  )
}

export function Select({ className = '', error, children, ...props }) {
  return (
    <select
      className={`
        w-full px-3 py-2 text-sm border rounded-lg bg-white
        text-gray-800
        focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
        disabled:bg-gray-50
        ${error ? 'border-red-400' : 'border-surface-border'}
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', error, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`
        w-full px-3 py-2 text-sm border rounded-lg bg-white resize-none
        placeholder-gray-400 text-gray-800
        focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
        ${error ? 'border-red-400' : 'border-surface-border'}
        ${className}
      `}
      {...props}
    />
  )
}

export function SearchInput({ className = '', placeholder = 'Search...', value, onChange }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full
          focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
          placeholder-gray-400 ${className}`}
      />
    </div>
  )
}
