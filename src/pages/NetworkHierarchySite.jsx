import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, MapPin, Server, Zap, Cpu } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import hierarchyStore, { OLT_TYPES, OLT_PORT_COUNTS, OLT_STATUSES } from '../data/hierarchyStore'

const STATUS_BADGE = {
  Active: 'green', Inactive: 'gray', 'Under Construction': 'yellow', Decommissioned: 'red',
}
const OLT_STATUS_BADGE = { Active: 'green', Inactive: 'gray', Maintenance: 'yellow' }

const VP_STATUS_STYLE = {
  Available: 'bg-emerald-100 text-emerald-700',
  'In-Use':  'bg-blue-100 text-blue-700',
  Vacant:    'bg-gray-100 text-gray-500',
}

const TABS = ['Locations & OLTs', 'Port Map', 'Details']

const LOC_FORM_DEFAULTS  = { name: '', description: '' }
const OLT_FORM_DEFAULTS  = { name: '', type: 'GPON', portCount: 8, model: '', serialNumber: '', locationId: '' }

export default function NetworkHierarchySite() {
  const { siteId } = useParams()
  const navigate = useNavigate()

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

  const { regions, siteGroups, sites, locations, olts, ponPorts, fatBoxes, virtualPorts } = snap

  const site       = sites.find(s => s.id === siteId)
  const siteGroup  = site ? siteGroups.find(sg => sg.id === site.siteGroupId) : null
  const region     = siteGroup ? regions.find(r => r.id === siteGroup.regionId) : null

  const siteLocations = locations.filter(l => l.siteId === siteId)
  const siteLocIds    = siteLocations.map(l => l.id)
  const siteOLTs      = olts.filter(o => siteLocIds.includes(o.locationId))

  // Port Map data: all VPs under this site
  const siteOLTIds   = siteOLTs.map(o => o.id)
  const sitePonPorts = ponPorts.filter(p => siteOLTIds.includes(p.oltId))
  const sitePonIds   = sitePonPorts.map(p => p.id)
  // S1 splitters under these PON ports
  const s1Ids = snap.splitters.filter(s => s.level === 'S1' && sitePonIds.includes(s.ponPortId)).map(s => s.id)
  // S2 splitters under these S1s
  const s2Ids = snap.splitters.filter(s => s.level === 'S2' && s1Ids.includes(s.parentSplitterId)).map(s => s.id)
  const allSplitterIds = [...s1Ids, ...s2Ids]
  const siteFATBoxes  = fatBoxes.filter(f => allSplitterIds.includes(f.splitterId))
  const siteFATIds    = siteFATBoxes.map(f => f.id)
  const siteVPs       = virtualPorts.filter(v => siteFATIds.includes(v.fatBoxId))

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0)

  // ── Add Location modal ─────────────────────────────────────────────────────
  const [showAddLoc, setShowAddLoc] = useState(false)
  const [locForm, setLocForm]       = useState(LOC_FORM_DEFAULTS)
  const [locErrors, setLocErrors]   = useState({})

  function openAddLoc() { setLocForm(LOC_FORM_DEFAULTS); setLocErrors({}); setShowAddLoc(true) }
  function closeAddLoc() { setShowAddLoc(false) }

  function handleSaveLoc() {
    if (!locForm.name.trim()) { setLocErrors({ name: 'Name is required' }); return }
    hierarchyStore.saveLocation({ name: locForm.name.trim(), description: locForm.description.trim(), siteId })
    setShowAddLoc(false)
  }

  // ── Add OLT modal ──────────────────────────────────────────────────────────
  const [showAddOLT, setShowAddOLT]         = useState(false)
  const [oltLocId, setOltLocId]             = useState('')
  const [oltForm, setOltForm]               = useState(OLT_FORM_DEFAULTS)
  const [oltErrors, setOltErrors]           = useState({})

  function openAddOLT(locationId) {
    setOltLocId(locationId)
    setOltForm({ ...OLT_FORM_DEFAULTS, locationId })
    setOltErrors({})
    setShowAddOLT(true)
  }
  function closeAddOLT() { setShowAddOLT(false) }

  function validateOLT() {
    const e = {}
    if (!oltForm.name.trim()) e.name = 'Name is required'
    if (!oltForm.locationId)  e.locationId = 'Location is required'
    return e
  }

  function handleSaveOLT() {
    const e = validateOLT()
    if (Object.keys(e).length) { setOltErrors(e); return }
    hierarchyStore.saveOLT({
      name:         oltForm.name.trim(),
      type:         oltForm.type,
      portCount:    Number(oltForm.portCount),
      model:        oltForm.model.trim(),
      serialNumber: oltForm.serialNumber.trim(),
      locationId:   oltForm.locationId,
      status:       'Active',
    })
    setShowAddOLT(false)
  }

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
        {siteGroup && (
          <>
            <span>/</span>
            <span className="text-gray-500">{siteGroup.name}</span>
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
            <MapPin size={13} className="text-gray-400 shrink-0" />
            {site.address}
          </p>
        )}
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

      {/* ── TAB 1: Locations & OLTs ──────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={openAddLoc}>Add Location</Button>
          </div>

          {siteLocations.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border py-14 text-center">
              <Server size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No locations yet — add one to start placing OLTs</p>
            </div>
          ) : (
            siteLocations.map(loc => {
              const locOLTs = olts.filter(o => o.locationId === loc.id)
              return (
                <div key={loc.id} className="space-y-3">
                  {/* Location header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Cpu size={14} className="text-teal-500" />
                        {loc.name}
                        <span className="text-[10px] font-mono text-gray-400">{loc.id}</span>
                      </h3>
                      {loc.description && (
                        <p className="text-xs text-gray-500 mt-0.5 ml-5">{loc.description}</p>
                      )}
                    </div>
                    <Button size="xs" icon={<Plus size={12} />} onClick={() => openAddOLT(loc.id)}>
                      Add OLT
                    </Button>
                  </div>

                  {locOLTs.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg py-6 text-center border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400">No OLTs in this location</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-border bg-gray-50/60">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">OLT Name</th>
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
                            return (
                              <tr key={olt.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-800">{olt.name}</p>
                                  {olt.model && <p className="text-xs text-gray-400">{olt.model}</p>}
                                  <p className="text-[10px] text-gray-400 font-mono">{olt.id}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-blue/10 text-brand-blue font-mono">
                                    {olt.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-700">
                                  {usedPorts}/{olt.portCount} used
                                </td>
                                <td className="px-4 py-3">
                                  <Badge color={OLT_STATUS_BADGE[olt.status] ?? 'gray'}>{olt.status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => setActiveTab(1)}
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
            })
          )}
        </div>
      )}

      {/* ── TAB 2: Port Map ───────────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div>
          {siteVPs.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border py-14 text-center">
              <Zap size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No virtual ports found — add OLTs and FAT boxes first</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">FAT Box</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Port #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {siteVPs.map(vp => {
                    const fat = siteFATBoxes.find(f => f.id === vp.fatBoxId)
                    return (
                      <tr key={vp.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800 text-xs">{fat?.name ?? vp.fatBoxId}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{vp.fatBoxId}</p>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-mono text-gray-700">
                          #{String(vp.portNumber).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${VP_STATUS_STYLE[vp.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {vp.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">
                          {vp.customerId ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Details ────────────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="bg-white rounded-xl border border-surface-border divide-y divide-surface-border">
          {[
            { label: 'Site ID',        value: site.id },
            { label: 'Name',           value: site.name },
            { label: 'Address',        value: site.address || '—' },
            { label: 'Coordinates',    value: site.geo ? `${site.geo.lat}, ${site.geo.lng}` : '—' },
            { label: 'Site Group',     value: siteGroup ? `${siteGroup.name} (${siteGroup.id})` : '—' },
            { label: 'Region',         value: region ? `${region.name} (${region.code})` : '—' },
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={locForm.description}
                onChange={e => setLocForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional notes…"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
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
        <Modal title="Add OLT" onClose={closeAddOLT} size="md">
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

            <div className="grid grid-cols-2 gap-4">
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
                <select
                  value={oltForm.portCount}
                  onChange={e => setOltForm(f => ({ ...f, portCount: Number(e.target.value) }))}
                  className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {OLT_PORT_COUNTS.map(c => <option key={c} value={c}>{c} ports</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Model</label>
              <input
                value={oltForm.model}
                onChange={e => setOltForm(f => ({ ...f, model: e.target.value }))}
                placeholder="e.g. Syrotech SY-GPON-1040"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Number</label>
              <input
                value={oltForm.serialNumber}
                onChange={e => setOltForm(f => ({ ...f, serialNumber: e.target.value }))}
                placeholder="e.g. SY20240001"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
              <select
                value={oltForm.locationId}
                onChange={e => setOltForm(f => ({ ...f, locationId: e.target.value }))}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">— Select —</option>
                {siteLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {oltErrors.locationId && <p className="text-xs text-red-500 mt-1">{oltErrors.locationId}</p>}
            </div>

            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              PON ports will be auto-generated based on the selected port count.
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
