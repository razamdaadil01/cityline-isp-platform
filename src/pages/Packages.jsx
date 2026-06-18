import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, CheckCircle, Wifi, Box, Plus, Search, Filter, MoreVertical, X, Info } from 'lucide-react'
import {
  MOCK_BW_PACKAGES, MOCK_OTHER_PACKAGES,
  MOCK_TENURES, MOCK_BANDWIDTHS, MOCK_OTT,
} from '../data/packagesStore'

// ── Shared UI ────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
    {status === 'active' ? 'Active' : 'Inactive'}
  </span>
)

const YN = ({ value, yesClass }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${value ? yesClass : 'bg-gray-100 text-gray-500'}`}>{value ? 'Yes' : 'No'}</span>
)

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors ${value ? 'bg-[#0A8DCD]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

function ThreeDotMenu({ items }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-gray-100">
        <MoreVertical size={15} className="text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-44 text-sm">
            {items.map(item => (
              <button key={item.label} onClick={() => { item.onClick(); setOpen(false) }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${item.danger ? 'text-red-600' : 'text-gray-700'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const FLD = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    {children}
  </div>
)

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"

// ── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Bandwidth Packages', 'Other Packages', 'Tenure Management', 'Bandwidth Management', 'OTT Management']

export default function Packages() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Bandwidth Packages')

  // Bandwidth packages state
  const [bwPkgs, setBwPkgs] = useState(MOCK_BW_PACKAGES)
  const [bwSearch, setBwSearch] = useState('')
  const [bwZone, setBwZone] = useState('All')

  // Other packages state
  const [othPkgs, setOthPkgs] = useState(MOCK_OTHER_PACKAGES)
  const [othSearch, setOthSearch] = useState('')

  // Tenure state
  const [tenures, setTenures] = useState(MOCK_TENURES)
  const [tenureModal, setTenureModal] = useState(false)
  const [tenureForm, setTenureForm] = useState({ name: '', months: '', discount: '', status: true })

  // Bandwidth state
  const [bandwidths, setBandwidths] = useState(MOCK_BANDWIDTHS)
  const [bwModal, setBwModal] = useState(false)
  const [bwForm, setBwForm] = useState({ name: '', download: '', upload: '', unit: 'Mbps', status: true })

  // OTT state
  const [otts, setOtts] = useState(MOCK_OTT)
  const [ottModal, setOttModal] = useState(false)
  const [ottForm, setOttForm] = useState({ name: '', provider: 'Playbox', channels: '', price: '', status: true })

  const totalPkgs = bwPkgs.length + othPkgs.length
  const activePkgs = bwPkgs.filter(p => p.status === 'active').length + othPkgs.filter(p => p.status === 'active').length

  const filteredBw = bwPkgs.filter(p => {
    const mz = bwZone === 'All' || p.zone === bwZone
    const ms = !bwSearch || p.name.toLowerCase().includes(bwSearch.toLowerCase())
    return mz && ms
  })

  const filteredOth = othPkgs.filter(p =>
    !othSearch || p.name.toLowerCase().includes(othSearch.toLowerCase())
  )

  const addTenure = () => {
    if (!tenureForm.name || !tenureForm.months) return
    setTenures(t => [...t, { id: 't' + Date.now(), ...tenureForm, months: Number(tenureForm.months), discount: Number(tenureForm.discount || 0), status: tenureForm.status ? 'active' : 'inactive' }])
    setTenureModal(false)
    setTenureForm({ name: '', months: '', discount: '', status: true })
  }

  const addBw = () => {
    if (!bwForm.name) return
    setBandwidths(b => [...b, { id: 'bw' + Date.now(), ...bwForm, download: Number(bwForm.download), upload: Number(bwForm.upload), status: bwForm.status ? 'active' : 'inactive' }])
    setBwModal(false)
    setBwForm({ name: '', download: '', upload: '', unit: 'Mbps', status: true })
  }

  const addOtt = () => {
    if (!ottForm.name) return
    setOtts(o => [...o, { id: 'ott' + Date.now(), ...ottForm, channels: Number(ottForm.channels || 0), price: Number(ottForm.price || 0), status: ottForm.status ? 'active' : 'inactive' }])
    setOttModal(false)
    setOttForm({ name: '', provider: 'Playbox', channels: '', price: '', status: true })
  }

  // Flatten bwpkg into rows for table rendering
  function getBwRows(pkg) {
    const rows = []
    ;(pkg.bandwidths || []).forEach(bwEntry => {
      ;(bwEntry.tenures || []).forEach(tEntry => {
        rows.push({ bandwidth: bwEntry.bandwidth, tenure: tEntry.tenure, price: tEntry.price, mrp: tEntry.mrp })
      })
    })
    // fallback for old rows-based data
    if (rows.length === 0 && pkg.rows) {
      pkg.rows.forEach(r => rows.push({ bandwidth: r.bandwidth, tenure: r.tenure, price: r.price, mrp: r.mrp }))
    }
    return rows
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2744]">Package &amp; Plan Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage service plans and configurations</p>
        </div>
        <button onClick={() => navigate('/packages/add')}
          className="flex items-center gap-2 bg-[#E8541A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
          <Plus size={16} /> Add Package
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Packages',     value: totalPkgs,      icon: Package,     bg: 'bg-blue-50',   ic: 'text-blue-600' },
          { label: 'Active',             value: activePkgs,     icon: CheckCircle, bg: 'bg-green-50',  ic: 'text-green-600' },
          { label: 'Bandwidth Packages', value: bwPkgs.length,  icon: Wifi,        bg: 'bg-indigo-50', ic: 'text-indigo-600' },
          { label: 'Other Packages',     value: othPkgs.length, icon: Box,         bg: 'bg-orange-50', ic: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
            <span className={`p-2.5 rounded-xl ${s.bg}`}><s.icon size={18} className={s.ic} /></span>
            <div>
              <p className="text-2xl font-bold text-[#0F2744]">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t ? 'bg-white shadow-sm text-[#0F2744]' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB 1: BANDWIDTH PACKAGES ── */}
      {activeTab === 'Bandwidth Packages' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={bwZone} onChange={e => setBwZone(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="All">All Zones</option>
              <option>Residential</option>
              <option>Enterprise</option>
              <option>SME</option>
              <option>Government</option>
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={bwSearch} onChange={e => setBwSearch(e.target.value)}
                placeholder="Search by name..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none" />
            </div>
            <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <Filter size={14} /> Filter
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Package Name','Zone','Bandwidth','Tenure','Price','MRP','Subscribers','Landline','Static IP','OTT','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBw.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-10 text-gray-400">No packages found</td></tr>
                  ) : filteredBw.map(pkg => {
                    const rows = getBwRows(pkg)
                    return rows.map((row, ri) => (
                      <tr key={`${pkg.id}-${ri}`} className="hover:bg-gray-50">
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 font-semibold text-[#0F2744] align-top border-r border-gray-100">{pkg.name}</td>}
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 text-gray-600 align-top border-r border-gray-100">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{pkg.zone}</span>
                        </td>}
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.bandwidth}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.tenure}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">&#8377;{Number(row.price).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.mrp ? <>&#8377;{Number(row.mrp).toLocaleString('en-IN')}</> : '—'}</td>
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 align-top text-gray-600">{pkg.subscribers ?? '—'}</td>}
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 align-top"><YN value={pkg.landlineEnabled || pkg.landline} yesClass="bg-blue-100 text-blue-700" /></td>}
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 align-top"><YN value={pkg.staticIpEnabled} yesClass="bg-purple-100 text-purple-700" /></td>}
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 align-top"><YN value={pkg.ottEnabled} yesClass="bg-orange-100 text-orange-700" /></td>}
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 align-top"><StatusBadge status={pkg.status} /></td>}
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-3 align-top">
                          <ThreeDotMenu items={[
                            { label: 'Edit Package', onClick: () => {} },
                            { label: pkg.status === 'active' ? 'Deactivate' : 'Activate', onClick: () => setBwPkgs(prev => prev.map(p => p.id === pkg.id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p)) },
                            { label: 'Delete', danger: true, onClick: () => setBwPkgs(prev => prev.filter(p => p.id !== pkg.id)) },
                          ]} />
                        </td>}
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: OTHER PACKAGES ── */}
      {activeTab === 'Other Packages' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={othSearch} onChange={e => setOthSearch(e.target.value)}
                placeholder="Search packages..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none" />
            </div>
            <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <Filter size={14} /> Filter
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Package Name','Type','Price','Taxable','Bound Package','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOth.map(pkg => (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-[#0F2744]">{pkg.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pkg.type === 'one-time' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {pkg.type === 'one-time' ? 'One-time' : 'Recurring'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">&#8377;{pkg.price.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><YN value={pkg.taxable} yesClass="bg-green-100 text-green-700" /></td>
                      <td className="px-4 py-3">
                        {(pkg.boundPackage || pkg.bindPackage)
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{pkg.boundPackage || pkg.bindPackage}</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Standalone</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={pkg.status} /></td>
                      <td className="px-4 py-3">
                        <ThreeDotMenu items={[
                          { label: 'Edit Package', onClick: () => {} },
                          { label: pkg.status === 'active' ? 'Deactivate' : 'Activate', onClick: () => setOthPkgs(prev => prev.map(p => p.id === pkg.id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p)) },
                          { label: 'Delete', danger: true, onClick: () => setOthPkgs(prev => prev.filter(p => p.id !== pkg.id)) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: TENURE MANAGEMENT ── */}
      {activeTab === 'Tenure Management' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0F2744]">Tenure Management</h2>
              <p className="text-sm text-gray-500">Define billing tenure options</p>
            </div>
            <button onClick={() => setTenureModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              <Plus size={14} /> Add Tenure
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['ID','Tenure Name','Months','Discount %','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenures.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.months}</td>
                    <td className="px-4 py-3 text-gray-600">{t.discount ?? 0}%</td>
                    <td className="px-4 py-3">
                      <Toggle value={t.status === 'active' || t.status === 'Active'} onChange={v => setTenures(prev => prev.map(x => x.id === t.id ? { ...x, status: v ? 'active' : 'inactive' } : x))} />
                    </td>
                    <td className="px-4 py-3">
                      <ThreeDotMenu items={[
                        { label: 'Edit', onClick: () => {} },
                        { label: 'Delete', danger: true, onClick: () => setTenures(prev => prev.filter(x => x.id !== t.id)) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal open={tenureModal} onClose={() => setTenureModal(false)} title="Add Tenure">
            <div className="space-y-4">
              <FLD label="Tenure Name *"><input value={tenureForm.name} onChange={e => setTenureForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="e.g. 3 Months" /></FLD>
              <FLD label="Total Months *"><input type="number" value={tenureForm.months} onChange={e => setTenureForm(f => ({...f, months: e.target.value}))} className={inp} placeholder="e.g. 3" /></FLD>
              <FLD label="Discount %"><input type="number" value={tenureForm.discount} onChange={e => setTenureForm(f => ({...f, discount: e.target.value}))} className={inp} placeholder="e.g. 5" /></FLD>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <Toggle value={tenureForm.status} onChange={v => setTenureForm(f => ({...f, status: v}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTenureModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addTenure} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add Tenure</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ── TAB 4: BANDWIDTH MANAGEMENT ── */}
      {activeTab === 'Bandwidth Management' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0F2744]">Bandwidth Management</h2>
              <p className="text-sm text-gray-500">Define available bandwidth options</p>
            </div>
            <button onClick={() => setBwModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              <Plus size={14} /> Add Bandwidth
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Name','Download','Upload','Unit','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bandwidths.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.name || `${b.speed} ${b.unit}`}</td>
                    <td className="px-4 py-3 text-gray-600">{b.download ?? b.speed} {b.unit}</td>
                    <td className="px-4 py-3 text-gray-600">{b.upload ?? b.speed} {b.unit}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{b.unit}</span></td>
                    <td className="px-4 py-3">
                      <Toggle value={b.status === 'active' || b.status === 'Active'} onChange={v => setBandwidths(prev => prev.map(x => x.id === b.id ? { ...x, status: v ? 'active' : 'inactive' } : x))} />
                    </td>
                    <td className="px-4 py-3">
                      <ThreeDotMenu items={[
                        { label: 'Edit', onClick: () => {} },
                        { label: 'Delete', danger: true, onClick: () => setBandwidths(prev => prev.filter(x => x.id !== b.id)) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal open={bwModal} onClose={() => setBwModal(false)} title="Add Bandwidth">
            <div className="space-y-4">
              <FLD label="Name *"><input value={bwForm.name} onChange={e => setBwForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="e.g. 100 Mbps" /></FLD>
              <div className="grid grid-cols-2 gap-3">
                <FLD label="Download *"><input type="number" value={bwForm.download} onChange={e => setBwForm(f => ({...f, download: e.target.value}))} className={inp} placeholder="e.g. 100" /></FLD>
                <FLD label="Upload *"><input type="number" value={bwForm.upload} onChange={e => setBwForm(f => ({...f, upload: e.target.value}))} className={inp} placeholder="e.g. 100" /></FLD>
              </div>
              <FLD label="Unit *">
                <select value={bwForm.unit} onChange={e => setBwForm(f => ({...f, unit: e.target.value}))} className={inp}>
                  <option>Mbps</option><option>Gbps</option>
                </select>
              </FLD>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <Toggle value={bwForm.status} onChange={v => setBwForm(f => ({...f, status: v}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setBwModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addBw} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add Bandwidth</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ── TAB 5: OTT MANAGEMENT ── */}
      {activeTab === 'OTT Management' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">Playbox API integration will be configured by the backend team</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#0F2744]">OTT Management</h2>
              <p className="text-sm text-gray-500">Manage OTT platform packages</p>
            </div>
            <button onClick={() => setOttModal(true)}
              className="flex items-center gap-1.5 bg-[#0A8DCD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              <Plus size={14} /> Add OTT Package
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['OTT Name','Provider','Channels','Price','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otts.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{o.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{o.provider}</span></td>
                    <td className="px-4 py-3 text-gray-600">{o.channels ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{o.price != null ? <>&#8377;{o.price}</> : '—'}</td>
                    <td className="px-4 py-3">
                      <Toggle value={o.status === 'active' || o.status === 'Active'} onChange={v => setOtts(prev => prev.map(x => x.id === o.id ? { ...x, status: v ? 'active' : 'inactive' } : x))} />
                    </td>
                    <td className="px-4 py-3">
                      <ThreeDotMenu items={[
                        { label: 'Edit', onClick: () => {} },
                        { label: 'Delete', danger: true, onClick: () => setOtts(prev => prev.filter(x => x.id !== o.id)) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal open={ottModal} onClose={() => setOttModal(false)} title="Add OTT Package">
            <div className="space-y-4">
              <FLD label="OTT Package Name *"><input value={ottForm.name} onChange={e => setOttForm(f => ({...f, name: e.target.value}))} className={inp} placeholder="e.g. Cityline TV Premium" /></FLD>
              <FLD label="Provider">
                <select value={ottForm.provider} onChange={e => setOttForm(f => ({...f, provider: e.target.value}))} className={inp}>
                  <option>Playbox</option><option>Other</option>
                </select>
              </FLD>
              <FLD label="Channels"><input type="number" value={ottForm.channels} onChange={e => setOttForm(f => ({...f, channels: e.target.value}))} className={inp} placeholder="e.g. 200" /></FLD>
              <FLD label="Price (₹)"><input type="number" value={ottForm.price} onChange={e => setOttForm(f => ({...f, price: e.target.value}))} className={inp} placeholder="e.g. 299" /></FLD>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Active</span>
                <Toggle value={ottForm.status} onChange={v => setOttForm(f => ({...f, status: v}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setOttModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addOtt} className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add OTT Package</button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
