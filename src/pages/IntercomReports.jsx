import { BarChart2 } from 'lucide-react'

export default function IntercomReports() {
  return (
    <div className="p-6 space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intercom Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Reporting and analytics for intercom operations</p>
      </div>

      {/* Coming soon state */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card p-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
          <BarChart2 size={24} />
        </div>
        <h2 className="text-base font-bold text-gray-800">Coming Soon</h2>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
          Intercom reports are under development. This page will soon offer detailed reporting on leads, installations, billing, and hardware.
        </p>
      </div>

    </div>
  )
}
