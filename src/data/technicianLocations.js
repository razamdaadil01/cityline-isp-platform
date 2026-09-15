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

// Rough centroid across every seeded technician's mock position — spans
// Mumbai/Bengaluru/Noida — at a zoom level that keeps all three clusters
// visible on first load.
export const MAP_DEFAULT_CENTER = { lat: 20.5, lng: 76.5 }
export const MAP_DEFAULT_ZOOM = 5
