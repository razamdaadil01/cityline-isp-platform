import { useState, useEffect } from 'react'
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Save, CheckCircle, Settings2, Type, Hash, Phone,
  Mail, List, ToggleLeft, Calendar, Upload, AlignLeft,
  ChevronDown as ChevronDownIcon, Link2, Zap, GitBranch,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getFormModules, setFormModule } from '../data/customFormStore'
import { getPipelines, subscribePipelines } from '../data/pipelineStore'
import {
  DATA_SOURCE_GROUPS, DATA_SOURCE_MAP,
  getLinkedSourceLabel, applyCascadeDetection,
} from '../data/linkedDataStore'

const FIELD_TYPES = [
  'Text', 'Number', 'Phone', 'Email', 'Dropdown',
  'Multi-select', 'Date', 'Yes/No Toggle', 'File Upload', 'Textarea',
  'Auto-fill', 'Conditional Section',
]

const CHILD_FIELD_TYPES = FIELD_TYPES.filter(t => t !== 'Conditional Section')

const FIELD_TYPE_ICON = {
  'Text':                Type,
  'Number':              Hash,
  'Phone':               Phone,
  'Email':               Mail,
  'Dropdown':            List,
  'Multi-select':        List,
  'Date':                Calendar,
  'Yes/No Toggle':       ToggleLeft,
  'File Upload':         Upload,
  'Textarea':            AlignLeft,
  'Auto-fill':           Zap,
  'Conditional Section': GitBranch,
}

const AUTO_FILL_SOURCES = [
  { key: 'Site Type',    label: 'Site Type (from Area Mapping)'    },
  { key: 'Branch Code',  label: 'Branch Code (from Area Mapping)'  },
  { key: 'Current Date', label: 'Current Date'                     },
  { key: 'Current User', label: 'Current User'                     },
  { key: 'Lead ID',      label: 'Lead ID (auto-generated)'         },
]

const CONDITION_OPS = ['is empty', 'is not empty', 'equals', 'not equals']

const DEFAULT_MODULES = [
  { key: 'B2C', name: 'Residential Lead Form', sub: 'Residential pipeline', color: '#0A8DCD', badge: 'bg-blue-100 text-blue-700' },
  { key: 'B2B', name: 'Corporate Lead Form',   sub: 'Corporate pipeline',   color: '#0F2744', badge: 'bg-navy/10 text-navy'      },
]

function buildModulesList(pipelines) {
  const custom = pipelines
    .filter(p => !p.isDefault)
    .map(p => ({
      key:   p.id,
      name:  `${p.name} Form`,
      sub:   `${p.name} pipeline`,
      color: '#475569',
      badge: 'bg-slate-100 text-slate-600',
    }))
  return [...DEFAULT_MODULES, ...custom]
}

function initFieldsByKey(pipelines) {
  const m = getFormModules()
  const result = {
    B2C: m.B2C?.fields ?? [],
    B2B: m.B2B?.fields ?? [],
  }
  pipelines.filter(p => !p.isDefault).forEach(p => {
    result[p.id] = m[p.id]?.fields ?? []
  })
  return result
}

const SUPPORTS_LINKED = ['Dropdown', 'Multi-select']

// ── Child Field Row (used inside Conditional Section) ─────────────────────────

function ChildFieldRow({ field, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = FIELD_TYPE_ICON[field.type] ?? Type
  const supportsOptions = ['Dropdown', 'Multi-select'].includes(field.type)

  return (
    <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 group">
        {/* Type chip */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 rounded text-[10px] font-semibold text-purple-600 shrink-0">
          <Icon size={10} />
          {field.type}
        </div>

        {/* Label */}
        <input
          value={field.label}
          onChange={e => onUpdate(field.id, { label: e.target.value })}
          className="flex-1 text-xs font-medium text-gray-700 bg-transparent border-b border-transparent focus:border-brand-blue outline-none px-1 min-w-0"
          placeholder="Field label…"
        />

        {/* Type selector */}
        <select
          value={field.type}
          onChange={e => onUpdate(field.id, { type: e.target.value, options: [] })}
          className="text-[10px] border border-surface-border rounded px-1.5 py-0.5 bg-white text-gray-600 focus:outline-none focus:border-brand-blue shrink-0"
        >
          {CHILD_FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Required toggle */}
        <button
          onClick={() => onUpdate(field.id, { required: !field.required })}
          className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold transition-colors shrink-0 ${
            field.required
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {field.required ? 'Req' : 'Opt'}
        </button>

        {/* Options expand */}
        {supportsOptions && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <ChevronDownIcon size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Remove */}
        <button
          onClick={onRemove}
          className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && supportsOptions && (
        <div className="px-2.5 pb-2.5 pt-2 border-t border-surface-border bg-gray-50">
          <FormField label="Options (one per line)">
            <Textarea
              value={(field.options ?? []).join('\n')}
              onChange={e => onUpdate(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
              placeholder={'Option 1\nOption 2'}
              rows={2}
            />
          </FormField>
        </div>
      )}
    </div>
  )
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({ field, index, total, onMove, onUpdate, onRemove, cascadeInfo, allFields = [] }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = FIELD_TYPE_ICON[field.type] ?? Type
  const isLinked = !!field.linkedSource
  const supportsLinked = SUPPORTS_LINKED.includes(field.type)
  const isAutoFill = field.type === 'Auto-fill'
  const isConditional = field.type === 'Conditional Section'

  function addChildField() {
    onUpdate(field.id, {
      childFields: [
        ...(field.childFields ?? []),
        {
          id: `cf-${Date.now()}`,
          type: 'Text',
          label: 'New Field',
          placeholder: '',
          required: false,
          options: [],
        },
      ],
    })
  }

  function updateChildField(cfId, patch) {
    onUpdate(field.id, {
      childFields: (field.childFields ?? []).map(c => c.id === cfId ? { ...c, ...patch } : c),
    })
  }

  function removeChildField(cfId) {
    onUpdate(field.id, {
      childFields: (field.childFields ?? []).filter(c => c.id !== cfId),
    })
  }

  const needsConditionValue = field.conditionOp === 'equals' || field.conditionOp === 'not equals'
  const childCount = (field.childFields ?? []).length

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 group">
        {/* Reorder */}
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

        {/* Type chip */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold shrink-0 ${
          isAutoFill    ? 'bg-amber-100 text-amber-700'   :
          isConditional ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          <Icon size={12} />
          {field.type}
        </div>

        {/* Label */}
        <input
          value={field.label}
          onChange={e => onUpdate(field.id, { label: e.target.value })}
          className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-brand-blue outline-none px-1 min-w-0"
          placeholder={isConditional ? 'Section label…' : 'Field label…'}
        />

        {/* Auto-fill badge */}
        {isAutoFill && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
            ⚡ Auto: {field.autoFillSource || 'Not set'}
          </span>
        )}

        {/* Conditional Section badge */}
        {isConditional && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
            🔀 {childCount} field{childCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Linked / manual opts badge */}
        {supportsLinked && (
          isLinked ? (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shrink-0 flex items-center gap-1">
              <Link2 size={9} />
              {DATA_SOURCE_MAP[field.linkedSource] ?? 'Linked'}
            </span>
          ) : (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">
              📝 {field.options?.length ?? 0} opts
            </span>
          )
        )}

        {/* Required toggle — hidden for Conditional Section (it's a container) */}
        {!isConditional && (
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
        )}

        <button
          onClick={() => setExpanded(p => !p)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          <ChevronDownIcon size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => onRemove(field.id)}
          className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2.5 border-t border-surface-border bg-gray-50 space-y-3">

          {/* Field Type row — hide placeholder for special types */}
          <div className={`grid gap-3 ${isAutoFill || isConditional ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <FormField label="Field Type">
              <Select
                value={field.type}
                onChange={e => onUpdate(field.id, {
                  type: e.target.value,
                  linkedSource: SUPPORTS_LINKED.includes(e.target.value) ? field.linkedSource : null,
                })}
              >
                {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            {!isAutoFill && !isConditional && (
              <div className="col-span-2">
                <FormField label="Placeholder Text">
                  <Input
                    value={field.placeholder ?? ''}
                    onChange={e => onUpdate(field.id, { placeholder: e.target.value })}
                    placeholder="e.g. Enter your company name…"
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* ── Auto-fill config ──────────────────────────────────────────── */}
          {isAutoFill && (
            <div className="space-y-2">
              <FormField label="Auto-fill Source">
                <Select
                  value={field.autoFillSource ?? ''}
                  onChange={e => onUpdate(field.id, { autoFillSource: e.target.value })}
                >
                  <option value="">Select source…</option>
                  {AUTO_FILL_SOURCES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </Select>
              </FormField>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Zap size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  This field will be automatically filled by the system.
                  It is read-only and cannot be edited by users.
                </p>
              </div>
            </div>
          )}

          {/* ── Conditional Section config ────────────────────────────────── */}
          {isConditional && (
            <div className="space-y-4">

              {/* Description */}
              <FormField label="Section Description (optional)">
                <Input
                  value={field.sectionDescription ?? ''}
                  onChange={e => onUpdate(field.id, { sectionDescription: e.target.value })}
                  placeholder="Brief description shown under the section title"
                />
              </FormField>

              {/* Condition builder */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Show When</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[130px]">
                    <FormField label="Field">
                      <Select
                        value={field.conditionField ?? ''}
                        onChange={e => onUpdate(field.id, { conditionField: e.target.value })}
                      >
                        <option value="">Select field…</option>
                        {allFields
                          .filter(f => f.id !== field.id && f.type !== 'Conditional Section')
                          .map(f => (
                            <option key={f.id} value={f.id}>
                              {f.label || 'Unnamed field'}
                            </option>
                          ))}
                      </Select>
                    </FormField>
                  </div>

                  <div className="flex-1 min-w-[130px]">
                    <FormField label="Condition">
                      <Select
                        value={field.conditionOp ?? 'is empty'}
                        onChange={e => onUpdate(field.id, { conditionOp: e.target.value })}
                      >
                        {CONDITION_OPS.map(op => <option key={op}>{op}</option>)}
                      </Select>
                    </FormField>
                  </div>

                  {needsConditionValue && (
                    <div className="flex-1 min-w-[130px]">
                      <FormField label="Value">
                        <Input
                          value={field.conditionValue ?? ''}
                          onChange={e => onUpdate(field.id, { conditionValue: e.target.value })}
                          placeholder="Value to match"
                        />
                      </FormField>
                    </div>
                  )}
                </div>

                {!field.conditionField && (
                  <p className="text-[11px] text-gray-400 mt-1.5 italic">
                    No condition set — section will always be visible.
                  </p>
                )}
              </div>

              {/* Child fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">
                    Child Fields
                    {childCount > 0 && (
                      <span className="ml-1.5 font-normal text-gray-400">({childCount})</span>
                    )}
                  </p>
                  <button
                    onClick={addChildField}
                    className="text-xs text-brand-blue hover:text-brand-blue-dark font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus size={11} /> Add Field
                  </button>
                </div>

                {childCount === 0 ? (
                  <div className="text-center py-3 border border-dashed border-surface-border rounded-lg">
                    <p className="text-xs text-gray-400">No child fields yet — click Add Field above</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(field.childFields ?? []).map(cf => (
                      <ChildFieldRow
                        key={cf.id}
                        field={cf}
                        onUpdate={updateChildField}
                        onRemove={() => removeChildField(cf.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── Linked / manual options (existing) ───────────────────────── */}
          {supportsLinked && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Data Source</p>
                <div className="flex gap-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name={`src-${field.id}`}
                      checked={!isLinked}
                      onChange={() => onUpdate(field.id, { linkedSource: null })}
                      className="w-3.5 h-3.5 text-brand-blue accent-brand-blue"
                    />
                    <span className={`text-sm ${!isLinked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      Manual Options
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name={`src-${field.id}`}
                      checked={isLinked}
                      onChange={() => onUpdate(field.id, { linkedSource: 'area.states', options: [] })}
                      className="w-3.5 h-3.5 text-brand-blue accent-brand-blue"
                    />
                    <span className={`text-sm ${isLinked ? 'text-brand-blue font-medium' : 'text-gray-500'}`}>
                      Linked Data Source
                    </span>
                  </label>
                </div>
              </div>

              {isLinked ? (
                <div className="space-y-2">
                  <FormField label="Select Data Source">
                    <Select
                      value={field.linkedSource}
                      onChange={e => onUpdate(field.id, { linkedSource: e.target.value })}
                    >
                      {DATA_SOURCE_GROUPS.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.sources.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </FormField>

                  {cascadeInfo && (
                    <div className="flex items-center justify-between px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-lg">
                      <span className="flex items-center gap-1.5 text-xs text-brand-blue font-medium">
                        <Link2 size={11} />
                        Cascades from <strong>{cascadeInfo.fromFieldLabel}</strong>
                      </span>
                      <button
                        onClick={() => onUpdate(field.id, { cascadeEnabled: field.cascadeEnabled === false })}
                        className="text-[10px] text-gray-400 hover:text-brand-blue underline shrink-0 ml-2"
                      >
                        {field.cascadeEnabled === false ? 'Re-enable cascade' : 'Disable cascade'}
                      </button>
                    </div>
                  )}

                  <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs text-emerald-700">
                      This dropdown will show data from{' '}
                      <strong>{getLinkedSourceLabel(field.linkedSource)}</strong> automatically.
                      Options update when source data changes.
                    </p>
                  </div>
                </div>
              ) : (
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
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalesFormBuilder() {
  const [pipelines, setPipelines] = useState(getPipelines)
  const [fieldsByKey, setFieldsByKey] = useState(() => initFieldsByKey(getPipelines()))
  const [selectedKey, setSelectedKey] = useState('B2C')
  const [saved, setSaved] = useState(false)

  useEffect(() => subscribePipelines(newPipelines => {
    setPipelines(newPipelines)
    setFieldsByKey(prev => {
      const m = getFormModules()
      const customKeys = new Set(newPipelines.filter(p => !p.isDefault).map(p => p.id))
      const next = { ...prev }
      customKeys.forEach(key => {
        if (!(key in next)) next[key] = m[key]?.fields ?? []
      })
      Object.keys(next).forEach(key => {
        if (key !== 'B2C' && key !== 'B2B' && !customKeys.has(key)) {
          delete next[key]
        }
      })
      return next
    })
  }), [])

  useEffect(() => {
    const validKeys = new Set([
      'B2C', 'B2B',
      ...pipelines.filter(p => !p.isDefault).map(p => p.id),
    ])
    if (!validKeys.has(selectedKey)) setSelectedKey('B2C')
  }, [pipelines, selectedKey])

  const modulesList = buildModulesList(pipelines)
  const fields = fieldsByKey[selectedKey] ?? []
  const meta = modulesList.find(m => m.key === selectedKey)

  function setFields(next) {
    const withCascade = applyCascadeDetection(next)
    setFieldsByKey(prev => ({ ...prev, [selectedKey]: withCascade }))
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
        linkedSource: null,
        cascadeFrom: null,
        cascadeEnabled: true,
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

  function getCascadeInfo(field, allFields) {
    if (!field.cascadeFrom) return null
    const parent = allFields.find(f => f.id === field.cascadeFrom)
    return parent ? { fromFieldId: parent.id, fromFieldLabel: parent.label } : null
  }

  function handleSave() {
    Object.entries(fieldsByKey).forEach(([key, flds]) => setFormModule(key, flds))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

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
          {modulesList.map(m => {
            const fieldCount = fieldsByKey[m.key]?.length ?? 0
            const isSelected = selectedKey === m.key
            return (
              <button
                key={m.key}
                onClick={() => setSelectedKey(m.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-transparent shadow-sm'
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
                    cascadeInfo={getCascadeInfo(field, fields)}
                    allFields={fields}
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
