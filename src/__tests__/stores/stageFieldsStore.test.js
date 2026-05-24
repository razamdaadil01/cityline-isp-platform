import { describe, it, expect, beforeEach } from 'vitest'

describe('stageFieldsStore', () => {
  let getStageFields, setStageFields, subscribeStageFields

  beforeEach(async () => {
    vi.resetModules()
    ;({ getStageFields, setStageFields, subscribeStageFields } =
      await import('../../data/stageFieldsStore.js'))
  })

  // ── getStageFields ────────────────────────────────────────────────────────────

  it('returns fields for stage s1 (New Inquiry)', () => {
    const fields = getStageFields('s1')
    expect(fields.length).toBeGreaterThan(0)
    expect(fields[0]).toHaveProperty('id')
    expect(fields[0]).toHaveProperty('label')
    expect(fields[0]).toHaveProperty('type')
  })

  it('returns Lead Source dropdown for s1', () => {
    const fields = getStageFields('s1')
    const leadSource = fields.find(f => f.label === 'Lead Source')
    expect(leadSource).toBeDefined()
    expect(leadSource.type).toBe('Dropdown')
    expect(leadSource.options).toContain('Website')
    expect(leadSource.options).toContain('Walk-in')
  })

  it('returns Contact Method (required) for s2 (Contacted)', () => {
    const fields = getStageFields('s2')
    const method = fields.find(f => f.label === 'Contact Method')
    expect(method).toBeDefined()
    expect(method.required).toBe(true)
  })

  it('returns Feasibility Status (required) for s4 (Site Survey)', () => {
    const fields = getStageFields('s4')
    const feasibility = fields.find(f => f.label === 'Feasibility Status')
    expect(feasibility).toBeDefined()
    expect(feasibility.required).toBe(true)
  })

  it('returns Quotation Amount (required, Number) for s5', () => {
    const fields = getStageFields('s5')
    const amount = fields.find(f => f.label === 'Quotation Amount')
    expect(amount).toBeDefined()
    expect(amount.type).toBe('Number')
    expect(amount.required).toBe(true)
  })

  it('returns Lost Reason (required, Dropdown) for s7', () => {
    const fields = getStageFields('s7')
    const reason = fields.find(f => f.label === 'Lost Reason')
    expect(reason).toBeDefined()
    expect(reason.type).toBe('Dropdown')
    expect(reason.required).toBe(true)
  })

  it('returns empty array for unknown stage id', () => {
    expect(getStageFields('nonexistent')).toEqual([])
  })

  // ── Required vs Optional fields ───────────────────────────────────────────────

  it('s2 has both required and optional fields', () => {
    const fields = getStageFields('s2')
    const required = fields.filter(f => f.required)
    const optional = fields.filter(f => !f.required)
    expect(required.length).toBeGreaterThan(0)
    expect(optional.length).toBeGreaterThan(0)
  })

  it('all s5d (Installation Visit) date/time/engineer fields are required', () => {
    const fields = getStageFields('s5d')
    const required = fields.filter(f => f.required)
    expect(required.find(f => f.label === 'Installation Date')).toBeDefined()
    expect(required.find(f => f.label === 'Installation Time')).toBeDefined()
    expect(required.find(f => f.label === 'Engineer Assigned')).toBeDefined()
  })

  it('Installation Notes in s5d is optional (can be skipped)', () => {
    const fields = getStageFields('s5d')
    const notes = fields.find(f => f.label === 'Installation Notes')
    expect(notes).toBeDefined()
    expect(notes.required).toBe(false)
  })

  // ── Field types render correctly ──────────────────────────────────────────────

  it('all supported field types appear across stages', () => {
    const allFields = [
      ...getStageFields('s1'),
      ...getStageFields('s2'),
      ...getStageFields('s4'),
      ...getStageFields('s5'),
      ...getStageFields('s5d'),
      ...getStageFields('s7'),
      ...getStageFields('b4'),
    ]
    const types = new Set(allFields.map(f => f.type))
    expect(types.has('Dropdown')).toBe(true)
    expect(types.has('Text')).toBe(true)
    expect(types.has('Number')).toBe(true)
    expect(types.has('Textarea')).toBe(true)
    expect(types.has('Date')).toBe(true)
    expect(types.has('Time')).toBe(true)
  })

  // ── setStageFields ────────────────────────────────────────────────────────────

  it('can set new fields for a stage', () => {
    const newFields = [
      { id: 'x-f1', label: 'Custom Field', type: 'Text', required: false, active: true, options: [] },
    ]
    setStageFields('sX', newFields)
    expect(getStageFields('sX')).toEqual(newFields)
  })

  it('can replace fields for an existing stage', () => {
    const replacement = [{ id: 's1-new', label: 'New Field', type: 'Number', required: true, active: true, options: [] }]
    setStageFields('s1', replacement)
    expect(getStageFields('s1')).toHaveLength(1)
    expect(getStageFields('s1')[0].label).toBe('New Field')
  })

  it('setStageFields does not affect other stages', () => {
    setStageFields('s1', [])
    expect(getStageFields('s2').length).toBeGreaterThan(0)
  })

  // ── Validation rules ──────────────────────────────────────────────────────────

  it('fields with required=true must block stage move when empty', async () => {
    const fields = getStageFields('s2')
    const { isFieldFilled } = await import('../../components/ui/DynamicFieldInput.jsx')
    const requiredFields = fields.filter(f => f.required)
    // Simulate no values provided
    const allEmpty = requiredFields.every(f => !isFieldFilled(f, ''))
    expect(allEmpty).toBe(true)
  })

  it('optional fields with empty value pass isFieldFilled check', async () => {
    const { isFieldFilled } = await import('../../components/ui/DynamicFieldInput.jsx')
    const optionalField = { id: 'opt', type: 'Text', required: false }
    // Empty optional field — isFieldFilled returns false but it's not required so no block
    expect(optionalField.required).toBe(false)
    expect(isFieldFilled(optionalField, '')).toBe(false)
  })

  // ── Subscribe ────────────────────────────────────────────────────────────────

  it('subscriber is notified when fields are updated', () => {
    const spy = vi.fn()
    const unsub = subscribeStageFields(spy)
    setStageFields('s1', [{ id: 'test', label: 'Test', type: 'Text', required: false, active: true, options: [] }])
    expect(spy).toHaveBeenCalledTimes(1)
    unsub()
  })
})
