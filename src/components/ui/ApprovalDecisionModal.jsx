import { useState, useEffect } from 'react'
import Button from './Button'
import Modal from './Modal'
import { FormField, Textarea } from './FormInputs'

export default function ApprovalDecisionModal({ isOpen, onClose, decision, approval, onConfirm }) {
  const [comment, setComment] = useState('')

  useEffect(() => { if (!isOpen) setComment('') }, [isOpen])

  if (!approval) return null

  const isApprove = decision === 'approve'

  function handleConfirm() {
    onConfirm(comment.trim())
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isApprove ? 'Approve Request' : 'Reject Request'} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={isApprove ? 'primary' : 'danger'} onClick={handleConfirm}>
            {isApprove ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isApprove ? 'Approving' : 'Rejecting'} request <span className="font-mono font-semibold text-gray-800">{approval.id}</span>
          {' '}<span className="text-gray-400">({approval.type})</span>.
        </p>
        <FormField label="Reason / Comment" hint="Optional">
          <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            placeholder={isApprove ? 'Any notes about this approval…' : 'Why is this being rejected?'} />
        </FormField>
      </div>
    </Modal>
  )
}
