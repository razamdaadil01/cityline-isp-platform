import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, Boxes, Receipt } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getHDDProject, subscribeProjects } from '../../data/projectStore'
import { getVendor } from '../../data/vendorStore'
import { getUsers } from '../../data/userStore'

const STATUS_BADGE = {
  'Planning': 'gray', 'In Progress': 'indigo', 'On Hold': 'orange', 'Completed': 'green', 'Cancelled': 'red',
}

const TABS = ['Work Orders', 'Inventory', 'CAPEX & Financials']
const TAB_SLUGS = { 'Work Orders': 'work-orders', 'Inventory': 'inventory', 'CAPEX & Financials': 'capex' }
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

function unitAbbrev(unit) { return unit === 'Kilometers' ? 'km' : 'm' }

function EmptyTabState({ icon: Icon, text }) {
  return (
    <div className="py-14 text-center text-sm text-gray-400">
      <Icon size={28} className="mx-auto mb-2 text-gray-200" />
      {text}
    </div>
  )
}

export default function HDDProjectDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()

  // Subscribing (without using the payload directly) just forces a
  // re-render whenever projectStore changes, so the getHDDProject(id)
  // lookup below always reflects the latest saved state (mirrors
  // VendorDetail.jsx's forceRerender pattern).
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeProjects(() => forceRerender(n => n + 1)), [])
  const project = getHDDProject(id)

  const activeTab = SLUG_TO_TAB[tab] ?? 'Work Orders'
  useEffect(() => {
    if (project && !tab) navigate(`/projects/hdd/${id}/work-orders`, { replace: true })
  }, [id, tab, project, navigate])

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Project not found.</p>
      </div>
    )
  }

  const siteInchargeName = getUsers().find(u => u.id === project.siteIncharge)?.name ?? '—'
  const vendorName = getVendor(project.vendor)?.companyName ?? '—'
  const unit = unitAbbrev(project.distanceUnit)
  const totalDistance = project.distance ?? 0

  function setActiveTab(t) {
    navigate(`/projects/hdd/${id}/${TAB_SLUGS[t]}`)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header summary card */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
        <div className="px-6 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <button onClick={() => navigate('/projects')} className="text-gray-400 hover:underline transition-colors">
            Projects
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{project.id}</span>
        </div>
        <div className="border-t border-surface-border" />

        <div className="p-6 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
              <Badge variant={STATUS_BADGE[project.status] ?? 'gray'} dot size="sm">{project.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono">{project.id}</p>
          </div>

          <p className="text-sm text-gray-700">
            {project.routeGeometry?.start?.name ?? '—'} → {project.routeGeometry?.end?.name ?? '—'}
            <span className="text-gray-400"> · Total: {totalDistance}{unit}</span>
          </p>

          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Drilled Distance</span>
              <span>0{unit} / {totalDistance}{unit} — 0%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-brand-blue rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Site Incharge', value: siteInchargeName },
              { label: 'Vendor', value: vendorName },
              { label: 'Drilling Rate / m', value: project.drillingRate != null ? `₹${project.drillingRate.toLocaleString('en-IN')}` : '—' },
              { label: 'Live Total CAPEX', value: '₹0' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-sm font-bold mt-0.5 text-gray-900 truncate">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                ${activeTab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-5 sm:p-6">
          {activeTab === 'Work Orders' && <EmptyTabState icon={ClipboardList} text="No work orders yet" />}
          {activeTab === 'Inventory' && <EmptyTabState icon={Boxes} text="No materials assigned yet" />}
          {activeTab === 'CAPEX & Financials' && <EmptyTabState icon={Receipt} text="CAPEX tracking will be available once work orders are added" />}
        </div>
      </div>
    </div>
  )
}
