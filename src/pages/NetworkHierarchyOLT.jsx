import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Server, ChevronDown, ChevronRight } from 'lucide-react'
import Badge from '../components/ui/Badge'
import hierarchyStore from '../data/hierarchyStore'

const OLT_TYPE_BADGE   = { GPON: 'blue', EPON: 'purple', 'XG-PON': 'teal' }
const OLT_STATUS_BADGE = { Active: 'green', Inactive: 'gray', Maintenance: 'yellow' }

const VP_CHIP = {
  Available: 'bg-emerald-100 text-emerald-700',
  'In-Use':  'bg-blue-100 text-blue-700',
  Vacant:    'bg-gray-100 text-gray-500',
}

function initSnap() {
  return {
    regions:      hierarchyStore.getRegions(),
    siteGroups:   hierarchyStore.getSiteGroups(),
    sites:        hierarchyStore.getSites(),
    locations:    hierarchyStore.getLocations(),
    olts:         hierarchyStore.getOLTs(),
    ponPorts:     hierarchyStore.getPONPorts(),
    splitters:    hierarchyStore.getSplitters(),
    fatBoxes:     hierarchyStore.getFATBoxes(),
    virtualPorts: hierarchyStore.getVirtualPorts(),
  }
}

export default function NetworkHierarchyOLT() {
  const { oltId } = useParams()
  const navigate = useNavigate()

  const [snap, setSnap] = useState(initSnap)
  const [expandedPorts, setExpandedPorts] = useState(new Set())

  useEffect(() => {
    return hierarchyStore.subscribe(setSnap)
  }, [])

  const olt       = snap.olts.find(o => o.id === oltId)
  const location  = olt      ? snap.locations.find(l  => l.id  === olt.locationId)      : null
  const site      = location ? snap.sites.find(s      => s.id  === location.siteId)      : null
  const siteGroup = site     ? snap.siteGroups.find(sg => sg.id === site.siteGroupId)    : null
  const region    = siteGroup? snap.regions.find(r    => r.id  === siteGroup.regionId)   : null

  const portRows = useMemo(() => {
    if (!olt) return []
    return snap.ponPorts
      .filter(p => p.oltId === oltId)
      .sort((a, b) => a.portNumber - b.portNumber)
      .map(ponPort => {
        const s1List   = snap.splitters.filter(s => s.ponPortId === ponPort.id && s.level === 'S1')
        const s2List   = snap.splitters.filter(s => s.ponPortId === ponPort.id && s.level === 'S2')
        const s2Ids    = s2List.map(s => s.id)
        const fatBoxes = snap.fatBoxes.filter(f => s2Ids.includes(f.splitterId))
        const fatIds   = fatBoxes.map(f => f.id)
        const vps      = snap.virtualPorts.filter(v => fatIds.includes(v.fatBoxId))
        return {
          ponPort,
          s1: s1List[0] ?? null,
          s2Count: s2List.length,
          fatBoxes,
          vps,
          totalVPs:     vps.length,
          availableVPs: vps.filter(v => v.status === 'Available').length,
          inUseVPs:     vps.filter(v => v.status === 'In-Use').length,
          vacantVPs:    vps.filter(v => v.status === 'Vacant').length,
        }
      })
  }, [snap, oltId, olt])

  const stats = useMemo(() => {
    const allVPs = portRows.flatMap(r => r.vps)
    return {
      totalPONPorts: portRows.length,
      totalVPs:      allVPs.length,
      available:     allVPs.filter(v => v.status === 'Available').length,
      inUse:         allVPs.filter(v => v.status === 'In-Use').length,
      vacant:        allVPs.filter(v => v.status === 'Vacant').length,
    }
  }, [portRows])

  function togglePort(portId) {
    setExpandedPorts(prev => {
      const next = new Set(prev)
      if (next.has(portId)) next.delete(portId)
      else next.add(portId)
      return next
    })
  }

  if (!olt) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <p className="text-sm text-gray-500">OLT not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <button
          onClick={() => navigate('/network/hierarchy')}
          className="hover:text-brand-blue transition-colors"
        >
          Network Hierarchy
        </button>
        {region && (
          <>
            <span>/</span>
            <button
              onClick={() => navigate('/network/hierarchy/' + region.id)}
              className="hover:text-brand-blue transition-colors"
            >
              {region.name}
            </button>
          </>
        )}
        {site && (
          <>
            <span>/</span>
            <button
              onClick={() => navigate('/network/hierarchy/sites/' + site.id)}
              className="hover:text-brand-blue transition-colors"
            >
              {site.name}
            </button>
          </>
        )}
        <span>/</span>
        <span className="text-gray-600 font-medium">{olt.name}</span>
      </div>

      <button
        onClick={() => navigate(site ? '/network/hierarchy/sites/' + site.id : '/network/hierarchy')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 -mt-2"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Server size={22} className="text-teal-500 shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900">{olt.name}</h1>
        <Badge color={OLT_TYPE_BADGE[olt.type] ?? 'gray'}>{olt.type}</Badge>
        <Badge color={OLT_STATUS_BADGE[olt.status] ?? 'gray'}>{olt.status}</Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'PON Ports',  value: stats.totalPONPorts, color: 'text-brand-blue'   },
          { label: 'Total VPs',  value: stats.totalVPs,      color: 'text-gray-700'     },
          { label: 'Available',  value: stats.available,     color: 'text-emerald-600'  },
          { label: 'In-Use',     value: stats.inUse,         color: 'text-blue-500'     },
          { label: 'Vacant',     value: stats.vacant,        color: 'text-gray-400'     },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* PON Port list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">PON Ports</h2>

        {portRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-surface-border py-10 text-center">
            <p className="text-xs text-gray-400">No PON ports found.</p>
          </div>
        ) : (
          portRows.map(row => {
            const expanded = expandedPorts.has(row.ponPort.id)
            return (
              <div key={row.ponPort.id} className="bg-white rounded-xl border border-surface-border overflow-hidden">
                {/* Port summary row — click to expand */}
                <button
                  onClick={() => togglePort(row.ponPort.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors text-left"
                >
                  {expanded
                    ? <ChevronDown  size={15} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={15} className="text-gray-400 shrink-0" />
                  }
                  <span className="font-semibold text-sm text-gray-800 w-20 shrink-0">
                    Port {String(row.ponPort.portNumber).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap flex-1 text-xs text-gray-500">
                    {row.s1 ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                        S1 {row.s1.ratio}
                      </span>
                    ) : (
                      <span className="text-gray-300">No S1</span>
                    )}
                    <span>{row.s2Count} S2</span>
                    <span>{row.fatBoxes.length} FAT</span>
                    {row.fatBoxes.length > 0 && (
                      <span className="text-gray-400">
                        {row.fatBoxes[0].name}
                        {row.fatBoxes.length > 1 ? ` +${row.fatBoxes.length - 1}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-3 text-xs">
                    <span className="text-emerald-600 font-medium">{row.availableVPs} avail</span>
                    <span className="text-blue-500 font-medium">{row.inUseVPs} in-use</span>
                    <span className="text-gray-400">{row.totalVPs} total</span>
                  </div>
                </button>

                {/* Expanded: Virtual Ports table */}
                {expanded && (
                  row.vps.length === 0 ? (
                    <div className="border-t border-surface-border px-4 py-6 text-center">
                      <p className="text-xs text-gray-400">No virtual ports under this PON port.</p>
                    </div>
                  ) : (
                    <div className="border-t border-surface-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/60 border-b border-surface-border">
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Port #</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">FAT Box</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                          {[...row.vps]
                            .sort((a, b) => a.portNumber - b.portNumber)
                            .map(vp => {
                              const fat = row.fatBoxes.find(f => f.id === vp.fatBoxId)
                              return (
                                <tr key={vp.id} className="hover:bg-gray-50/40">
                                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                                    #{String(vp.portNumber).padStart(2, '0')}
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-gray-600">{fat?.name ?? '—'}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VP_CHIP[vp.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                      {vp.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{vp.customerId ?? '—'}</td>
                                </tr>
                              )
                            })
                          }
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
