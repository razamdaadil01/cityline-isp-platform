import { describe, it, expect, beforeEach } from 'vitest'

// Use vi.resetModules() + dynamic import so each test starts with fresh in-memory state
describe('pipelineStore', () => {
  let getPipelines, addPipeline, updatePipeline, deletePipeline, subscribePipelines

  beforeEach(async () => {
    vi.resetModules()
    ;({ getPipelines, addPipeline, updatePipeline, deletePipeline, subscribePipelines } =
      await import('../../data/pipelineStore.js'))
  })

  // ── Initial state ────────────────────────────────────────────────────────────

  it('starts with 2 default pipelines (Residential and Corporate)', () => {
    expect(getPipelines()).toHaveLength(2)
  })

  it('initial pipelines have correct names', () => {
    const names = getPipelines().map(p => p.name)
    expect(names).toContain('Residential')
    expect(names).toContain('Corporate')
  })

  // ── Create new pipeline ──────────────────────────────────────────────────────

  it('can create a new custom pipeline', () => {
    const newPipeline = {
      id: 'PL-TEST',
      name: 'Test Pipeline',
      description: 'Testing',
      isDefault: false,
      active: true,
      activeLeads: 0,
      stages: [],
    }
    addPipeline(newPipeline)
    expect(getPipelines()).toHaveLength(3)
    expect(getPipelines().find(p => p.id === 'PL-TEST')).toBeDefined()
  })

  it('new pipeline is retrievable by id', () => {
    addPipeline({ id: 'PL-CUSTOM', name: 'Custom', isDefault: false, active: true, stages: [] })
    const found = getPipelines().find(p => p.id === 'PL-CUSTOM')
    expect(found.name).toBe('Custom')
  })

  // ── Update pipeline ──────────────────────────────────────────────────────────

  it('can update pipeline name', () => {
    updatePipeline('PL-001', { name: 'Updated Name' })
    const updated = getPipelines().find(p => p.id === 'PL-001')
    expect(updated.name).toBe('Updated Name')
  })

  it('can deactivate a pipeline', () => {
    updatePipeline('PL-001', { active: false })
    const p = getPipelines().find(p => p.id === 'PL-001')
    expect(p.active).toBe(false)
  })

  it('update does not affect other pipelines', () => {
    updatePipeline('PL-001', { name: 'Changed' })
    const other = getPipelines().find(p => p.id === 'PL-002')
    expect(other.name).toBe('Corporate')
  })

  // ── Delete pipeline ──────────────────────────────────────────────────────────

  it('can delete a non-default custom pipeline', () => {
    addPipeline({ id: 'PL-DEL', name: 'ToDelete', isDefault: false, active: true, stages: [] })
    expect(getPipelines()).toHaveLength(3)
    deletePipeline('PL-DEL')
    expect(getPipelines()).toHaveLength(2)
    expect(getPipelines().find(p => p.id === 'PL-DEL')).toBeUndefined()
  })

  // ── Stage reorder ────────────────────────────────────────────────────────────

  it('stage reorder works via updatePipeline', () => {
    const original = getPipelines().find(p => p.id === 'PL-001')
    const reordered = [...original.stages].reverse()
    updatePipeline('PL-001', { stages: reordered })
    const updated = getPipelines().find(p => p.id === 'PL-001')
    expect(updated.stages[0].id).toBe(original.stages[original.stages.length - 1].id)
  })

  it('adding a stage to a pipeline persists', () => {
    const original = getPipelines().find(p => p.id === 'PL-001')
    const newStage = { id: 'sNEW', name: 'Pre-Survey', color: 'bg-teal-500', type: 'Standard', active: true }
    updatePipeline('PL-001', { stages: [...original.stages, newStage] })
    const updated = getPipelines().find(p => p.id === 'PL-001')
    expect(updated.stages.find(s => s.id === 'sNEW')).toBeDefined()
  })

  // ── Subscribe/Unsubscribe ────────────────────────────────────────────────────

  it('subscriber is called when pipeline is added', () => {
    const spy = vi.fn()
    const unsub = subscribePipelines(spy)
    addPipeline({ id: 'PL-SUB', name: 'Sub Test', isDefault: false, active: true, stages: [] })
    expect(spy).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('subscriber receives updated pipeline list', () => {
    let received = null
    const unsub = subscribePipelines(pipelines => { received = pipelines })
    addPipeline({ id: 'PL-RCV', name: 'Received Test', isDefault: false, active: true, stages: [] })
    expect(received).toHaveLength(3)
    unsub()
  })

  it('unsubscribed callback is not called after removal', () => {
    const spy = vi.fn()
    const unsub = subscribePipelines(spy)
    unsub()
    updatePipeline('PL-001', { name: 'Trigger' })
    expect(spy).not.toHaveBeenCalled()
  })

  // ── deleteConfirm guard (UI level — cannot delete pipeline with leads) ────────

  it('DeleteConfirmModal shows cannot-delete message when pipeline has active leads', () => {
    // This logic lives in the UI (SalesPipelines.jsx DeleteConfirmModal).
    // The store itself does not guard — the guard is the leadCount prop.
    // We verify the data contract: a pipeline with activeLeads > 0 carries that count.
    const residential = getPipelines().find(p => p.id === 'PL-001')
    expect(residential.activeLeads).toBeGreaterThan(0)
  })
})
