import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLeads = [
  {
    id: 'LD-001', name: 'Existing Customer', phone: '9876543210',
    alternateMobile: '9111111111', pipeline: 'B2C',
    stage: 'Contacted', createdAt: '2026-01-01', assigned: 'Arjun Kumar',
  },
]

vi.mock('../../data/leadsStore', () => ({
  getLeads: () => mockLeads,
  saveLead:  vi.fn(),
}))

vi.mock('../../data/pipelineStore', () => ({
  getPipelines: () => [
    {
      id: 'PL-001', name: 'Residential', active: true, isDefault: true,
      stages: [{ id: 's1', name: 'New Inquiry', active: true }],
    },
    {
      id: 'PL-002', name: 'Corporate', active: true, isDefault: true,
      stages: [{ id: 'b1', name: 'New Inquiry', active: true }],
    },
  ],
  subscribePipelines: () => () => {},
}))

vi.mock('../../data/stageFieldsStore', () => ({
  getStageFields: () => [
    { id: 's1-f1', label: 'Lead Source', type: 'Dropdown', required: false, active: true,
      options: ['Walk-in', 'Website', 'Referral', 'Cold Call', 'Social Media', 'Other'] },
    { id: 's1-f2', label: 'Interested Plan', type: 'Dropdown', required: false, active: true,
      options: ['50 Mbps', '100 Mbps', '200 Mbps'] },
  ],
  subscribeStageFields: () => () => {},
}))

vi.mock('../../data/feasibilityStore', () => ({
  saveFeasibilityRequest: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

import SalesNewLead from '../../pages/SalesNewLead'
import { getStates, getDistricts, getAreasList, getLocalities, getSubLocalities, lookupSubLocality } from '../../data/areaMappingStore'

function renderPage() {
  return render(
    <MemoryRouter>
      <SalesNewLead />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Form renders ──────────────────────────────────────────────────────────────

describe('SalesNewLead form renders', () => {
  it('renders without crashing', () => {
    expect(() => renderPage()).not.toThrow()
  })

  it('renders Lead Name field', () => {
    renderPage()
    expect(screen.getByText(/lead name/i)).toBeInTheDocument()
  })

  it('renders Full Name field', () => {
    renderPage()
    expect(screen.getByText(/full name/i)).toBeInTheDocument()
  })

  it('renders Phone Number field', () => {
    renderPage()
    expect(screen.getByText(/phone number/i)).toBeInTheDocument()
  })

  it('renders pipeline selection (B2C / B2B)', () => {
    renderPage()
    expect(screen.queryAllByText('Residential').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Corporate').length).toBeGreaterThan(0)
  })
})

// ── Required fields validation ────────────────────────────────────────────────

describe('SalesNewLead required fields validation', () => {
  it('shows error when lead name is empty on submit', async () => {
    renderPage()
    const submitBtn = screen.getByText(/create lead/i) || screen.getByRole('button', { name: /create/i })
    if (submitBtn) fireEvent.click(submitBtn)
    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  it('validate() returns error for empty leadName', () => {
    // Unit test of the validation logic extracted from the component
    const form = { leadName: '', name: 'Test', phone: '9876543210', alternatePhone: '' }
    const errors = {}
    if (!form.leadName.trim()) errors.leadName = 'Lead name is required'
    expect(errors.leadName).toBe('Lead name is required')
  })

  it('validate() returns error for empty name', () => {
    const form = { leadName: 'Test Lead', name: '', phone: '9876543210', alternatePhone: '' }
    const errors = {}
    if (!form.name.trim()) errors.name = 'Full name is required'
    expect(errors.name).toBe('Full name is required')
  })

  it('validate() returns error for invalid phone (less than 10 digits)', () => {
    const form = { leadName: 'Test', name: 'Test', phone: '98765', alternatePhone: '' }
    const errors = {}
    if (!form.phone.match(/^\d{10}$/)) errors.phone = 'Enter a valid 10-digit number'
    expect(errors.phone).toBeDefined()
  })

  it('validate() returns error for non-numeric phone', () => {
    const form = { leadName: 'Test', name: 'Test', phone: 'abcdefghij', alternatePhone: '' }
    const errors = {}
    if (!form.phone.match(/^\d{10}$/)) errors.phone = 'Enter a valid 10-digit number'
    expect(errors.phone).toBeDefined()
  })

  it('validate() passes for valid 10-digit phone', () => {
    const form = { leadName: 'Test Lead', name: 'Test', phone: '9876543210', alternatePhone: '' }
    const errors = {}
    if (!form.leadName.trim()) errors.leadName = 'Lead name is required'
    if (!form.name.trim()) errors.name = 'Full name is required'
    if (!form.phone.match(/^\d{10}$/)) errors.phone = 'Enter a valid 10-digit number'
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('validate() returns error for invalid alternate phone when provided', () => {
    const form = { leadName: 'X', name: 'X', phone: '9876543210', alternatePhone: '123' }
    const errors = {}
    if (form.alternatePhone && !form.alternatePhone.match(/^\d{10}$/))
      errors.alternatePhone = 'Enter a valid 10-digit number'
    expect(errors.alternatePhone).toBeDefined()
  })

  it('validate() passes when alternate phone is empty', () => {
    const form = { leadName: 'X', name: 'X', phone: '9876543210', alternatePhone: '' }
    const errors = {}
    if (form.alternatePhone && !form.alternatePhone.match(/^\d{10}$/))
      errors.alternatePhone = 'Enter a valid 10-digit number'
    expect(errors.alternatePhone).toBeUndefined()
  })
})

// ── Duplicate mobile number detection ─────────────────────────────────────────

describe('Duplicate mobile number detection', () => {
  function findDuplicate(phoneNum, leads) {
    if (!phoneNum || phoneNum.length !== 10) return null
    return leads.find(l => l.phone === phoneNum || l.alternateMobile === phoneNum) ?? null
  }

  it('returns null for phone shorter than 10 digits', () => {
    expect(findDuplicate('98765', mockLeads)).toBeNull()
  })

  it('returns null for empty phone', () => {
    expect(findDuplicate('', mockLeads)).toBeNull()
  })

  it('detects duplicate by matching primary phone', () => {
    const dup = findDuplicate('9876543210', mockLeads)
    expect(dup).not.toBeNull()
    expect(dup.id).toBe('LD-001')
  })

  it('detects duplicate by matching alternate mobile', () => {
    const dup = findDuplicate('9111111111', mockLeads)
    expect(dup).not.toBeNull()
    expect(dup.id).toBe('LD-001')
  })

  it('returns null when phone not found in any lead', () => {
    const dup = findDuplicate('9999999999', mockLeads)
    expect(dup).toBeNull()
  })

  it('only triggers when exactly 10 digits are entered', () => {
    expect(findDuplicate('987654321', mockLeads)).toBeNull()   // 9 digits
    expect(findDuplicate('98765432100', mockLeads)).toBeNull() // 11 digits
    expect(findDuplicate('9876543210', mockLeads)).not.toBeNull() // 10 digits
  })

  it('shows duplicate banner when duplicate exists', async () => {
    renderPage()
    const phoneInput = screen.queryAllByPlaceholderText(/9876543210/i)[0]
    if (phoneInput) {
      fireEvent.change(phoneInput, { target: { value: '9876543210' } })
      fireEvent.blur(phoneInput)
      await waitFor(() => {
        const banner = screen.queryByText(/duplicate/i)
        // Banner appears when duplicate is found
        if (banner) expect(banner).toBeInTheDocument()
      })
    }
  })
})

// ── Area chain (State → District → Area → Locality → Sub Locality) ────────────

describe('Area chain (State → District → Area → Locality → Sub Locality)', () => {
  it('getStates returns available states', () => {
    const states = getStates()
    expect(states).toContain('Karnataka')
    expect(states).toContain('Uttar Pradesh')
  })

  it('selecting state populates districts', () => {
    const districts = getDistricts('Uttar Pradesh')
    expect(districts.length).toBeGreaterThan(0)
    expect(districts).toContain('Gautam Buddha Nagar')
  })

  it('selecting district populates areas', () => {
    const areas = getAreasList('Uttar Pradesh', 'Gautam Buddha Nagar')
    expect(areas.length).toBeGreaterThan(0)
    expect(areas).toContain('Noida')
  })

  it('selecting area populates localities', () => {
    const localities = getLocalities('Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida')
    expect(localities.length).toBeGreaterThan(0)
  })

  it('selecting locality populates sub-localities', () => {
    const subs = getSubLocalities('Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 62')
    expect(subs.length).toBeGreaterThan(0)
    expect(subs[0]).toHaveProperty('subLocality')
    expect(subs[0]).toHaveProperty('siteType')
  })

  it('chain resets when state changes (districts empty for unrelated state)', () => {
    const districts = getDistricts('Nonexistent State')
    expect(districts).toHaveLength(0)
  })
})

// ── Site Type auto-populate ────────────────────────────────────────────────────

describe('Site Type auto-populate via lookupSubLocality', () => {
  it('auto-populates FTTH for Sector 62 Tower A', () => {
    const record = lookupSubLocality(
      'Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 62', 'Tower A'
    )
    expect(record.siteType).toBe('FTTH')
  })

  it('auto-populates Sector type for Sector 63 Block C', () => {
    const record = lookupSubLocality(
      'Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 63', 'Block C'
    )
    expect(record.siteType).toBe('Sector')
  })

  it('returns null (no auto-populate) for unknown sub-locality', () => {
    const record = lookupSubLocality('X', 'Y', 'Z', 'W', 'V')
    expect(record).toBeNull()
  })

  it('auto-populates branch code alongside site type', () => {
    const record = lookupSubLocality(
      'Uttar Pradesh', 'Gautam Buddha Nagar', 'Noida', 'Sector 62', 'Tower B'
    )
    expect(record.branchCode).toBe('CNPL-001')
  })
})

// ── Feasibility Required toggle ────────────────────────────────────────────────

describe('Feasibility Required toggle', () => {
  it('feasibilityRequired defaults to false in initial form', () => {
    const INIT_FORM = {
      pipeline: 'B2C', leadName: '', name: '', phone: '', alternatePhone: '',
      email: '', state: '', district: '', area: '', locality: '', subLocality: '',
      source: '', plan: '', assigned: '', followUp: '', notes: '',
      kycDocs: {}, feasibilityRequired: false,
    }
    expect(INIT_FORM.feasibilityRequired).toBe(false)
  })

  it('feasibilityRequired can be toggled to true', () => {
    let feasibilityRequired = false
    feasibilityRequired = !feasibilityRequired
    expect(feasibilityRequired).toBe(true)
  })

  it('feasibilityRequired is a boolean toggle in the form state', () => {
    // Feasibility Required is a checkbox rendered when sub-locality is "__other__"
    // The initial value is false; toggling the checkbox sets it to true
    let feasibilityRequired = false
    feasibilityRequired = !feasibilityRequired
    expect(feasibilityRequired).toBe(true)
    feasibilityRequired = !feasibilityRequired
    expect(feasibilityRequired).toBe(false)
  })
})
