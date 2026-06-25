import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const EMPTY_ROW = { bandwidth: '', jazeId: '', tenure: '', price: '', ott: 'None' }

export default function PackageAdd() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(false)

  // Plan Type
  const [pkgType, setPkgType] = useState('Bandwidth')

  // Basic Details
  const [zone, setZone] = useState('')
  const [pkgName, setPkgName] = useState('')

  // Bandwidth pricing rows
  const [bwRows, setBwRows] = useState([{ ...EMPTY_ROW }])

  // Other package fields
  const [bound, setBound] = useState(false)
  const [bindPkg, setBindPkg] = useState('')
  const [othPrice, setOthPrice] = useState('')
  const [separateInvoice, setSeparateInvoice] = useState(false)

  // Settings
  const [editable, setEditable] = useState(false)
  const [landline, setLandline] = useState(false)
  const [offer, setOffer] = useState(false)
  const [active, setActive] = useState(true)

  const addRow = () => setBwRows(r => [...r, { ...EMPTY_ROW }])
  const removeRow = (i) => setBwRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i, field, val) => setBwRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const canSave = zone && pkgName.trim() && (
    pkgType === 'Bandwidth'
      ? bwRows.every(r => r.bandwidth && r.jazeId && r.tenure && r.price)
      : (bound ? (bindPkg && othPrice) : !!othPrice)
  )

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
        <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to create a new package</p>
      </div>

      {/* ── Plan Type ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Plan Type</p>
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

      {/* ── Basic Details ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Details</p>

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
          <label className="block text-xs font-medium text-gray-500 mb-1">Package Name *</label>
          <input value={pkgName} onChange={e => setPkgName(e.target.value)} className={inp}
            placeholder="e.g. Sonic 100, Home Basic" />
        </div>
      </div>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pricing</p>

        {pkgType === 'Bandwidth' && (
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

        {pkgType === 'Other' && (
          <>
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
      </div>

      {/* ── Settings ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Settings</p>

        {[
          { key: 'editable', val: editable, set: setEditable, title: 'Is Package Editable?',        icon: '✏️', desc: 'Allow sales team to modify price during lead stage. If Yes → approval flow triggered' },
          { key: 'landline', val: landline, set: setLandline, title: 'Landline Number Applicable?', icon: '📞', desc: 'Does this package support landline/VOIP assignment? If Yes → shown in lead form' },
          { key: 'offer',    val: offer,    set: setOffer,    title: 'Is Offer Package?',           icon: '🎁', desc: 'Mark as introductory/special offer. Applicable once per customer only' },
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
      </div>

      {/* ── Footer Buttons ────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => navigate('/packages')}
          className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!canSave}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            canSave ? 'bg-[#E8541A] text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          <CheckCircle size={15} /> Save Package
        </button>
      </div>
    </div>
  )
}
