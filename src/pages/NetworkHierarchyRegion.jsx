import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Layers, MapPin, Building2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import hierarchyStore, { REGION_STATUSES, SITE_STATUSES } from '../data/hierarchyStore'

const STATUS_BADGE = {
  Active: 'green', Inactive: 'gray', 'Under Construction': 'yellow', Decommissioned: 'red',
}

const SG_FORM_DEFAULTS = { name: '', description: '', status: 'Active' }
const SITE_FORM_DEFAULTS = { name: '', address: '', siteGroupId: '', status: 'Active' }

export default function NetworkHierarchyRegion() {
  const { regionId } = useParams()
  const navigate = useNavigate()

  const [regions, setRegions] = useState(() => hierarchyStore.getRegions())
  const [siteGroups, setSiteGroups] = useState(() => hierarchyStore.getSiteGroups())
  const [sites, setSites] = useState(() => hierarchyStore.getSites())

  useEffect(() => {
    return hierarchyStore.subscribe(snap => {
      setRegions(snap.regions)
      setSiteGroups(snap.siteGroups)
      setSites(snap.sites)
    })
  }, [])

  const region = regions.find(r => r.id === regionId)
  const regionSiteGroups = siteGroups.filter(sg => sg.regionId === regionId)
  const regionSgIds = regionSiteGroups.map(sg => sg.id)
  const regionSites = sites.filter(s => regionSgIds.includes(s.siteGroupId))

  // ── Add Site Group modal ───────────────────────────────────────────────────
  const [showAddSG, setShowAddSG] = useState(false)
  const [sgForm, setSgForm] = useState(SG_FORM_DEFAULTS)
  const [sgErrors, setSgErrors] = useState({})

  function openAddSG() { setSgForm(SG_FORM_DEFAULTS); setSgErrors({}); setShowAddSG(true) }
  function closeAddSG() { setShowAddSG(false) }

  function validateSG() {
    const e = {}
    if (!sgForm.name.trim()) e.name = 'Name is required'
    return e
  }

  function handleSaveSG() {
    const e = validateSG()
    if (Object.keys(e).length) { setSgErrors(e); return }
    hierarchyStore.saveSiteGroup({
      name: sgForm.name.trim(),
      description: sgForm.description.trim(),
      status: sgForm.status,
      regionId,
    })
    setShowAddSG(false)
  }

  // ── Add Site modal ─────────────────────────────────────────────────────────
  const [showAddSite, setShowAddSite] = useState(false)
  const [siteForm, setSiteForm] = useState(SITE_FORM_DEFAULTS)
  const [siteErrors, setSiteErrors] = useState({})

  function openAddSite() {
    setSiteForm({
      ...SITE_FORM_DEFAULTS,
      siteGroupId: regionSiteGroups[0]?.id ?? '',
    })
    setSiteErrors({})
    setShowAddSite(true)
  }
  function closeAddSite() { setShowAddSite(false) }

  function validateSite() {
    const e = {}
    if (!siteForm.name.trim()) e.name = 'Name is required'
    if (!siteForm.siteGroupId) e.siteGroupId = 'Site Group is required'
    return e
  }

  function handleSaveSite() {
    const e = validateSite()
    if (Object.keys(e).length) { setSiteErrors(e); return }
    hierarchyStore.saveSite({
      name: siteForm.name.trim(),
      address: siteForm.address.trim(),
      siteGroupId: siteForm.siteGroupId,
      status: siteForm.status,
    })
    setShowAddSite(false)
  }

  if (!region) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/network/hierarchy')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <p className="text-sm text-gray-500">Region not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <button
          onClick={() => navigate('/network/hierarchy')}
          className="hover:text-brand-blue transition-colors"
        >
          Network Hierarchy
        </button>
        <span>/</span>
        <span className="text-gray-600 font-medium">{region.name}</span>
      </div>

      <button
        onClick={() => navigate('/network/hierarchy')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 -mt-2"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Page title */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{region.name}</h1>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 font-mono">
          {region.code}
        </span>
        <Badge color={STATUS_BADGE[region.status] ?? 'gray'}>{region.status}</Badge>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT: Site Groups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Layers size={15} className="text-brand-blue" />
              Site Groups
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                {regionSiteGroups.length}
              </span>
            </h2>
            <Button size="xs" icon={<Plus size={12} />} onClick={openAddSG}>
              Add Site Group
            </Button>
          </div>

          {regionSiteGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border py-10 text-center">
              <Layers size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-xs text-gray-400">No site groups yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {regionSiteGroups.map(sg => {
                const sgSiteCount = sites.filter(s => s.siteGroupId === sg.id).length
                return (
                  <div
                    key={sg.id}
                    className="bg-white rounded-xl border border-surface-border p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{sg.name}</span>
                        <Badge color={STATUS_BADGE[sg.status] ?? 'gray'} className="text-[10px]">
                          {sg.status}
                        </Badge>
                      </div>
                      {sg.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sg.description}</p>
                      )}
                      <p className="text-xs text-gray-400 font-mono mt-1">{sg.id}</p>
                    </div>
                    <div className="shrink-0 text-center bg-gray-50 rounded-lg px-3 py-1.5 min-w-[52px]">
                      <p className="text-lg font-bold text-gray-800">{sgSiteCount}</p>
                      <p className="text-[10px] text-gray-400">Sites</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Sites */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 size={15} className="text-purple-500" />
              Sites
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                {regionSites.length}
              </span>
            </h2>
            <Button size="xs" icon={<Plus size={12} />} onClick={openAddSite}>
              Add Site
            </Button>
          </div>

          {regionSites.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border py-10 text-center">
              <Building2 size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-xs text-gray-400">No sites yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Site</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Group</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {regionSites.map(site => {
                    const sg = siteGroups.find(g => g.id === site.siteGroupId)
                    return (
                      <tr key={site.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{site.name}</p>
                          {site.address && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {site.address}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 font-mono">{site.id}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{sg?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge color={STATUS_BADGE[site.status] ?? 'gray'}>{site.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-brand-blue font-medium cursor-default">View →</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Site Group modal */}
      {showAddSG && (
        <Modal title="Add Site Group" onClose={closeAddSG} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                value={sgForm.name}
                onChange={e => setSgForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Alpha Cluster"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              {sgErrors.name && <p className="text-xs text-red-500 mt-1">{sgErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={sgForm.description}
                onChange={e => setSgForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional notes…"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={sgForm.status}
                onChange={e => setSgForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {REGION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={closeAddSG}>Cancel</Button>
              <Button size="sm" onClick={handleSaveSG}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Site modal */}
      {showAddSite && (
        <Modal title="Add Site" onClose={closeAddSite} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                value={siteForm.name}
                onChange={e => setSiteForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Alpha 1 Tower"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              {siteErrors.name && <p className="text-xs text-red-500 mt-1">{siteErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
              <input
                value={siteForm.address}
                onChange={e => setSiteForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Sector 62, Noida"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Site Group <span className="text-red-500">*</span></label>
              <select
                value={siteForm.siteGroupId}
                onChange={e => setSiteForm(f => ({ ...f, siteGroupId: e.target.value }))}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">— Select —</option>
                {regionSiteGroups.map(sg => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>
              {siteErrors.siteGroupId && <p className="text-xs text-red-500 mt-1">{siteErrors.siteGroupId}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={siteForm.status}
                onChange={e => setSiteForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {SITE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={closeAddSite}>Cancel</Button>
              <Button size="sm" onClick={handleSaveSite}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
