import { Construction } from 'lucide-react'

export default function IntercomInstallations() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intercom Installations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage intercom installation visits</p>
      </div>
      <div className="bg-white rounded-xl border border-surface-border shadow-card py-20 text-center">
        <Construction size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Coming Soon</p>
        <p className="text-xs text-gray-400 mt-1">This module is under construction.</p>
      </div>
    </div>
  )
}
