// Thin lookup layer over userStore.js's role='engineer' users — the
// canonical Technician entity chosen in Phase 1 of the Technician
// Monitoring Dashboard (see userStore.js's INITIAL_USERS comment for why
// this roster was chosen over installationsStore.js's FIELD_ENGINEERS or
// ticketsStore.js's TECHNICIAN_PROFILES). Dashboard code should read
// technicians through here rather than filtering getUsers() itself, so
// "what counts as a technician" stays defined in exactly one place.
//
// This is data-layer only — no dashboard UI reads from this yet.

import { getUsers } from './userStore'

export function getAllTechnicians() {
  return getUsers().filter(u => u.role === 'engineer')
}

export function getTechnicianById(id) {
  return getAllTechnicians().find(t => t.id === id) ?? null
}
