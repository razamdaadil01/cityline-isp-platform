// MOCK DATA — replace with a real GPS feed once a backend/location-
// reporting service exists. At that point this whole file becomes a
// fetch/subscription call (e.g. getTechnicianLocation() polling an API, or
// a live socket updating a store) — TechnicianDashboard.jsx's map rendering
// does not need to change; it only ever reads getTechnicianLocation(id)
// and never touches these coordinates' shape or origin.
//
// Coordinates are real-world lat/lng for each technician's actual
// branch/zone (see userStore.js's role='engineer' users), not random
// points — with a small deterministic offset for technicians who share a
// zone so their markers don't sit exactly on top of one another on the map.
const MOCK_LOCATIONS = {
  u3:  { lat: 19.1364, lng: 72.8296 }, // Arjun Kumar    — Andheri West, Mumbai
  u5:  { lat: 19.1136, lng: 72.8697 }, // Suresh Babu    — Andheri East, Mumbai
  u8:  { lat: 12.9716, lng: 77.6412 }, // Karan Mehta    — Indiranagar, Bengaluru
  u9:  { lat: 28.5697, lng: 77.3260 }, // Divya Nambiar  — Sector 18, Noida
  u10: { lat: 12.9698, lng: 77.7500 }, // Farhan Sheikh  — Whitefield, Bengaluru
  u11: { lat: 19.1380, lng: 72.8310 }, // Suresh Iyer    — Andheri West, Mumbai
  u12: { lat: 19.0596, lng: 72.8656 }, // Prakash Yadav  — Bandra East, Mumbai
  u13: { lat: 19.1663, lng: 72.8526 }, // Manoj Verma    — Goregaon, Mumbai
  u14: { lat: 19.1317, lng: 72.8142 }, // Dinesh Kumar   — Versova, Mumbai
  u15: { lat: 19.1150, lng: 72.8680 }, // Vikram Singh   — Andheri East, Mumbai
}

export function getTechnicianLocation(technicianId) {
  return MOCK_LOCATIONS[technicianId] ?? null
}

// ── Mock "day route" overlay (Map tab, Live Location) ────────────────────
// Purely illustrative demo data, same as MOCK_LOCATIONS above — NOT derived
// from any real installation/ticket/assignment record. Seeded per-technician
// (mulberry32 PRNG keyed off a hash of the id) so a given technician's route
// stays the same across renders/re-opens instead of reshuffling on every
// click, without needing to persist it anywhere.

function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h
}

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Index 0 is reserved for the first stop, the last two for the final two
// slots below — the random middle picks skip both ends of this list.
const ROUTE_LABELS = [
  'Started day at base',
  'Job site visit',
  'Customer installation',
  'Fault repair call',
  'Hardware pickup',
  'Follow-up visit',
  'Lunch break',
  'Return to base',
]

const WORKDAY_START_MIN = 9 * 60   // 9:00 AM
const WORKDAY_END_MIN = 17 * 60    // 5:00 PM

function formatTime(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440
  const h24 = Math.floor(wrapped / 60)
  const m = Math.round(wrapped % 60)
  const period = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// Returns 4-6 mock waypoints for a technician's simulated day, scattered
// within ~0.5-3km of their current mock location (a plausible on-ground
// radius, not a city-wide jump) and connected in chronological order, with
// the last waypoint pinned to their current location — the same
// coordinates already plotted on the Live Location map — so the route
// visibly connects to the marker the admin clicked.
export function getTechnicianDayRoute(technicianId) {
  const current = MOCK_LOCATIONS[technicianId]
  if (!current) return null

  const rand = mulberry32(hashSeed(technicianId))
  const stopCount = 4 + Math.floor(rand() * 3) // 4, 5 or 6 stops total
  const earlierCount = stopCount - 1 // last stop is the current-location pin

  // 1 degree latitude ≈ 111km; longitude degrees are scaled by cos(lat) so
  // the km radius stays roughly circular at any latitude.
  const kmPerDegLng = 111 * Math.cos((current.lat * Math.PI) / 180)
  const span = WORKDAY_END_MIN - WORKDAY_START_MIN

  const stops = []
  for (let i = 0; i < earlierCount; i++) {
    const angle = rand() * Math.PI * 2
    const radiusKm = 0.5 + rand() * 2.5
    const lat = current.lat + (radiusKm / 111) * Math.sin(angle)
    const lng = current.lng + (radiusKm / kmPerDegLng) * Math.cos(angle)

    const baseMinute = WORKDAY_START_MIN + (span * i) / Math.max(earlierCount - 1, 1)
    const jitter = (rand() - 0.5) * 16 // keeps stops in chronological order
    const label = i === 0
      ? ROUTE_LABELS[0]
      : ROUTE_LABELS[1 + Math.floor(rand() * (ROUTE_LABELS.length - 2))]

    stops.push({ lat, lng, time: formatTime(baseMinute + jitter), label })
  }

  stops.push({
    lat: current.lat,
    lng: current.lng,
    time: formatTime(WORKDAY_END_MIN + 15 + Math.floor(rand() * 20)),
    label: 'Current location',
  })

  return stops
}

// Default view is the Noida/Greater Noida area (the region of actual
// admin interest), not a wide all-India view — sits between u9's Sector 18,
// Noida marker and Greater Noida proper, at a city-level zoom. The
// Mumbai/Bengaluru clusters fall outside this initial viewport; panning or
// zooming out (via the map's zoom controls — scrollWheelZoom is disabled)
// still reaches them, marker clustering included.
export const MAP_DEFAULT_CENTER = { lat: 28.52, lng: 77.40 }
export const MAP_DEFAULT_ZOOM = 11
