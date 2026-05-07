import { useState, useMemo } from 'react'
import {
  Activity, Search, TrendingUp, TrendingDown, Wifi,
  Server, Users, Clock, Download, RefreshCw, X
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Mock data generators ─────────────────────────────────────────────────────

function genUsage1hr() {
  return Array.from({ length: 12 }, (_, i) => {
    const h = new Date()
    h.setMinutes(h.getMinutes() - (11 - i) * 5)
    return {
      time:     `${h.getHours().toString().padStart(2,'0')}:${h.getMinutes().toString().padStart(2,'0')}`,
      download: +(Math.random() * 80 + 20).toFixed(1),
      upload:   +(Math.random() * 20 + 5).toFixed(1),
    }
  })
}

function genUsage24hr() {
  return Array.from({ length: 24 }, (_, i) => ({
    time:     `${i.toString().padStart(2,'0')}:00`,
    download: +(Math.sin(i / 4) * 30 + Math.random() * 20 + 40).toFixed(1),
    upload:   +(Math.sin(i / 4) * 8 + Math.random() * 5 + 12).toFixed(1),
  }))
}

function genUsage7d() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  return days.map(d => ({
    time:     d,
    download: +(Math.random() * 200 + 300).toFixed(0),
    upload:   +(Math.random() * 60 + 80).toFixed(0),
  }))
}

function genUsage30d() {
  return Array.from({ length: 30 }, (_, i) => ({
    time:     `${i + 1}`,
    download: +(Math.random() * 300 + 200).toFixed(0),
    upload:   +(Math.random() * 80 + 60).toFixed(0),
  }))
}

const CUSTOMER_DATA = {
  'CL-1001': { name: 'Rajan Mehta',   plan: 'FTTH 100Mbps', ip: '10.1.1.101', olt: 'OLT-AW-01', status: 'online',  server: 'JAZE-MUM-01' },
  'CL-1002': { name: 'Priya Sharma',  plan: 'FTTB 50Mbps',  ip: '10.1.2.15',  olt: 'OLT-BE-02', status: 'online',  server: 'JAZE-MUM-02' },
  'CL-1005': { name: 'Vikram Singh',  plan: 'P2P 1Gbps',    ip: '10.2.0.88',  olt: 'OLT-MC-03', status: 'online',  server: 'JAZE-MUM-01' },
  'CL-1007': { name: 'Deepa Nair',    plan: 'FTTH 200Mbps', ip: '10.3.1.44',  olt: 'OLT-JU-01', status: 'online',  server: 'JAZE-MUM-02' },
  'CL-1010': { name: 'Arun Kapoor',   plan: 'ILL 10Mbps',   ip: '10.4.0.9',   olt: 'OLT-MC-03', status: 'idle',    server: 'JAZE-MUM-01' },
  'CL-1003': { name: 'Suresh Kumar',  plan: 'Wireless 25Mbps',ip:'10.5.1.22', olt: 'OLT-GG-01', status: 'offline', server: 'JAZE-MUM-01' },
}

const NETWORK_WIDE = {
  totalDownload: '28.4',
  totalUpload:   '7.2',
  activeUsers:   847,
  peakTime:      '21:00',
  avgLatency:    '12ms',
}

const TOP_CONSUMERS = Array.from({ length: 20 }, (_, i) => ({
  rank:     i + 1,
  id:       `CL-${1001 + i * 3}`,
  name:     ['Chandra Sekhar','Vikram Singh','Harish Pillai','Jayashree Kulkarni','DigiLink Office','Sanjay Verma','OmniConnect HQ','Rajan Mehta','Deepa Nair','Priya Sharma','Kavitha Rao','Arun Kapoor','Meera Gupta','Rohit Bose','Sunita Joshi','Vandana Mishra','Sunil Kadam','Dinesh Naik','Nalitha Kumar','Prakash Yadav'][i],
  plan:     ['P2P 10Gbps','P2P 1Gbps','FTTH 1Gbps','FTTH 500Mbps','Business BB','FTTH 500Mbps','Enterprise','FTTH 100Mbps','FTTH 200Mbps','FTTB 50Mbps','FTTH 100Mbps','ILL 10Mbps','FTTH 200Mbps','FTTH 100Mbps','FTTH 40Mbps','FTTH 40Mbps','FTTB 100Mbps','P2P 100Mbps','FTTH 100Mbps','Wireless 25Mbps'][i],
  download: +(Math.random() * 800 + 100 - i * 35).toFixed(1),
  upload:   +(Math.random() * 200 + 20 - i * 8).toFixed(1),
  olt:      ['OLT-LP-01','OLT-MC-03','OLT-SM-01','OLT-PW-01','OLT-BE-02','OLT-BKC-01','OLT-PUN-01','OLT-AW-01','OLT-JU-01','OLT-BE-02','OLT-PW-01','OLT-MC-03','OLT-KD-01','OLT-MT-01','OLT-SC-02','OLT-WR-01','OLT-TN-01','OLT-VK-01','OLT-BH-01','OLT-KU-01'][i],
}))

const PEAK_HOURS = Array.from({ length: 24 }, (_, i) => ({
  hour:  `${i.toString().padStart(2,'0')}:00`,
  usage: +(Math.sin((i - 14) / 5) * 10 + Math.random() * 5 + (i >= 19 && i <= 23 ? 25 : i >= 7 && i <= 10 ? 18 : 8)).toFixed(1),
}))

const OLT_TRAFFIC = [
  { olt: 'OLT-AW-01', download: 4.2, upload: 1.1, ports: 128, active: 112 },
  { olt: 'OLT-BE-02', download: 3.8, upload: 0.9, ports: 128, active: 98  },
  { olt: 'OLT-MUM-01',download: 5.1, upload: 1.3, ports: 256, active: 201 },
  { olt: 'OLT-JU-01', download: 2.4, upload: 0.6, ports: 96,  active: 78  },
  { olt: 'OLT-PW-01', download: 3.2, upload: 0.8, ports: 128, active: 107 },
  { olt: 'OLT-GG-01', download: 1.9, upload: 0.5, ports: 64,  active: 48  },
  { olt: 'OLT-MC-03', download: 4.7, upload: 1.2, ports: 192, active: 164 },
  { olt: 'OLT-TN-01', download: 3.1, upload: 0.8, ports: 128, active: 99  },
]

const OLT_COLORS = ['#0A8DCD','#0F2744','#E8541A','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4']

const TIME_RANGES = ['1hr', '24hr', '7 days', '30 days']

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-card-hover px-3 py-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value} Mbps</span></p>
      ))}
    </div>
  )
}

const PEAK_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-card px-3 py-2 text-xs">
      <p className="font-semibold text-gray-600">{label}</p>
      <p className="text-brand-blue font-bold">{payload[0]?.value} Gbps</p>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-brand-blue/10 text-brand-blue',
    orange: 'bg-brand-orange/10 text-brand-orange',
    green:  'bg-emerald-100 text-emerald-600',
    navy:   'bg-navy/10 text-navy',
  }
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function BandwidthMonitoring() {
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [notFound,    setNotFound]      = useState(false)
  const [timeRange,   setTimeRange]     = useState('24hr')
  const [usageData,   setUsageData]     = useState(() => genUsage24hr())
  const [lastRefresh, setLastRefresh]   = useState(new Date().toLocaleTimeString())

  function handleSearch() {
    const key = searchQuery.trim().toUpperCase()
    const found = CUSTOMER_DATA[key]
    if (found) {
      setSearchResult({ id: key, ...found, usage1hr: genUsage1hr(), usage24hr: genUsage24hr() })
      setNotFound(false)
    } else {
      setSearchResult(null)
      setNotFound(true)
    }
  }

  function getChartData() {
    if (searchResult) {
      if (timeRange === '1hr') return searchResult.usage1hr
      return searchResult.usage24hr
    }
    switch (timeRange) {
      case '1hr':    return genUsage1hr()
      case '7 days': return genUsage7d()
      case '30 days':return genUsage30d()
      default:       return usageData
    }
  }

  function handleRefresh() {
    setUsageData(genUsage24hr())
    setLastRefresh(new Date().toLocaleTimeString())
  }

  const chartData = useMemo(() => getChartData(), [timeRange, searchResult])

  const currentDown = chartData[chartData.length - 1]?.download ?? 0
  const currentUp   = chartData[chartData.length - 1]?.upload   ?? 0

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bandwidth Monitoring</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time network usage · Last updated {lastRefresh}</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={handleRefresh}>Refresh</Button>
      </div>

      {/* ── Network-wide stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={TrendingDown} label="Total Download"  value={`${NETWORK_WIDE.totalDownload} Gbps`} sub="across all OLTs"  color="blue"   />
        <StatCard icon={TrendingUp}   label="Total Upload"    value={`${NETWORK_WIDE.totalUpload} Gbps`}   sub="across all OLTs"  color="orange" />
        <StatCard icon={Users}        label="Active Sessions" value={NETWORK_WIDE.activeUsers.toLocaleString()} sub="online right now" color="green"  />
        <StatCard icon={Clock}        label="Peak Hour"       value={NETWORK_WIDE.peakTime}               sub="highest load"     color="navy"   />
        <StatCard icon={Activity}     label="Avg Latency"     value={NETWORK_WIDE.avgLatency}             sub="across servers"   color="blue"   />
      </div>

      {/* ── Customer search ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Customer Bandwidth Lookup</h3>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setNotFound(false) }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Customer ID (e.g. CL-1001)…"
              className="pl-9 pr-8 py-2 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResult(null); setNotFound(false) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <Button size="sm" onClick={handleSearch} icon={<Search size={14} />}>Search</Button>
        </div>

        {notFound && (
          <div className="py-6 text-center text-sm text-gray-400">
            <Wifi size={28} className="mx-auto mb-2 text-gray-200" />
            No customer found for "{searchQuery}"
          </div>
        )}

        {searchResult && (
          <div className="space-y-4">
            {/* Customer info bar */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-navy/5 rounded-xl border border-navy/10">
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-semibold text-gray-800">{searchResult.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ID</p>
                <p className="font-mono text-xs text-brand-blue font-semibold">{searchResult.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <p className="text-sm text-gray-700">{searchResult.plan}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IP</p>
                <p className="font-mono text-xs text-gray-600">{searchResult.ip}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">OLT</p>
                <p className="text-xs text-gray-600">{searchResult.olt}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Server</p>
                <p className="text-xs text-gray-600">{searchResult.server}</p>
              </div>
              <div className="ml-auto">
                <Badge variant={searchResult.status === 'online' ? 'green' : searchResult.status === 'idle' ? 'yellow' : 'gray'} dot>
                  {searchResult.status.charAt(0).toUpperCase() + searchResult.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-3 text-center">
                <p className="text-xs text-brand-blue font-medium">Current Download</p>
                <p className="text-2xl font-bold text-brand-blue">{currentDown} <span className="text-sm font-normal">Mbps</span></p>
              </div>
              <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3 text-center">
                <p className="text-xs text-brand-orange font-medium">Current Upload</p>
                <p className="text-2xl font-bold text-brand-orange">{currentUp} <span className="text-sm font-normal">Mbps</span></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Usage Graph ── */}
      <SectionCard
        title={searchResult ? `${searchResult.name} – Usage Graph` : 'Network-Wide Usage Graph'}
        action={
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {TIME_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${timeRange === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0A8DCD" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0A8DCD" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#E8541A" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#E8541A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit=" M" />
            <Tooltip content={<CUSTOM_TOOLTIP />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="download" name="Download" stroke="#0A8DCD" strokeWidth={2} fill="url(#gDown)" dot={false} />
            <Area type="monotone" dataKey="upload"   name="Upload"   stroke="#E8541A" strokeWidth={2} fill="url(#gUp)"   dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Top 20 consumers + Peak hours (side by side) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Top 20 Consumers */}
        <SectionCard
          title="Top 20 Bandwidth Consumers"
          action={<Button size="xs" variant="secondary" icon={<Download size={12} />}>Export</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="pb-2 text-left text-gray-500 font-semibold uppercase tracking-wide w-8">#</th>
                  <th className="pb-2 text-left text-gray-500 font-semibold uppercase tracking-wide">Customer</th>
                  <th className="pb-2 text-left text-gray-500 font-semibold uppercase tracking-wide">OLT</th>
                  <th className="pb-2 text-right text-gray-500 font-semibold uppercase tracking-wide">DL (Mbps)</th>
                  <th className="pb-2 text-right text-gray-500 font-semibold uppercase tracking-wide">UL (Mbps)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {TOP_CONSUMERS.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-1.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${c.rank <= 3 ? 'bg-brand-orange' : c.rank <= 10 ? 'bg-brand-blue' : 'bg-gray-400'}`}>
                        {c.rank}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <p className="font-medium text-gray-800 truncate max-w-[130px]">{c.name}</p>
                      <p className="text-gray-400 font-mono">{c.id}</p>
                    </td>
                    <td className="py-1.5 text-gray-500 font-mono">{c.olt}</td>
                    <td className="py-1.5 text-right font-semibold text-brand-blue">{c.download}</td>
                    <td className="py-1.5 text-right font-semibold text-brand-orange">{c.upload}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Peak usage hours */}
        <SectionCard title="Peak Usage Hours (Today)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={PEAK_HOURS} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit=" G" />
              <Tooltip content={<PEAK_TOOLTIP />} />
              <Bar dataKey="usage" name="Traffic" fill="#0A8DCD" radius={[3, 3, 0, 0]}>
                {PEAK_HOURS.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.usage >= 25 ? '#E8541A' : entry.usage >= 18 ? '#0A8DCD' : '#0F274480'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-orange inline-block" /> Peak (&gt;25 Gbps)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-blue inline-block" /> High (18–25 Gbps)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-navy/50 inline-block" /> Normal</span>
          </div>
        </SectionCard>
      </div>

      {/* ── OLT-wise traffic breakdown ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Bar chart */}
        <div className="xl:col-span-2">
          <SectionCard title="OLT-wise Traffic Breakdown">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={OLT_TRAFFIC} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit=" G" />
                <YAxis type="category" dataKey="olt" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white border border-surface-border rounded-xl shadow-card px-3 py-2 text-xs">
                        <p className="font-semibold text-gray-700 mb-1">{label}</p>
                        {payload.map(p => (
                          <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{p.value} Gbps</b></p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="download" name="Download" fill="#0A8DCD" radius={[0, 3, 3, 0]} />
                <Bar dataKey="upload"   name="Upload"   fill="#E8541A" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* OLT summary table */}
        <SectionCard title="OLT Port Utilisation">
          <div className="space-y-3">
            {OLT_TRAFFIC.map((olt, i) => {
              const pct = Math.round((olt.active / olt.ports) * 100)
              return (
                <div key={olt.olt}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{olt.olt}</span>
                    <span className="text-xs text-gray-500">{olt.active}/{olt.ports} <span className="font-semibold text-gray-700">{pct}%</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${pct >= 85 ? 'bg-brand-orange' : pct >= 65 ? 'bg-brand-blue' : 'bg-emerald-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-orange inline-block" /> Critical (&gt;85%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-blue inline-block" /> High</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Normal</span>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
