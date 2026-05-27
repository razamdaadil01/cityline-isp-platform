import { Input, Select, Textarea } from './FormInputs'
import { resolveOptions } from '../../data/linkedDataStore'

export function isFieldFilled(field, value) {
  if (field.type === 'Multi-select')        return Array.isArray(value) && value.length > 0
  if (field.type === 'Checkbox')            return value === true
  if (field.type === 'Auto-fill')           return true  // system-populated, always considered filled
  if (field.type === 'Conditional Section') return true  // container, not a value field
  return !!value
}

export function displayFieldValue(val) {
  if (Array.isArray(val)) return val.join(', ')
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  if (val !== null && typeof val === 'object') return Object.values(val).filter(Boolean).join(', ')
  return String(val ?? '')
}

// formValues: optional object keyed by field.id — used for cascade resolution
// For Auto-fill: formValues.__siteType / __branchCode are injected by the host form
export default function DynamicFieldInput({ field, value, onChange, formValues = {} }) {
  const { type, options = [], placeholder = '', label, linkedSource, cascadeFrom } = field
  const val = value ?? (type === 'Multi-select' ? [] : type === 'Checkbox' ? false : '')

  // ── Auto-fill ─────────────────────────────────────────────────────────────
  if (type === 'Auto-fill') {
    const resolved = (() => {
      const src = field.autoFillSource
      if (!src)                return '—'
      if (src === 'Site Type')    return formValues.__siteType   || '—'
      if (src === 'Branch Code')  return formValues.__branchCode || '—'
      if (src === 'Current Date') return new Date().toLocaleDateString('en-IN')
      if (src === 'Current User') return 'Admin User'
      if (src === 'Lead ID')      return 'Auto-generated'
      return '—'
    })()

    return (
      <div className="relative">
        <Input
          value={resolved}
          disabled
          readOnly
          className="bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200 pr-14"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded pointer-events-none">
          AUTO
        </span>
      </div>
    )
  }

  // ── Conditional Section ───────────────────────────────────────────────────
  if (type === 'Conditional Section') {
    const { conditionField, conditionOp, conditionValue, childFields = [] } = field

    const conditionMet = (() => {
      if (!conditionField || !conditionOp) return true
      const fv = formValues[conditionField]
      const empty = fv === undefined || fv === null || fv === '' ||
                    (Array.isArray(fv) && fv.length === 0)
      if (conditionOp === 'is empty')     return empty
      if (conditionOp === 'is not empty') return !empty
      if (conditionOp === 'equals')       return String(fv ?? '') === (conditionValue ?? '')
      if (conditionOp === 'not equals')   return String(fv ?? '') !== (conditionValue ?? '')
      return true
    })()

    if (!conditionMet) return null

    return (
      <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
        {field.label && (
          <p className="text-sm font-semibold text-purple-800">{field.label}</p>
        )}
        {field.sectionDescription && (
          <p className="text-xs text-purple-600">{field.sectionDescription}</p>
        )}
        {childFields.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No fields configured in this section.</p>
        ) : (
          childFields.map(cf => (
            <div key={cf.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {cf.label}
                {cf.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <DynamicFieldInput
                field={cf}
                value={value?.[cf.id]}
                onChange={v => onChange({ ...(value ?? {}), [cf.id]: v })}
                formValues={formValues}
              />
            </div>
          ))
        )}
      </div>
    )
  }

  // ── Standard types ────────────────────────────────────────────────────────

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
