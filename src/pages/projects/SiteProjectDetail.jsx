import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, Boxes, FileText, Receipt, Copy, Phone } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getSiteProject, subscribeProjects } from '../../data/projectStore'

const STATUS_BADGE = {
  'NEW': 'gray', 'SURVEY': 'indigo', 'ACQUIRED': 'orange', 'IN_EXECUTION': 'orange', 'Live': 'green',
}

const TABS = ['Work Orders', 'Inventory & Consumption', 'Documents & Vault', 'CAPEX & Cost Ledger']
const TAB_SLUGS = {
  'Work Orders': 'work-orders',
  'Inventory & Consumption': 'inventory',
  'Documents & Vault': 'documents',
  'CAPEX & Cost Ledger': 'capex',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

function EmptyTabState({ icon: Icon, text }) {
  return (
    <div className="py-14 text-center text-sm text-gray-400">
      <Icon size={28} className="mx-auto mb-2 text-gray-200" />
      {text}
    </div>
  )
}

// Built dynamically from the project's own siteType/capacity/competitors —
// never hardcoded, since the three site types capture completely different
// capacity fields (see CreateSiteProject.jsx's buildCapacity()).
function capacitySummary(project) {
  const c = project.capacity || {}
  const parts = []
  if (project.siteType === 'Residential') {
    parts.push(`${c.homePasses ?? 0} Home Passes`, `${c.flatsCount ?? 0} Flats`, `${c.towersCount ?? 0} Towers`)
  } else if (project.siteType === 'Commercial') {
    parts.push(`${c.shopUnits ?? 0} Shops/Office Units`)
  } else {
    parts.push(`${c.residentialUnits ?? 0} Residential Units`, `${c.commercialUnits ?? 0} Commercial Units`)
  }
  let summary = `Total Capacity: ${parts.join(' | ')}`
  if (project.competitors?.length) summary += ` | Competitor: ${project.competitors.join(', ')}`
  return summary
}

export default function SiteProjectDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()

  // Subscribing (without using the payload directly) just forces a
  // re-render whenever projectStore changes (mirrors HDDProjectDetail.jsx's
  // forceRerender pattern).
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeProjects(() => forceRerender(n => n + 1)), [])
  const project = getSiteProject(id)

  const activeTab = SLUG_TO_TAB[tab] ?? 'Work Orders'
  useEffect(() => {
    if (project && !tab) navigate(`/projects/site/${id}/work-orders`, { replace: true })
  }, [id, tab, project, navigate])

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Project not found.</p>
      </div>
    )
  }

  function setActiveTab(t) {
    navigate(`/projects/site/${id}/${TAB_SLUGS[t]}`)
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
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <Badge variant={STATUS_BADGE[project.status] ?? 'gray'} dot size="sm">{project.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono">{project.id}</p>
          </div>

          <p className="text-sm text-gray-700">{capacitySummary(project)}</p>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Contacts</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">Builder / Developer</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{project.builderName || '—'}</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">Site Contact</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{project.contactPerson || '—'}</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Contact Number</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{project.contactNumber || '—'}</p>
                </div>
                {project.contactNumber && (
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`tel:${project.contactNumber}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors">
                      <Phone size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(project.contactNumber)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
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
          {activeTab === 'Inventory & Consumption' && <EmptyTabState icon={Boxes} text="No inventory recorded yet" />}
          {activeTab === 'Documents & Vault' && <EmptyTabState icon={FileText} text="No documents uploaded yet" />}
          {activeTab === 'CAPEX & Cost Ledger' && <EmptyTabState icon={Receipt} text="CAPEX tracking will be available once work orders are added" />}
        </div>
      </div>
    </div>
  )
}
