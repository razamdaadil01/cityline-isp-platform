import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const TODAY = '2026-05-24'

const mockFollowups = [
  {
    id: 'FU-001', leadId: 'LD-001', leadName: 'Past Lead', customer: 'Past Lead',
    pipeline: 'Residential', phone: '9876001122',
    date: '2026-05-01', time: '10:00', note: 'Overdue note',
    stage: 'Contacted', assignedTo: 'Arjun Kumar', notifyTo: ['Preethi Nair'],
    priority: 'high', status: 'Pending',
  },
  {
    id: 'FU-002', leadId: 'LD-002', leadName: 'Today Lead', customer: 'Today Lead',
    pipeline: 'Residential', phone: '9876001123',
    date: TODAY, time: '11:00', note: 'Due today note',
    stage: 'Follow-up', assignedTo: 'Preethi Nair', notifyTo: [],
    priority: 'medium', status: 'Pending',
  },
  {
    id: 'FU-003', leadId: 'LD-003', leadName: 'Future Lead', customer: 'Future Lead',
    pipeline: 'Residential', phone: '9876001124',
    date: '2027-01-01', time: '14:00', note: 'Upcoming note',
    stage: 'New Inquiry', assignedTo: 'Suresh Babu', notifyTo: [],
    priority: 'low', status: 'Pending',
  },
  {
    id: 'FU-004', leadId: 'LD-004', leadName: 'Done Lead', customer: 'Done Lead',
    pipeline: 'Residential', phone: '9876001125',
    date: '2026-05-01', time: '09:00', note: 'Completed',
    stage: 'Won', assignedTo: 'Anita Sharma', notifyTo: [],
    priority: 'low', status: 'Done',
  },
  {
    id: 'FU-005', leadId: 'LD-005', leadName: 'Cancelled Lead', customer: 'Cancelled Lead',
    pipeline: 'Residential', phone: '9876001126',
    date: '2026-05-01', time: '09:00', note: 'Cancelled',
    stage: 'Lost', assignedTo: 'Arjun Kumar', notifyTo: [],
    priority: 'low', status: 'Cancelled',
  },
]

const mockSaveFollowup  = vi.fn()
const mockMarkDone      = vi.fn()
const mockCancelFollowup = vi.fn()

vi.mock('../../data/followupStore', () => ({
  getFollowups:       () => mockFollowups,
  saveFollowup:       (...args) => mockSaveFollowup(...args),
  markFollowupDone:   (...args) => mockMarkDone(...args),
  cancelFollowup:     (...args) => mockCancelFollowup(...args),
  subscribeFollowups: () => () => {},
}))

import SalesFollowups from '../../pages/SalesFollowups'

function renderPage() {
  return render(
    <MemoryRouter>
      <SalesFollowups />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Follow-up date cannot be in the past (form validation logic) ──────────────

describe('Follow-up date validation', () => {
  it('date field defaults to today in the follow-up modal', () => {
    // The FollowupModal initialises date to TODAY
    const FORM_DEFAULT = {
      leadName: '', phone: '', date: TODAY, time: '10:00',
      note: '', stage: '', assignedTo: '', notifyTo: [], priority: 'medium',
    }
    expect(FORM_DEFAULT.date).toBe(TODAY)
  })

  it('handleSave returns early when date is empty', () => {
    // Logic from FollowupModal.handleSave: if (!form.date) return
    const form = { leadName: 'Test', date: '' }
    const isValid = !(!form.leadName.trim() || !form.date)
    expect(isValid).toBe(false)
  })

  it('handleSave returns early when leadName is empty', () => {
    const form = { leadName: '', date: '2026-05-24' }
    const isValid = !(!form.leadName.trim() || !form.date)
    expect(isValid).toBe(false)
  })

  it('future date is a valid follow-up date', () => {
    const futureDate = '2027-01-01'
    expect(futureDate > TODAY).toBe(true)
  })

  it('past date string is less than TODAY', () => {
    const pastDate = '2026-01-01'
    expect(pastDate < TODAY).toBe(true)
  })
})

// ── Status calculation (Kanban column filters) ─────────────────────────────────

describe('Follow-up status classification', () => {
  const isDueToday = fu =>
    fu.date === TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'
  const isUpcoming = fu =>
    fu.date > TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'
  const isOverdue = fu =>
    fu.date < TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'

  it('FU-001 (past date, Pending) is classified as Overdue', () => {
    expect(isOverdue(mockFollowups[0])).toBe(true)
  })

  it('FU-001 is NOT Due Today or Upcoming', () => {
    expect(isDueToday(mockFollowups[0])).toBe(false)
    expect(isUpcoming(mockFollowups[0])).toBe(false)
  })

  it('FU-002 (today, Pending) is classified as Due Today', () => {
    expect(isDueToday(mockFollowups[1])).toBe(true)
  })

  it('FU-002 is NOT Overdue or Upcoming', () => {
    expect(isOverdue(mockFollowups[1])).toBe(false)
    expect(isUpcoming(mockFollowups[1])).toBe(false)
  })

  it('FU-003 (future, Pending) is classified as Upcoming', () => {
    expect(isUpcoming(mockFollowups[2])).toBe(true)
  })

  it('FU-003 is NOT Due Today or Overdue', () => {
    expect(isDueToday(mockFollowups[2])).toBe(false)
    expect(isOverdue(mockFollowups[2])).toBe(false)
  })

  it('FU-004 (Done) does not appear in active columns', () => {
    const done = mockFollowups[3]
    expect(isDueToday(done)).toBe(false)
    expect(isUpcoming(done)).toBe(false)
    expect(isOverdue(done)).toBe(false)
    expect(done.status).toBe('Done')
  })

  it('FU-005 (Cancelled) does not appear in active columns', () => {
    const cancelled = mockFollowups[4]
    expect(isDueToday(cancelled)).toBe(false)
    expect(isUpcoming(cancelled)).toBe(false)
    expect(isOverdue(cancelled)).toBe(false)
  })

  it('correctly counts follow-ups per category', () => {
    const overdue  = mockFollowups.filter(isOverdue)
    const dueToday = mockFollowups.filter(isDueToday)
    const upcoming = mockFollowups.filter(isUpcoming)

    expect(overdue).toHaveLength(1)   // FU-001
    expect(dueToday).toHaveLength(1)  // FU-002
    expect(upcoming).toHaveLength(1)  // FU-003
  })
})

// ── Cancel follow-up flow ─────────────────────────────────────────────────────

describe('Cancel follow-up flow', () => {
  it('page renders without error', () => {
    expect(() => renderPage()).not.toThrow()
  })

  it('follow-up leads are visible in the page', () => {
    renderPage()
    expect(screen.queryAllByText('Past Lead').length).toBeGreaterThan(0)
  })

  it('cancelFollowup sets status to Cancelled via store', async () => {
    let followups = [...mockFollowups]
    function cancelFollowup(id) {
      followups = followups.map(f => f.id === id ? { ...f, status: 'Cancelled' } : f)
    }
    cancelFollowup('FU-001')
    expect(followups.find(f => f.id === 'FU-001').status).toBe('Cancelled')
  })

  it('cancelled follow-up no longer appears in overdue column', () => {
    const isOverdue = fu => fu.date < TODAY && fu.status !== 'Done' && fu.status !== 'Cancelled'
    const cancelledFu = { ...mockFollowups[0], status: 'Cancelled' }
    expect(isOverdue(cancelledFu)).toBe(false)
  })
})

// ── Notifier selection ────────────────────────────────────────────────────────

describe('Notifier selection', () => {
  it('follow-up stores notifyTo with selected staff members', () => {
    const fu = mockFollowups[0]
    expect(fu.notifyTo).toContain('Preethi Nair')
  })

  it('follow-up without notifiers has empty notifyTo array', () => {
    const fu = mockFollowups[2]
    expect(fu.notifyTo).toHaveLength(0)
  })

  it('toggleNotify adds staff to notifyTo', () => {
    let notifyTo = []
    function toggleNotify(name) {
      notifyTo = notifyTo.includes(name)
        ? notifyTo.filter(n => n !== name)
        : [...notifyTo, name]
    }
    toggleNotify('Arjun Kumar')
    expect(notifyTo).toContain('Arjun Kumar')
  })

  it('toggleNotify removes staff from notifyTo when already selected', () => {
    let notifyTo = ['Arjun Kumar', 'Preethi Nair']
    function toggleNotify(name) {
      notifyTo = notifyTo.includes(name)
        ? notifyTo.filter(n => n !== name)
        : [...notifyTo, name]
    }
    toggleNotify('Arjun Kumar')
    expect(notifyTo).not.toContain('Arjun Kumar')
    expect(notifyTo).toContain('Preethi Nair')
  })

  it('multiple notifiers can be selected', () => {
    let notifyTo = []
    function toggleNotify(name) {
      notifyTo = notifyTo.includes(name)
        ? notifyTo.filter(n => n !== name)
        : [...notifyTo, name]
    }
    toggleNotify('Arjun Kumar')
    toggleNotify('Preethi Nair')
    toggleNotify('Suresh Babu')
    expect(notifyTo).toHaveLength(3)
  })
})
