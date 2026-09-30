import { useState, useEffect } from 'react'
import { X, Search, Download, CheckCircle, AlertTriangle, RotateCcw, RefreshCw, AlertOctagon, Zap } from 'lucide-react'
import Button from '../components/ui/Button'
import {
  getTr069Devices, subscribeTr069Devices,
  updateTr069Device, getOnlineCount, getOfflineCount,
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

function StatusPill({ status }) {
  const online = status === 'Online'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${online ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${online ? 'bg-emerald-500' : 'bg-red-400'}`} />
      {status}
    </span>
  )
}

function DetailRow({ label, value, mono, colorClass }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface-border pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right ${mono ? 'font-mono' : ''} ${colorClass || 'text-gray-800'}`}>{value ?? '—'}</span>
    </div>
  )
}

export default function TR069Management() {
  const [devices, setDevices] = useState(getTr069Devices)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('All Device')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [panelTab, setPanelTab] = useState('Overview')
  const [confirmAction, setConfirmAction] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => subscribeTr069Devices(setDevices), [])

  // sync selected when store updates
  useEffect(() => {
    if (selected) {
      const updated = devices.find(d => d.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  const onlineCount = devices.filter(d => d.status === 'Online').length
  const offlineCount = devices.filter(d => d.status === 'Offline').length

  const q = search.toLowerCase()
  const tabFiltered = devices.filter(d => {
    if (tab === 'Assigned Device') return d.customerId !== ''
    if (tab === 'Unassigned Device') return d.customerId === ''
    return true
  })
  const filtered = tabFiltered.filter(d =>
    !q ||
    d.serialNumber.toLowerCase().includes(q) ||
    d.userId.toLowerCase().includes(q) ||
    d.ip.toLowerCase().includes(q) ||
    d.ssid.toLowerCase().includes(q) ||
    d.customerName.toLowerCase().includes(q)
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)

  function changeTab(t) { setTab(t); setPage(1) }
  function changeSearch(v) { setSearch(v); setPage(1) }

  function openPanel(device) {
    setSelected(device)
    setPanelTab('Overview')
  }

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

  // Actions panel
  const ACTIONS = [
    { label: 'Reboot Device',       icon: <RotateCcw size={14} />,   cls: 'bg-amber-500 hover:bg-amber-600 text-white',   q: "Reboot this CPE device?" },
    { label: 'Re-push PPPoE Config', icon: <RefreshCw size={14} />,   cls: 'bg-brand-blue hover:bg-blue-700 text-white',  q: 'Re-push the PPPoE configuration to this device?' },
    { label: 'Factory Reset',        icon: <AlertOctagon size={14} />, cls: 'bg-red-500 hover:bg-red-600 text-white',       q: 'Factory reset this device? This would normally wipe all settings.' },
    { label: 'Fetch Live Stats',     icon: <Zap size={14} />,          cls: 'bg-emerald-500 hover:bg-emerald-600 text-white', q: 'Fetch live stats from this device?' },
  ]

  function handleConfirmAction() {
    const a = confirmAction
    setConfirmAction(null)
    logAudit({ module: 'Network', action: 'Edit', details: `${a.label} command logged for device ${selected?.serialNumber} (no ACS integration)` })
    showToast(`${a.label} logged — no ACS integration to actually reach the device yet.`)
  }

  function handleAssign(customer) {
    if (!selected) return
    updateTr069Device(selected.id, {
      customerId: customer.id,
      customerName: customer.name,
      userId: customer.id,
    })
    logAudit({ module: 'Network', action: 'Edit', details: `Device ${selected.serialNumber} assigned to customer ${customer.name} (${customer.id})` })
    setAssignOpen(false)
    setAssignSearch('')
    showToast(`Device assigned to ${customer.name}`)
  }

  function handleUnassign() {
    if (!selected) return
    updateTr069Device(selected.id, {
      customerId: '',
      customerName: 'Unassigned Device',
      userId: '—',
    })
    logAudit({ module: 'Network', action: 'Edit', details: `Device ${selected.serialNumber} unassigned` })
    setUnassignOpen(false)
    showToast('Device unassigned')
  }

  const allCustomers = getAllCustomers()
  const filteredCustomers = allCustomers.filter(c =>
    !assignSearch || c.name.toLowerCase().includes(assignSearch.toLowerCase()) || c.id.toLowerCase().includes(assignSearch.toLowerCase())
  )

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
          <h1 className="text-xl font-bold text-gray-900">TR-069 / ACS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage CPE devices and remote configuration</p>
        </div>
      </div>

      {/* Online / Offline Banner */}
      <div className="flex rounded-xl overflow-hidden shadow-card">
        <div className="flex-1 bg-emerald-500 px-6 py-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-white/60 inline-block" />
          <span className="text-white font-bold text-base">Total Online Device: {onlineCount}</span>
        </div>
        <div className="flex-1 bg-red-500 px-6 py-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-white/60 inline-block" />
          <span className="text-white font-bold text-base">Total Offline Device: {offlineCount}</span>
        </div>
      </div>

      {/* Search + Export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => changeSearch(e.target.value)}
            placeholder="Search serial, user, IP, SSID…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {/* Tabs + Table + Panel */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
          {/* Tab Group */}
          <div className="flex border-b border-surface-border px-4 pt-3 gap-1">
            {['All Device', 'Assigned Device', 'Unassigned Device'].map(t => (
              <button
                key={t}
                onClick={() => changeTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-surface-border">
                  {['S.NO','SERIAL NUMBER','USER','PRODUCT CLASS','SOFTWARE VERSION','IP','SSID','RX POWER','UPTIME','LAST INFORM','STATUS'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">No devices found</td>
                  </tr>
                ) : pageRows.map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-gray-500">{start + i + 1}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => openPanel(d)}
                        className="font-mono text-brand-blue text-xs font-semibold hover:underline"
                      >
                        {d.serialNumber}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {d.customerId
                        ? <span className="text-brand-blue font-medium">{d.userId}</span>
                        : <span className="text-gray-400">Unassigned Device</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700">{d.productClass}</td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-700">{d.softwareVersion}</td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-700">{d.ip}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{d.ssid}</td>
                    <td className={`px-3 py-3 text-xs font-semibold font-mono ${rxColor(d.rxPower)}`}>{d.rxPower ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{d.uptime}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{formatLastInform(d.lastInform)}</td>
                    <td className="px-3 py-3"><StatusPill status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
              <p className="text-xs text-gray-500">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} devices
              </p>
              <div className="flex gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-7 rounded-lg text-xs font-medium ${page === i + 1 ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-gray-50 text-gray-700'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Device Detail Side Panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-xl shadow-card border border-surface-border flex flex-col">
            {/* Panel Header */}
            <div className="flex items-start justify-between px-4 py-3 border-b border-surface-border">
              <div className="min-w-0">
                <p className="text-xs font-mono font-semibold text-brand-blue truncate">{selected.serialNumber}</p>
                <div className="mt-1"><StatusPill status={selected.status} /></div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {selected.customerId
                  ? (
                    <button
                      onClick={() => setUnassignOpen(true)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Unassign
                    </button>
                  ) : (
                    <button
                      onClick={() => { setAssignOpen(true); setAssignSearch('') }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-brand-blue text-brand-blue hover:bg-blue-50 transition-colors"
                    >
                      Assign
                    </button>
                  )
                }
                <button
                  onClick={() => setSelected(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Inner Tabs */}
            <div className="flex border-b border-surface-border px-2 pt-2 gap-0.5">
              {['Overview','WAN','LAN','Actions'].map(t => (
                <button
                  key={t}
                  onClick={() => setPanelTab(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-t transition-colors ${panelTab === t ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {panelTab === 'Overview' && (
                <>
                  <DetailRow label="Model"         value={selected.model} />
                  <DetailRow label="Firmware"       value={selected.firmware} mono />
                  <DetailRow label="Hardware"       value={selected.hardware} mono />
                  <DetailRow label="MAC Address"    value={selected.mac} mono />
                  <DetailRow label="Last Seen"      value={formatLastInform(selected.lastInform)} />
                  <DetailRow label="Uptime"         value={selected.uptime} />
                  <DetailRow label="IP Address"     value={selected.ip} mono />
                  <DetailRow label="SSID"           value={selected.ssid} />
                  <DetailRow label="RX Power"       value={selected.rxPower != null ? `${selected.rxPower} dBm` : '—'} mono colorClass={rxColor(selected.rxPower)} />
                  {selected.customerId && (
                    <DetailRow label="Customer"     value={selected.customerName} />
                  )}
                </>
              )}
              {panelTab === 'WAN' && (
                <>
                  <DetailRow label="WAN IP"          value={selected.ip} mono />
                  <DetailRow label="Gateway"         value={selected.gateway} mono />
                  <DetailRow label="DNS Primary"     value={selected.dnsPrimary} mono />
                  <DetailRow label="DNS Secondary"   value={selected.dnsSecondary} mono />
                  <DetailRow label="Connection Type" value={selected.connectionType} />
                  <DetailRow label="Status"          value={selected.status} colorClass={selected.status === 'Online' ? 'text-emerald-600' : 'text-red-500'} />
                </>
              )}
              {panelTab === 'LAN' && (
                <>
                  <DetailRow label="LAN IP"              value={selected.lanIp} mono />
                  <DetailRow label="Subnet Mask"         value={selected.subnet} mono />
                  <DetailRow label="DHCP"                value={selected.dhcp} colorClass={selected.dhcp === 'Enabled' ? 'text-emerald-600' : 'text-gray-800'} />
                  <DetailRow label="Connected Devices"   value={String(selected.connectedDevices)} colorClass="text-brand-blue" />
                  <DetailRow label="WiFi 2.4GHz"         value={selected.wifi24} colorClass={selected.wifi24 === 'Enabled' ? 'text-emerald-600' : 'text-gray-500'} />
                  <DetailRow label="WiFi 5GHz"           value={selected.wifi5}  colorClass={selected.wifi5  === 'Enabled' ? 'text-emerald-600' : 'text-gray-500'} />
                </>
              )}
              {panelTab === 'Actions' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-500 mb-1">Send a command to this CPE device via TR-069.</p>
                  {ACTIONS.map(a => (
                    <button
                      key={a.label}
                      onClick={() => setConfirmAction(a)}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${a.cls}`}
                    >
                      {a.icon}
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">{confirmAction.label}</h3>
            <p className="text-sm text-gray-600">{confirmAction.q}</p>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              No ACS backend connected. Confirming logs this command to the Audit Log — it is not actually sent to a device.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmAction}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Customer Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Assign to Customer</h3>
              <button onClick={() => setAssignOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400"><X size={13} /></button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                placeholder="Search customer…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border border-surface-border rounded-lg divide-y divide-surface-border">
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
                    <p className="text-xs text-gray-400">{c.id}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Confirm Modal */}
      {unassignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Unassign Device</h3>
            <p className="text-sm text-gray-600">
              Remove the assignment of device <span className="font-mono font-semibold text-brand-blue">{selected?.serialNumber}</span> from customer <strong>{selected?.customerName}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setUnassignOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleUnassign}>Unassign</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
