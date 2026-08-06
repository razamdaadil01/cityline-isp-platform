import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import Badge from '../components/ui/Badge'
import { getCustomerTypes } from '../data/customerTypes'
import { getFieldConfig, subscribeFieldConfig, setFieldMandatory } from '../data/fieldConfigStore'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200
        ${checked ? 'bg-brand-blue' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function FieldConfigSettings() {
  const navigate = useNavigate()
  const { type } = useParams()
  const customerTypes = getCustomerTypes()
  const activeType = customerTypes.some(t => t.id === type) ? type : customerTypes[0]?.id

  const [fields, setFields] = useState(() => getFieldConfig(activeType))

  useEffect(() => {
    setFields(getFieldConfig(activeType))
    return subscribeFieldConfig(() => setFields(getFieldConfig(activeType)))
  }, [activeType])

  function handleToggle(field, next) {
    if (field.locked) return
    setFieldMandatory(activeType, field.fieldName, next)
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings/customer-type')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Field Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            System Configuration — Customer Type — control which fields are Mandatory or Optional on the Lead/Customer creation form
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {customerTypes.map(t => (
          <button
            key={t.id}
            onClick={() => navigate(`/settings/customer-type/${t.id}/fields`)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeType === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Changes apply going forward to new Lead/Customer entries; existing records are not retro-validated.
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mandatory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {fields.map(field => (
              <tr key={field.fieldName} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{field.fieldName}</span>
                    {field.conditional && <Badge variant="yellow" size="sm">Conditional</Badge>}
                    {field.locked && (
                      <Lock
                        size={12}
                        className="text-gray-400 shrink-0"
                        aria-label="System-default-mandatory field — cannot be made optional"
                        title="System-default-mandatory field — cannot be made optional"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Toggle checked={field.mandatory} disabled={field.locked} onChange={v => handleToggle(field, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${field.mandatory ? 'text-green-600' : 'text-gray-400'}`}>
                      {field.mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
