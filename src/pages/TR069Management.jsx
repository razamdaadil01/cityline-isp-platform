import { useState, useEffect } from 'react'
import { X, Search, Download, CheckCircle, AlertTriangle, RotateCcw, RefreshCw, AlertOctagon, Zap, Cpu, Wifi, WifiOff, UserX } from 'lucide-react'
import {
  getTr069Devices, subscribeTr069Devices,
  updateTr069Device,
} from '../data/tr069Store'
import { getAllCustomers } from '../data/customersData'
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

const ACTIONS = [
  { label: 'Reboot Device',        icon: <RotateCcw size={14} />,    cls: 'bg-amber-500 hover:bg-amber-600 text-white',            q: "Reboot this CPE device?" },
  { label: 'Re-push PPPoE Config', icon: <RefreshCw size={14} />,    cls: 'bg-[#0A8DCD] hover:bg-[#0878b0] text-white',           q: 'Re-push the PPPoE configuration to this device?' },
  { label: 'Factory Reset',        icon: <AlertOctagon size={14} />, cls: 'bg-red-500 hover:bg-red-600 text-white',                q: 'Factory reset this device? This would normally wipe all settings.' },
  { label: 'Fetch Live Stats',     icon: <Zap size={14} />,          cls: 'bg-emerald-500 hover:bg-emerald-600 text-white',        q: 'Fetch live stats from this device?' },
]

function LabelValue({ label, value, mono, colorClass }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right ${mono ? 'font-mono' : ''} ${colorClass || 'text-gray-800'}`}>{value ?? '—'}</span>
    </div>
  )
}

export default function TR069Management() {
  const [devices, setDevices]         = useState(getTr069Devices)
  const [search, setSearch]           = useState('')
  const [tab, setTab]                 = useState('All Devices')
  const [page, setPage]               = useState(1)
  const [selected, setSelected]       = useState(null)
  const [panelTab, setPanelTab]       = useState('Overview')
  const [confirmAction, setConfirmAction] = useState(null)
  const [assignOpen, setAssignOpen]   = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [toast, setToast]             = useState(null)

  useEffect(() => subscribeTr069Devices(setDevices), [])

  useEffect(() => {
    if (selected) {
      const updated = devices.find(d => d.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalDevices   = devices.length
  const onlineCount    = devices.filter(d => d.status === 'Online').length
  const offlineCount   = devices.filter(d => d.status === 'Offline').length
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

  function openPanel(device) { setSelected(device); setPanelTab('Overview') }

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

  function handleConfirmAction() {
    const a = confirmAction
    setConfirmAction(null)
    logAudit({ module: 'Network', action: 'Edit', details: `${a.label} command logged for device ${selected?.serialNumber} (no ACS integration)` })
    showToast(`${a.label} logged — no ACS integration to actually reach the device yet.`)
  }

  function handleAssign(customer) {
    if (!selected) return
    updateTr069Device(selected.id, {
      customerId:   customer.id,
      customerName: customer.name,
      userId:       customer.id,
    })
    logAudit({ module: 'Network', action: 'Edit', details: `Device ${selected.serialNumber} assigned to ${customer.name} (${customer.id})` })
    setAssignOpen(false)
    setAssignSearch('')
    showToast(`Device assigned to ${customer.name}`)
  }

  function handleUnassign() {
    if (!selected) return
    updateTr069Device(selected.id, {
      customerId:   '',
      customerName: 'Unassigned Device',
      userId:       '—',
    })
    logAudit({ module: 'Network', action: 'Edit', details: `Device ${selected.serialNumber} unassigned` })
    setUnassignOpen(false)
    showToast('Device unassigned')
  }

  const allCustomers = getAllCustomers()
  const filteredCustomers = allCustomers.filter(c =>
    !assignSearch ||
    c.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    c.id.toLowerCase().includes(assignSearch.toLowerCase())
  )

  const STAT_CARDS = [
    { label: 'Total Devices', value: totalDevices,    color: 'text-[#0A8DCD]',  bg: 'bg-blue-50',    icon: <Cpu size={18} /> },
    { label: 'Online',        value: onlineCount,     color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Wifi size={18} /> },
    { label: 'Offline',       value: offlineCount,    color: 'text-red-500',     bg: 'bg-red-50',     icon: <WifiOff size={18} /> },
    { label: 'Unassigned',    value: unassignedCount, color: 'text-amber-500',   bg: 'bg-amber-50',   icon: <UserX size={18} /> },
  ]

  const PANEL_TABS = ['Overview', 'WAN', 'LAN', 'Actions']

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

      {/* Table + Side Panel */}
      <div className="flex gap-4 items-start">

        {/* Table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                  <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${selected?.id === d.id ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{start + i + 1}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openPanel(d)}
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

        {/* Device Detail Side Panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col self-start">

            {/* Panel Header */}
            <div className="flex items-start justify-between px-4 py-3.5 border-b border-gray-200">
              <div className="min-w-0">
                <p className="text-xs font-mono font-bold text-[#0A8DCD] truncate">{selected.serialNumber}</p>
                <div className="mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {selected.customerId ? (
                  <button
                    onClick={() => setUnassignOpen(true)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    Unassign
                  </button>
                ) : (
                  <button
                    onClick={() => { setAssignOpen(true); setAssignSearch('') }}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#0A8DCD] text-[#0A8DCD] hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    Assign
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Inner Tab Bar */}
            <div className="flex border-b border-gray-200">
              {PANEL_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setPanelTab(t)}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                    panelTab === t
                      ? 'border-[#0A8DCD] text-[#0A8DCD]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {panelTab === 'Overview' && (
                <div>
                  <LabelValue label="Model"       value={selected.model} />
                  <LabelValue label="Firmware"    value={selected.firmware} mono />
                  <LabelValue label="Hardware"    value={selected.hardware} mono />
                  <LabelValue label="MAC Address" value={selected.mac} mono />
                  <LabelValue label="Last Seen"   value={formatLastInform(selected.lastInform)} />
                  <LabelValue label="Uptime"      value={selected.uptime} />
                  <LabelValue label="IP Address"  value={selected.ip} mono />
                  <LabelValue label="SSID"        value={selected.ssid} />
                  <LabelValue
                    label="RX Power"
                    value={selected.rxPower != null ? `${selected.rxPower} dBm` : '—'}
                    mono
                    colorClass={rxColor(selected.rxPower)}
                  />
                  {selected.customerId && (
                    <LabelValue label="Customer" value={selected.customerName} />
                  )}
                </div>
              )}

              {panelTab === 'WAN' && (
                <div>
                  <LabelValue label="WAN IP"          value={selected.ip} mono />
                  <LabelValue label="Gateway"         value={selected.gateway} mono />
                  <LabelValue label="DNS Primary"     value={selected.dnsPrimary} mono />
                  <LabelValue label="DNS Secondary"   value={selected.dnsSecondary} mono />
                  <LabelValue label="Connection Type" value={selected.connectionType} />
                  <LabelValue
                    label="Status"
                    value={selected.status}
                    colorClass={selected.status === 'Online' ? 'text-emerald-600' : 'text-red-500'}
                  />
                </div>
              )}

              {panelTab === 'LAN' && (
                <div>
                  <LabelValue label="LAN IP"            value={selected.lanIp} mono />
                  <LabelValue label="Subnet Mask"       value={selected.subnet} mono />
                  <LabelValue
                    label="DHCP"
                    value={selected.dhcp}
                    colorClass={selected.dhcp === 'Enabled' ? 'text-emerald-600' : 'text-gray-800'}
                  />
                  <LabelValue label="Connected Devices" value={String(selected.connectedDevices)} colorClass="text-[#0A8DCD]" />
                  <LabelValue
                    label="WiFi 2.4GHz"
                    value={selected.wifi24}
                    colorClass={selected.wifi24 === 'Enabled' ? 'text-emerald-600' : 'text-gray-500'}
                  />
                  <LabelValue
                    label="WiFi 5GHz"
                    value={selected.wifi5}
                    colorClass={selected.wifi5 === 'Enabled' ? 'text-emerald-600' : 'text-gray-500'}
                  />
                </div>
              )}

              {panelTab === 'Actions' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-400 mb-3">Send a command to this CPE device via TR-069.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTIONS.map(a => (
                      <button
                        key={a.label}
                        onClick={() => setConfirmAction(a)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${a.cls}`}
                      >
                        {a.icon}
                        <span className="text-center leading-tight">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">{confirmAction.label}</h2>
              <button onClick={() => setConfirmAction(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">{confirmAction.q}</p>
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                No ACS backend connected. Confirming logs this command to the Audit Log — it is not actually sent to a device.
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0] flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} /> Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Customer Modal */}
      {assignOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Assign to Customer</h2>
              <button onClick={() => setAssignOpen(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Search customer…"
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30"
                />
              </div>
              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-center text-gray-400">No customers found</p>
                ) : filteredCustomers.slice(0, 50).map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAssign(c)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.id}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setAssignOpen(false)}
                className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Confirm Modal */}
      {unassignOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Unassign Device</h2>
              <button onClick={() => setUnassignOpen(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Remove the assignment of device{' '}
                <span className="font-mono font-semibold text-[#0A8DCD]">{selected?.serialNumber}</span>{' '}
                from customer <strong>{selected?.customerName}</strong>?
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setUnassignOpen(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnassign}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Unassign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
