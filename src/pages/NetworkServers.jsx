import { useState, useEffect } from 'react'
import { RefreshCw, Users, Clock, Wifi, AlertTriangle, WifiOff } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { getJazeServers, subscribeJazeServers, updateJazeServerSync } from '../data/jazeServerStore'

const STATUS_DOT = {
  online: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  offline: 'bg-red-500',
}

const STATUS_BADGE = {
  online: 'green',
  degraded: 'yellow',
  offline: 'red',
}

const LATENCY_COLOR = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-500',
}

function latencyClass(ms) {
  if (ms === null) return LATENCY_COLOR.bad
  if (ms < 50) return LATENCY_COLOR.good
  if (ms < 100) return LATENCY_COLOR.warn
  return LATENCY_COLOR.bad
}

export default function NetworkServers() {
  const [servers, setServers] = useState(getJazeServers)
  useEffect(() => subscribeJazeServers(setServers), [])

  const [syncing, setSyncing] = useState(new Set())
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = servers.filter(s => {
    const matchType = !filterType || s.type === filterType
    const matchStatus = !filterStatus || s.status === filterStatus
    return matchType && matchStatus
  })

  // Still a simulated re-check, not a real health probe (see
  // jazeServerStore.js's own top-of-file note) — just persisted to the
  // shared store now instead of local-only component state, so a sync
  // done here is reflected wherever else this data is read (e.g.
  // Dashboard.jsx's Jaze Network Status widget).
  function handleSync(id) {
    setSyncing(prev => new Set([...prev, id]))
    setTimeout(() => {
      setSyncing(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      const server = servers.find(s => s.id === id)
      updateJazeServerSync(id, {
        lastSynced: 'just now',
        latency: server?.status === 'offline' ? null : Math.floor(Math.random() * 30) + 8,
      })
    }, 1800)
  }

  function handleSyncAll() {
    const ids = filtered.map(s => s.id)
    setSyncing(new Set(ids))
    setTimeout(() => {
      setSyncing(new Set())
      ids.forEach(id => updateJazeServerSync(id, { lastSynced: 'just now' }))
    }, 2200)
  }

  const online = servers.filter(s => s.status === 'online').length
  const degraded = servers.filter(s => s.status === 'degraded').length
  const offline = servers.filter(s => s.status === 'offline').length
  const totalCustomers = servers.reduce((acc, s) => acc + s.customers, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jaze Network Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time status of all {servers.length} configured servers</p>
        </div>
        <Button
          size="sm"
          icon={<RefreshCw size={14} className={syncing.size > 0 ? 'animate-spin' : ''} />}
          onClick={handleSyncAll}
        >
          Sync All
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Online', value: online, cls: 'text-emerald-600', icon: <Wifi size={18} className="text-emerald-500" /> },
          { label: 'Degraded', value: degraded, cls: 'text-amber-600', icon: <AlertTriangle size={18} className="text-amber-500" /> },
          { label: 'Offline', value: offline, cls: 'text-red-500', icon: <WifiOff size={18} className="text-red-400" /> },
          { label: 'Total Customers', value: totalCustomers.toLocaleString('en-IN'), cls: 'text-gray-900', icon: <Users size={18} className="text-brand-blue" /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border flex items-center gap-4">
            <div className="p-2.5 bg-gray-50 rounded-lg">{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border px-4 py-3 flex flex-wrap gap-3 items-center">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
        >
          <option value="">All Types</option>
          <option value="Jaze">Jaze</option>
          <option value="IPACCAT">IPACCAT</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
        >
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="degraded">Degraded</option>
          <option value="offline">Offline</option>
        </select>
        {(filterType || filterStatus) && (
          <button
            onClick={() => { setFilterType(''); setFilterStatus('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {servers.length} servers</span>
      </div>

      {/* Server Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(server => (
          <ServerCard
            key={server.id}
            server={server}
            isSyncing={syncing.has(server.id)}
            onSync={() => handleSync(server.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ServerCard({ server, isSyncing, onSync }) {
  const isOffline = server.status === 'offline'

  return (
    <div
      className={`bg-white rounded-xl shadow-card border border-surface-border flex flex-col transition-all duration-200 hover:shadow-card-hover ${
        isOffline ? 'opacity-70' : ''
      }`}
    >
      {/* Card Header */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[server.status]} ${
              server.status === 'online' ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : ''
            }`} />
            <div>
              <p className="text-sm font-bold text-gray-900">{server.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{server.zone}</p>
            </div>
          </div>
          <Badge
            variant={server.type === 'Jaze' ? 'blue' : 'navy'}
            size="sm"
          >
            {server.type}
          </Badge>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3.5 flex-1 space-y-3">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Status</span>
          <Badge variant={STATUS_BADGE[server.status]} size="sm" dot>
            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
          </Badge>
        </div>

        {/* Latency */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Latency</span>
          <span className={`text-sm font-bold ${latencyClass(server.latency)}`}>
            {server.latency !== null ? `${server.latency} ms` : '— ms'}
          </span>
        </div>

        {/* Customers */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={11} />
            Customers
          </span>
          <span className="text-sm font-semibold text-gray-800">
            {server.customers.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Last synced */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} />
            Last synced
          </span>
          <span className="text-xs text-gray-500">{isSyncing ? 'Syncing…' : server.lastSynced}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-border">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className={`
            w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            border border-surface-border transition-all
            ${isSyncing
              ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-50 hover:text-brand-blue hover:border-brand-blue/30'
            }
          `}
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>
    </div>
  )
}
