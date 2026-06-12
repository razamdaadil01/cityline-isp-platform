import { useState } from 'react'
import { Plus, X, Wifi, Activity } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// Node positions in a 800x460 viewBox
const SWITCHES = [
  {
    id: 'CORE', label: 'Core Switch', subtitle: 'HQ', x: 400, y: 80,
    ip: '10.0.0.1', model: 'Cisco Catalyst 9300', ports: 48, portsUsed: 48,
    uptime: '99.9%', status: 'online', vlan: 'VLAN 10, 20, 30',
  },
  {
    id: 'DIST-01', label: 'Distribution', subtitle: 'Andheri', x: 200, y: 230,
    ip: '10.1.0.1', model: 'Cisco SG350', ports: 24, portsUsed: 24,
    uptime: '99.1%', status: 'online', vlan: 'VLAN 20',
  },
  {
    id: 'DIST-02', label: 'Distribution', subtitle: 'Bandra', x: 600, y: 230,
    ip: '10.2.0.1', model: 'Cisco SG350', ports: 24, portsUsed: 22,
    uptime: '98.7%', status: 'online', vlan: 'VLAN 30',
  },
]

const OLTS = [
  {
    id: 'OLT-01', label: 'OLT', subtitle: 'Versova', parent: 'DIST-01', x: 80, y: 380,
    ip: '10.10.1.1', model: 'ZTE C300', ports: 8, portsUsed: 8,
    uptime: '97.4%', status: 'online', customers: 64,
  },
  {
    id: 'OLT-02', label: 'OLT', subtitle: 'Lokhandwala', parent: 'DIST-01', x: 200, y: 380,
    ip: '10.10.1.2', model: 'ZTE C300', ports: 8, portsUsed: 6,
    uptime: '99.2%', status: 'online', customers: 48,
  },
  {
    id: 'OLT-03', label: 'OLT', subtitle: 'DN Nagar', parent: 'DIST-01', x: 320, y: 380,
    ip: '10.10.1.3', model: 'ZTE C300', ports: 8, portsUsed: 0,
    uptime: '0%', status: 'offline', customers: 0,
  },
  {
    id: 'OLT-04', label: 'OLT', subtitle: 'Khar', parent: 'DIST-02', x: 480, y: 380,
    ip: '10.10.2.1', model: 'Huawei MA5600', ports: 8, portsUsed: 5,
    uptime: '95.0%', status: 'degraded', customers: 40,
  },
  {
    id: 'OLT-05', label: 'OLT', subtitle: 'Santacruz', parent: 'DIST-02', x: 600, y: 380,
    ip: '10.10.2.2', model: 'Huawei MA5600', ports: 8, portsUsed: 7,
    uptime: '98.8%', status: 'online', customers: 56,
  },
  {
    id: 'OLT-06', label: 'OLT', subtitle: 'Vile Parle', parent: 'DIST-02', x: 720, y: 380,
    ip: '10.10.2.3', model: 'Huawei MA5600', ports: 8, portsUsed: 8,
    uptime: '99.5%', status: 'online', customers: 64,
  },
]

const STATUS_COLORS = {
  online: { stroke: '#10B981', fill: '#D1FAE5', text: '#065F46' },
  offline: { stroke: '#EF4444', fill: '#FEE2E2', text: '#991B1B' },
  degraded: { stroke: '#F59E0B', fill: '#FEF3C7', text: '#92400E' },
}

const SWITCH_COLORS = { stroke: '#0A8DCD', fill: '#EBF8FF', text: '#0C4A6E' }

const LINKS = [
  { from: 'CORE', to: 'DIST-01' },
  { from: 'CORE', to: 'DIST-02' },
  { from: 'DIST-01', to: 'OLT-01' },
  { from: 'DIST-01', to: 'OLT-02' },
  { from: 'DIST-01', to: 'OLT-03' },
  { from: 'DIST-02', to: 'OLT-04' },
  { from: 'DIST-02', to: 'OLT-05' },
  { from: 'DIST-02', to: 'OLT-06' },
]

function getNode(id) {
  return SWITCHES.find(s => s.id === id) || OLTS.find(o => o.id === id)
}

const STATUS_BADGE = { online: 'green', offline: 'red', degraded: 'yellow' }

const allNodes = [...SWITCHES, ...OLTS]
const totalOLTs = OLTS.length
const onlineOLTs = OLTS.filter(o => o.status === 'online').length
const offlineOLTs = OLTS.filter(o => o.status === 'offline').length
const degradedOLTs = OLTS.filter(o => o.status === 'degraded').length

export default function Network() {
  const [selected, setSelected] = useState(null)

  function selectNode(id) {
    setSelected(prev => prev?.id === id ? null : getNode(id))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Network Topology</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visual Switch → OLT tree — click any node for details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Plus size={14} />}>Add OLT</Button>
          <Button size="sm" icon={<Plus size={14} />}>Add Switch</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Switches', value: SWITCHES.length, cls: 'text-brand-blue' },
          { label: 'Total OLTs', value: totalOLTs, cls: 'text-gray-900' },
          { label: 'Online', value: onlineOLTs, cls: 'text-emerald-600' },
          { label: 'Degraded', value: degradedOLTs, cls: 'text-amber-600' },
          { label: 'Offline', value: offlineOLTs, cls: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {[
          { color: '#0A8DCD', label: 'Switch / Distribution' },
          { color: '#10B981', label: 'OLT Online' },
          { color: '#F59E0B', label: 'OLT Degraded' },
          { color: '#EF4444', label: 'OLT Offline' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Topology + Details Panel */}
      <div className="flex gap-4">
        {/* SVG Topology */}
        <div className="flex-1 bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-2">
            <Activity size={14} className="text-brand-blue" />
            <h3 className="text-sm font-semibold text-gray-800">Live Topology</h3>
          </div>
          <div className="p-4">
            <svg
              viewBox="0 0 800 460"
              className="w-full h-auto"
              style={{ minHeight: 320 }}
            >
              {/* Links */}
              {LINKS.map(link => {
                const from = getNode(link.from)
                const to = getNode(link.to)
                const isActive = from.status !== 'offline' && to.status !== 'offline'
                return (
                  <line
                    key={`${link.from}-${link.to}`}
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={isActive ? '#CBD5E1' : '#FCA5A5'}
                    strokeWidth={isActive ? 2 : 1.5}
                    strokeDasharray={to.status === 'offline' ? '5 4' : undefined}
                  />
                )
              })}

              {/* Switch Nodes */}
              {SWITCHES.map(sw => {
                const r = sw.id === 'CORE' ? 30 : 24
                const isSelected = selected?.id === sw.id
                return (
                  <g
                    key={sw.id}
                    onClick={() => selectNode(sw.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={sw.x} cy={sw.y} r={r}
                      fill={SWITCH_COLORS.fill}
                      stroke={isSelected ? '#0A8DCD' : SWITCH_COLORS.stroke}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    <Wifi
                      className="pointer-events-none"
                      x={sw.x - 9} y={sw.y - 9}
                      width={18} height={18}
                      color={SWITCH_COLORS.stroke}
                    />
                    <text
                      x={sw.x} y={sw.y + r + 14}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#1E3A5F"
                    >
                      {sw.label}
                    </text>
                    <text
                      x={sw.x} y={sw.y + r + 26}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748B"
                    >
                      {sw.subtitle}
                    </text>
                    {isSelected && (
                      <circle cx={sw.x} cy={sw.y} r={r + 6} fill="none" stroke="#0A8DCD" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
                    )}
                  </g>
                )
              })}

              {/* OLT Nodes */}
              {OLTS.map(olt => {
                const colors = STATUS_COLORS[olt.status]
                const r = 22
                const isSelected = selected?.id === olt.id
                const portCols = olt.ports
                const portW = 6, portGap = 2
                const totalPortW = portCols * portW + (portCols - 1) * portGap
                const portStartX = olt.x - totalPortW / 2

                return (
                  <g
                    key={olt.id}
                    onClick={() => selectNode(olt.id)}
                    className="cursor-pointer"
                  >
                    {/* Port dots */}
                    {Array.from({ length: olt.ports }).map((_, i) => (
                      <rect
                        key={i}
                        x={portStartX + i * (portW + portGap)}
                        y={olt.y + r + 18}
                        width={portW}
                        height={portW}
                        rx={1}
                        fill={i < olt.portsUsed ? colors.stroke : '#E2E8F0'}
                      />
                    ))}
                    <circle
                      cx={olt.x} cy={olt.y} r={r}
                      fill={colors.fill}
                      stroke={isSelected ? colors.stroke : colors.stroke}
                      strokeWidth={isSelected ? 3 : 2}
                      opacity={olt.status === 'offline' ? 0.6 : 1}
                    />
                    <text
                      x={olt.x} y={olt.y + 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={colors.text}
                    >
                      {olt.id}
                    </text>
                    <text
                      x={olt.x} y={olt.y + r + 12}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="#334155"
                    >
                      {olt.subtitle}
                    </text>
                    {isSelected && (
                      <circle cx={olt.x} cy={olt.y} r={r + 6} fill="none" stroke={colors.stroke} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Details Panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-xl shadow-card border border-surface-border flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">{selected.id}</h3>
              <button
                onClick={() => setSelected(null)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <p className="text-base font-semibold text-gray-900">{selected.label}</p>
                <p className="text-xs text-gray-500">{selected.subtitle}</p>
                <div className="mt-2">
                  <Badge variant={STATUS_BADGE[selected.status]} size="sm" dot>
                    {selected.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2.5">
                <DetailRow label="IP Address" value={selected.ip} mono />
                <DetailRow label="Model" value={selected.model} />
                <DetailRow label="Uptime" value={selected.uptime} />
                <DetailRow
                  label="Ports"
                  value={`${selected.portsUsed} / ${selected.ports} used`}
                />
                {selected.vlan && <DetailRow label="VLANs" value={selected.vlan} />}
                {selected.customers !== undefined && (
                  <DetailRow label="Customers" value={selected.customers} />
                )}
              </div>

              {/* Port Grid */}
              {selected.ports && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Port Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: selected.ports }).map((_, i) => {
                      const used = i < selected.portsUsed
                      const colors = STATUS_COLORS[selected.status] || STATUS_COLORS.online
                      return (
                        <div
                          key={i}
                          title={`Port ${i + 1}: ${used ? 'Active' : 'Free'}`}
                          className="w-6 h-4 rounded text-center text-white flex items-center justify-center"
                          style={{
                            backgroundColor: used ? colors.stroke : '#E2E8F0',
                            fontSize: 8,
                            fontWeight: 700,
                            color: used ? 'white' : '#94A3B8',
                          }}
                        >
                          {i + 1}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-surface-border flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1">Ping</Button>
              <Button size="sm" className="flex-1">Manage</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-gray-800 text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
