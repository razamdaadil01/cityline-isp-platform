// Jaze/IPACCAT auth-server status store — module-level pub/sub pattern,
// same as departmentStore.js/storeStore.js. First real, persisted source
// for this data: NetworkServers.jsx's own SERVERS array and Dashboard.jsx's
// separate JAZE_STATUS array were two disconnected hardcoded mocks
// describing the same infrastructure (flagged in a prior audit).
//
// Deliberately its own store rather than folded into popStore.js's
// equipment model: Jaze/IPACCAT are auth/billing SERVICE instances (zone,
// latency, subscriber count, last-sync time), not physical network
// hardware with ports to allocate the way a POP's OLT/Switch equipment
// is — cramming that heterogeneous "software server" shape into an array
// whose whole point is "OLT/Switch device inventory per physical site"
// would make that model messier, not cleaner. None of these 16 servers
// maps cleanly onto one of the 3 seeded POPs either — their zones (Khar,
// Santacruz, Goregaon, Malad, Kandivali, Borivali, Dahisar, Mira Road...)
// span far more neighborhoods than those 3 POPs cover, so forcing a POP
// link here would mean inventing POPs this task never asked for.
//
// This task doesn't build real health-check/ping infrastructure — status
// stays admin-settable/seeded data, same as most other "status" fields in
// this app (customer status, ticket status, etc.), not a real network
// probe. updateJazeServerSync() below just persists whatever NetworkServers.jsx's
// existing (already-simulated) Sync/Sync All actions were already doing to
// local component state, so that interaction keeps working, now against a
// real shared store instead of state that reset on every page reload.

export const JAZE_SERVER_TYPES = ['Jaze', 'IPACCAT']
export const JAZE_SERVER_STATUSES = ['online', 'degraded', 'offline']

// Migrated verbatim from NetworkServers.jsx's own hardcoded SERVERS array.
const INITIAL_SERVERS = [
  { id: 1, name: 'Jaze-01', zone: 'Andheri West', type: 'Jaze', status: 'online', latency: 12, customers: 342, lastSynced: '2 min ago' },
  { id: 2, name: 'Jaze-02', zone: 'Andheri East', type: 'Jaze', status: 'online', latency: 15, customers: 289, lastSynced: '3 min ago' },
  { id: 3, name: 'Jaze-03', zone: 'Bandra West', type: 'Jaze', status: 'online', latency: 18, customers: 418, lastSynced: '1 min ago' },
  { id: 4, name: 'Jaze-04', zone: 'Khar', type: 'Jaze', status: 'degraded', latency: 87, customers: 203, lastSynced: '8 min ago' },
  { id: 5, name: 'Jaze-05', zone: 'Santacruz', type: 'Jaze', status: 'online', latency: 14, customers: 376, lastSynced: '2 min ago' },
  { id: 6, name: 'Jaze-06', zone: 'Vile Parle', type: 'Jaze', status: 'online', latency: 11, customers: 451, lastSynced: '4 min ago' },
  { id: 7, name: 'Jaze-07', zone: 'Goregaon', type: 'Jaze', status: 'online', latency: 22, customers: 297, lastSynced: '2 min ago' },
  { id: 8, name: 'Jaze-08', zone: 'Malad', type: 'Jaze', status: 'offline', latency: null, customers: 0, lastSynced: '2 hrs ago' },
  { id: 9, name: 'Jaze-09', zone: 'Kandivali', type: 'Jaze', status: 'online', latency: 19, customers: 325, lastSynced: '3 min ago' },
  { id: 10, name: 'Jaze-10', zone: 'Borivali', type: 'Jaze', status: 'online', latency: 25, customers: 388, lastSynced: '5 min ago' },
  { id: 11, name: 'Jaze-11', zone: 'Dahisar', type: 'Jaze', status: 'degraded', latency: 124, customers: 167, lastSynced: '12 min ago' },
  { id: 12, name: 'Jaze-12', zone: 'Mira Road', type: 'Jaze', status: 'online', latency: 31, customers: 214, lastSynced: '2 min ago' },
  { id: 13, name: 'IPACCAT-01', zone: 'Core Network', type: 'IPACCAT', status: 'online', latency: 8, customers: 89, lastSynced: '1 min ago' },
  { id: 14, name: 'IPACCAT-02', zone: 'Leased Line Hub', type: 'IPACCAT', status: 'online', latency: 9, customers: 54, lastSynced: '1 min ago' },
  { id: 15, name: 'IPACCAT-03', zone: 'Enterprise', type: 'IPACCAT', status: 'online', latency: 11, customers: 37, lastSynced: '2 min ago' },
  { id: 16, name: 'IPACCAT-04', zone: 'ILL Segment', type: 'IPACCAT', status: 'degraded', latency: 95, customers: 22, lastSynced: '15 min ago' },
]

let _servers = [...INITIAL_SERVERS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._servers])) }

export function getJazeServers() { return _servers }

export function getJazeServer(id) { return _servers.find(s => s.id === id) ?? null }

// NetworkServers.jsx's Sync/Sync All actions — a simulated re-check, same
// as before this store existed, just persisted now instead of local-only
// component state. Not a real health probe (see this file's own top-of-
// file note).
export function updateJazeServerSync(id, patch) {
  _servers = _servers.map(s => s.id === id ? { ...s, ...patch } : s)
  notify()
}

export function subscribeJazeServers(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}
