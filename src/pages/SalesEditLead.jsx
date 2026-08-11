import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { getLeads, subscribeLeads } from '../data/leadsStore'
import SalesNewLead from './SalesNewLead'

// Edit Lead reuses the exact same form component as Create New Lead (FR-6/
// FR-7's Resident/Corporate field sets), passing the existing lead as
// SalesNewLead's `lead` prop — that prop's presence is what switches the
// shared form into edit mode (prefilled fields, locked Pipeline/Stage,
// "Save Changes" instead of "Create Lead", etc.). This page's only job is
// looking up the lead by route param and handling the not-found case.
export default function SalesEditLead() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [leads, setLeads] = useState(getLeads)

  useEffect(() => subscribeLeads(setLeads), [])

  const lead = leads.find(l => l.id === id)

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <p className="text-lg font-semibold text-gray-900 mb-2">Lead not found</p>
        <p className="text-sm text-gray-500 mb-6">
          The lead ID <code className="bg-gray-100 px-2 py-0.5 rounded">{id}</code> does not exist.
        </p>
        <Button onClick={() => navigate('/sales')}>Back to Sales Pipeline</Button>
      </div>
    )
  }

  return <SalesNewLead lead={lead} />
}
