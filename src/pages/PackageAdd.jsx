import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select } from '../components/ui/FormInputs'

const BANDWIDTHS = ['50 Mbps', '100 Mbps', '150 Mbps', '200 Mbps', '300 Mbps', '500 Mbps', '1 Gbps']
const TENURES = ['1 Month', '3 Months', '6 Months', '1 Year', '12+1', '12+2']
const OTT_OPTIONS = ['None', 'Cityline TV Gold', 'Cityline TV Silver', 'Cityline TV Basic', 'Playbox']
const BILLING_TYPES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One Time']
const ZONES = ['Residential', 'Enterprise', 'Zone A', 'Zone B']

const EMPTY_ROW = { bandwidth: '', jazeId: '', tenure: '', price: '', ott: 'None' }

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${value ? 'bg-[#0A8DCD]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

const inp = "w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"

export default function PackageAdd() {
  const navigate = useNavigate()

  // Plan Type
  const [planType, setPlanType] = useState('Bandwidth')

  // Basic Details
  const [zone, setZone] = useState('')
  const [pkgName, setPkgName] = useState('')

  // Bandwidth config
  const [bwRows, setBwRows] = useState([{ ...EMPTY_ROW }])

  // Other Package config
  const [price, setPrice] = useState('')
  const [billingType, setBillingType] = useState('Monthly')
  const [bindBw, setBindBw] = useState(false)
  const [bindPkg, setBindPkg] = useState('')
  const [separateInvoice, setSeparateInvoice] = useState(false)

  // Settings
  const [editable, setEditable] = useState(false)
  const [landline, setLandline] = useState(false)
  const [offer, setOffer] = useState(false)
  const [active, setActive] = useState(true)

  const addRow = () => setBwRows(r => [...r, { ...EMPTY_ROW }])
  const removeRow = i => setBwRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i, field, val) => setBwRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const canSave = zone && pkgName.trim() && (
    planType === 'Bandwidth'
      ? bwRows.every(r => r.bandwidth && r.jazeId && r.tenure && r.price)
      : !!price
  )

  function handleSubmit() {
    navigate('/packages')
  }

  const sectionLabel = "text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4"

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/packages')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add New Plan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create a new service plan</p>
          </div>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex gap-5 px-6 pb-24 items-start">

        {/* ── LEFT PANEL (60%) ─────────────────────────────────── */}
        <div className="flex-[3] min-w-0 bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">

          {/* SECTION 1 — Plan Type */}
          <div>
            <p className={sectionLabel}>Plan Type</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { type: 'Bandwidth',     sub: 'Internet plans with speed tiers' },
                { type: 'Other Package', sub: 'Add-on services' },
              ].map(opt => (
                <button key={opt.type} type="button" onClick={() => setPlanType(opt.type)}
                  className={`p-5 rounded-xl border-2 text-left transition-colors ${
                    planType === opt.type ? 'border-[#0A8DCD] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className={`font-semibold text-sm ${planType === opt.type ? 'text-[#0A8DCD]' : 'text-gray-700'}`}>{opt.type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2 — Basic Details */}
          <div className="border-t border-surface-border pt-5">
            <p className={sectionLabel}>Basic Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <FormField label="Select Zone" required>
                <Select value={zone} onChange={e => setZone(e.target.value)}>
                  <option value="">Select zone…</option>
                  {ZONES.map(z => <option key={z}>{z}</option>)}
                </Select>
              </FormField>
              <FormField label="Package Name" required>
                <Input
                  placeholder="e.g. Sonic 100, Home Basic"
                  value={pkgName}
                  onChange={e => setPkgName(e.target.value)}
                />
              </FormField>
              <div className="col-span-2">
                <FormField label="Package Type">
                  <input
                    readOnly
                    value={planType === 'Bandwidth' ? 'Bandwidth Package' : 'Other Package'}
                    className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* SECTION 3 — Configuration */}
          <div className="border-t border-surface-border pt-5">
            <p className={sectionLabel}>Configuration</p>

            {/* ── Bandwidth rows ── */}
            {planType === 'Bandwidth' && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Bandwidth *', 'Jaze Package ID *', 'Tenure *', 'Price (₹) *', 'OTT Package', ''].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bwRows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-2">
                            <select value={row.bandwidth} onChange={e => updateRow(i, 'bandwidth', e.target.value)} className={inp}>
                              <option value="">Select…</option>
                              {BANDWIDTHS.map(b => <option key={b}>{b}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number" min="0" max="100"
                              value={row.jazeId}
                              onChange={e => updateRow(i, 'jazeId', e.target.value)}
                              className={inp} placeholder="e.g. 42"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select value={row.tenure} onChange={e => updateRow(i, 'tenure', e.target.value)} className={inp}>
                              <option value="">Select…</option>
                              {TENURES.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">₹</span>
                              <input
                                type="number" min="0"
                                value={row.price}
                                onChange={e => updateRow(i, 'price', e.target.value)}
                                className={`${inp} pl-7`} placeholder="0"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <select value={row.ott} onChange={e => updateRow(i, 'ott', e.target.value)} className={inp}>
                              {OTT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeRow(i)} disabled={bwRows.length === 1}
                              className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addRow}
                  className="flex items-center gap-1.5 text-[#0A8DCD] text-sm font-medium hover:text-blue-600">
                  <Plus size={14} /> Add Row
                </button>
              </div>
            )}

            {/* ── Other Package fields ── */}
            {planType === 'Other Package' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <FormField label="Price (₹)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">₹</span>
                      <input
                        type="number" min="0"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className={`${inp} pl-7`} placeholder="0"
                      />
                    </div>
                  </FormField>
                  <FormField label="Billing Type" required>
                    <Select value={billingType} onChange={e => setBillingType(e.target.value)}>
                      {BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
                    </Select>
                  </FormField>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Bind with Bandwidth Package</p>
                    <p className="text-xs text-gray-500 mt-0.5">Link this add-on to a specific bandwidth package</p>
                  </div>
                  <Toggle value={bindBw} onChange={setBindBw} />
                </div>

                {bindBw && (
                  <FormField label="Select Bandwidth Package" required>
                    <Select value={bindPkg} onChange={e => setBindPkg(e.target.value)}>
                      <option value="">Select package…</option>
                      <option>Sonic 100 - Monthly</option>
                      <option>Sonic 200 - Monthly</option>
                      <option>Home Basic - Quarterly</option>
                      <option>Enterprise 500 - Yearly</option>
                    </Select>
                  </FormField>
                )}

                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <input type="checkbox" checked={separateInvoice} onChange={e => setSeparateInvoice(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0A8DCD]" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Separate Invoice</p>
                    <p className="text-xs text-gray-500 mt-0.5">This package amount shows separately in the invoice</p>
                  </div>
                </label>
              </div>
            )}

          </div>
        </div>

        {/* ── RIGHT PANEL (40%) ────────────────────────────────── */}
        <div className="flex-[2] min-w-0 bg-white rounded-xl border border-surface-border shadow-card p-6">
          <p className={sectionLabel}>Settings</p>
          <div className="space-y-3">

            {[
              { key: 'editable', val: editable, set: setEditable, icon: '✏️', title: 'Is Package Editable?' },
              { key: 'landline', val: landline, set: setLandline, icon: '📞', title: 'Landline Number Applicable?' },
              { key: 'offer',    val: offer,    set: setOffer,    icon: '🎁', title: 'Is Offer Package?' },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{opt.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
                </div>
                <Toggle value={opt.val} onChange={opt.set} />
              </div>
            ))}

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <p className="text-sm font-semibold text-gray-800">Status</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{active ? 'Active' : 'Inactive'}</span>
                <Toggle value={active} onChange={setActive} />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Bottom Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <p className="text-xs text-gray-400">Fields marked <span className="text-red-400">*</span> are required</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/packages')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSave}>Save Plan</Button>
        </div>
      </div>

    </div>
  )
}
