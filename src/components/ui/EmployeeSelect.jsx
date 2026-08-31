// Reusable employee/staff picker — wraps getActiveUsers() in a plain
// FormInputs Select, same idiom every other screen already inlines
// (SalesFollowups.jsx's Assigned To, CreateAssignment.jsx's engineer picker,
// etc.), pulled out here so Project Management's "Site Incharge / Project
// Owner", "Assigned Engineer" and "Technician Assignment" fields (HDD and
// Site project forms alike) all share one implementation instead of three
// copies.
import { Select } from './FormInputs'
import { getActiveUsers } from '../../data/userStore'

export default function EmployeeSelect({ value, onChange, roleFilter, placeholder = 'Select employee…', ...props }) {
  const employees = getActiveUsers().filter(u => !roleFilter || roleFilter(u.role))
  return (
    <Select value={value ?? ''} onChange={e => onChange(e.target.value)} {...props}>
      <option value="">{placeholder}</option>
      {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
    </Select>
  )
}
