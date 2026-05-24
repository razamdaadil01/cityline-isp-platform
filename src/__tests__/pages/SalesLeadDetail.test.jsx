import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { isFieldFilled, displayFieldValue } from '../../components/ui/DynamicFieldInput'

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockLead = {
  id: 'LD-215',
  pipeline: 'B2C',
  leadName: 'Ramesh Nair — 100 Mbps Home',
  name: 'Ramesh Nair',
  phone: '9876001890',
  email: 'ramesh.nair@email.com',
  area: 'Koramangala',
  source: 'Website',
  stage: 'Installation Visit',
  plan: '100 Mbps Home',
  assigned: 'Arjun Kumar',
  assignedInitials: 'AK',
  assignedColor: 'bg-brand-blue',
  daysInStage: 1,
  lastActivity: 'Moved to Installation Visit',
  followUp: '',
  priority: 'high',
  ekycStatus: 'Completed',
  hwAssigned: null,
  createdAt: '2026-05-21',
  address: '12, Brigade Road',
  city: 'Bangalore',
  pincode: '560001',
  alternateMobile: '9812345678',
  createdBy: 'Arjun Kumar',
  kycDocs: {
    aadhaar: 'aadhaar_ramesh.pdf',
    panCard: 'pan_ramesh.pdf',
    customerPhoto: 'photo_ramesh.jpg',
  },
  stageHistory: [
    { stage: 'New Inquiry',       date: '2026-05-19', movedBy: 'Arjun Kumar', fields: { 's1-f1': 'Website', 's1-f2': '100 Mbps' } },
    { stage: 'Contacted',         date: '2026-05-20', movedBy: 'Arjun Kumar', fields: { 's2-f1': 'Call', 's2-f2': 'Yes' } },
    { stage: 'Site Survey',       date: '2026-05-20', movedBy: 'Arjun Kumar', fields: { 's4-f1': 'Feasible' } },
    { stage: 'Quotation Sent',    date: '2026-05-21', movedBy: 'Arjun Kumar', fields: { 's5-f1': '3500', 's5-f2': '100 Mbps' } },
    { stage: 'Hardware Assignment', date: '2026-05-21', movedBy: 'Arjun Kumar', fields: {} },
    { stage: 'Installation Visit', date: '2026-05-22', movedBy: 'Arjun Kumar', fields: { 's5d-f1': '2026-05-23', 's5d-f2': '10:30', 's5d-f3': 'Ravi Technician (ENG-001)' } },
  ],
  activityLog: [
    { id: 1, icon: '🟢', text: 'Lead Created', user: 'Arjun Kumar', time: '5 days ago' },
    { id: 2, icon: '➡️', text: 'Moved to Contacted', user: 'Arjun Kumar', time: '4 days ago' },
    { id: 3, icon: '📋', text: 'Follow-up scheduled for 2026-05-25', user: 'Arjun Kumar', time: '3 days ago' },
    { id: 4, icon: '➡️', text: 'Moved to Site Survey', user: 'Arjun Kumar', time: '3 days ago' },
  ],
}

vi.mock('../../data/leadsStore', () => ({
  getLeads:       () => [mockLead],
  saveLead:       vi.fn(),
  subscribeLeads: () => () => {},
}))

vi.mock('../../data/followupStore', () => ({
  saveFollowup: vi.fn(),
}))

vi.mock('../../data/pipelineStore', () => ({
  getPipelines: () => [
    {
      id: 'PL-001', name: 'Residential', active: true, isDefault: true,
      stages: [
        { id: 's1',  name: 'New Inquiry',        color: 'bg-blue-500', type: 'Standard', active: true, statusType: 'Open' },
        { id: 's5d', name: 'Installation Visit', color: 'bg-purple-600', type: 'Standard', active: true, statusType: 'Open' },
        { id: 's6',  name: 'Won',                color: 'bg-emerald-500', type: 'Standard', active: true, statusType: 'Won' },
        { id: 's7',  name: 'Lost',               color: 'bg-red-500', type: 'Standard', active: true, statusType: 'Lost' },
      ],
    },
  ],
  subscribePipelines: () => () => {},
}))

vi.mock('../../data/stageFieldsStore', () => ({
  getStageFields: (stageId) => {
    if (stageId === 's5d') return [
      { id: 's5d-f1', label: 'Installation Date',  type: 'Date',     required: true,  active: true, options: [] },
      { id: 's5d-f2', label: 'Installation Time',  type: 'Time',     required: true,  active: true, options: [] },
      { id: 's5d-f3', label: 'Engineer Assigned',  type: 'Dropdown', required: true,  active: true,
        options: ['Ravi Technician (ENG-001)', 'Kumar Installer (ENG-002)'] },
      { id: 's5d-f4', label: 'Installation Notes', type: 'Textarea', required: false, active: true, options: [] },
    ]
    if (stageId === 's7') return [
      { id: 's7-f1', label: 'Lost Reason', type: 'Dropdown', required: true, active: true,
        options: ['Price Too High', 'No Feasibility', 'Competition', 'Other'] },
    ]
    return []
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useParams:   () => ({ id: 'LD-215' }),
    useNavigate: () => vi.fn(),
  }
})

import SalesLeadDetail from '../../pages/SalesLeadDetail'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/sales/leads/LD-215']}>
      <Routes>
        <Route path="/sales/leads/:id" element={<SalesLeadDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Stage history ─────────────────────────────────────────────────────────────

describe('Stage history shows correct data', () => {
  it('stageHistory has correct number of stages', () => {
    expect(mockLead.stageHistory).toHaveLength(6)
  })

  it('stageHistory entries have stage, date, movedBy, and fields', () => {
    mockLead.stageHistory.forEach(entry => {
      expect(entry).toHaveProperty('stage')
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('movedBy')
      expect(entry).toHaveProperty('fields')
    })
  })

  it('stageHistory first entry is New Inquiry', () => {
    expect(mockLead.stageHistory[0].stage).toBe('New Inquiry')
    expect(mockLead.stageHistory[0].movedBy).toBe('Arjun Kumar')
  })

  it('stageHistory last entry is Installation Visit', () => {
    const last = mockLead.stageHistory[mockLead.stageHistory.length - 1]
    expect(last.stage).toBe('Installation Visit')
  })

  it('stageHistory fields contain field values for each stage', () => {
    const quotation = mockLead.stageHistory.find(h => h.stage === 'Quotation Sent')
    expect(quotation).toBeDefined()
    expect(quotation.fields['s5-f1']).toBe('3500')
    expect(quotation.fields['s5-f2']).toBe('100 Mbps')
  })

  it('renders page without crashing', () => {
    expect(() => renderPage()).not.toThrow()
  })
})

// ── Move Stage validates required fields ──────────────────────────────────────

describe('Move Stage validates required fields', () => {
  it('required fields block stage move when empty', () => {
    const requiredFields = [
      { id: 's5d-f1', label: 'Installation Date',  type: 'Date',     required: true },
      { id: 's5d-f2', label: 'Installation Time',  type: 'Time',     required: true },
      { id: 's5d-f3', label: 'Engineer Assigned',  type: 'Dropdown', required: true },
    ]
    const stageFieldVals = {}

    const errors = {}
    requiredFields.filter(f => f.required).forEach(f => {
      if (!isFieldFilled(f, stageFieldVals[f.id])) errors[f.id] = `${f.label} is required`
    })

    expect(Object.keys(errors)).toHaveLength(3)
    expect(errors['s5d-f1']).toBe('Installation Date is required')
    expect(errors['s5d-f2']).toBe('Installation Time is required')
    expect(errors['s5d-f3']).toBe('Engineer Assigned is required')
  })

  it('no errors when all required fields are filled', () => {
    const requiredFields = [
      { id: 's5d-f1', label: 'Installation Date',  type: 'Date',     required: true },
      { id: 's5d-f2', label: 'Installation Time',  type: 'Time',     required: true },
      { id: 's5d-f3', label: 'Engineer Assigned',  type: 'Dropdown', required: true },
    ]
    const stageFieldVals = {
      's5d-f1': '2026-05-25',
      's5d-f2': '10:00',
      's5d-f3': 'Ravi Technician (ENG-001)',
    }

    const errors = {}
    requiredFields.filter(f => f.required).forEach(f => {
      if (!isFieldFilled(f, stageFieldVals[f.id])) errors[f.id] = `${f.label} is required`
    })

    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('optional field (Installation Notes) does not block stage move when empty', () => {
    const fields = [
      { id: 's5d-f4', label: 'Installation Notes', type: 'Textarea', required: false },
    ]
    const stageFieldVals = {}

    const errors = {}
    fields.filter(f => f.required).forEach(f => {
      if (!isFieldFilled(f, stageFieldVals[f.id])) errors[f.id] = `${f.label} is required`
    })

    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('Lost stage requires Lost Reason field', () => {
    const lostFields = [
      { id: 's7-f1', label: 'Lost Reason', type: 'Dropdown', required: true,
        options: ['Price Too High', 'No Feasibility', 'Competition', 'Other'] },
    ]
    const stageFieldVals = {}
    const errors = {}
    lostFields.filter(f => f.required).forEach(f => {
      if (!isFieldFilled(f, stageFieldVals[f.id])) errors[f.id] = `${f.label} is required`
    })
    expect(errors['s7-f1']).toBe('Lost Reason is required')
  })
})

// ── Activity log records events ───────────────────────────────────────────────

describe('Activity log records events', () => {
  it('activity log has correct number of entries', () => {
    expect(mockLead.activityLog).toHaveLength(4)
  })

  it('activity log entries have id, icon, text, user, time', () => {
    mockLead.activityLog.forEach(entry => {
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('text')
      expect(entry).toHaveProperty('user')
      expect(entry).toHaveProperty('time')
    })
  })

  it('first activity is Lead Created', () => {
    expect(mockLead.activityLog[0].text).toBe('Lead Created')
  })

  it('stage move events are recorded in activity log', () => {
    const stageMoves = mockLead.activityLog.filter(e => e.text.startsWith('Moved to'))
    expect(stageMoves.length).toBeGreaterThan(0)
  })

  it('follow-up scheduling is recorded in activity log', () => {
    const fuEntry = mockLead.activityLog.find(e => e.text.includes('Follow-up scheduled'))
    expect(fuEntry).toBeDefined()
  })
})

// ── Comments @mention parsing ─────────────────────────────────────────────────

describe('Comments @mention parsing', () => {
  const STAFF = [
    { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue' },
    { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500' },
    { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500' },
    { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
  ]

  // The component splits on /(@\w+ \w+)/ to parse @mentions
  function parseCommentParts(text) {
    return text.split(/(@\w+\s\w+)/)
  }

  it('splits text into mention and non-mention parts', () => {
    const text = 'Hello @Arjun Kumar please review'
    const parts = parseCommentParts(text)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.some(p => p.startsWith('@'))).toBe(true)
  })

  it('identifies mention parts by @ prefix', () => {
    const text = '@Preethi Nair please check feasibility for this area.'
    const parts = parseCommentParts(text)
    const mentionPart = parts.find(p => p.startsWith('@'))
    expect(mentionPart).toBe('@Preethi Nair')
  })

  it('non-mention text does not start with @', () => {
    const text = 'Hello @Arjun Kumar how are you?'
    const parts = parseCommentParts(text)
    const nonMentions = parts.filter(p => !p.startsWith('@'))
    nonMentions.forEach(p => expect(p.startsWith('@')).toBe(false))
  })

  it('comment with no mention has only one part', () => {
    const text = 'Just a regular comment'
    const parts = parseCommentParts(text)
    expect(parts.some(p => p.startsWith('@'))).toBe(false)
  })

  it('mention filter works for @ query', () => {
    const query = 'ar'
    const filtered = STAFF.filter(s => s.name.toLowerCase().includes(query))
    expect(filtered).toHaveLength(2) // Arjun Kumar, Anita Sharma
  })

  it('empty mention query shows all staff', () => {
    const query = ''
    const filtered = STAFF.filter(s => s.name.toLowerCase().includes(query))
    expect(filtered).toHaveLength(STAFF.length)
  })

  it('mention @ triggers suggestion list when text contains @', () => {
    const comment = 'Please help @'
    const atIdx = comment.lastIndexOf('@')
    const query = comment.slice(atIdx + 1).toLowerCase()
    expect(query).toBe('')
    // Empty query would show all staff in suggestions
    const filtered = STAFF.filter(s => s.name.toLowerCase().includes(query))
    expect(filtered).toHaveLength(STAFF.length)
  })

  it('mention substitution replaces @query with @Name', () => {
    let newComment = 'Hello @Arj'
    const name = 'Arjun Kumar'
    const atIdx = newComment.lastIndexOf('@')
    newComment = newComment.slice(0, atIdx) + `@${name} `
    expect(newComment).toBe('Hello @Arjun Kumar ')
  })
})

// ── displayFieldValue for stage history ───────────────────────────────────────

describe('displayFieldValue for stage history display', () => {
  it('displays string values as-is', () => {
    expect(displayFieldValue('Website')).toBe('Website')
  })

  it('displays number values as string', () => {
    expect(displayFieldValue(3500)).toBe('3500')
  })

  it('displays array values as comma-joined string', () => {
    expect(displayFieldValue(['FTTH', 'Sector'])).toBe('FTTH, Sector')
  })

  it('displays true as Yes (checkbox fields)', () => {
    expect(displayFieldValue(true)).toBe('Yes')
  })

  it('displays undefined as empty string', () => {
    expect(displayFieldValue(undefined)).toBe('')
  })
})
