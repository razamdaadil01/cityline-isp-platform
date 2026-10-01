import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, CheckCircle, Cpu, Wifi, WifiOff, UserX } from 'lucide-react'
import {
  getTr069Devices, subscribeTr069Devices,
} from '../data/tr069Store'
import { logAudit } from '../data/auditLogStore'
import { exportCsv } from '../utils/csvExport'

const PAGE_SIZE = 10

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatLastInform(iso) {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const day = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS[d.getMonth()]
  const yr = d.getFullYear()
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${day} ${mon}, ${yr} | ${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function rxColor(v) {
  if (v == null) return 'text-gray-500'
  if (v > -20) return 'text-emerald-600'
  if (v >= -23) return 'text-amber-500'
  return 'text-red-500'
}

export default function TR069Management() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState(getTr069Devices)
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState('All Devices')
  const [page, setPage]       = useState(1)
  const [toast, setToast]     = useState(null)

  useEffect(() => subscribeTr069Devices(setDevices), [])

  const totalDevices    = devices.length
  const onlineCount     = devices.filter(d => d.status === 'Online').length
  const offlineCount    = devices.filter(d => d.status === 'Offline').length
  const unassignedCount = devices.filter(d => d.customerId === '').length

  const tabFiltered = devices.filter(d => {
    if (tab === 'Assigned')   return d.customerId !== ''
    if (tab === 'Unassigned') return d.customerId === ''
    return true
  })
  const q = search.trim().toLowerCase()
  const filtered = tabFiltered.filter(d =>
    !q ||
    d.serialNumber.toLowerCase().includes(q) ||
    d.userId.toLowerCase().includes(q) ||
    d.ip.toLowerCase().includes(q) ||
    d.ssid.toLowerCase().includes(q) ||
    d.customerName.toLowerCase().includes(q)
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const start      = (safePage - 1) * PAGE_SIZE
  const pageRows   = filtered.slice(start, start + PAGE_SIZE)
  const from       = filtered.length === 0 ? 0 : start + 1
  const to         = Math.min(start + PAGE_SIZE, filtered.length)

  function changeTab(t) { setTab(t); setPage(1) }
  function changeSearch(v) { setSearch(v); setPage(1) }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleExport() {
    exportCsv(
      filtered,
      ['id','serialNumber','userId','customerName','productClass','softwareVersion','ip','ssid','rxPower','uptime','lastInform','status'],
      'tr069-devices'
    )
    logAudit({ module: 'Network', action: 'Export', details: `Exported ${filtered.length} TR-069 devices` })
  }

  const STAT_CARDS = [
    { label: 'Total Devices', value: totalDevices,    color: 'text-[#0A8DCD]',  bg: 'bg-blue-50',    icon: <Cpu size={18} /> },
    { label: 'Online',        value: onlineCount,     color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Wifi size={18} /> },
    { label: 'Offline',       value: offlineCount,    color: 'text-red-500',     bg: 'bg-red-50',     icon: <WifiOff size={18} /> },
    { label: 'Unassigned',    value: unassignedCount, color: 'text-amber-500',   bg: 'bg-amber-50',   icon: <UserX size={18} /> },
  ]

  return (
    <div className="p-6 space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2744]">TR-069 / ACS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage CPE devices and remote configuration</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 bg-white transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
              <span className={c.color}>{c.icon}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 gap-1">
        {['All Devices', 'Assigned', 'Unassigned'].map(t => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[#0A8DCD] text-[#0A8DCD]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => changeSearch(e.target.value)}
            placeholder="Search serial, user, IP, SSID…"
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['S.NO','SERIAL NUMBER','USER','PRODUCT CLASS','SOFTWARE VERSION','IP','SSID','RX POWER','UPTIME','LAST INFORM','STATUS'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400 text-sm">No devices found.</td>
                  </tr>
                ) : pageRows.map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500">{start + i + 1}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/network/tr069/${d.id}`)}
                        className="font-mono text-xs text-[#0A8DCD] font-semibold hover:underline whitespace-nowrap"
                      >
                        {d.serialNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {d.customerId
                        ? <span className="text-[#0A8DCD] font-medium">{d.userId}</span>
                        : <span className="text-gray-400 italic">Unassigned</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{d.productClass}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">{d.softwareVersion}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{d.ip}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{d.ssid}</td>
                    <td className={`px-4 py-3 text-xs font-semibold font-mono whitespace-nowrap ${rxColor(d.rxPower)}`}>
                      {d.rxPower != null ? `${d.rxPower}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{d.uptime}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatLastInform(d.lastInform)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/40">
            <p className="text-xs text-gray-500">Showing {from}–{to} of {filtered.length} device{filtered.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white bg-gray-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                    p === safePage ? 'bg-[#0A8DCD] text-white' : 'border border-gray-200 hover:bg-white text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}
