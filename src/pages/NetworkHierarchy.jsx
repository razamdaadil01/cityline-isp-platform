import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GitBranch, Globe, Server, Layers, Zap } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import hierarchyStore, { REGION_STATUSES } from '../data/hierarchyStore'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function PortBar({ used, total }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Ports used</span>
        <span className="text-xs font-medium text-gray-700">{used} / {total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const STATUS_BADGE = { Active: 'green', Inactive: 'gray' }

const FORM_DEFAULTS = { name: '', code: '', description: '', status: 'Active' }

export default function NetworkHierarchy() {
  const navigate = useNavigate()

  const [regions, setRegions] = useState(() => hierarchyStore.getRegions())
  const [siteGroups, setSiteGroups] = useState(() => hierarchyStore.getSiteGroups())
  const [sites, setSites] = useState(() => hierarchyStore.getSites())
  const [olts, setOlts] = useState(() => hierarchyStore.getOLTs())
  const [virtualPorts, setVirtualPorts] = useState(() => hierarchyStore.getVirtualPorts())

  useEffect(() => {
    return hierarchyStore.subscribe(snap => {
      setRegions(snap.regions)
      setSiteGroups(snap.siteGroups)
      setSites(snap.sites)
      setOlts(snap.olts)
      setVirtualPorts(snap.virtualPorts)
    })
  }, [])

  const availablePorts = virtualPorts.filter(v => v.status === 'Available').length

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(FORM_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function openAdd() { setForm(FORM_DEFAULTS); setErrors({}); setShowAdd(true) }
  function closeAdd() { setShowAdd(false) }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.code.trim()) e.code = 'Code is required'
    else if (form.code.trim().length > 6) e.code = 'Max 6 characters'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    hierarchyStore.saveRegion({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      status: form.status,
    })
    setSaving(false)
    setShowAdd(false)
  }

  function field(key) {
    return {
      value: form[key],
      onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Network Hierarchy</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Region → Site Group → Site → OLT → Port → Customer
          </p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>
          Add Region
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Regions"   value={regions.length}      icon={Globe}       color="bg-brand-blue" />
        <StatCard label="Total Sites"     value={sites.length}         icon={Layers}      color="bg-purple-500" />
        <StatCard label="Total OLTs"      value={olts.length}          icon={Server}      color="bg-teal-500" />
        <StatCard label="Available Ports" value={availablePorts}       icon={Zap}         color="bg-emerald-600" />
      </div>

      {/* Regions grid */}
      {regions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card border border-surface-border py-16 text-center">
          <GitBranch size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No regions yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first region to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {regions.map(region => {
            const sgCount = siteGroups.filter(sg => sg.regionId === region.id).length
            const stats = hierarchyStore.getRegionStats(region.id)
            return (
              <div
                key={region.id}
                className="bg-white rounded-xl shadow-card border border-surface-border p-5 flex flex-col gap-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-brand-blue/10 rounded-lg flex items-center justify-center shrink-0">
                      <Globe size={16} className="text-brand-blue" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 truncate">{region.name}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 font-mono shrink-0">
                          {region.code}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{region.id}</span>
                    </div>
                  </div>
                  <Badge color={STATUS_BADGE[region.status] ?? 'gray'} className="shrink-0">
                    {region.status}
                  </Badge>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Site Groups', value: sgCount },
                    { label: 'Sites',       value: stats.siteCount },
                    { label: 'OLTs',        value: stats.oltCount  },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-gray-800">{value}</p>
                      <p className="text-[10px] text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Port bar */}
                <PortBar used={stats.usedPorts} total={stats.totalPorts} />

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-400">
                    {stats.availablePorts} port{stats.availablePorts !== 1 ? 's' : ''} available
                  </span>
                  <button
                    onClick={() => navigate(`/network/hierarchy/${region.id}`)}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Region modal */}
      {showAdd && (
        <Modal title="Add Region" onClose={closeAdd} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                {...field('name')}
                placeholder="e.g. Gautam Buddha Nagar"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
                <span className="font-normal text-gray-400 ml-1">(max 6 chars)</span>
              </label>
              <input
                {...field('code')}
                placeholder="e.g. GBN"
                maxLength={6}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                {...field('description')}
                rows={3}
                placeholder="Optional notes about this region…"
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                {...field('status')}
                className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {REGION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={closeAdd}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
