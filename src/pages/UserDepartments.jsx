import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Check, AlertTriangle, Users } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Textarea } from '../components/ui/FormInputs'
import { getUsers, subscribeUsers } from '../data/userStore'
import {
  getDepartments, subscribeDepartments, saveDepartment, deleteDepartment, isDepartmentNameTaken,
} from '../data/departmentStore'

// Departments — moved out of Settings.jsx's own tab into its own page under
// User Management's sidebar submenu (User List / Departments), the same
// pattern Customers uses for Customer List / Hardware Recovery. Same store
// (departmentStore.js's getDepartments()/saveDepartment()/deleteDepartment()/
// subscribeDepartments()) and the same add/rename/delete UI this app's
// Complaint Categories settings tab established — only the page chrome
// changed (a full page header instead of a Settings tab panel). Staff
// binding still reads/writes userStore.js's `departmentId` field on the
// user record, assigned only from the Add User page's Department dropdown
// (see departmentStore.js's top-of-file comment for why that field lives
// on the user, not a `members` array here).
export default function UserDepartments() {
  const [departments, setDepartments] = useState(getDepartments)
  useEffect(() => subscribeDepartments(setDepartments), [])

  const [users, setUsers] = useState(getUsers)
  useEffect(() => subscribeUsers(setUsers), [])

  const [toast, setToast] = useState('')
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  const [formOpen, setFormOpen] = useState(false)
  const [formTarget, setFormTarget] = useState(null) // department being edited, or null when adding
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)

  function staffOf(departmentId) {
    return users.filter(u => u.departmentId === departmentId)
  }

  function openAdd() {
    setFormTarget(null)
    setFormName('')
    setFormDescription('')
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(dept) {
    setFormTarget(dept)
    setFormName(dept.name)
    setFormDescription(dept.description ?? '')
    setFormError('')
    setFormOpen(true)
  }

  function handleSaveForm() {
    const name = formName.trim()
    if (!name) { setFormError('Department name is required.'); return }
    if (isDepartmentNameTaken(name, formTarget?.id ?? null)) {
      setFormError('A department with this name already exists.')
      return
    }
    saveDepartment({ id: formTarget?.id, name, description: formDescription.trim() })
    setToast(formTarget ? 'Department updated successfully' : 'Department added successfully')
    setFormOpen(false)
  }

  function handleDelete() {
    if (!deleteTarget || staffOf(deleteTarget.id).length > 0) return
    deleteDepartment(deleteTarget.id)
    setToast('Department deleted successfully')
    setDeleteTarget(null)
  }

  const deleteStaffCount = deleteTarget ? staffOf(deleteTarget.id).length : 0

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Group staff into departments. Staff are assigned to a department from the Add User page.
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openAdd}>Add Department</Button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <Check size={14} className="shrink-0" />
          {toast}
        </div>
      )}

      <div className="space-y-3">
        {departments.map(dept => {
          const staff = staffOf(dept.id)
          return (
            <div key={dept.id} className="bg-white border border-surface-border rounded-xl shadow-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users size={14} className="text-brand-blue shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{dept.name}</p>
                    {dept.description && <p className="text-xs text-gray-500 truncate">{dept.description}</p>}
                  </div>
                  <Badge size="sm" variant="gray">{staff.length} staff</Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(dept)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(dept)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-surface-border">
                {staff.length === 0 ? (
                  <p className="text-xs text-gray-400">No staff bound yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {staff.map(u => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-border bg-white text-xs text-gray-700">
                        {u.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {departments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No departments configured yet.</p>
        )}
      </div>

      {/* Add/Edit Department */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formTarget ? `Edit Department — ${formTarget.name}` : 'Add Department'}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveForm}>{formTarget ? 'Save Changes' : 'Add Department'}</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Department Name" required error={formError}>
            <Input value={formName} onChange={e => { setFormName(e.target.value); setFormError('') }} placeholder="e.g. Network Operations" />
          </FormField>
          <FormField label="Description">
            <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="What this department is responsible for" />
          </FormField>
        </div>
      </Modal>

      {/* Delete Department */}
      {deleteTarget && deleteStaffCount > 0 && (
        <Modal
          isOpen
          onClose={() => setDeleteTarget(null)}
          title="Cannot Delete Department"
          size="sm"
          footer={<Button onClick={() => setDeleteTarget(null)}>Got It</Button>}
        >
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Cannot delete — <strong className="text-red-600">{deleteStaffCount} staff member{deleteStaffCount > 1 ? 's' : ''}</strong>{' '}
                currently belong to "{deleteTarget.name}".
              </p>
              <p className="text-sm text-gray-600">
                Reassign this department's staff to another department first.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {deleteTarget && deleteStaffCount === 0 && (
        <Modal
          isOpen
          onClose={() => setDeleteTarget(null)}
          title="Delete Department"
          size="sm"
          footer={<>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete Department</Button>
          </>}
        >
          <p className="text-sm text-gray-600">
            Are you sure? This will permanently delete <strong>{deleteTarget.name}</strong>. This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
