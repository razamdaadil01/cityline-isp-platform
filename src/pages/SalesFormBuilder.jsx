import { useState } from 'react'
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Save, CheckCircle, Settings2, Type, Hash, Phone,
  Mail, List, ToggleLeft, Calendar, Upload, AlignLeft,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getFormModules, setFormModule } from '../data/customFormStore'

const FIELD_TYPES = [
  'Text', 'Number', 'Phone', 'Email', 'Dropdown',
  'Multi-select', 'Date', 'Yes/No Toggle', 'File Upload', 'Textarea',
]

const FIELD_TYPE_ICON = {
  'Text':          Type,
  'Number':        Hash,
  'Phone':         Phone,
  'Email':         Mail,
  'Dropdown':      List,
  'Multi-select':  List,
  'Date':          Calendar,
  'Yes/No Toggle': ToggleLeft,
  'File Upload':   Upload,
  'Textarea':      AlignLeft,
}

const MODULES_META = [
  { key: 'B2C', name: 'B2C Lead Form', sub: 'B2C Residential pipeline', color: '#0A8DCD', badge: 'bg-blue-100 text-blue-700' },
  { key: 'B2B', name: 'B2B Lead Form', sub: 'B2B Corporate pipeline',   color: '#0F2744', badge: 'bg-navy/10 text-navy'      },
]

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({ field, index, total, onMove, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = FIELD_TYPE_ICON[field.type] ?? Type

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 group">
        {/* Move arrows */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="w-4 h-4 flex items-center justify-center hover:text-brand-blue disabled:opacity-20 disabled:cursor-not-allowed text-gray-300"
          >
            <ChevronUp size={12} />
          </button>
          <GripVertical size={13} className="text-gray-200 mx-auto" />
          <button
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            className="w-4 h-4 flex items-center justify-center hover:text-brand-blue disabled:opacity-20 disabled:cursor-not-allowed text-gray-300"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Type icon chip */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 shrink-0">
          <Icon size={12} />
          {field.type}
        </div>

        {/* Label inline edit */}
        <input
          value={field.label}
          onChange={e => onUpdate(field.id, { label: e.target.value })}
          className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-brand-blue outline-none px-1 min-w-0"
          placeholder="Field label…"
        />

        {/* Required badge */}
        <button
          onClick={() => onUpdate(field.id, { required: !field.required })}
          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors shrink-0 ${
            field.required
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {field.required ? 'Required' : 'Optional'}
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          <ChevronDownIcon size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Delete */}
        <button
          onClick={() => onRemove(field.id)}
          className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2.5 border-t border-surface-border bg-gray-50 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Field Type">
              <Select
                value={field.type}
                onChange={e => onUpdate(field.id, { type: e.target.value })}
              >
                {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <div className="col-span-2">
              <FormField label="Placeholder Text">
                <Input
                  value={field.placeholder ?? ''}
                  onChange={e => onUpdate(field.id, { placeholder: e.target.value })}
                  placeholder="e.g. Enter your company name…"
                />
              </FormField>
            </div>
          </div>

          {(field.type === 'Dropdown' || field.type === 'Multi-select') && (
            <FormField label="Options (one per line)">
              <Textarea
                value={(field.options ?? []).join('\n')}
                onChange={e => onUpdate(field.id, {
                  options: e.target.value.split('\n').filter(Boolean),
                })}
                placeholder={'Option 1\nOption 2\nOption 3'}
                rows={3}
              />
            </FormField>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function initFields() {
  const m = getFormModules()
  return {
    B2C: m.B2C?.fields ?? [],
    B2B: m.B2B?.fields ?? [],
  }
}

export default function SalesFormBuilder() {
  const [selectedKey, setSelectedKey] = useState('B2C')
  const [fieldsByKey, setFieldsByKey] = useState(initFields)
  const [saved, setSaved] = useState(false)

  const fields = fieldsByKey[selectedKey] ?? []

  function setFields(next) {
    setFieldsByKey(prev => ({ ...prev, [selectedKey]: next }))
  }

  function addField() {
    setFields([
      ...fields,
      {
        id: `f-${Date.now()}`,
        type: 'Text',
        label: 'New Field',
        placeholder: '',
        required: false,
        options: [],
      },
    ])
  }

  function updateField(id, patch) {
    setFields(fields.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function removeField(id) {
    setFields(fields.filter(f => f.id !== id))
  }

  function moveField(fromIdx, toIdx) {
    const arr = [...fields]
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item)
    setFields(arr)
  }

  function handleSave() {
    Object.entries(fieldsByKey).forEach(([key, flds]) => setFormModule(key, flds))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const meta = MODULES_META.find(m => m.key === selectedKey)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize lead capture fields for each pipeline</p>
        </div>
        <Button
          onClick={handleSave}
          icon={saved ? <CheckCircle size={14} /> : <Save size={14} />}
          variant={saved ? 'secondary' : 'primary'}
        >
          {saved ? 'Saved!' : 'Save Form'}
        </Button>
      </div>

      <div className="flex gap-5">
        {/* Module list */}
        <div className="w-56 shrink-0 space-y-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">
            Form Modules
          </p>
          {MODULES_META.map(m => {
            const fieldCount = fieldsByKey[m.key]?.length ?? 0
            const isSelected = selectedKey === m.key
            return (
              <button
                key={m.key}
                onClick={() => setSelectedKey(m.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-transparent shadow-sm text-white'
                    : 'bg-white border-surface-border hover:border-brand-blue/40 hover:shadow-sm'
                }`}
                style={isSelected ? { backgroundColor: m.color } : {}}
              >
                <p className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {m.name}
                </p>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                  {m.sub}
                </p>
                <div className="mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : m.badge
                  }`}>
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            )
          })}

          <div className="pt-3 border-t border-surface-border">
            <p className="text-xs text-gray-400 leading-relaxed px-1">
              Custom fields appear in the Add Lead modal for the matching pipeline.
            </p>
          </div>
        </div>

        {/* Field editor */}
        <div className="flex-1 bg-white rounded-xl border border-surface-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-brand-blue" />
              <h2 className="font-bold text-gray-900">{meta?.name}</h2>
              {fields.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue font-semibold">
                  {fields.length} fields
                </span>
              )}
            </div>
            <Button size="sm" icon={<Plus size={14} />} onClick={addField}>
              Add Field
            </Button>
          </div>

          <div className="p-5">
            {fields.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Plus size={24} className="text-gray-300" />
                </div>
                <p className="font-medium text-gray-500">No custom fields yet</p>
                <p className="text-sm mt-1">
                  Click <strong>+ Add Field</strong> to start building your form
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    index={idx}
                    total={fields.length}
                    onMove={moveField}
                    onUpdate={updateField}
                    onRemove={removeField}
                  />
                ))}
              </div>
            )}
          </div>

          {fields.length > 0 && (
            <div className="px-5 pb-5">
              <div className="mt-3 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
                <p className="text-xs text-brand-blue font-medium">
                  These {fields.length} field{fields.length !== 1 ? 's' : ''} will appear in the{' '}
                  <strong>{meta?.name}</strong> when creating a new lead in the{' '}
                  {meta?.sub.replace(' pipeline', '')} pipeline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
