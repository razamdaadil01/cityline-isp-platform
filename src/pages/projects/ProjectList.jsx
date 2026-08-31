import { useState, useEffect } from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ProjectTypeModal from '../../components/projects/ProjectTypeModal'
import { getHDDProjects, getSiteProjects, subscribeProjects } from '../../data/projectStore'
import { usePermission } from '../../data/rolesStore'

const STATUS_BADGE = {
  'Planning': 'gray', 'In Progress': 'blue', 'On Hold': 'yellow', 'Completed': 'green', 'Cancelled': 'red',
}

export default function ProjectList() {
  const canCreate = usePermission('Projects', 'Create')

  const [hddProjects, setHddProjects] = useState(getHDDProjects)
  const [siteProjects, setSiteProjects] = useState(getSiteProjects)
  useEffect(() => subscribeProjects(({ hddProjects, siteProjects }) => {
    setHddProjects(hddProjects)
    setSiteProjects(siteProjects)
  }), [])

  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const projects = [
    ...hddProjects.map(p => ({ id: p.id, name: p.title, type: 'HDD / Backbone Route', status: p.status })),
    ...siteProjects.map(p => ({ id: p.id, name: p.name, type: 'Site Project', status: p.status })),
  ]

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
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center text-sm text-gray-400">
                    <FolderKanban size={32} className="mx-auto mb-2 text-gray-200" />
                    No projects yet. Click "Create New Project" to get started.
                  </td>
                </tr>
              ) : projects.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{p.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[p.status] || 'gray'} dot size="sm">{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ProjectTypeModal isOpen={typeModalOpen} onClose={() => setTypeModalOpen(false)} />
    </div>
  )
}
