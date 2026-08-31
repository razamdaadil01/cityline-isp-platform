import { useNavigate } from 'react-router-dom'
import { Building2, ArrowLeft } from 'lucide-react'
import Button from '../../components/ui/Button'

// Phase 1 stub — the full Site Project (FTTH/Commercial) creation form
// (builder details, capacity, competitor tracking, work orders) is built
// in Phase 5.
export default function CreateSiteProject() {
  const navigate = useNavigate()

  return (
    <div className="p-6">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to Projects
      </button>
      <div className="bg-white rounded-xl shadow-card border border-surface-border p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
          <Building2 size={26} />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Site Project (FTTH/Commercial)</h1>
        <p className="text-sm text-gray-500 mt-1.5 max-w-md">
          The full creation form for Site projects — builder details, capacity, and competitor tracking — is coming in Phase 5.
        </p>
        <Button variant="secondary" size="sm" className="mt-6" onClick={() => navigate('/projects')}>Back to Projects</Button>
      </div>
    </div>
  )
}
