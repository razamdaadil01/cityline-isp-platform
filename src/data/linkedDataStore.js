// Linked data source registry — resolves options for linked dropdown fields

import { getAreas } from './areaMappingStore'
import { getPipelines } from './pipelineStore'

const STAFF = ['Arjun Kumar', 'Preethi Nair', 'Suresh Babu', 'Anita Sharma']

const ENGINEERS = ['Ravi Technician', 'Kumar Installer', 'Sunil Networks', 'Dinesh Fiber']

const PLANS = [
  '50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra', '1 Gbps Enterprise',
]

export const DATA_SOURCE_GROUPS = [
  {
    group: 'Area Mapping',
    sources: [
      { key: 'area.states',        label: 'All States'         },
      { key: 'area.districts',     label: 'All Districts'      },
      { key: 'area.areas',         label: 'All Areas'          },
      { key: 'area.localities',    label: 'All Localities'     },
      { key: 'area.subLocalities', label: 'All Sub Localities' },
    ],
  },
  {
    group: 'Team & Users',
    sources: [
      { key: 'team.all',       label: 'All Team Members'      },
      { key: 'team.sales',     label: 'Sales Executives only' },
      { key: 'team.engineers', label: 'Engineers only'        },
    ],
  },
  {
    group: 'Packages',
    sources: [
      { key: 'packages.all', label: 'All Internet Plans' },
    ],
  },
  {
    group: 'Pipeline',
    sources: [
      { key: 'pipelines.all',    label: 'All Pipelines'                 },
      { key: 'pipelines.stages', label: 'All Stages (current pipeline)' },
    ],
  },
]

// Flat key → label map for quick lookup
export const DATA_SOURCE_MAP = Object.fromEntries(
  DATA_SOURCE_GROUPS.flatMap(g => g.sources.map(s => [s.key, s.label]))
)

// Cascade chain: child source → parent source key
export const CASCADE_CHAIN = {
  'area.districts':    'area.states',
  'area.areas':        'area.districts',
  'area.localities':   'area.areas',
  'area.subLocalities':'area.localities',
}

export function getLinkedSourceLabel(key) {
  return DATA_SOURCE_MAP[key] ?? key
}

export function resolveOptions(sourceKey, parentValue = null) {
  const areas = getAreas()

  switch (sourceKey) {
    case 'area.states':
      return [...new Set(areas.map(a => a.state))].sort()

    case 'area.districts':
      if (parentValue) return [...new Set(areas.filter(a => a.state === parentValue).map(a => a.district))].sort()
      return [...new Set(areas.map(a => a.district))].sort()

    case 'area.areas':
      if (parentValue) return [...new Set(areas.filter(a => a.district === parentValue).map(a => a.area))].sort()
      return [...new Set(areas.map(a => a.area))].sort()

    case 'area.localities':
      if (parentValue) return [...new Set(areas.filter(a => a.area === parentValue).map(a => a.locality))].sort()
      return [...new Set(areas.map(a => a.locality))].sort()

    case 'area.subLocalities':
      if (parentValue) return [...new Set(areas.filter(a => a.locality === parentValue).map(a => a.subLocality))].sort()
      return [...new Set(areas.map(a => a.subLocality))].sort()

    case 'team.all':
      return [...STAFF, ...ENGINEERS]

    case 'team.sales':
      return [...STAFF]

    case 'team.engineers':
      return [...ENGINEERS]

    case 'packages.all':
      return [...PLANS]

    case 'pipelines.all':
      return getPipelines().map(p => p.name)

    case 'pipelines.stages':
      return getPipelines().flatMap(p => p.stages.map(s => s.name))

    default:
      return []
  }
}

// Walk the fields array and set cascadeFrom on each linked field
// based on the nearest preceding field whose linkedSource is the cascade parent.
export function applyCascadeDetection(fields) {
  return fields.map((field, idx) => {
    if (!field.linkedSource) return { ...field, cascadeFrom: null }

    const parentSourceKey = CASCADE_CHAIN[field.linkedSource]
    if (!parentSourceKey) return { ...field, cascadeFrom: null }

    for (let i = idx - 1; i >= 0; i--) {
      if (fields[i].linkedSource === parentSourceKey) {
        const cascadeEnabled = field.cascadeEnabled !== false
        return { ...field, cascadeFrom: cascadeEnabled ? fields[i].id : null }
      }
    }

    return { ...field, cascadeFrom: null }
  })
}
