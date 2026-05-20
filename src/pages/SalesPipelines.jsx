import { useState, useRef } from 'react'
import {
  Plus, Edit3, Trash2, GripVertical, ChevronDown, ChevronUp,
  Layers, Settings2, HardDrive, AlertCircle, Check
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = ['B2C', 'B2B', 'ILL', 'Custom']

const TYPE_BADGE = { B2C: 'blue', B2B: 'navy', ILL: 'purple', Custom: 'orange' }

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

const INIT_PIPELINES = [
  {
    id: 'PL-001', name: 'B2C Residential', type: 'B2C', activeLeads: 12,
    description: 'Standard pipeline for residential internet subscribers',
    stages: [
      { id: 's1', name: 'New Inquiry',    color: 'bg-blue-500',    required: false, type: 'Standard' },
      { id: 's2', name: 'Contacted',      color: 'bg-cyan-500',    required: false, type: 'Standard' },
      { id: 's3', name: 'Follow-up',      color: 'bg-purple-500',  required: false, type: 'Standard' },
      { id: 's4', name: 'Site Survey',    color: 'bg-amber-500',   required: false, type: 'Standard' },
      { id: 's5', name: 'Quotation Sent', color: 'bg-orange-500',  required: false, type: 'Standard' },
      { id: 's6', name: 'Won',            color: 'bg-emerald-500', required: false, type: 'Standard' },
      { id: 's7', name: 'Lost',           color: 'bg-red-500',     required: false, type: 'Standard' },
    ],
  },
  {
    id: 'PL-002', name: 'B2B Corporate', type: 'B2B', activeLeads: 5,
    description: 'Enterprise pipeline with mandatory approval stages',
    stages: [
      { id: 'b1', name: 'Lead Received',       color: 'bg-blue-500',    required: true,  type: 'Standard' },
      { id: 'b2', name: 'Technical Survey',    color: 'bg-cyan-500',    required: true,  type: 'Standard' },
      { id: 'b3', name: 'Proposal Sent',       color: 'bg-purple-500',  required: true,  type: 'Standard' },
      { id: 'b4', name: 'Negotiation',         color: 'bg-amber-500',   required: true,  type: 'Standard' },
      { id: 'b5', name: 'Contract Signed',     color: 'bg-orange-500',  required: true,  type: 'Standard' },
      { id: 'b6', name: 'Hardware Assignment', color: 'bg-pink-500',    required: true,  type: 'Hardware Assignment' },
      { id: 'b7', name: 'Active',              color: 'bg-emerald-500', required: false, type: 'Standard' },
    ],
  },
  {
    id: 'PL-003', name: 'ILL Leased Line', type: 'ILL', activeLeads: 3,
    description: 'Internet Leased Line pipeline for enterprise connectivity',
    stages: [
      { id: 'i1', name: 'Inquiry',           color: 'bg-blue-500',    required: false, type: 'Standard' },
      { id: 'i2', name: 'Feasibility Check', color: 'bg-cyan-500',    required: true,  type: 'Standard' },
      { id: 'i3', name: 'Quote Approval',    color: 'bg-purple-500',  required: true,  type: 'Standard' },
      { id: 'i4', name: 'LOI Signed',        color: 'bg-amber-500',   required: true,  type: 'Standard' },
      { id: 'i5', name: 'Hardware Setup',    color: 'bg-pink-500',    required: true,  type: 'Hardware Assignment' },
      { id: 'i6', name: 'Commissioning',     color: 'bg-orange-500',  required: false, type: 'Standard' },
      { id: 'i7', name: 'Live',              color: 'bg-emerald-500', required: false, type: 'Standard' },
    ],
  },
]

const INIT_PIPELINE_FORM = { name: '', type: 'B2C', description: '' }

// ── Stage Row (drag-and-drop in editor) ──────────────────────────────────────

function StageRow({ stage, index, total, onMove, onUpdate, onRemove, showRequired }) {
  const [editing, setEditing] = useState(false)
  const dragRef = useRef(null)
  const [localName, setLocalName] = useState(stage.name)

  function commitName() {
    if (localName.trim()) onUpdate(stage.id, { name: localName.trim() })
    setEditing(false)
  }

  return (
    <div
      ref={dragRef}
      className="flex items-center gap-2 bg-white border border-surface-border rounded-lg px-3 py-2.5 group hover:border-brand-blue/40 transition-colors"
    >
      {/* Drag handle & order */}
      <div className="flex flex-col items-center gap-0.5 cursor-grab text-gray-300 hover:text-gray-500 shrink-0">
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

      {/* Color dot */}
      <div
        className={`w-3 h-3 rounded-full shrink-0 ${stage.color}`}
        title="Stage color"
      />

      {/* Stage name */}
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
            className="text-sm font-medium text-gray-800 hover:text-brand-blue text-left w-full truncate"
          >
            {stage.name}
          </button>
        )}
      </div>

      {/* Type badge */}
      {stage.type === 'Hardware Assignment' && (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full shrink-0">
          <HardDrive size={10} /> HW
        </span>
      )}

      {/* Controls */}
      <select
        value={stage.color}
        onChange={e => onUpdate(stage.id, { color: e.target.value })}
        className="text-xs border border-surface-border rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/30 shrink-0"
      >
        {STAGE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <select
        value={stage.type}
        onChange={e => onUpdate(stage.id, { type: e.target.value })}
        className="text-xs border border-surface-border rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/30 shrink-0"
      >
        {STAGE_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>

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

      <button
        onClick={() => onRemove(stage.id)}
        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ── Pipeline Editor Modal ────────────────────────────────────────────────────

function PipelineEditorModal({ isOpen, onClose, pipeline, onSave }) {
  const [stages, setStages] = useState(pipeline?.stages ?? [])
  const [newStageName, setNewStageName] = useState('')

  const showRequired = pipeline?.type === 'B2B' || pipeline?.type === 'ILL'

  function moveStage(fromIdx, toIdx) {
    setStages(prev => {
      const arr = [...prev]
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      return arr
    })
  }

  function updateStage(id, patch) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function removeStage(id) {
    setStages(prev => prev.filter(s => s.id !== id))
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
          <Button onClick={() => { onSave(stages); onClose() }}>Save Stages</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Reorder stages using the arrow buttons. Click a stage name to rename it inline.
          {showRequired && ' Toggle Required for mandatory stages.'}
        </p>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {stages.map((stage, idx) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={idx}
              total={stages.length}
              onMove={moveStage}
              onUpdate={updateStage}
              onRemove={removeStage}
              showRequired={showRequired}
            />
          ))}
          {stages.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">No stages yet. Add one below.</div>
          )}
        </div>

        {/* Add stage */}
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
    </Modal>
  )
}

const RESTRICTED_TYPES = ['B2C', 'B2B', 'ILL']

// ── Create Pipeline Modal ────────────────────────────────────────────────────

function CreatePipelineModal({ isOpen, onClose, onCreate, existingPipelines }) {
  const [form, setForm] = useState(INIT_PIPELINE_FORM)

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  const typeBlocked = RESTRICTED_TYPES.includes(form.type) &&
    existingPipelines.some(p => p.type === form.type)

  function handleCreate() {
    if (!form.name.trim() || typeBlocked) return
    onCreate({
      id: `PL-${Date.now()}`,
      name: form.name.trim(),
      type: form.type,
      description: form.description,
      activeLeads: 0,
      stages: [
        { id: `${Date.now()}-1`, name: 'New Inquiry', color: 'bg-blue-500',    required: false, type: 'Standard' },
        { id: `${Date.now()}-2`, name: 'In Progress', color: 'bg-amber-500',   required: false, type: 'Standard' },
        { id: `${Date.now()}-3`, name: 'Won',         color: 'bg-emerald-500', required: false, type: 'Standard' },
        { id: `${Date.now()}-4`, name: 'Lost',        color: 'bg-red-500',     required: false, type: 'Standard' },
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
          <Button onClick={handleCreate} disabled={!form.name.trim() || typeBlocked}>Create Pipeline</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Pipeline Name" required>
          <Input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Enterprise B2B 2026"
          />
        </FormField>
        <FormField label="Customer Type" required>
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe when this pipeline is used…"
            rows={3}
          />
        </FormField>
        {typeBlocked ? (
          <p className="flex items-center gap-1.5 text-sm text-brand-orange font-medium">
            <AlertCircle size={14} className="shrink-0" />
            A {form.type} pipeline already exists. Only Custom pipelines can have multiple entries.
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            A default set of stages will be created. You can customise them after creation.
          </p>
        )}
      </div>
    </Modal>
  )
}

// ── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ isOpen, onClose, pipeline, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Pipeline"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Delete</Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Are you sure you want to delete <strong>{pipeline?.name}</strong>? This action cannot be undone.
        {pipeline?.activeLeads > 0 && (
          <span className="block mt-2 text-brand-orange font-medium">
            Warning: This pipeline has {pipeline.activeLeads} active leads.
          </span>
        )}
      </p>
    </Modal>
  )
}

// ── Pipeline Card ────────────────────────────────────────────────────────────

function PipelineCard({ pipeline, onEdit, onDelete, onEditStages }) {
  const [expanded, setExpanded] = useState(false)
  const hwStages = pipeline.stages.filter(s => s.type === 'Hardware Assignment')

  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card hover:shadow-card-hover transition-shadow">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-base truncate">{pipeline.name}</h3>
              <Badge variant={TYPE_BADGE[pipeline.type] ?? 'gray'} size="sm">{pipeline.type}</Badge>
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
              {hwStages.length > 0 && (
                <span className="flex items-center gap-1 text-pink-600">
                  <HardDrive size={12} />
                  HW stage
                </span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button size="xs" variant="secondary" icon={<Settings2 size={12} />} onClick={() => onEditStages(pipeline)}>
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

      {/* Expanded stages preview */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-surface-border pt-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Stage Flow</p>
          <div className="flex items-center gap-1 flex-wrap">
            {pipeline.stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-surface-border text-xs font-medium text-gray-700">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  {stage.name}
                  {stage.required && (
                    <span className="text-brand-blue text-[9px] font-bold">*</span>
                  )}
                  {stage.type === 'Hardware Assignment' && (
                    <HardDrive size={10} className="text-pink-500" />
                  )}
                </div>
                {idx < pipeline.stages.length - 1 && (
                  <span className="text-gray-300 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
          {pipeline.type === 'B2B' && (
            <p className="text-[10px] text-gray-400 mt-2">* Required stages cannot be skipped</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SalesPipelines() {
  const [pipelines, setPipelines] = useState(INIT_PIPELINES)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState(null)
  const [stageEditorPipeline, setStageEditorPipeline] = useState(null)
  const [deletingPipeline, setDeletingPipeline] = useState(null)
  const [filterType, setFilterType] = useState('All')

  const displayed = filterType === 'All'
    ? pipelines
    : pipelines.filter(p => p.type === filterType)

  function handleCreate(pipeline) {
    setPipelines(prev => [...prev, pipeline])
  }

  function handleSaveStages(stages) {
    setPipelines(prev => prev.map(p =>
      p.id === stageEditorPipeline.id ? { ...p, stages } : p
    ))
    setStageEditorPipeline(null)
  }

  function handleDelete() {
    setPipelines(prev => prev.filter(p => p.id !== deletingPipeline.id))
    setDeletingPipeline(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pipeline Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure sales pipelines and their stages</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          Create Pipeline
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Pipelines', value: pipelines.length, color: 'text-gray-700', bg: 'bg-gray-100' },
          ...TYPE_OPTIONS.map(t => ({
            label: `${t} Pipelines`,
            value: pipelines.filter(p => p.type === t).length,
            color: `text-${t === 'B2C' ? 'brand-blue' : t === 'B2B' ? 'navy' : t === 'ILL' ? 'purple-600' : 'brand-orange'}`,
            bg: `bg-${t === 'B2C' ? 'brand-blue' : t === 'B2B' ? 'navy' : t === 'ILL' ? 'purple' : 'brand-orange'}/10`,
            maxOne: RESTRICTED_TYPES.includes(t),
          })),
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3">
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
            {s.maxOne && <p className="text-[10px] text-gray-400 mt-0.5">Max: 1</p>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['All', ...TYPE_OPTIONS].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filterType === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              filterType === t ? 'bg-brand-blue/10 text-brand-blue' : 'bg-gray-200 text-gray-500'
            }`}>
              {t === 'All' ? pipelines.length : pipelines.filter(p => p.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Pipeline cards */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Layers size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No pipelines found</p>
            <p className="text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          displayed.map(pipeline => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onEdit={p => { setEditingPipeline(p); }}
              onDelete={setDeletingPipeline}
              onEditStages={setStageEditorPipeline}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <CreatePipelineModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        existingPipelines={pipelines}
      />

      {stageEditorPipeline && (
        <PipelineEditorModal
          isOpen={!!stageEditorPipeline}
          onClose={() => setStageEditorPipeline(null)}
          pipeline={stageEditorPipeline}
          onSave={handleSaveStages}
        />
      )}

      {deletingPipeline && (
        <DeleteConfirmModal
          isOpen={!!deletingPipeline}
          onClose={() => setDeletingPipeline(null)}
          pipeline={deletingPipeline}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
