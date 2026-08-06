import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers2 } from 'lucide-react'
import { getPipelines } from '../data/pipelineStore'
import { getStageFields } from '../data/stageFieldsStore'

const PIPELINES = getPipelines()

const STAGE_DOT = {
  'bg-blue-500':    'bg-blue-500',
  'bg-blue-600':    'bg-blue-600',
  'bg-purple-500':  'bg-purple-500',
  'bg-amber-500':   'bg-amber-500',
  'bg-orange-500':  'bg-orange-500',
  'bg-teal-500':    'bg-teal-500',
  'bg-emerald-500': 'bg-emerald-500',
  'bg-red-500':     'bg-red-500',
}

function RequiredBadge({ field }) {
  if (field.conditionalOn) {
    return (
      <span className="inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
        Conditional
      </span>
    )
  }
  if (field.required) {
    return (
      <span className="inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        Required
      </span>
    )
  }
  return (
    <span className="inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      Optional
    </span>
  )
}

function TypeChip({ type }) {
  const colors = {
    'Text':     'bg-purple-100 text-purple-700',
    'Textarea': 'bg-indigo-100 text-indigo-700',
    'Dropdown': 'bg-blue-100 text-blue-700',
    'Radio':    'bg-blue-100 text-blue-700',
    'Date':     'bg-teal-100 text-teal-700',
    'Time':     'bg-teal-100 text-teal-700',
    'Number':   'bg-orange-100 text-orange-700',
    'Toggle':   'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium ${colors[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  )
}

function StageSection({ stage }) {
  const fields = getStageFields(stage.id)
  const dotClass = STAGE_DOT[stage.color] ?? 'bg-gray-400'

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      {/* Stage header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50/80 border-b border-surface-border">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-sm font-semibold text-gray-800">{stage.name}</span>
      </div>

      {fields.length === 0 ? (
        <div className="px-4 py-4 text-xs text-gray-400 italic">
          No additional fields for this stage.
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_120px] px-4 py-2.5 border-b border-surface-border bg-white">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Field Name</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Required</span>
          </div>
          {/* Table rows */}
          <div className="divide-y divide-surface-border bg-white">
            {fields.map(f => (
              <div key={f.id} className="grid grid-cols-[1fr_120px_120px] px-4 py-3 items-center hover:bg-gray-50/40">
                <span className="text-sm text-gray-700">{f.label}</span>
                <TypeChip type={f.type} />
                <RequiredBadge field={f} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SalesStageFields() {
  const navigate = useNavigate()
  const [activePipeline, setActivePipeline] = useState(PIPELINES[0]?.id ?? '')

  const pipeline = PIPELINES.find(p => p.id === activePipeline)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stage Fields</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fields configured for each pipeline stage</p>
        </div>
      </div>

      {/* Pipeline selector tabs */}
      <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 w-fit">
        {PIPELINES.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePipeline(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePipeline === p.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Stage list */}
      {pipeline ? (
        <div className="space-y-4">
          {pipeline.stages.map(stage => (
            <StageSection key={stage.id} stage={stage} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <Layers2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No pipeline selected</p>
        </div>
      )}
    </div>
  )
}
