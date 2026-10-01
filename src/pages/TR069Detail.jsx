import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, Wifi, Activity, Signal,
  Cpu, Server, Zap, RotateCcw, RefreshCw, AlertOctagon, Phone,
  ClipboardList, Users, X,
} from 'lucide-react'
import { getTr069Devices, subscribeTr069Devices } from '../data/tr069Store'
import { logAudit } from '../data/auditLogStore'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip as RechartTooltip,
} from 'recharts'

const TR069_INNER_TABS = ['Overview', 'Tasks', 'Faults', 'Network & Wi-Fi', 'Connected Clients', 'Diagnostics', 'Maintenance', 'VoIP']

function rxPowerSignal(rxPower) {
  if (rxPower > -20) return { label: 'Good',     color: 'text-emerald-600', dot: 'bg-emerald-500' }
  if (rxPower >= -25) return { label: 'Warning',  color: 'text-amber-500',   dot: 'bg-amber-400'   }
  return                     { label: 'Critical', color: 'text-red-500',     dot: 'bg-red-400'     }
}

function rxLineColor(rxPower) {
  if (rxPower > -27) return '#16a34a'
  if (rxPower >= -30) return '#f59e0b'
  return '#ef4444'
}

function formatLastInform(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dd  = String(d.getDate()).padStart(2, '0')
  const mon = months[d.getMonth()]
  const hh  = String(d.getHours()).padStart(2, '0')
  const mm  = String(d.getMinutes()).padStart(2, '0')
  return `${dd} ${mon}, ${hh}:${mm}`
}

function buildOpticalChartData(rxPower) {
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, dBm: rxPower }))
}

function rxPowerBarPct(rxPower) {
  const clamped = Math.max(-30, Math.min(-10, rxPower))
  return Math.round(((clamped - (-30)) / 20) * 100)
}

function FieldRow({ label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-mono font-semibold text-gray-800">{children}</span>
    </div>
  )
}

function GridField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-mono font-semibold text-gray-800 truncate">{value ?? '—'}</p>
    </div>
  )
}

export default function TR069Detail() {
  const { id, tab: tabParam } = useParams()
  const navigate = useNavigate()

  const [devices, setDevices]           = useState(getTr069Devices)
  const [innerTab, setInnerTab]         = useState(tabParam || 'Overview')
  const [confirmAction, setConfirmAction] = useState(null)
  const [toast, setToast]               = useState(null)

  useEffect(() => subscribeTr069Devices(setDevices), [])

  const device = devices.find(d => d.id === id)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleConfirmAction() {
    const action = confirmAction
    setConfirmAction(null)
    logAudit({ module: 'Network', action: 'Edit', details: `${action.label} command logged for device ${device.serialNumber} (no ACS integration)` })
    showToast(`${action.label} logged — no ACS integration to actually reach the device yet.`)
  }

  if (!device) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24 gap-4">
        <Cpu size={40} className="text-gray-300" />
        <p className="text-sm text-gray-500">Device not found.</p>
        <button
          onClick={() => navigate('/network/tr069')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={14} /> Back to TR-069 / ACS
        </button>
      </div>
    )
  }

  const signal    = rxPowerSignal(device.rxPower)
  const chartData = buildOpticalChartData(device.rxPower)
  const lineColor = rxLineColor(device.rxPower)
  const barPct    = rxPowerBarPct(device.rxPower)
  const isOnline  = device.status === 'Online'

  const actions = [
    {
      label: 'Reboot Device',
      icon: <RotateCcw size={13} />,
      iconLg: <RotateCcw size={20} />,
      style: 'bg-amber-500 hover:bg-amber-600 text-white',
      desc: 'Restart the CPE and reconnect to ACS.',
      question: 'Reboot this CPE device?',
    },
    {
      label: 'Re-push PPPoE Config',
      icon: <RefreshCw size={13} />,
      iconLg: <RefreshCw size={20} />,
      style: 'bg-[#0A8DCD] hover:bg-[#0878b0] text-white',
      desc: 'Re-provision PPPoE credentials to the device.',
      question: 'Re-push the PPPoE configuration to this device?',
    },
    {
      label: 'Factory Reset',
      icon: <AlertOctagon size={13} />,
      iconLg: <AlertOctagon size={20} />,
      style: 'bg-red-500 hover:bg-red-600 text-white',
      desc: 'Wipe all device settings and restore factory defaults.',
      question: 'Factory reset this device? This would normally wipe all settings.',
    },
    {
      label: 'Fetch Live Stats',
      icon: <Zap size={13} />,
      iconLg: <Zap size={20} />,
      style: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      desc: 'Pull current RX power, uptime, and connected clients.',
      question: 'Fetch live stats from this device?',
    },
  ]

  const headerStubActions = [
    { label: 'Refresh',            icon: <RotateCcw size={13} />, question: 'Refresh device data from ACS?' },
    { label: 'Connection Request', icon: <Activity  size={13} />, question: 'Send a connection request to the device?' },
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

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/network/tr069')}
          className="text-gray-400 hover:text-[#0A8DCD] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          TR-069 / ACS
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-mono font-semibold">{device.serialNumber}</span>
      </div>

      {/* Header bar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-lg font-bold text-gray-900 font-mono">{device.serialNumber}</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                {device.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {device.model} · {device.hardware} · OUI: <span className="font-mono">{device.mac}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerStubActions.map(a => (
              <button
                key={a.label}
                onClick={() => setConfirmAction(a)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {a.icon}{a.label}
              </button>
            ))}
            <button
              onClick={() => setConfirmAction(actions[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={13} />Reboot
            </button>
            <button
              onClick={() => setConfirmAction(actions[2])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <AlertOctagon size={13} />Factory Reset
            </button>
            <button
              onClick={() => setConfirmAction(actions[3])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0A8DCD]/30 text-xs font-medium text-[#0A8DCD] hover:bg-[#0A8DCD]/5 transition-colors"
            >
              <Zap size={13} />Fetch Live Stats
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'ONT Uptime',         value: device.uptime,                   icon: <Clock size={15} className="text-[#0A8DCD]" />     },
          { label: 'Connected Clients',  value: String(device.connectedDevices),  icon: <Wifi size={15} className="text-emerald-500" />     },
          { label: 'Data Traffic Today', value: '—',                              icon: <Activity size={15} className="text-purple-500" /> },
          { label: 'Last Inform',        value: formatLastInform(device.lastInform), icon: <Signal size={15} className="text-amber-500" />  },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate">{label}</p>
              <p className="text-sm font-bold text-gray-800 font-mono truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Nested tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 px-4 pt-3 gap-1 overflow-x-auto">
          {TR069_INNER_TABS.map(t => (
            <button
              key={t}
              onClick={() => setInnerTab(t)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                innerTab === t
                  ? 'text-[#0A8DCD] border-b-2 border-[#0A8DCD] -mb-px bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ════════ OVERVIEW ════════ */}
          {innerTab === 'Overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* LEFT */}
                <div className="space-y-4">
                  {/* Optical Signal Health */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Optical Signal Health</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live Link
                      </span>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">RX Optical Power</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-gray-800">{device.rxPower} dBm</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            signal.label === 'Good'    ? 'bg-emerald-50 text-emerald-700' :
                            signal.label === 'Warning' ? 'bg-amber-50 text-amber-700' :
                                                          'bg-red-50 text-red-600'
                          }`}>{signal.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">TX Laser Power</span>
                        <span className="text-sm font-mono font-semibold text-gray-700">1.4 dBm</span>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                          <span>Critical (-30)</span><span>Good (-10)</span>
                        </div>
                        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 40%, #22c55e 100%)' }}>
                          <div
                            className="absolute top-0 bottom-0 w-2 -ml-1 rounded-full bg-white border-2 border-gray-800 shadow"
                            style={{ left: `${barPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Distance</span>
                        <span className="text-sm font-mono font-semibold text-gray-700">~0.0 km</span>
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">System Health</span>
                      <button
                        onClick={() => showToast('Polling device… (no ACS connected)')}
                        className="text-xs font-medium text-[#0A8DCD] border border-[#0A8DCD]/30 px-2.5 py-1 rounded-lg hover:bg-[#0A8DCD]/5 transition-colors"
                      >
                        Poll TR-069
                      </button>
                    </div>
                    <div className="px-4 py-4 space-y-4">
                      {[
                        { label: 'CPU Load',          value: '14%',  pct: 14  },
                        { label: 'Memory (RAM)',       value: '38%',  pct: 38  },
                        { label: 'Laser Temperature', value: '42°C', pct: null },
                        { label: 'Supply Voltage',    value: '3.3V', pct: null },
                      ].map(({ label, value, pct }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">{label}</span>
                            <span className="text-xs font-mono font-semibold text-gray-700">{value}</span>
                          </div>
                          {pct != null && (
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-4">
                  {/* 24-Hour Optical Signal Performance */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-2">24-Hour Optical Signal Performance</p>
                      <div className="flex items-center gap-4 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Optimal (&lt;27 dBm)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Warning (27-30 dBm)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Critical (&gt;30 dBm)</span>
                      </div>
                    </div>
                    <div className="px-2 pt-3 pb-2">
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                          <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={3} />
                          <YAxis
                            domain={[-35, -15]}
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={v => `${v}`}
                            width={30}
                          />
                          <RechartTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}
                            formatter={v => [`${v} dBm`, 'RX Power']}
                            labelFormatter={h => `Hour ${h}:00`}
                          />
                          <ReferenceLine y={-27} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1} />
                          <ReferenceLine y={-30} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
                          <Line type="monotone" dataKey="dBm" stroke={lineColor} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="px-4 pb-3 text-[10px] text-gray-400 flex gap-4 flex-wrap">
                      <span>Signal stability: <span className="text-gray-600 font-medium">Stable</span></span>
                      <span>Max: <span className="font-mono text-gray-600">{device.rxPower} dBm</span></span>
                      <span>Min: <span className="font-mono text-gray-600">{device.rxPower} dBm</span></span>
                    </div>
                  </div>

                  {/* Wi-Fi Radios */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Wi-Fi Radios</span>
                    </div>
                    <div className="px-4 py-4">
                      {device.wifi24 === 'Disabled' && device.wifi5 === 'Disabled' ? (
                        <p className="text-xs text-gray-400 py-2">No active Wi-Fi SSIDs reported.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">WiFi 2.4GHz</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              device.wifi24 === 'Enabled' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                            }`}>{device.wifi24}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">WiFi 5GHz</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              device.wifi5 === 'Enabled' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                            }`}>{device.wifi5}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <span className="text-xs text-gray-500">SSID</span>
                            <span className="text-xs font-mono font-semibold text-gray-800">{device.ssid}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 3-column row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Device Identity */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Device Identity</span>
                  </div>
                  <div className="px-4 py-4 grid grid-cols-1 gap-3">
                    <GridField label="Device Model"     value={device.model} />
                    <GridField label="Hardware Version" value={device.hardware} />
                    <GridField label="Firmware"         value={device.firmware} />
                    <GridField label="Serial Number"    value={device.serialNumber} />
                    <GridField label="MAC Address"      value={device.mac} />
                  </div>
                </div>

                {/* Broadband & IP */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Broadband &amp; IP</span>
                  </div>
                  <div className="px-4 py-4 grid grid-cols-1 gap-3">
                    <GridField label="WAN IP"          value={device.ip} />
                    <GridField label="Gateway"         value={device.gateway} />
                    <GridField label="DNS Primary"     value={device.dnsPrimary} />
                    <GridField label="DNS Secondary"   value={device.dnsSecondary} />
                    <GridField label="Connection Type" value={device.connectionType} />
                  </div>
                </div>

                {/* Subscriber Link */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Subscriber Link</span>
                  </div>
                  <div className="px-4 py-4 grid grid-cols-1 gap-3">
                    <GridField label="Customer"      value={device.customerName} />
                    <GridField label="User ID"       value={device.userId} />
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>{device.status}</span>
                    </div>
                    <GridField label="Product Class" value={device.productClass} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ TASKS ════════ */}
          {innerTab === 'Tasks' && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <ClipboardList size={36} className="text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No tasks found for this device.</p>
              <p className="text-xs text-gray-400">Tasks will sync once ACS integration is connected.</p>
            </div>
          )}

          {/* ════════ FAULTS ════════ */}
          {innerTab === 'Faults' && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <AlertTriangle size={36} className="text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No faults detected.</p>
              <p className="text-xs text-gray-400">Fault detection requires ACS integration.</p>
            </div>
          )}

          {/* ════════ NETWORK & WI-FI ════════ */}
          {innerTab === 'Network & Wi-Fi' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">WAN Status</span>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <FieldRow label="WAN IP">{device.ip}</FieldRow>
                  <FieldRow label="Gateway">{device.gateway}</FieldRow>
                  <FieldRow label="DNS Primary">{device.dnsPrimary}</FieldRow>
                  <FieldRow label="DNS Secondary">{device.dnsSecondary}</FieldRow>
                  <FieldRow label="Connection Type">{device.connectionType}</FieldRow>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      {device.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">LAN Status</span>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <FieldRow label="LAN IP">{device.lanIp}</FieldRow>
                  <FieldRow label="Subnet Mask">{device.subnet}</FieldRow>
                  <FieldRow label="DHCP Status">
                    <span className={device.dhcp === 'Enabled' ? 'text-emerald-600' : undefined}>{device.dhcp}</span>
                  </FieldRow>
                  <FieldRow label="Connected Devices">
                    <span className="text-[#0A8DCD]">{String(device.connectedDevices)}</span>
                  </FieldRow>
                  <FieldRow label="WiFi 2.4GHz">
                    <span className={device.wifi24 === 'Enabled' ? 'text-emerald-600' : undefined}>{device.wifi24}</span>
                  </FieldRow>
                  <FieldRow label="WiFi 5GHz">
                    <span className={device.wifi5 === 'Enabled' ? 'text-emerald-600' : undefined}>{device.wifi5}</span>
                  </FieldRow>
                </div>
              </div>
            </div>
          )}

          {/* ════════ CONNECTED CLIENTS ════════ */}
          {innerTab === 'Connected Clients' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <Users size={36} className="text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">Connected clients data is not available.</p>
                <p className="text-xs text-gray-400">Live client data will be available once ACS integration is connected.</p>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 bg-gray-50/80 border-b border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span>MAC Address</span>
                  <span>IP Address</span>
                  <span>Hostname</span>
                  <span>Connection</span>
                  <span>Signal</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-5 text-xs font-mono text-gray-300 items-center">
                  <span>AA:BB:CC:DD:EE:FF</span>
                  <span>192.168.0.10</span>
                  <span>android-device</span>
                  <span>2.4GHz</span>
                  <span>—</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <AlertTriangle size={13} className="shrink-0" />
                Sample data only — not live
              </div>
            </div>
          )}

          {/* ════════ DIAGNOSTICS ════════ */}
          {innerTab === 'Diagnostics' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
              <Server size={36} className="text-gray-300" />
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Diagnostics tools will be available once ACS integration is connected.</p>
                <p className="text-xs text-gray-400">These tools require a live TR-069/ACS backend to communicate with the device.</p>
              </div>
              <div className="flex gap-3 mt-2">
                <button disabled className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-300 cursor-not-allowed">
                  <Activity size={14} />Run Ping Test
                </button>
                <button disabled className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-300 cursor-not-allowed">
                  <Zap size={14} />Run Speed Test
                </button>
              </div>
            </div>
          )}

          {/* ════════ MAINTENANCE ════════ */}
          {innerTab === 'Maintenance' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actions.map(action => (
                <button
                  key={action.label}
                  onClick={() => setConfirmAction(action)}
                  className="group flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${action.style.split(' ')[0]}`}>
                    {action.iconLg}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ════════ VOIP ════════ */}
          {innerTab === 'VoIP' && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <Phone size={36} className="text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">VoIP configuration is not available.</p>
              <p className="text-xs text-gray-400">VoIP settings require ACS integration.</p>
            </div>
          )}

        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">{confirmAction.label}</h2>
              <button onClick={() => setConfirmAction(null)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">{confirmAction.question}</p>
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
    </div>
  )
}
