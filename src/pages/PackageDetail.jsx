import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, ArrowLeft } from 'lucide-react'
import { MOCK_BW_PACKAGES, MOCK_OTHER_PACKAGES } from '../data/packagesStore'

const YN = ({ value, yesClass }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${value ? yesClass : 'bg-gray-100 text-gray-500'}`}>
    {value ? 'Yes' : 'No'}
  </span>
)

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
    {status}
  </span>
)

const InfoRow = ({ label, children }) => (
  <div className="flex items-center py-3 border-b border-gray-100 last:border-0">
    <span className="w-44 text-sm text-gray-500 shrink-0">{label}</span>
    <span className="text-sm font-medium text-gray-800">{children}</span>
  </div>
)

export default function PackageDetail() {
  const { packageId } = useParams()
  const navigate = useNavigate()

  const pkg = [...MOCK_BW_PACKAGES, ...MOCK_OTHER_PACKAGES].find(p => p.id === packageId)

  if (!pkg) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Package not found.</p>
        <button onClick={() => navigate('/packages')} className="mt-4 text-[#0A8DCD] text-sm hover:underline">← Back to Packages</button>
      </div>
    )
  }

  const isBw = pkg.type === 'Bandwidth'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/packages')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={15} /> Back to Packages
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{pkg.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pkg.id} · {pkg.zone} · {pkg.type}</p>
        </div>
        <button onClick={() => navigate(`/packages/${pkg.id}/edit`)}
          className="flex items-center gap-2 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0878b0]">
          <Edit2 size={15} /> Edit Package
        </button>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Basic Information</h2>
        <InfoRow label="Package Name">{pkg.name}</InfoRow>
        <InfoRow label="Zone">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{pkg.zone}</span>
        </InfoRow>
        <InfoRow label="Type">{pkg.type}</InfoRow>
        <InfoRow label="Status"><StatusBadge status={pkg.status} /></InfoRow>
      </div>

      {/* Pricing Rows — Bandwidth */}
      {isBw && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pricing Tiers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Bandwidth', 'Jaze ID', 'Tenure', 'Price', 'OTT'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pkg.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.bandwidth}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.jazeId}</td>
                    <td className="px-4 py-3 text-gray-700">{row.tenure}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">₹{row.price.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.ott !== 'None' ? row.ott : <span className="text-gray-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing — Other */}
      {!isBw && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Pricing</h2>
          <InfoRow label="Price">₹{pkg.price}</InfoRow>
          <InfoRow label="Bind Package">{pkg.bindPackage || '—'}</InfoRow>
          <InfoRow label="Separate Invoice"><YN value={pkg.separateInvoice} yesClass="bg-orange-100 text-orange-700" /></InfoRow>
        </div>
      )}

      {/* Settings — Bandwidth */}
      {isBw && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Settings</h2>
          <InfoRow label="Editable"><YN value={pkg.editable} yesClass="bg-amber-100 text-amber-700" /></InfoRow>
          <InfoRow label="Landline Support"><YN value={pkg.landline} yesClass="bg-blue-100 text-blue-700" /></InfoRow>
          <InfoRow label="Offer Enabled"><YN value={pkg.offer} yesClass="bg-orange-100 text-orange-700" /></InfoRow>
        </div>
      )}
    </div>
  )
}
