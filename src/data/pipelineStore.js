import { setFormModule, removeFormModule } from './customFormStore'

const INIT_PIPELINES = [
  {
    id: 'PL-001', name: 'Residential', activeLeads: 12,
    description: 'Standard pipeline for residential customers',
    isDefault: true,
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
    id: 'PL-002', name: 'Corporate', activeLeads: 5,
    description: 'Standard pipeline for business customers',
    isDefault: true,
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
]

let _pipelines = JSON.parse(JSON.stringify(INIT_PIPELINES))
const _listeners = []

function notify() { _listeners.forEach(fn => fn(_pipelines)) }

export function getPipelines() { return _pipelines }

export function addPipeline(pipeline) {
  _pipelines = [..._pipelines, pipeline]
  notify()
  if (!pipeline.isDefault) setFormModule(pipeline.id, [])
}

export function updatePipeline(id, patch) {
  _pipelines = _pipelines.map(p => p.id === id ? { ...p, ...patch } : p)
  notify()
}

export function deletePipeline(id) {
  const pipeline = _pipelines.find(p => p.id === id)
  _pipelines = _pipelines.filter(p => p.id !== id)
  notify()
  if (pipeline && !pipeline.isDefault) removeFormModule(pipeline.id)
}

export function subscribePipelines(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
