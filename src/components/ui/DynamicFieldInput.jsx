import { Input, Select, Textarea } from './FormInputs'
import { resolveOptions } from '../../data/linkedDataStore'

export function isFieldFilled(field, value) {
  if (field.type === 'Multi-select') return Array.isArray(value) && value.length > 0
  if (field.type === 'Checkbox') return value === true
  return !!value
}

export function displayFieldValue(val) {
  if (Array.isArray(val)) return val.join(', ')
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return String(val ?? '')
}

// formValues: optional object keyed by field.id — used for cascade resolution
export default function DynamicFieldInput({ field, value, onChange, formValues = {} }) {
  const { type, options = [], placeholder = '', label, linkedSource, cascadeFrom } = field
  const val = value ?? (type === 'Multi-select' ? [] : type === 'Checkbox' ? false : '')

  const effectiveOptions = (() => {
    if (!linkedSource) return options
    const parentValue = cascadeFrom ? (formValues[cascadeFrom] ?? null) : null
    const resolved = resolveOptions(linkedSource, parentValue)
    return resolved.length > 0 ? resolved : []
  })()

  if (type === 'Dropdown') {
    return (
      <Select value={val} onChange={e => onChange(e.target.value)}>
        <option value="">{effectiveOptions.length === 0 ? 'No options available' : 'Select…'}</option>
        {effectiveOptions.map(o => <option key={o}>{o}</option>)}
      </Select>
    )
  }

  if (type === 'Multi-select') {
    const arr = Array.isArray(val) ? val : []
    if (effectiveOptions.length === 0) {
      return <p className="text-xs text-gray-400 py-1 italic">No options available</p>
    }
    return (
      <div className="space-y-1.5 py-0.5">
        {effectiveOptions.map(o => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={arr.includes(o)}
              onChange={e => onChange(e.target.checked ? [...arr, o] : arr.filter(x => x !== o))}
              className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
            />
            <span className="text-gray-700">{o}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'Radio') {
    return (
      <div className="space-y-1.5 py-0.5">
        {effectiveOptions.map(o => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`radio-${field.id}`}
              checked={val === o}
              onChange={() => onChange(o)}
              className="w-3.5 h-3.5 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
            />
            <span className="text-gray-700">{o}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'Checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={!!val}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
        />
        <span className="text-gray-600">{label}</span>
      </label>
    )
  }

  if (type === 'Textarea') {
    return (
      <Textarea
        value={val}
        onChange={e => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder || `Enter ${label.toLowerCase()}…`}
      />
    )
  }

  if (type === 'File Upload') {
    return (
      <input
        type="file"
        onChange={e => onChange(e.target.files?.[0]?.name ?? '')}
        className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20 cursor-pointer"
      />
    )
  }

  const inputType = {
    Text: 'text', Number: 'number', Phone: 'tel', Email: 'email',
    Date: 'date', Time: 'time', 'Date & Time': 'datetime-local', URL: 'url',
  }[type] ?? 'text'

  return (
    <Input
      type={inputType}
      value={val}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || (type === 'URL' ? 'https://' : '')}
    />
  )
}
