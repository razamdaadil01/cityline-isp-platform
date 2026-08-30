import { useNavigate, useLocation } from 'react-router-dom'

// Top-of-module pill tab bar — same "Sub-tab bar" shape Settings.jsx's own
// Master Configuration page uses (bg-gray-100 pill track, active tab lifted
// on a white pill), reused here as a standalone component since Asset
// Management's tabs are two full routes (/assets, /assets/po-approval)
// rather than an in-page section switch.
const TABS = [
  { path: '/assets', label: 'Assets' },
  { path: '/assets/po-approval', label: 'PO Approval' },
]

export default function AssetModuleTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {TABS.map(t => (
        <button
          key={t.path} onClick={() => navigate(t.path)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            location.pathname === t.path ? 'bg-white shadow-sm text-[#0F2744]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
