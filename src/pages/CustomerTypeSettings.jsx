import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Tags, ListChecks } from 'lucide-react'
import { getCustomerTypes, subscribeCustomerTypes, setCustomerTypeStatus } from '../data/customerTypes'
import { countServiceTagsForType } from '../data/serviceTags'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function CustomerTypeSettings() {
  const navigate = useNavigate()
  const [types, setTypes] = useState(getCustomerTypes)

  useEffect(() => subscribeCustomerTypes(setTypes), [])

  function handleToggle(type, next) {
    setCustomerTypeStatus(type.id, next ? 'Active' : 'Inactive')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customer Type</h1>
          <p className="text-sm text-gray-500 mt-0.5">System Configuration — Resident and Corporate are system-seeded and cannot be added or removed</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Type Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mapped Service Tags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Fields Configured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {types.map(t => {
              const tagCount = countServiceTagsForType(t.id)
              return (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Toggle checked={t.status === 'Active'} onChange={v => handleToggle(t, v)} />
                      <span className={`text-xs font-medium whitespace-nowrap ${t.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{t.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => navigate(`/settings/customer-type/service-tags?type=${t.id}`)}
                      className="inline-flex items-center gap-1.5 text-brand-blue hover:underline font-medium"
                    >
                      <Tags size={13} />
                      {tagCount} {tagCount === 1 ? 'tag' : 'tags'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => navigate(`/settings/customer-type/${t.id}/fields`)}
                      className="inline-flex items-center gap-1.5 text-brand-blue hover:underline font-medium"
                    >
                      <ListChecks size={13} />
                      {t.fieldsConfiguredCount} fields
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
