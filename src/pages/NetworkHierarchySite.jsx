import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, MapPin, Server, Zap, Cpu } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import hierarchyStore, { OLT_TYPES, OLT_STATUSES } from '../data/hierarchyStore'

const STATUS_BADGE = {
  Active: 'green', Inactive: 'gray', 'Under Construction': 'yellow', Decommissioned: 'red',
}
const OLT_STATUS_BADGE = { Active: 'green', Inactive: 'gray', Maintenance: 'yellow' }

const VP_CHIP = {
  Available: 'bg-emerald-100 text-emerald-700',
  'In-Use':  'bg-blue-100 text-blue-700',
  Vacant:    'bg-gray-100 text-gray-500',
}

const TABS = ['Locations & OLTs', 'Port Map', 'Details']

const LOC_DEFAULTS  = { name: '', address: '', latitude: '', longitude: '' }
const OLT_DEFAULTS  = { name: '', type: 'GPON', portCount: 8, status: 'Active' }

export default function NetworkHierarchySite() {
  const { siteId } = useParams()
  const navigate   = useNavigate()

  // ── Store subscription ──────────────────────────────────────────────────────
  const [snap, setSnap] = useState(() => ({
    regions:      hierarchyStore.getRegions(),
    siteGroups:   hierarchyStore.getSiteGroups(),
    sites:        hierarchyStore.getSites(),
    locations:    hierarchyStore.getLocations(),
    olts:         hierarchyStore.getOLTs(),
    ponPorts:     hierarchyStore.getPONPorts(),
    splitters:    hierarchyStore.getSplitters(),
    fatBoxes:     hierarchyStore.getFATBoxes(),
    virtualPorts: hierarchyStore.getVirtualPorts(),
  }))

  useEffect(() => hierarchyStore.subscribe(setSnap), [])

  const { regions, siteGroups, sites, locations, olts, ponPorts, splitters, fatBoxes, virtualPorts } = snap

  // ── Derived hierarchy lookups ───────────────────────────────────────────────
  const site      = sites.find(s => s.id === siteId)
  const siteGroup = site ? siteGroups.find(sg => sg.id === site.siteGroupId) : null
  const region    = siteGroup ? regions.find(r => r.id === siteGroup.regionId) : null

  const siteLocations = locations.filter(l => l.siteId === siteId)
  const siteLocIds    = siteLocations.map(l => l.id)
  const siteOLTs      = olts.filter(o => siteLocIds.includes(o.locationId))
  const siteOLTIds    = siteOLTs.map(o => o.id)

  // Stats
  const sitePonPorts     = ponPorts.filter(p => siteOLTIds.includes(p.oltId))
  const sitePonIds       = sitePonPorts.map(p => p.id)
  const s1Ids            = splitters.filter(s => s.level === 'S1' && sitePonIds.includes(s.ponPortId)).map(s => s.id)
  const s2Ids            = splitters.filter(s => s.level === 'S2' && s1Ids.includes(s.parentSplitterId)).map(s => s.id)
  const allSplitterIds   = [...s1Ids, ...s2Ids]
  const siteFATBoxes     = fatBoxes.filter(f => allSplitterIds.includes(f.splitterId))
  const siteFATIds       = siteFATBoxes.map(f => f.id)
  const siteVPs          = virtualPorts.filter(v => siteFATIds.includes(v.fatBoxId))
  const availableCount   = siteVPs.filter(v => v.status === 'Available').length
  const inUseCount       = siteVPs.filter(v => v.status === 'In-Use').length

  // ── Port Map: flatten with context labels ───────────────────────────────────
  const portMapRows = useMemo(() => {
    const rows = []
    for (const loc of siteLocations) {
      const locOLTs = olts.filter(o => o.locationId === loc.id)
      for (const olt of locOLTs) {
        const oltPons = ponPorts.filter(p => p.oltId === olt.id)
        for (const ponPort of oltPons) {
          const s1List = splitters.filter(s => s.level === 'S1' && s.ponPortId === ponPort.id)
          for (const s1 of s1List) {
            const s2List = splitters.filter(s => s.level === 'S2' && s.parentSplitterId === s1.id)
            for (const s2 of s2List) {
              const fats = fatBoxes.filter(f => f.splitterId === s2.id)
              for (const fat of fats) {
                const vps = virtualPorts.filter(v => v.fatBoxId === fat.id)
                for (const vp of vps) {
                  rows.push({
                    ...vp,
                    fatBoxName: fat.name,
                    oltName:    olt.name,
                    locName:    loc.name,
                  })
                }
              }
            }
          }
        }
      }
    }
    return rows
  }, [siteLocations, olts, ponPorts, splitters, fatBoxes, virtualPorts])

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0)

  // ── Add Location modal ──────────────────────────────────────────────────────
  const [showAddLoc, setShowAddLoc] = useState(false)
  const [locForm, setLocForm]       = useState(LOC_DEFAULTS)
  const [locErrors, setLocErrors]   = useState({})

  function openAddLoc() { setLocForm(LOC_DEFAULTS); setLocErrors({}); setShowAddLoc(true) }
  function closeAddLoc() { setShowAddLoc(false) }

  function handleSaveLoc() {
    if (!locForm.name.trim()) { setLocErrors({ name: 'Name is required' }); return }
    const payload = { name: locForm.name.trim(), siteId }
    if (locForm.address.trim())   payload.address   = locForm.address.trim()
    if (locForm.latitude.trim())  payload.latitude  = locForm.latitude.trim()
    if (locForm.longitude.trim()) payload.longitude = locForm.longitude.trim()
    hierarchyStore.saveLocation(payload)
    setShowAddLoc(false)
  }

  // ── Add OLT modal ───────────────────────────────────────────────────────────
  const [showAddOLT, setShowAddOLT] = useState(false)
  const [addOLTLocId, setAddOLTLocId] = useState('')
  const [oltForm, setOltForm]         = useState(OLT_DEFAULTS)
  const [oltErrors, setOltErrors]     = useState({})

  function openAddOLT(locationId) {
    setAddOLTLocId(locationId)
    setOltForm(OLT_DEFAULTS)
    setOltErrors({})
    setShowAddOLT(true)
  }
  function closeAddOLT() { setShowAddOLT(false) }

  function handleSaveOLT() {
    if (!oltForm.name.trim()) { setOltErrors({ name: 'Name is required' }); return }
    hierarchyStore.saveOLT({
      name:       oltForm.name.trim(),
      type:       oltForm.type,
      portCount:  Number(oltForm.portCount),
      status:     oltForm.status,
      locationId: addOLTLocId,
    })
    setShowAddOLT(false)
  }

  // ── 404 fallback ─────────────────────────────────────────────────────────────
  if (!site) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/network/hierarchy')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <p className="text-sm text-gray-500">Site not found.</p>
      </div>
    )
  }

  const backTo = region ? `/network/hierarchy/${region.id}` : '/network/hierarchy'

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <button onClick={() => navigate('/network/hierarchy')} className="hover:text-brand-blue transition-colors">
          Network Hierarchy
        </button>
        {region && (
          <>
            <span>/</span>
            <button onClick={() => navigate(`/network/hierarchy/${region.id}`)} className="hover:text-brand-blue transition-colors">
              {region.name}
            </button>
          </>
        )}
        <span>/</span>
        <span className="text-gray-600 font-medium">{site.name}</span>
      </div>

      <button onClick={() => navigate(backTo)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 -mt-2">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Page title */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          <Badge color={STATUS_BADGE[site.status] ?? 'gray'}>{site.status}</Badge>
        </div>
        {site.address && (
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <MapPin size={13} className="text-gray-400 shrink-0" /> {site.address}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Locations',       value: siteLocations.length, color: 'bg-brand-blue', icon: Cpu   },
          { label: 'OLTs',            value: siteOLTs.length,      color: 'bg-teal-500',   icon: Server },
          { label: 'Available Ports', value: availableCount,        color: 'bg-emerald-600',icon: Zap   },
          { label: 'In-Use Ports',    value: inUseCount,            color: 'bg-blue-500',   icon: Zap   },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-surface-border p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={15} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-surface-border gap-1">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === i
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Locations & OLTs ─────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={openAddLoc}>Add Location</Button>
          </div>

          {siteLocations.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border py-14 text-center">
              <Server size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No locations yet</p>
            </div>
          ) : siteLocations.map(loc => {
            const locOLTs = olts.filter(o => o.locationId === loc.id)
            return (
              <div key={loc.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Cpu size={14} className="text-teal-500 shrink-0" />
                    {loc.name}
                    <span className="text-[10px] font-mono text-gray-400">{loc.id}</span>
                  </h3>
                  <Button size="xs" icon={<Plus size={12} />} onClick={() => openAddOLT(loc.id)}>
                    Add OLT
                  </Button>
                </div>

                {locOLTs.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg py-5 text-center border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No OLTs in this location</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border bg-gray-50/60">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ports</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-2.5 w-28 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {locOLTs.map(olt => {
                          const oltPorts = ponPorts.filter(p => p.oltId === olt.id)
                          const usedPorts = oltPorts.filter(p => p.status === 'In-Use').length
                          const pct = olt.portCount > 0 ? Math.round((usedPorts / olt.portCount) * 100) : 0
                          return (
                            <tr key={olt.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-800">{olt.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{olt.id}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-blue/10 text-brand-blue font-mono">
                                  {olt.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 min-w-[120px]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">{usedPorts}/{olt.portCount}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-emerald-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge color={OLT_STATUS_BADGE[olt.status] ?? 'gray'}>{olt.status}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => navigate(`/network/hierarchy/olts/${olt.id}`)}
                                  className="text-xs font-medium text-brand-blue hover:underline"
                                >
                                  View Ports →
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB 2: Port Map ──────────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div>
          {portMapRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border py-14 text-center">
              <Zap size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No virtual ports found for this site</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">FAT Box</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Port #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">OLT</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {portMapRows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-xs text-gray-800">{row.fatBoxName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{row.fatBoxId}</p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-gray-700">
                        #{String(row.portNumber).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{row.oltName}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{row.locName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${VP_CHIP[row.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">
                        {row.customerId ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Details ───────────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="bg-white rounded-xl border border-surface-border divide-y divide-surface-border">
          {[
            { label: 'Site ID',        value: site.id },
            { label: 'Name',           value: site.name },
            { label: 'Address',        value: site.address || '—' },
            { label: 'Coordinates',    value: site.geo ? `${site.geo.lat}, ${site.geo.lng}` : '—' },
            { label: 'Linked Project', value: site.siteProjectId || '—' },
            { label: 'Status',         value: site.status },
            { label: 'Created',        value: site.createdAt || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-6 px-5 py-3">
              <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Location modal */}
      {showAddLoc && (
        <Modal title="Add Location" onClose={closeAddLoc} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                value={locForm.name}
                onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rooftop Server Room"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              {locErrors.name && <p className="text-xs text-red-500 mt-1">{locErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
              <input
                value={locForm.address}
                onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Block A, 3rd Floor"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Latitude</label>
                <input
                  value={locForm.latitude}
                  onChange={e => setLocForm(f => ({ ...f, latitude: e.target.value }))}
                  placeholder="e.g. 28.4744"
                  className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Longitude</label>
                <input
                  value={locForm.longitude}
                  onChange={e => setLocForm(f => ({ ...f, longitude: e.target.value }))}
                  placeholder="e.g. 77.5040"
                  className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={closeAddLoc}>Cancel</Button>
              <Button size="sm" onClick={handleSaveLoc}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add OLT modal */}
      {showAddOLT && (
        <Modal title="Add OLT" onClose={closeAddOLT} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                value={oltForm.name}
                onChange={e => setOltForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. OLT-GBN-02"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              {oltErrors.name && <p className="text-xs text-red-500 mt-1">{oltErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                <select
                  value={oltForm.type}
                  onChange={e => setOltForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {OLT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Port Count</label>
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={oltForm.portCount}
                  onChange={e => setOltForm(f => ({ ...f, portCount: e.target.value }))}
                  className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={oltForm.status}
                onChange={e => setOltForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {OLT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              PON ports will be auto-generated from the port count.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={closeAddOLT}>Cancel</Button>
              <Button size="sm" onClick={handleSaveOLT}>Save & Generate Ports</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
