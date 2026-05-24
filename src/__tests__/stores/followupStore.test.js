import { describe, it, expect, beforeEach } from 'vitest'

describe('followupStore', () => {
  let getFollowups, saveFollowup, markFollowupDone, cancelFollowup, subscribeFollowups

  beforeEach(async () => {
    vi.resetModules()
    ;({ getFollowups, saveFollowup, markFollowupDone, cancelFollowup, subscribeFollowups } =
      await import('../../data/followupStore.js'))
  })

  // ── Initial state ────────────────────────────────────────────────────────────

  it('loads initial follow-up data', () => {
    expect(getFollowups().length).toBeGreaterThan(0)
  })

  it('initial follow-ups have required fields', () => {
    const fu = getFollowups()[0]
    expect(fu).toHaveProperty('id')
    expect(fu).toHaveProperty('leadId')
    expect(fu).toHaveProperty('date')
    expect(fu).toHaveProperty('status')
  })

  // ── Save (create) ────────────────────────────────────────────────────────────

  it('can save a new follow-up', () => {
    const initial = getFollowups().length
    saveFollowup({
      id: 'FU-TEST',
      leadId: 'LD-999',
      leadName: 'Test Lead',
      customer: 'Test Lead',
      pipeline: 'Residential',
      phone: '9999999999',
      date: '2027-01-01',
      time: '10:00',
      note: 'Test note',
      stage: 'New Inquiry',
      assignedTo: 'Arjun Kumar',
      notifyTo: [],
      priority: 'medium',
      status: 'Pending',
    })
    expect(getFollowups().length).toBe(initial + 1)
  })

  it('new follow-up is retrievable by id', () => {
    saveFollowup({ id: 'FU-NEW', leadId: 'LD-001', date: '2027-06-01', status: 'Pending', notifyTo: [] })
    const found = getFollowups().find(f => f.id === 'FU-NEW')
    expect(found).toBeDefined()
    expect(found.status).toBe('Pending')
  })

  // ── Save (update) ────────────────────────────────────────────────────────────

  it('can update an existing follow-up note', () => {
    const initial = getFollowups()[0]
    saveFollowup({ ...initial, note: 'Updated note' })
    const updated = getFollowups().find(f => f.id === initial.id)
    expect(updated.note).toBe('Updated note')
    expect(getFollowups().length).toBe(10) // count unchanged
  })

  // ── Mark as done ─────────────────────────────────────────────────────────────

  it('markFollowupDone sets status to Done', () => {
    const pending = getFollowups().find(f => f.status === 'Pending')
    expect(pending).toBeDefined()
    markFollowupDone(pending.id)
    const updated = getFollowups().find(f => f.id === pending.id)
    expect(updated.status).toBe('Done')
  })

  it('markFollowupDone does not affect other follow-ups', () => {
    const [first, second] = getFollowups()
    markFollowupDone(first.id)
    expect(getFollowups().find(f => f.id === second.id).status).toBe(second.status)
  })

  // ── Cancel ───────────────────────────────────────────────────────────────────

  it('cancelFollowup sets status to Cancelled', () => {
    const pending = getFollowups().find(f => f.status === 'Pending')
    cancelFollowup(pending.id)
    expect(getFollowups().find(f => f.id === pending.id).status).toBe('Cancelled')
  })

  it('cancelled follow-up count increases after cancel', () => {
    const before = getFollowups().filter(f => f.status === 'Cancelled').length
    const pending = getFollowups().find(f => f.status === 'Pending')
    cancelFollowup(pending.id)
    const after = getFollowups().filter(f => f.status === 'Cancelled').length
    expect(after).toBe(before + 1)
  })

  // ── Notifier selection ────────────────────────────────────────────────────────

  it('follow-up stores notifyTo array with selected notifiers', () => {
    saveFollowup({
      id: 'FU-NOTIFY',
      leadId: 'LD-001',
      date: '2027-01-01',
      status: 'Pending',
      notifyTo: ['Preethi Nair', 'Anita Sharma'],
    })
    const fu = getFollowups().find(f => f.id === 'FU-NOTIFY')
    expect(fu.notifyTo).toEqual(['Preethi Nair', 'Anita Sharma'])
  })

  it('notifyTo can be empty array (no notifiers selected)', () => {
    saveFollowup({ id: 'FU-NO-NOTIFY', leadId: 'LD-001', date: '2027-01-01', status: 'Pending', notifyTo: [] })
    const fu = getFollowups().find(f => f.id === 'FU-NO-NOTIFY')
    expect(fu.notifyTo).toHaveLength(0)
  })

  // ── Subscribe/Unsubscribe ────────────────────────────────────────────────────

  it('subscriber is called when follow-up is saved', () => {
    const spy = vi.fn()
    const unsub = subscribeFollowups(spy)
    saveFollowup({ id: 'FU-SUB', leadId: 'LD-001', date: '2027-01-01', status: 'Pending', notifyTo: [] })
    expect(spy).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('subscriber is called when follow-up is cancelled', () => {
    const spy = vi.fn()
    const unsub = subscribeFollowups(spy)
    const pending = getFollowups().find(f => f.status === 'Pending')
    cancelFollowup(pending.id)
    expect(spy).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('unsubscribed listener is not called after removal', () => {
    const spy = vi.fn()
    const unsub = subscribeFollowups(spy)
    unsub()
    saveFollowup({ id: 'FU-UNSUB', leadId: 'LD-001', date: '2027-01-01', status: 'Pending', notifyTo: [] })
    expect(spy).not.toHaveBeenCalled()
  })
})

// ── Status calculation (Kanban column filter logic) ───────────────────────────

describe('follow-up status calculation (Kanban filters)', () => {
  const TODAY = '2026-05-24'

  const isDueToday = fu =>
    fu.date === TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'
  const isUpcoming = fu =>
    fu.date > TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'
  const isOverdue = fu =>
    fu.date < TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'

  const makeFu = (date, status = 'Pending') => ({ date, status, notifyTo: [] })

  it('classifies same-day pending follow-up as Due Today', () => {
    expect(isDueToday(makeFu(TODAY))).toBe(true)
    expect(isUpcoming(makeFu(TODAY))).toBe(false)
    expect(isOverdue(makeFu(TODAY))).toBe(false)
  })

  it('classifies future follow-up as Upcoming', () => {
    const fu = makeFu('2027-01-01')
    expect(isUpcoming(fu)).toBe(true)
    expect(isDueToday(fu)).toBe(false)
    expect(isOverdue(fu)).toBe(false)
  })

  it('classifies past pending follow-up as Overdue', () => {
    const fu = makeFu('2026-01-01')
    expect(isOverdue(fu)).toBe(true)
    expect(isDueToday(fu)).toBe(false)
    expect(isUpcoming(fu)).toBe(false)
  })

  it('Done follow-up does not appear in active columns', () => {
    const fu = makeFu(TODAY, 'Done')
    expect(isDueToday(fu)).toBe(false)
    expect(isUpcoming(fu)).toBe(false)
    expect(isOverdue(fu)).toBe(false)
  })

  it('Cancelled follow-up does not appear in active columns', () => {
    const fu = makeFu('2026-01-01', 'Cancelled')
    expect(isOverdue(fu)).toBe(false)
    expect(isDueToday(fu)).toBe(false)
    expect(isUpcoming(fu)).toBe(false)
  })

  it('past Done follow-up still has status Done regardless of date', () => {
    const fu = { date: '2026-01-01', status: 'Done', notifyTo: [] }
    expect(fu.status).toBe('Done')
    expect(isOverdue(fu)).toBe(false)
  })
})
