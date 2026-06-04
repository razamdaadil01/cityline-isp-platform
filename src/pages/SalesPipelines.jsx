import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Edit3, Trash2, GripVertical, ChevronDown, ChevronUp,
  Layers, Settings2, HardDrive, AlertCircle, Check, FolderOpen,
  X, List, Type, Hash, Phone, Mail,
  Circle, Calendar, Clock, CheckSquare, AlignLeft, Upload, Link, FileText,
  Trophy, XCircle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getPipelines, addPipeline, updatePipeline, deletePipeline, subscribePipelines } from '../data/pipelineStore'
import { getStageFields, setStageFields } from '../data/stageFieldsStore'
import { getLeads, subscribeLeads } from '../data/leadsStore'
import {
  DATA_SOURCE_GROUPS, DATA_SOURCE_MAP,
  getLinkedSourceLabel, applyCascadeDetection,
} from '../data/linkedDataStore'

const STAGE_COLORS = [
  { label: 'Blue',    value: 'bg-blue-500'    },
  { label: 'Cyan',    value: 'bg-cyan-500'    },
  { label: 'Purple',  value: 'bg-purple-500'  },
  { label: 'Amber',   value: 'bg-amber-500'   },
  { label: 'Orange',  value: 'bg-orange-500'  },
  { label: 'Pink',    value: 'bg-pink-500'    },
  { label: 'Emerald', value: 'bg-emerald-500' },
  { label: 'Red',     value: 'bg-red-500'     },
]

const STAGE_TYPES = ['Standard', 'Hardware Assignment']
const STATUS_TYPES = ['Open', 'Won', 'Lost']

const FIELD_TYPES = [
  'Text', 'Number', 'Phone', 'Email',
  'Dropdown', 'Multi-select', 'Radio',
  'Date', 'Time', 'Date & Time',
  'Checkbox', 'Textarea', 'File Upload', 'URL',
]

const TYPES_WITH_OPTIONS = ['Dropdown', 'Multi-select', 'Radio']

const FIELD_TYPE_ICON_MAP = {
  'Text':        Type,
  'Number':      Hash,
  'Phone':       Phone,
  'Email':       Mail,
  'Dropdown':    ChevronDown,
  'Multi-select': List,
  'Radio':       Circle,
  'Date':        Calendar,
  'Time':        Clock,
  'Date & Time': Clock,
  'Checkbox':    CheckSquare,
  'Textarea':    AlignLeft,
  'File Upload': Upload,
  'URL':         Link,
}

// Reverse map for pipeline type key → lead pipeline field value
const PIPELINE_LEAD_KEY_MAP = { 'PL-001': 'B2C' }

// Query-param slug ↔ pipeline id (for ?edit= param)
const PIPELINE_EDIT_SLUG = { 'PL-001': 'residential', 'PL-003': 'enterprise' }
const SLUG_TO_ID         = { residential: 'PL-001', enterprise: 'PL-003' }

const INIT_PIPELINE_FORM = { name: '', description: '' }

const SUPPORTS_LINKED = ['Dropdown', 'Multi-select']

const INIT_FIELD_FORM = {
  label: '',
  type: 'Text',
  options: [],
  placeholder: '',
  help: '',
  required: false,
  active: true,
  linkedSource: null,
  cascadeEnabled: true,
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, size = 'md' }) {
  const isSmall = size === 'sm'
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-blue/40 ${
        isSmall ? 'h-4 w-7' : 'h-5 w-9'
      } ${value ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow transition-transform ${
          isSmall
            ? `h-2.5 w-2.5 ${value ? 'translate-x-3.5' : 'translate-x-0.5'}`
            : `h-3.5 w-3.5 ${value ? 'translate-x-5' : 'translate-x-0.5'}`
        }`}
      />
    </button>
  )
}

// ── Field List Item ──────────────────────────────────────────────────────────

function FieldListItem({ field, index, total, onMove, onEdit, onDelete, isActive }) {
  const Icon = FIELD_TYPE_ICON_MAP[field.type] ?? FileText

  return (
    <div
      className={`flex items-center gap-2 border rounded-lg px-2.5 py-2 group transition-colors ${
        isActive
          ? 'border-brand-blue bg-blue-50/60'
          : 'border-surface-border bg-white hover:border-brand-blue/30'
      }`}
    >
      {/* Reorder */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 text-gray-300">
        <button
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className="hover:text-brand-blue disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronUp size={10} />
        </button>
        <GripVertical size={12} className="text-gray-200" />
        <button
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className="hover:text-brand-blue disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronDown size={10} />
        </button>
      </div>

      <Icon size={13} className="text-brand-blue shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{field.label}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{field.type}</span>
          {field.required && (
            <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded">Required</span>
          )}
          {!field.active && (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactive</span>
          )}
          {SUPPORTS_LINKED.includes(field.type) && (
            field.linkedSource ? (
              <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Link size={9} />
                {DATA_SOURCE_MAP[field.linkedSource] ?? 'Linked'}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                📝 {field.options?.length ?? 0} opts
              </span>
            )
          )}
          {field.cascadeFrom && (
            <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/5 border border-brand-blue/20 px-1.5 py-0.5 rounded">
              ↳ cascade
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(field)}
          className="p-1 rounded hover:bg-brand-blue/10 text-gray-400 hover:text-brand-blue transition-colors"
          title="Edit field"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={() => onDelete(field.id)}
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete field"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Field Form ───────────────────────────────────────────────────────────────

function FieldForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    initialData
      ? { ...INIT_FIELD_FORM, ...initialData, options: [...(initialData.options ?? [])] }
      : { ...INIT_FIELD_FORM }
  )
  const [newOption, setNewOption] = useState('')

  const supportsLinked = SUPPORTS_LINKED.includes(form.type)
  const isLinked = supportsLinked && !!form.linkedSource
  const hasOptions = TYPES_WITH_OPTIONS.includes(form.type) && !isLinked
  const isEditing = !!initialData

  function set(key, value) { setForm(p => ({ ...p, [key]: value })) }

  function handleTypeChange(newType) {
    setForm(p => ({
      ...p,
      type: newType,
      options: TYPES_WITH_OPTIONS.includes(newType) ? p.options : [],
      linkedSource: SUPPORTS_LINKED.includes(newType) ? p.linkedSource : null,
    }))
  }

  function addOption() {
    const val = newOption.trim()
    if (!val || form.options.includes(val)) return
    set('options', [...form.options, val])
    setNewOption('')
  }

  function removeOption(idx) {
    set('options', form.options.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    if (!form.label.trim()) return
    if (!isLinked && hasOptions && form.options.length === 0) return
    onSave({
      label:          form.label.trim(),
      type:           form.type,
      options:        isLinked ? [] : form.options,
      linkedSource:   form.linkedSource ?? null,
      cascadeEnabled: form.cascadeEnabled,
      placeholder:    form.placeholder,
      help:           form.help,
      required:       form.required,
      active:         form.active,
    })
  }

  const canSave = form.label.trim() && (isLinked || !hasOptions || form.options.length > 0)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">
        {isEditing ? 'Edit Field' : 'Add Field'}
      </h3>

      <FormField label="Field Label" required>
        <Input
          value={form.label}
          onChange={e => set('label', e.target.value)}
          placeholder="e.g. Feasibility Status"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </FormField>

      <FormField label="Field Type" required>
        <Select value={form.type} onChange={e => handleTypeChange(e.target.value)}>
          {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
        </Select>
      </FormField>

      {/* Linked data source toggle for Dropdown / Multi-select */}
      {supportsLinked && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Data Source</p>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name={`pf-src-${isEditing ? initialData?.id : 'new'}`}
                  checked={!isLinked}
                  onChange={() => set('linkedSource', null)}
                  className="w-3.5 h-3.5 accent-brand-blue"
                />
                <span className={`text-sm ${!isLinked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                  Manual Options
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name={`pf-src-${isEditing ? initialData?.id : 'new'}`}
                  checked={isLinked}
                  onChange={() => setForm(p => ({ ...p, linkedSource: 'area.states', options: [] }))}
                  className="w-3.5 h-3.5 accent-brand-blue"
                />
                <span className={`text-sm ${isLinked ? 'text-brand-blue font-medium' : 'text-gray-500'}`}>
                  Linked Data Source
                </span>
              </label>
            </div>
          </div>

          {isLinked && (
            <div className="space-y-2">
              <FormField label="Select Data Source">
                <Select
                  value={form.linkedSource}
                  onChange={e => set('linkedSource', e.target.value)}
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
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700">
                  This field will show data from{' '}
                  <strong>{getLinkedSourceLabel(form.linkedSource)}</strong> automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual options editor */}
      {hasOptions && (
        <FormField label="Options">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                placeholder="Type an option and press Enter…"
              />
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addOption}>
                Add
              </Button>
            </div>
            {form.options.length > 0 ? (
              <div className="space-y-1">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 border border-surface-border px-2.5 py-1.5 rounded-lg">
                    <span className="text-xs text-gray-700">{opt}</span>
                    <button
                      onClick={() => removeOption(idx)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-2 shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600">Add at least one option.</p>
            )}
          </div>
        </FormField>
      )}

      <FormField label="Placeholder text">
        <Input
          value={form.placeholder}
          onChange={e => set('placeholder', e.target.value)}
          placeholder="Optional placeholder shown in the field…"
        />
      </FormField>

      <FormField label="Help text">
        <Input
          value={form.help}
          onChange={e => set('help', e.target.value)}
          placeholder="Optional hint shown below the field…"
        />
      </FormField>

      <div className="space-y-3 pt-2 border-t border-surface-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 font-medium">Required</p>
            <p className="text-xs text-gray-400">Sales team must fill this field</p>
          </div>
          <Toggle value={form.required} onChange={v => set('required', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 font-medium">Active</p>
            <p className="text-xs text-gray-400">Show this field to users</p>
          </div>
          <Toggle value={form.active} onChange={v => set('active', v)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSave}>
          {isEditing ? 'Update Field' : 'Save Field'}
        </Button>
      </div>
    </div>
  )
}

// ── Stage Field Manager Modal ─────────────────────────────────────────────────

function StageFieldManagerModal({ isOpen, onClose, stage }) {
  const [fields, setFields] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingField, setEditingField] = useState(null)

  useEffect(() => {
    if (stage) {
      setFields(getStageFields(stage.id))
      setShowForm(false)
      setEditingField(null)
    }
  }, [stage?.id])

  function persist(newFields) {
    setFields(newFields)
    setStageFields(stage.id, newFields)
  }

  function handleAddNew() {
    setEditingField(null)
    setShowForm(true)
  }

  function handleEdit(field) {
    setEditingField(field)
    setShowForm(true)
  }

  function handleDelete(fieldId) {
    persist(applyCascadeDetection(fields.filter(f => f.id !== fieldId)))
    if (editingField?.id === fieldId) { setShowForm(false); setEditingField(null) }
  }

  function handleMove(fromIdx, toIdx) {
    const arr = [...fields]
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item)
    persist(applyCascadeDetection(arr))
  }

  function handleSaveField(fieldData) {
    let newFields
    if (editingField) {
      newFields = fields.map(f => f.id === editingField.id ? { ...f, ...fieldData } : f)
    } else {
      newFields = [...fields, { ...fieldData, id: `${stage.id}-field-${Date.now()}` }]
    }
    persist(applyCascadeDetection(newFields))
    setShowForm(false)
    setEditingField(null)
  }

  function handleCancelForm() {
    setShowForm(false)
    setEditingField(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fields — ${stage?.name ?? ''}`}
      size="xl"
      zIndex="z-[60]"
    >
      <p className="text-xs text-gray-500 mb-4 -mt-1">
        These fields appear when a lead enters or moves to this stage.
      </p>

      <div className="grid grid-cols-5 gap-5" style={{ minHeight: 420 }}>
        {/* Left — Fields list */}
        <div className="col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Fields ({fields.length})
            </span>
            <Button size="xs" icon={<Plus size={12} />} onClick={handleAddNew}>
              Add Field
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-0.5" style={{ maxHeight: 460 }}>
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-surface-border rounded-xl h-full">
                <FileText size={24} className="text-gray-300 mb-2" />
                <p className="text-xs font-medium text-gray-500">No fields yet.</p>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Add fields that sales team<br />should fill at this stage.
                </p>
              </div>
            ) : (
              fields.map((field, idx) => (
                <FieldListItem
                  key={field.id}
                  field={field}
                  index={idx}
                  total={fields.length}
                  onMove={handleMove}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isActive={editingField?.id === field.id && showForm}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — Add/Edit form */}
        <div className="col-span-3 border-l border-surface-border pl-5 overflow-y-auto" style={{ maxHeight: 480 }}>
          {showForm ? (
            <FieldForm
              key={editingField?.id ?? 'new'}
              initialData={editingField}
              onSave={handleSaveField}
              onCancel={handleCancelForm}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <List size={28} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">
                Click <strong className="text-gray-500">+ Add Field</strong> to add a field,
              </p>
              <p className="text-xs text-gray-400 mt-1">or click the edit icon on an existing field.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Stage Row (in pipeline editor) ───────────────────────────────────────────

function StageRow({ stage, index, total, onMove, onUpdate, onRemove, showRequired, onOpenFields, allStages,
  dragging, dragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [editing, setEditing] = useState(false)
  const dragRef = useRef(null)
  const [localName, setLocalName] = useState(stage.name)
  const [statusWarning, setStatusWarning] = useState(null)

  const isActive = stage.active !== false
  const statusType = stage.statusType ?? 'Open'
  const followUpAllowed = stage.followUpAllowed !== false

  function commitName() {
    if (localName.trim()) onUpdate(stage.id, { name: localName.trim() })
    setEditing(false)
  }

  const STATUS_TYPE_COLORS = {
    Open: 'text-brand-blue',
    Won:  'text-emerald-600',
    Lost: 'text-red-500',
  }

  return (
    <div
      ref={dragRef}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex flex-col gap-1.5 border rounded-lg px-3 py-2.5 group transition-colors select-none
        ${dragging ? 'opacity-40 scale-[0.98]' : ''}
        ${dragOver === 'above' ? 'border-t-2 border-t-brand-blue border-x-brand-blue/30 border-b-surface-border' : ''}
        ${dragOver === 'below' ? 'border-b-2 border-b-brand-blue border-x-brand-blue/30 border-t-surface-border' : ''}
        ${!dragging && !dragOver && (isActive
          ? 'bg-white border-surface-border hover:border-brand-blue/40'
          : 'bg-gray-50 border-gray-200 opacity-70'
        )}
        ${dragging ? (isActive ? 'bg-white border-surface-border' : 'bg-gray-50 border-gray-200') : ''}
      `}
    >
      {/* Row 1: Move, color, name, HW badge, type controls, delete */}
      <div className="flex items-center gap-2">
        <div className={`flex flex-col items-center gap-0.5 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} text-gray-300 hover:text-gray-500 shrink-0`}>
          <button
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="w-4 h-4 flex items-center justify-center hover:text-brand-blue disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronUp size={12} />
          </button>
          <GripVertical size={14} className="text-gray-300" />
          <button
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            className="w-4 h-4 flex items-center justify-center hover:text-brand-blue disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        <div className={`w-3 h-3 rounded-full shrink-0 ${stage.color}`} title="Stage color" />

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false) }}
              className="w-full text-sm border-b border-brand-blue outline-none bg-transparent pb-0.5"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className={`text-sm font-medium text-left w-full truncate ${isActive ? 'text-gray-800 hover:text-brand-blue' : 'text-gray-500'}`}
            >
              {stage.name}
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 shrink-0">
          {!isActive && (
            <span className="text-[10px] font-semibold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Inactive</span>
          )}
          {statusType === 'Won' && (
            <Trophy size={11} className="text-emerald-500" title="Won stage" />
          )}
          {statusType === 'Lost' && (
            <XCircle size={11} className="text-red-400" title="Lost stage" />
          )}
          {stage.type === 'Hardware Assignment' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
              <HardDrive size={10} /> HW
            </span>
          )}
        </div>

        <button
          onClick={() => onRemove(stage.id)}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Row 2: Config controls */}
      <div className="flex items-center gap-2 pl-6 flex-wrap">
        {/* Color */}
        <select
          value={stage.color}
          onChange={e => onUpdate(stage.id, { color: e.target.value })}
          className="text-xs border border-surface-border rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/30 shrink-0"
          title="Stage color"
        >
          {STAGE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {/* Type */}
        <select
          value={stage.type}
          onChange={e => onUpdate(stage.id, { type: e.target.value })}
          className="text-xs border border-surface-border rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/30 shrink-0"
          title="Stage type"
        >
          {STAGE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Status Type */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">Status:</span>
            <select
              value={statusType}
              onChange={e => {
                const next = e.target.value
                if ((next === 'Won' || next === 'Lost') && allStages) {
                  const conflict = allStages.find(s => s.id !== stage.id && s.statusType === next)
                  if (conflict) {
                    setStatusWarning(`⚠️ Another stage is already set to ${next}. Only one ${next} stage is allowed per pipeline.`)
                    setTimeout(() => setStatusWarning(null), 3000)
                    return
                  }
                }
                onUpdate(stage.id, { statusType: next })
              }}
              className={`text-xs border border-surface-border rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/30 shrink-0 font-semibold ${STATUS_TYPE_COLORS[statusType]}`}
              title="Status type"
            >
              {STATUS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {statusWarning && (
            <span className="text-xs text-amber-600 max-w-[220px] leading-tight">{statusWarning}</span>
          )}
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-gray-400">Active</span>
          <Toggle size="sm" value={isActive} onChange={v => onUpdate(stage.id, { active: v })} />
        </div>

        {/* Follow-up Allowed toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-gray-400">Follow-up</span>
          <Toggle size="sm" value={followUpAllowed} onChange={v => onUpdate(stage.id, { followUpAllowed: v })} />
        </div>

        {/* Required (B2B only) */}
        {showRequired && (
          <button
            onClick={() => onUpdate(stage.id, { required: !stage.required })}
            title={stage.required ? 'Required (click to toggle)' : 'Optional (click to toggle)'}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
              stage.required
                ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:border-brand-blue/30'
            }`}
          >
            {stage.required ? <Check size={10} /> : <AlertCircle size={10} />}
            {stage.required ? 'Required' : 'Optional'}
          </button>
        )}

        {/* Fields */}
        <Button
          size="xs"
          variant="secondary"
          icon={<List size={11} />}
          onClick={() => onOpenFields(stage)}
          title="Manage stage fields"
          className="shrink-0"
        >
          Fields
        </Button>
      </div>
    </div>
  )
}

// ── Pipeline Editor Modal ─────────────────────────────────────────────────────

function PipelineEditorModal({ isOpen, onClose, pipeline, onSave, onOpenFields, leads = [] }) {
  const [stages, setStages] = useState(pipeline?.stages ?? [])
  const [newStageName, setNewStageName] = useState('')
  const [stageDeleteTarget, setStageDeleteTarget] = useState(null)
  const [saveErrorToast, setSaveErrorToast] = useState(false)
  const dragIndexRef = useRef(null)
  const [dragState, setDragState] = useState({ dragging: null, dropOver: null, dropSide: null })

  const showRequired = pipeline?.type === 'ILL'

  function moveStage(fromIdx, toIdx) {
    setStages(prev => {
      const arr = [...prev]
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      return arr
    })
  }

  function makeDragHandlers(index) {
    return {
      onDragStart: e => {
        dragIndexRef.current = index
        e.dataTransfer.effectAllowed = 'move'
        setDragState({ dragging: index, dropOver: null, dropSide: null })
      },
      onDragOver: e => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const rect = e.currentTarget.getBoundingClientRect()
        const side = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
        setDragState(s => ({ ...s, dropOver: index, dropSide: side }))
      },
      onDrop: e => {
        e.preventDefault()
        const from = dragIndexRef.current
        if (from === null || from === index) { setDragState({ dragging: null, dropOver: null, dropSide: null }); return }
        const rect = e.currentTarget.getBoundingClientRect()
        const side = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
        let to = side === 'above' ? index : index + 1
        if (from < to) to -= 1
        moveStage(from, to)
        dragIndexRef.current = null
        setDragState({ dragging: null, dropOver: null, dropSide: null })
      },
      onDragEnd: () => {
        dragIndexRef.current = null
        setDragState({ dragging: null, dropOver: null, dropSide: null })
      },
    }
  }

  function updateStage(id, patch) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function removeStage(id) {
    setStages(prev => prev.filter(s => s.id !== id))
    setStageDeleteTarget(null)
  }

  function handleRemoveStage(id) {
    const stage = stages.find(s => s.id === id)
    if (!stage) return
    const pipelineKey = PIPELINE_LEAD_KEY_MAP[pipeline?.id] ?? pipeline?.type ?? pipeline?.id
    const leadCount = leads.filter(l => l.pipeline === pipelineKey && l.stage === stage.name).length
    setStageDeleteTarget({ stage, leadCount })
  }

  function addStage() {
    if (!newStageName.trim()) return
    setStages(prev => [
      ...prev,
      {
        id: `stage-${Date.now()}`,
        name: newStageName.trim(),
        color: 'bg-blue-500',
        required: false,
        type: 'Standard',
        active: true,
        statusType: 'Open',
        followUpAllowed: true,
      },
    ])
    setNewStageName('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Stages — ${pipeline?.name}`}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            const wonCount = stages.filter(s => s.statusType === 'Won').length
            const lostCount = stages.filter(s => s.statusType === 'Lost').length
            if (wonCount > 1 || lostCount > 1) {
              setSaveErrorToast(true)
              setTimeout(() => setSaveErrorToast(false), 3500)
              return
            }
            onSave(stages)
            onClose()
          }}>Save Stages</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Reorder stages using the arrow buttons. Click a stage name to rename it inline.
          Configure status type, active state, and follow-up allowance per stage.
          Click <strong>Fields</strong> to configure data collected at each stage.
          {showRequired && ' Toggle Required for mandatory stages.'}
        </p>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {stages.map((stage, idx) => {
            const dh = makeDragHandlers(idx)
            return (
              <StageRow
                key={stage.id}
                stage={stage}
                index={idx}
                total={stages.length}
                onMove={moveStage}
                onUpdate={updateStage}
                onRemove={handleRemoveStage}
                showRequired={showRequired}
                onOpenFields={onOpenFields}
                allStages={stages}
                dragging={dragState.dragging === idx}
                dragOver={dragState.dropOver === idx ? dragState.dropSide : null}
                {...dh}
              />
            )
          })}
          {stages.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">No stages yet. Add one below.</div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-surface-border">
          <input
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStage()}
            placeholder="New stage name…"
            className="flex-1 text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={addStage}>Add Stage</Button>
        </div>
      </div>

      <StageDeleteModal
        isOpen={!!stageDeleteTarget}
        onClose={() => setStageDeleteTarget(null)}
        stage={stageDeleteTarget?.stage}
        leadCount={stageDeleteTarget?.leadCount ?? 0}
        onConfirm={() => removeStage(stageDeleteTarget.stage.id)}
      />

      {saveErrorToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          ⚠️ Fix stage status conflicts before saving.
        </div>
      )}
    </Modal>
  )
}

// ── Create Pipeline Modal ─────────────────────────────────────────────────────

function CreatePipelineModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState(INIT_PIPELINE_FORM)

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleCreate() {
    if (!form.name.trim()) return
    const t = Date.now()
    onCreate({
      id: `PL-${t}`,
      name: form.name.trim(),
      description: form.description,
      activeLeads: 0,
      isDefault: false,
      active: true,
      stages: [
        { id: `${t}-1`, name: 'New Inquiry', color: 'bg-blue-500',    required: false, type: 'Standard', active: true, statusType: 'Open', followUpAllowed: true  },
        { id: `${t}-2`, name: 'In Progress', color: 'bg-amber-500',   required: false, type: 'Standard', active: true, statusType: 'Open', followUpAllowed: true  },
        { id: `${t}-3`, name: 'Won',         color: 'bg-emerald-500', required: false, type: 'Standard', active: true, statusType: 'Won',  followUpAllowed: false },
        { id: `${t}-4`, name: 'Lost',        color: 'bg-red-500',     required: false, type: 'Standard', active: true, statusType: 'Lost', followUpAllowed: false },
      ],
    })
    setForm(INIT_PIPELINE_FORM)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Pipeline"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.name.trim()}>Create Pipeline</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Pipeline Name" required>
          <Input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Enterprise ILL 2026"
          />
        </FormField>
        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe when this pipeline is used…"
            rows={3}
          />
        </FormField>
        <p className="text-xs text-gray-400">
          A default set of stages will be created. You can customise them after creation.
        </p>
      </div>
    </Modal>
  )
}

// ── Edit Pipeline Modal ───────────────────────────────────────────────────────

function EditPipelineModal({ isOpen, onClose, pipeline, onSave }) {
  const [form, setForm] = useState({
    name: pipeline?.name ?? '',
    description: pipeline?.description ?? '',
  })

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSave() {
    if (!form.name.trim()) return
    onSave({ name: form.name.trim(), description: form.description })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Pipeline"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Pipeline Name" required>
          <Input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Pipeline name"
          />
        </FormField>
        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe when this pipeline is used…"
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ isOpen, onClose, pipeline, onConfirm, leadCount }) {
  if (leadCount > 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cannot Delete Pipeline"
        size="sm"
        footer={<Button onClick={onClose}>Got It</Button>}
      >
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Cannot delete — this pipeline has{' '}
              <strong className="text-red-600">{leadCount} active lead{leadCount > 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-sm text-gray-600">
              Deactivate it instead to stop new leads from being added while keeping existing leads visible.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Pipeline"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Delete Pipeline</Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Are you sure? This will permanently delete <strong>{pipeline?.name}</strong> and all its stage configurations.
        This action cannot be undone.
      </p>
    </Modal>
  )
}

// ── Stage Delete Modal ────────────────────────────────────────────────────────

function StageDeleteModal({ isOpen, onClose, stage, onConfirm, leadCount }) {
  if (leadCount > 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cannot Delete Stage"
        size="sm"
        footer={<Button onClick={onClose}>Got It</Button>}
      >
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Cannot delete — this stage has{' '}
              <strong className="text-red-600">{leadCount} active lead{leadCount !== 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-sm text-gray-600">
              Deactivate it instead to stop new leads from entering while keeping existing leads visible.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Stage?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Delete</Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        This will permanently delete <strong>'{stage?.name}'</strong>. This cannot be undone.
      </p>
    </Modal>
  )
}

// ── Pipeline Card ─────────────────────────────────────────────────────────────

function PipelineCard({ pipeline, onEdit, onDelete, onEditStages, onToggleActive }) {
  const [expanded, setExpanded] = useState(false)
  const hwStages = pipeline.stages.filter(s => s.type === 'Hardware Assignment')
  const isActive = pipeline.active !== false

  return (
    <div className={`rounded-xl border shadow-card hover:shadow-card-hover transition-all ${
      isActive
        ? 'bg-white border-surface-border'
        : 'bg-gray-50 border-gray-200 opacity-80'
    }`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`font-bold text-base truncate ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                {pipeline.name}
              </h3>
              {!isActive && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full border border-gray-300">
                  Inactive
                </span>
              )}
              {hwStages.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                  <HardDrive size={10} /> HW Stage
                </span>
              )}
            </div>
            {pipeline.description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{pipeline.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Layers size={12} className="text-brand-blue" />
                <strong className="text-gray-700">{pipeline.stages.length}</strong> stages
              </span>
              <span className="flex items-center gap-1">
                <Settings2 size={12} className="text-brand-orange" />
                <strong className="text-gray-700">{pipeline.activeLeads}</strong> active leads
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Active/Inactive toggle */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-surface-border bg-gray-50">
              <span className={`text-[10px] font-semibold ${isActive ? 'text-brand-blue' : 'text-gray-400'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <Toggle value={isActive} onChange={onToggleActive} />
            </div>

            <Button size="xs" variant="secondary" icon={<Settings2 size={12} />} onClick={onEditStages}>
              Stages
            </Button>
            <Button size="xs" variant="ghost" icon={<Edit3 size={12} />} onClick={() => onEdit(pipeline)} />
            <Button size="xs" variant="ghost" icon={<Trash2 size={12} />} onClick={() => onDelete(pipeline)} />
            <button
              onClick={() => setExpanded(p => !p)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-surface-border pt-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Stage Flow</p>
          <div className="flex items-center gap-1 flex-wrap">
            {pipeline.stages.map((stage, idx) => {
              const stgActive = stage.active !== false
              const stgStatus = stage.statusType ?? 'Open'
              return (
                <div key={stage.id} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-opacity ${
                    stgActive
                      ? 'bg-gray-50 border-surface-border text-gray-700'
                      : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    {stage.name}
                    {stage.required && (
                      <span className="text-brand-blue text-[9px] font-bold">*</span>
                    )}
                    {stage.type === 'Hardware Assignment' && (
                      <HardDrive size={10} className="text-pink-500" />
                    )}
                    {stgStatus === 'Won' && <Trophy size={9} className="text-emerald-500" />}
                    {stgStatus === 'Lost' && <XCircle size={9} className="text-red-400" />}
                    {!stgActive && <span className="text-[9px] text-gray-400">(off)</span>}
                  </div>
                  {idx < pipeline.stages.length - 1 && (
                    <span className="text-gray-300 text-xs">→</span>
                  )}
                </div>
              )
            })}
          </div>
          {pipeline.type === 'ILL' && (
            <p className="text-[10px] text-gray-400 mt-2">* Required stages cannot be skipped</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalesPipelines() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pipelines, setPipelines] = useState(getPipelines)
  const [leads, setLeads]         = useState(getLeads)
  const [editingPipeline, setEditingPipeline]   = useState(null)
  const [deletingPipeline, setDeletingPipeline] = useState(null)
  const [fieldManagerStage, setFieldManagerStage] = useState(null)

  useEffect(() => subscribePipelines(setPipelines), [])
  useEffect(() => subscribeLeads(setLeads), [])

  // Derive modal visibility from URL params
  const action      = searchParams.get('action')   // 'create'
  const editSlug    = searchParams.get('edit')      // 'residential' | 'enterprise' | pipeline-id
  const viewParam   = searchParams.get('view')      // 'stages'

  const showCreate         = action === 'create'
  const stageEditorId      = viewParam === 'stages' && editSlug ? (SLUG_TO_ID[editSlug] ?? editSlug) : null
  const stageEditorPipeline = stageEditorId ? (pipelines.find(p => p.id === stageEditorId) ?? null) : null

  // URL helpers
  function openCreate()           { setSearchParams({ action: 'create' }) }
  function openStages(pipeline)   { setSearchParams({ edit: PIPELINE_EDIT_SLUG[pipeline.id] ?? pipeline.id, view: 'stages' }) }
  function closeModal()           { setSearchParams({}) }

  const defaultPipelines = pipelines.filter(p => p.isDefault)
  const customPipelines = pipelines.filter(p => !p.isDefault)

  function getPipelineLeadCount(pipelineId) {
    const key = PIPELINE_LEAD_KEY_MAP[pipelineId]
    if (key) return leads.filter(l => l.pipeline === key).length
    return leads.filter(l => l.pipeline === pipelineId).length
  }

  function handleCreate(pipeline) { addPipeline(pipeline) }

  function handleSaveEdit(patch) {
    updatePipeline(editingPipeline.id, patch)
    setEditingPipeline(null)
  }

  function handleSaveStages(stages) {
    updatePipeline(stageEditorPipeline.id, { stages })
    closeModal()
  }

  function handleDelete() {
    deletePipeline(deletingPipeline.id)
    setDeletingPipeline(null)
  }

  function handleOpenDelete(pipeline) {
    setDeletingPipeline({ ...pipeline, _leadCount: getPipelineLeadCount(pipeline.id) })
  }

  function handleToggleActive(pipelineId, value) {
    updatePipeline(pipelineId, { active: value })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pipeline Builder</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your sales pipelines</p>
      </div>

      {/* Default Pipelines */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Default Pipelines</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{defaultPipelines.length}</span>
        </div>
        {defaultPipelines.map(pipeline => (
          <PipelineCard
            key={pipeline.id}
            pipeline={pipeline}
            onEdit={setEditingPipeline}
            onDelete={handleOpenDelete}
            onEditStages={() => openStages(pipeline)}
            onToggleActive={v => handleToggleActive(pipeline.id, v)}
          />
        ))}
      </div>

      {/* Custom Pipelines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Custom Pipelines</h2>
            {customPipelines.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{customPipelines.length}</span>
            )}
          </div>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={openCreate}>
            Create Pipeline
          </Button>
        </div>

        {customPipelines.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-surface-border px-6 py-12 text-center">
            <FolderOpen size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No custom pipelines yet.</p>
            <p className="text-xs text-gray-400 mt-1">Create one to get started.</p>
          </div>
        ) : (
          customPipelines.map(pipeline => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onEdit={setEditingPipeline}
              onDelete={handleOpenDelete}
              onEditStages={() => openStages(pipeline)}
              onToggleActive={v => handleToggleActive(pipeline.id, v)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <CreatePipelineModal
        isOpen={showCreate}
        onClose={closeModal}
        onCreate={handleCreate}
      />

      {editingPipeline && (
        <EditPipelineModal
          isOpen={!!editingPipeline}
          onClose={() => setEditingPipeline(null)}
          pipeline={editingPipeline}
          onSave={handleSaveEdit}
        />
      )}

      {stageEditorPipeline && (
        <PipelineEditorModal
          isOpen={!!stageEditorPipeline}
          onClose={closeModal}
          pipeline={stageEditorPipeline}
          onSave={handleSaveStages}
          onOpenFields={setFieldManagerStage}
          leads={leads}
        />
      )}

      {deletingPipeline && (
        <DeleteConfirmModal
          isOpen={!!deletingPipeline}
          onClose={() => setDeletingPipeline(null)}
          pipeline={deletingPipeline}
          onConfirm={handleDelete}
          leadCount={deletingPipeline._leadCount ?? 0}
        />
      )}

      {fieldManagerStage && (
        <StageFieldManagerModal
          isOpen={!!fieldManagerStage}
          onClose={() => setFieldManagerStage(null)}
          stage={fieldManagerStage}
        />
      )}
    </div>
  )
}
