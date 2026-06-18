import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_BANDWIDTHS, MOCK_TENURES, savePlan } from '../data/packagesStore'

const ZONES = ['Residential', 'Enterprise', 'SME', 'Government']
const TYPES = ['bandwidth', 'other']

export default function PackageAdd() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    zone: '', type: 'bandwidth', name: '',
    rows: [{ bandwidth: '', tenure: '', price: '', mrp: '' }],
    otherType: 'one-time', price: '', taxable: true, boundPackage: '', separateInvoice: false,
    editable: false, landlineEnabled: false, staticIpEnabled: false, ottEnabled: false, offerEnabled: false,
  })

  const step1Valid = form.zone && form.name.trim()
  const step2Valid = form.type === 'bandwidth'
    ? form.rows.every(r => r.bandwidth && r.tenure && r.price)
    : form.price

  function addRow() {
    setForm(f => ({ ...f, rows: [...f.rows, { bandwidth: '', tenure: '', price: '', mrp: '' }] }))
  }
  function removeRow(i) {
    setForm(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))
  }
  function updateRow(i, field, value) {
    setForm(f => {
      const rows = [...f.rows]
      rows[i] = { ...rows[i], [field]: value }
      return { ...f, rows }
    })
  }

  function handleSubmit() {
    savePlan({
      name: form.name,
      zone: form.zone,
      type: form.type,
      bandwidths: form.type === 'bandwidth' ? [{ bandwidth: form.rows[0].bandwidth, tenures: form.rows }] : [],
      landlineEnabled: form.landlineEnabled,
      staticIpEnabled: form.staticIpEnabled,
      ottEnabled: form.ottEnabled,
      status: 'active',
    })
    navigate('/packages')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/packages')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Back to Packages
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add New Package</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {[1,2,3].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-[#0A8DCD] text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
            <span className={`ml-2 text-sm ${step >= s ? 'text-[#0A8DCD] font-medium' : 'text-gray-400'}`}>
              {s === 1 ? 'Zone & Type' : s === 2 ? 'Configuration' : 'Settings'}
            </span>
            {i < 2 && <div className={`mx-4 h-0.5 w-16 ${step > s ? 'bg-[#0A8DCD]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Zone & Package Type</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone *</label>
              <select value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]">
                <option value="">Select Zone</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Type *</label>
              <div className="flex gap-4">
                {TYPES.map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value={t} checked={form.type === t}
                      onChange={() => setForm(f => ({ ...f, type: t }))} />
                    <span className="text-sm capitalize">{t === 'bandwidth' ? 'Bandwidth Package' : 'Other Package'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sonic 100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]" />
            </div>
          </div>
        )}

        {/* Step 2 - Bandwidth */}
        {step === 2 && form.type === 'bandwidth' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Bandwidth Configuration</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">Bandwidth</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">Tenure</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">Price (₹)</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">MRP (₹)</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        <select value={row.bandwidth} onChange={e => updateRow(i, 'bandwidth', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A8DCD]">
                          <option value="">Select</option>
                          {MOCK_BANDWIDTHS.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <select value={row.tenure} onChange={e => updateRow(i, 'tenure', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A8DCD]">
                          <option value="">Select</option>
                          {MOCK_TENURES.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" value={row.price} onChange={e => updateRow(i, 'price', e.target.value)}
                          placeholder="0" className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A8DCD]" />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" value={row.mrp} onChange={e => updateRow(i, 'mrp', e.target.value)}
                          placeholder="0" className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A8DCD]" />
                      </td>
                      <td className="py-2">
                        {form.rows.length > 1 && (
                          <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} className="text-sm text-[#0A8DCD] hover:underline">+ Add Row</button>
          </div>
        )}

        {/* Step 2 - Other */}
        {step === 2 && form.type === 'other' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Package Configuration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
              <div className="flex gap-4">
                {['one-time', 'recurring'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="otherType" value={t} checked={form.otherType === t}
                      onChange={() => setForm(f => ({ ...f, otherType: t }))} />
                    <span className="text-sm capitalize">{t.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="taxable" checked={form.taxable} onChange={e => setForm(f => ({ ...f, taxable: e.target.checked }))} className="w-4 h-4 accent-[#0A8DCD]" />
              <label htmlFor="taxable" className="text-sm text-gray-700">Taxable</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="sep" checked={form.separateInvoice} onChange={e => setForm(f => ({ ...f, separateInvoice: e.target.checked }))} className="w-4 h-4 accent-[#0A8DCD]" />
              <label htmlFor="sep" className="text-sm text-gray-700">Generate separate invoice</label>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Package Settings</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'landlineEnabled', label: 'Landline Support', desc: 'Allow landline numbers to be assigned with this package' },
                { key: 'staticIpEnabled', label: 'Static IP Support', desc: 'Allow static IPs to be assigned with this package' },
                { key: 'ottEnabled', label: 'OTT Support', desc: 'Allow OTT add-ons with this package' },
                { key: 'offerEnabled', label: 'Offer Enabled', desc: 'Show promotional offers on this package' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                    className={`w-11 h-6 rounded-full transition-colors ${form[key] ? 'bg-[#0A8DCD]' : 'bg-gray-300'} relative`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-2">Summary</div>
              <div className="text-sm text-gray-600 space-y-1">
                <div><span className="font-medium">Name:</span> {form.name}</div>
                <div><span className="font-medium">Zone:</span> {form.zone}</div>
                <div><span className="font-medium">Type:</span> {form.type}</div>
                {form.type === 'bandwidth' && <div><span className="font-medium">Rows:</span> {form.rows.length} pricing tier(s)</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/packages')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        {step < 3
          ? <button onClick={() => setStep(s => s + 1)} disabled={step === 1 ? !step1Valid : !step2Valid}
              className="px-4 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0878b0]">
              Next
            </button>
          : <button onClick={handleSubmit}
              className="px-4 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0]">
              Create Package
            </button>
        }
      </div>
    </div>
  )
}
