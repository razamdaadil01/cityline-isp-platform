import { setFormModule, removeFormModule } from './customFormStore'

const INIT_PIPELINES = [
  {
    id: 'PL-001', name: 'Residential', activeLeads: 12,
    description: 'Standard pipeline for residential customers',
    isDefault: true, active: true,
    stages: [
      { id: 's1', name: 'New Inquiry',          color: 'bg-blue-500',    required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's2', name: 'Contacted',            color: 'bg-cyan-500',    required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's3', name: 'Follow-up',            color: 'bg-purple-500',  required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's4', name: 'Site Survey',          color: 'bg-amber-500',   required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's5', name: 'Quotation Sent',       color: 'bg-orange-500',  required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's5b', name: 'Negotiation',         color: 'bg-pink-500',    required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's5d', name: 'Installation Visit', color: 'bg-purple-600', required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 's6', name: 'Won',                  color: 'bg-emerald-500', required: false, type: 'Standard',           active: true, statusType: 'Won',  followUpAllowed: false },
      { id: 's7', name: 'Lost',                 color: 'bg-red-500',     required: false, type: 'Standard',           active: true, statusType: 'Lost', followUpAllowed: false },
    ],
  },
  {
    id: 'PL-002', name: 'Corporate', activeLeads: 5,
    description: 'Standard pipeline for business customers',
    isDefault: true, active: true,
    stages: [
      { id: 'b1',  name: 'New Inquiry',          color: 'bg-blue-500',    required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b1b', name: 'Meeting Scheduled',    color: 'bg-sky-500',     required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b2',  name: 'Requirement Analysis', color: 'bg-indigo-500',  required: true,  type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b3',  name: 'Technical Feasibility',color: 'bg-teal-500',    required: true,  type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b4',  name: 'Commercial Proposal',  color: 'bg-amber-500',   required: true,  type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b4b', name: 'Negotiation',          color: 'bg-orange-500',  required: false, type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b5',  name: 'Legal/Agreement',      color: 'bg-slate-500',   required: true,  type: 'Standard',           active: true, statusType: 'Open', followUpAllowed: true  },
      { id: 'b7',  name: 'Won',                  color: 'bg-emerald-500', required: false, type: 'Standard',           active: true, statusType: 'Won',  followUpAllowed: false },
      { id: 'b8',  name: 'Lost',                 color: 'bg-red-500',     required: false, type: 'Standard',           active: true, statusType: 'Lost', followUpAllowed: false },
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
