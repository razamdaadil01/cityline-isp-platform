import { useNavigate } from 'react-router-dom'
import { Route, Building2, ChevronRight } from 'lucide-react'
import Modal from '../ui/Modal'

const PROJECT_TYPES = [
  {
    key: 'hdd',
    label: 'HDD / Backbone Route',
    description: 'Horizontal Directional Drilling and backbone route projects — duct/chamber routing, drilling contractor cost.',
    icon: Route,
    to: '/projects/new/hdd',
  },
  {
    key: 'site',
    label: 'Site Project (FTTH/Commercial)',
    description: 'FTTH or commercial site rollouts — builder details, capacity, and competitor tracking.',
    icon: Building2,
    to: '/projects/new/site',
  },
]

export default function ProjectTypeModal({ isOpen, onClose }) {
  const navigate = useNavigate()

  function selectType(to) {
    onClose()
    navigate(to)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Project Type" size="md">
      <div className="space-y-3">
        {PROJECT_TYPES.map(({ key, label, description, icon: Icon, to }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectType(to)}
            className="w-full flex items-center gap-4 text-left px-4 py-3.5 rounded-xl border border-surface-border hover:border-brand-blue hover:bg-brand-blue/5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-blue shrink-0" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
