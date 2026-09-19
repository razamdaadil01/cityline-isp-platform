import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, MoreVertical, FileDown } from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ProjectTypeModal from '../../components/projects/ProjectTypeModal'
import { getHDDProjects, getSiteProjects, subscribeProjects } from '../../data/projectStore'
import { useMicroPermission } from '../../data/rolesStore'

// HDD's PROJECT_STATUSES and Site's SITE_PROJECT_STATUSES are two distinct
// status sets (see projectStore.js) — both map into this one shared table's
// Badge, so every value from either list needs an entry here.
const STATUS_BADGE = {
  'Planning': 'gray', 'In Progress': 'blue', 'On Hold': 'yellow', 'Completed': 'green', 'Cancelled': 'red',
  'NEW': 'gray', 'SURVEY': 'indigo', 'ACQUIRED': 'orange', 'IN_EXECUTION': 'orange', 'COMMISSIONED': 'green',
}

export default function ProjectList() {
  const canCreate = useMicroPermission('Projects', 'createNewProject')
  const navigate = useNavigate()

  const [hddProjects, setHddProjects] = useState(getHDDProjects)
  const [siteProjects, setSiteProjects] = useState(getSiteProjects)
  useEffect(() => subscribeProjects(({ hddProjects, siteProjects }) => {
    setHddProjects(hddProjects)
    setSiteProjects(siteProjects)
  }), [])

  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const projects = [
    ...hddProjects.map(p => ({ id: p.id, name: p.title, type: 'HDD / Backbone Route', status: p.status, kind: 'hdd', projectExecutionType: p.projectExecutionType })),
    ...siteProjects.map(p => ({ id: p.id, name: p.name, type: 'Site Project (FTTH/Commercial)', status: p.status, kind: 'site', projectExecutionType: p.projectExecutionType })),
  ]

  function openProject(p) {
    navigate(p.kind === 'hdd' ? `/projects/hdd/${p.id}` : `/projects/site/${p.id}`)
  }

  // 3-dot Actions menu — same fixed-position/click-outside pattern as
  // StoreTransfer.jsx's row menu (this app's established "row actions
  // dropdown" precedent).
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  function downloadPDF(p) {
    // Static "pdf" prefix (/projects/pdf/:type/:id), not
    // /projects/:kind/:id/pdf — that shape ties in route specificity with
    // /projects/hdd/:id/:tab and /projects/site/:id/:tab in App.jsx, which
    // are declared first and so won the tie, sending this to the regular
    // detail page (tab="pdf") instead of ProjectPDFView.
    navigate(`/projects/pdf/${p.kind}/${p.id}`)
    setMenuId(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length === 1 ? '' : 's'}</p>
        </div>
        {canCreate && (
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setTypeModalOpen(true)}>Create New Project</Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-gray-400">
                    <FolderKanban size={32} className="mx-auto mb-2 text-gray-200" />
                    No projects yet. Click "Create New Project" to get started.
                  </td>
                </tr>
              ) : projects.map(p => (
                <tr
                  key={p.id}
                  onClick={() => openProject(p)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {p.type}
                      {p.projectExecutionType && (
                        <Badge variant={p.projectExecutionType === 'OH' ? 'orange' : 'slate'} size="sm">{p.projectExecutionType}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[p.status] || 'gray'} dot size="sm">{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-16 text-center">
                    <button
                      onClick={e => openMenu(e, p.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === p.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const row = projects.find(p => p.id === menuId)
        if (!row) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-52"
          >
            <button
              onClick={e => { e.stopPropagation(); downloadPDF(row) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileDown size={13} className="text-gray-400 shrink-0" /> Download PDF
            </button>
          </div>
        )
      })()}

      <ProjectTypeModal isOpen={typeModalOpen} onClose={() => setTypeModalOpen(false)} />
    </div>
  )
}
