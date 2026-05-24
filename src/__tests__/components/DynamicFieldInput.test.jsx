import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DynamicFieldInput, { isFieldFilled, displayFieldValue } from '../../components/ui/DynamicFieldInput'

function makeField(id, type, options = [], required = false) {
  return { id, label: `Test ${type}`, type, required, active: true, placeholder: '', help: '', options }
}

// ── isFieldFilled ─────────────────────────────────────────────────────────────

describe('isFieldFilled', () => {
  it('returns true for non-empty Text value', () => {
    expect(isFieldFilled(makeField('f1', 'Text'), 'hello')).toBe(true)
  })

  it('returns false for empty Text value', () => {
    expect(isFieldFilled(makeField('f1', 'Text'), '')).toBe(false)
  })

  it('returns false for undefined value', () => {
    expect(isFieldFilled(makeField('f1', 'Text'), undefined)).toBe(false)
  })

  it('returns true for non-empty Number value', () => {
    expect(isFieldFilled(makeField('f1', 'Number'), '42')).toBe(true)
  })

  it('Multi-select returns true when array has items', () => {
    expect(isFieldFilled(makeField('f1', 'Multi-select'), ['Option A'])).toBe(true)
  })

  it('Multi-select returns false for empty array', () => {
    expect(isFieldFilled(makeField('f1', 'Multi-select'), [])).toBe(false)
  })

  it('Multi-select returns false for non-array value', () => {
    expect(isFieldFilled(makeField('f1', 'Multi-select'), 'not-array')).toBe(false)
  })

  it('Checkbox returns true for true', () => {
    expect(isFieldFilled(makeField('f1', 'Checkbox'), true)).toBe(true)
  })

  it('Checkbox returns false for false', () => {
    expect(isFieldFilled(makeField('f1', 'Checkbox'), false)).toBe(false)
  })

  it('Dropdown returns true for selected value', () => {
    expect(isFieldFilled(makeField('f1', 'Dropdown', ['A', 'B']), 'A')).toBe(true)
  })

  it('Dropdown returns false for empty string', () => {
    expect(isFieldFilled(makeField('f1', 'Dropdown', ['A', 'B']), '')).toBe(false)
  })
})

// ── displayFieldValue ─────────────────────────────────────────────────────────

describe('displayFieldValue', () => {
  it('joins array values with comma', () => {
    expect(displayFieldValue(['A', 'B', 'C'])).toBe('A, B, C')
  })

  it('converts true to "Yes"', () => {
    expect(displayFieldValue(true)).toBe('Yes')
  })

  it('converts false to "No"', () => {
    expect(displayFieldValue(false)).toBe('No')
  })

  it('converts undefined to empty string', () => {
    expect(displayFieldValue(undefined)).toBe('')
  })

  it('returns string as-is', () => {
    expect(displayFieldValue('hello')).toBe('hello')
  })
})

// ── Field type rendering ──────────────────────────────────────────────────────

describe('DynamicFieldInput renders correct input type', () => {
  it('renders text input for type Text', () => {
    render(<DynamicFieldInput field={makeField('f1', 'Text')} value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
  })

  it('renders number input for type Number', () => {
    render(<DynamicFieldInput field={makeField('f1', 'Number')} value="" onChange={() => {}} />)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('renders email input for type Email', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'Email')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="email"]')
    expect(input).toBeInTheDocument()
  })

  it('renders tel input for type Phone', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'Phone')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="tel"]')
    expect(input).toBeInTheDocument()
  })

  it('renders date input for type Date', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'Date')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="date"]')
    expect(input).toBeInTheDocument()
  })

  it('renders time input for type Time', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'Time')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="time"]')
    expect(input).toBeInTheDocument()
  })

  it('renders datetime-local input for type Date & Time', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'Date & Time')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="datetime-local"]')
    expect(input).toBeInTheDocument()
  })

  it('renders url input for type URL', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'URL')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="url"]')
    expect(input).toBeInTheDocument()
  })

  it('renders select for type Dropdown with options', () => {
    const field = makeField('f1', 'Dropdown', ['Option A', 'Option B'])
    render(<DynamicFieldInput field={field} value="" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders checkboxes for type Multi-select', () => {
    const field = makeField('f1', 'Multi-select', ['Alpha', 'Beta'])
    render(<DynamicFieldInput field={field} value={[]} onChange={() => {}} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('renders radio buttons for type Radio', () => {
    const field = makeField('f1', 'Radio', ['Yes', 'No', 'Maybe'])
    render(<DynamicFieldInput field={field} value="" onChange={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('renders textarea for type Textarea', () => {
    const field = makeField('f1', 'Textarea')
    render(<DynamicFieldInput field={field} value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('renders file input for type File Upload', () => {
    const { container } = render(
      <DynamicFieldInput field={makeField('f1', 'File Upload')} value="" onChange={() => {}} />
    )
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
  })

  it('renders checkbox for type Checkbox', () => {
    const field = makeField('f1', 'Checkbox')
    render(<DynamicFieldInput field={field} value={false} onChange={() => {}} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  // ── onChange callback ────────────────────────────────────────────────────────

  it('Text input calls onChange with entered value', () => {
    const onChange = vi.fn()
    render(<DynamicFieldInput field={makeField('f1', 'Text')} value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('Dropdown calls onChange when option is selected', () => {
    const onChange = vi.fn()
    const field = makeField('f1', 'Dropdown', ['Walk-in', 'Website'])
    render(<DynamicFieldInput field={field} value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Website' } })
    expect(onChange).toHaveBeenCalledWith('Website')
  })

  it('Multi-select adds item when checked', () => {
    const onChange = vi.fn()
    const field = makeField('f1', 'Multi-select', ['Alpha', 'Beta'])
    render(<DynamicFieldInput field={field} value={[]} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Alpha'))
    expect(onChange).toHaveBeenCalledWith(['Alpha'])
  })

  it('Multi-select removes item when unchecked', () => {
    const onChange = vi.fn()
    const field = makeField('f1', 'Multi-select', ['Alpha', 'Beta'])
    render(<DynamicFieldInput field={field} value={['Alpha', 'Beta']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Alpha'))
    expect(onChange).toHaveBeenCalledWith(['Beta'])
  })

  it('Radio calls onChange with selected option', () => {
    const onChange = vi.fn()
    const field = makeField('f1', 'Radio', ['Yes', 'No'])
    render(<DynamicFieldInput field={field} value="" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Yes'))
    expect(onChange).toHaveBeenCalledWith('Yes')
  })

  it('Checkbox calls onChange with true when checked', () => {
    const onChange = vi.fn()
    const field = makeField('f1', 'Checkbox')
    render(<DynamicFieldInput field={field} value={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
