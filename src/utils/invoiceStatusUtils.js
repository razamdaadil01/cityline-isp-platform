const LABELS = {
  pending:        'Pending',
  partially_paid: 'Partially Paid',
  paid:           'Paid',
  cancelled:      'Cancelled',
  refunded:       'Refunded',
  overdue:        'Overdue',
}

const VARIANTS = {
  pending:        'yellow',
  partially_paid: 'orange',
  paid:           'green',
  cancelled:      'red',
  refunded:       'blue',
  overdue:        'red',
}

export function invoiceStatusLabel(status) {
  return LABELS[status] ?? status ?? 'Pending'
}

export function invoiceStatusVariant(status) {
  return VARIANTS[status] ?? 'yellow'
}
