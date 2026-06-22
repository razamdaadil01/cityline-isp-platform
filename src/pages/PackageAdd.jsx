import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wifi, Package, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { MOCK_BANDWIDTHS, MOCK_TENURES, MOCK_OTT, MOCK_BW_PACKAGES } from '../data/packagesStore'

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors ${value ? 'bg-[#0A8DCD]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

const STEPS = ['Zone & Type', 'Configuration', 'Settings']

export default function PackageAdd() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [toast, setToast] = useState(false)

  const rawStep = parseInt(searchParams.get('step') || '1', 10)
  const typeParam = searchParams.get('type') // 'bandwidth' | 'other' | null
  // Guard: step 2/3 without a type → redirect to step 1
  const step = (rawStep === 2 || rawStep === 3) && !typeParam ? 1 : rawStep
  const stepIndex = step - 1 // 0-based for arrays/comparisons

  // Step 1 state
  const [zone, setZone] = useState('')
  const [pkgType, setPkgType] = useState(typeParam === 'bandwidth' ? 'Bandwidth' : typeParam === 'other' ? 'Other' : '')
  const [pkgName, setPkgName] = useState('')

  // Step 2 state — bandwidth rows
  const EMPTY_ROW = { bandwidth: '', jazeId: '', tenure: '', price: '', ott: 'None' }
  const [bwRows, setBwRows] = useState([{ ...EMPTY_ROW }])

  // Step 2 state — other package
  const [bound, setBound] = useState(false)
  const [bindPkg, setBindPkg] = useState('')
  const [othPrice, setOthPrice] = useState('')
  const [separateInvoice, setSeparateInvoice] = useState(false)

  // Step 3 state
  const [editable, setEditable] = useState(false)
  const [landline, setLandline] = useState(false)
  const [offer, setOffer] = useState(false)
  const [active, setActive] = useState(true)

  const resolvedType = typeParam === 'other' ? 'Other' : 'Bandwidth'

  const step1Valid = zone && pkgType && pkgName.trim()
  const step2Valid = resolvedType === 'Bandwidth'
    ? bwRows.every(r => r.bandwidth && r.jazeId && r.tenure && r.price)
    : (bound ? (bindPkg && othPrice) : othPrice)

  const addRow = () => setBwRows(r => [...r, { ...EMPTY_ROW }])
  const removeRow = (i) => setBwRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i, field, val) => setBwRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const goNext = () => {
    if (stepIndex === 0) {
      const t = pkgType === 'Other' ? 'other' : 'bandwidth'
      setSearchParams({ type: t, step: '2' })
    } else if (stepIndex === 1) {
      setSearchParams({ type: typeParam, step: '3' })
    }
  }

  const goBack = () => {
    if (stepIndex === 0) {
      navigate('/packages')
    } else if (stepIndex === 1) {
      setSearchParams({ step: '1' })
    } else {
      setSearchParams({ type: typeParam, step: '2' })
    }
  }

  const handleSave = () => {
    setToast(true)
    setTimeout(() => { navigate('/packages') }, 1500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle size={16} /> Package created successfully!
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F2744]">Create New Package</h1>
        <p className="text-sm text-gray-500 mt-0.5">Step {step} of 3 &mdash; {STEPS[stepIndex]}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                i < stepIndex ? 'bg-green-500 border-green-500 text-white' :
                i === stepIndex ? 'bg-[#0A8DCD] border-[#0A8DCD] text-white' :
                'bg-white border-gray-300 text-gray-400'
              }`}>
                {i < stepIndex ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className="text-xs text-gray-500 mt-1 whitespace-nowrap">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < stepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

        {/* STEP 1 */}
        {stepIndex === 0 && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Zone *</label>
              <select value={zone} onChange={e => setZone(e.target.value)} className={inp}>
                <option value="">Select zone...</option>
                <option>Residential</option>
                <option>Enterprise</option>
                <option>Zone A</option>
                <option>Zone B</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Package Type *</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { type: 'Bandwidth', icon: Wifi,    sub: 'Internet plans with speed tiers' },
                  { type: 'Other',     icon: Package, sub: 'Add-on services' },
                ].map(opt => (
                  <button key={opt.type} onClick={() => setPkgType(opt.type)}
                    className={`p-5 rounded-xl border-2 text-left transition-colors ${
                      pkgType === opt.type ? 'border-[#0A8DCD] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <opt.icon size={24} className={pkgType === opt.type ? 'text-[#0A8DCD]' : 'text-gray-400'} />
                    <p className={`font-semibold mt-2 ${pkgType === opt.type ? 'text-[#0A8DCD]' : 'text-gray-700'}`}>{opt.type} Package</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Package Name *</label>
              <input value={pkgName} onChange={e => setPkgName(e.target.value)} className={inp}
                placeholder="e.g. Sonic 100, Home Basic" />
            </div>
          </>
        )}

        {/* STEP 2A — Bandwidth */}
        {stepIndex === 1 && resolvedType === 'Bandwidth' && (
          <>
            <p className="text-sm text-gray-500">Add pricing rows &mdash; each row is a bandwidth/tenure combination.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Bandwidth','Jaze Package ID','Tenure','Price (&#8377;)','OTT Package',''].map((h, hi) => (
                      <th key={hi} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap" dangerouslySetInnerHTML={{__html: h}} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bwRows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select value={row.bandwidth} onChange={e => updateRow(i, 'bandwidth', e.target.value)} className={inp}>
                          <option value="">Select...</option>
                          {MOCK_BANDWIDTHS.map(b => <option key={b.id}>{b.speed} {b.unit}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={row.jazeId} onChange={e => updateRow(i, 'jazeId', e.target.value)}
                          className={inp} placeholder="e.g. 42" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.tenure} onChange={e => updateRow(i, 'tenure', e.target.value)} className={inp}>
                          <option value="">Select...</option>
                          {MOCK_TENURES.map(t => <option key={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-sm">&#8377;</span>
                          <input type="number" value={row.price} onChange={e => updateRow(i, 'price', e.target.value)}
                            className={inp} placeholder="0" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.ott} onChange={e => updateRow(i, 'ott', e.target.value)} className={inp}>
                          <option value="None">None</option>
                          {MOCK_OTT.map(o => <option key={o.id}>{o.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeRow(i)} disabled={bwRows.length === 1}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow}
              className="flex items-center gap-1.5 text-[#0A8DCD] text-sm font-medium hover:text-blue-600">
              <Plus size={14} /> Add Row
            </button>
          </>
        )}

        {/* STEP 2B — Other */}
        {stepIndex === 1 && resolvedType === 'Other' && (
          <>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              Zone: <span className="font-medium">{zone}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Bind with Bandwidth Package</p>
                <p className="text-xs text-gray-500 mt-0.5">Link this add-on to a specific bandwidth package</p>
              </div>
              <Toggle value={bound} onChange={setBound} />
            </div>

            {bound ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bind Package *</label>
                  <select value={bindPkg} onChange={e => setBindPkg(e.target.value)} className={inp}>
                    <option value="">Select bandwidth package...</option>
                    {MOCK_BW_PACKAGES.map(p => <option key={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Price (&#8377;) *</label>
                  <input type="number" value={othPrice} onChange={e => setOthPrice(e.target.value)} className={inp} placeholder="0" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                  Standalone package &mdash; can be added independently to any lead
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Price (&#8377;) *</label>
                  <input type="number" value={othPrice} onChange={e => setOthPrice(e.target.value)} className={inp} placeholder="0" />
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={separateInvoice} onChange={e => setSeparateInvoice(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#0A8DCD]" />
              <div>
                <p className="text-sm font-medium text-gray-800">Separate Invoice</p>
                <p className="text-xs text-gray-500 mt-0.5">This package amount shows separately in the invoice</p>
              </div>
            </label>
          </>
        )}

        {/* STEP 3 */}
        {stepIndex === 2 && (
          <>
            {[
              { key: 'editable', val: editable, set: setEditable, title: 'Is Package Editable?',          icon: '✏️', desc: 'Allow sales team to modify price during lead stage. If Yes → approval flow triggered' },
              { key: 'landline', val: landline, set: setLandline, title: 'Landline Number Applicable?',   icon: '📞', desc: 'Does this package support landline/VOIP assignment? If Yes → shown in lead form' },
              { key: 'offer',    val: offer,    set: setOffer,    title: 'Is Offer Package?',             icon: '🎁', desc: 'Mark as introductory/special offer. Applicable once per customer only' },
            ].map(opt => (
              <div key={opt.key} className="flex items-start justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{opt.desc}</p>
                  </div>
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

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-200">
              <p className="font-semibold text-gray-700 mb-3">Summary</p>
              {[
                ['Package Name', pkgName || '—'],
                ['Zone', zone || '—'],
                ['Type', resolvedType + ' Package'],
                ['Editable', editable ? 'Yes' : 'No'],
                ['Landline', landline ? 'Yes' : 'No'],
                ['Offer', offer ? 'Yes' : 'No'],
                ['Status', active ? 'Active' : 'Inactive'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button onClick={goBack}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          {stepIndex === 0 ? 'Cancel' : '← Back'}
        </button>
        {stepIndex < 2 ? (
          <button onClick={goNext}
            disabled={stepIndex === 0 ? !step1Valid : !step2Valid}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              (stepIndex === 0 ? step1Valid : step2Valid)
                ? 'bg-[#0A8DCD] text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            Next →
          </button>
        ) : (
          <button onClick={handleSave}
            className="px-6 py-2.5 bg-[#E8541A] text-white rounded-xl text-sm font-medium hover:bg-orange-600 flex items-center gap-2">
            <CheckCircle size={15} /> Save Package
          </button>
        )}
      </div>
    </div>
  )
}
