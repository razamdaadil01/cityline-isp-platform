import { describe, it, expect } from 'vitest'
import {
  getStates, getDistricts, getAreasList, getLocalities,
  getSubLocalities, lookupSubLocality,
} from '../../data/areaMappingStore.js'

// Area mapping functions are pure (read-only) so no module reset needed

describe('areaMappingStore — area chain (State → District → Area → Locality → Sub Locality)', () => {

  // ── getStates ────────────────────────────────────────────────────────────────

  it('getStates returns distinct states', () => {
    const states = getStates()
    expect(states.length).toBeGreaterThan(0)
    // No duplicates
    expect(new Set(states).size).toBe(states.length)
  })

  it('getStates includes Karnataka and Uttar Pradesh', () => {
    const states = getStates()
    expect(states).toContain('Karnataka')
    expect(states).toContain('Uttar Pradesh')
  })

  it('getStates returns sorted list', () => {
    const states = getStates()
    const sorted = [...states].sort()
    expect(states).toEqual(sorted)
  })

  // ── getDistricts ─────────────────────────────────────────────────────────────

  it('getDistricts filters by state correctly', () => {
    const districts = getDistricts('Karnataka')
    expect(districts).toContain('Bangalore')
  })

  it('getDistricts returns empty for unknown state', () => {
    expect(getDistricts('Unknown State')).toEqual([])
  })

  it('getDistricts for UP includes Gautam Buddha Nagar and Ghaziabad', () => {
    const districts = getDistricts('Uttar Pradesh')
    expect(districts).toContain('Gautam Buddha Nagar')
    expect(districts).toContain('Ghaziabad')
  })

  it('getDistricts returns distinct values', () => {
    const districts = getDistricts('Uttar Pradesh')
    expect(new Set(districts).size).toBe(districts.length)
  })

  // ── getAreasList ──────────────────────────────────────────────────────────────

  it('getAreasList filters by state and district', () => {
    const areas = getAreasList('Uttar Pradesh', 'Gautam Buddha Nagar')
    expect(areas).toContain('Noida')
    expect(areas).toContain('Noida Extension')
  })

  it('getAreasList returns empty for wrong district', () => {
    const areas = getAreasList('Karnataka', 'Gautam Buddha Nagar')
    expect(areas).toHaveLength(0)
  })

  it('getAreasList returns distinct areas', () => {
    const areas = getAreasList('Uttar Pradesh', 'Gautam Buddha Nagar')
    expect(new Set(areas).size).toBe(areas.length)
  })

  // ── getLocalities ─────────────────────────────────────────────────────────────

  it('getLocalities drills down correctly from area', () => {
    const localities = getLocalities('Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida')
    expect(localities).toContain('Sector 62')
    expect(localities).toContain('Sector 63')
  })

  it('getLocalities returns empty for wrong area', () => {
    const localities = getLocalities('Karnataka', 'Bangalore', 'Noida')
    expect(localities).toHaveLength(0)
  })

  it('getLocalities returns distinct locality names', () => {
    const localities = getLocalities('Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida')
    expect(new Set(localities).size).toBe(localities.length)
  })

  // ── getSubLocalities ──────────────────────────────────────────────────────────

  it('getSubLocalities returns sub-locality objects with siteType', () => {
    const subs = getSubLocalities('Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 62')
    expect(subs.length).toBeGreaterThan(0)
    expect(subs[0]).toHaveProperty('subLocality')
    expect(subs[0]).toHaveProperty('siteType')
    expect(subs[0]).toHaveProperty('branchCode')
  })

  it('getSubLocalities includes Tower A and Tower B for Noida Sector 62', () => {
    const subs = getSubLocalities('Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 62')
    const names = subs.map(s => s.subLocality)
    expect(names).toContain('Tower A')
    expect(names).toContain('Tower B')
  })

  it('getSubLocalities returns empty for unknown locality', () => {
    const subs = getSubLocalities('Karnataka', 'Bangalore', 'Koramangala', 'Unknown Block')
    expect(subs).toHaveLength(0)
  })

  // ── lookupSubLocality / Site Type auto-populate ───────────────────────────────

  it('lookupSubLocality returns full area record including siteType', () => {
    const record = lookupSubLocality(
      'Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 62', 'Tower A'
    )
    expect(record).not.toBeNull()
    expect(record.siteType).toBe('FTTH')
    expect(record.branchCode).toBe('CNPL-001')
  })

  it('lookupSubLocality auto-populates site type (Sector) for Sector 63 Block C', () => {
    const record = lookupSubLocality(
      'Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 63', 'Block C'
    )
    expect(record).not.toBeNull()
    expect(record.siteType).toBe('Sector')
  })

  it('lookupSubLocality returns null for non-existent combination', () => {
    const record = lookupSubLocality('Karnataka', 'Bangalore', 'Koramangala', 'Block X', 'Wing Z')
    expect(record).toBeNull()
  })

  it('lookupSubLocality finds Karnataka Koramangala record', () => {
    const record = lookupSubLocality(
      'Karnataka', 'Bangalore', 'Koramangala', '5th Block', 'HSR Layout'
    )
    expect(record).not.toBeNull()
    expect(record.siteType).toBe('FTTH')
    expect(record.feasibility).toBe('Feasible')
  })
})
