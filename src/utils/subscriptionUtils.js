import { getCustomer, updateCustomer } from '../data/customersData'
import { addInvoice, getInvoices } from '../data/invoicesStore'
import { recordPayment } from '../data/paymentsStore'
import { computeExpiry, getCustomerSubscription, computeGst } from './customerUtils'
import { getCompanyEntity, getEntityState } from '../data/companyEntities'
import { getPlans } from '../data/packagesStore'
import { logAudit } from '../data/auditLogStore'

// ── Shared helpers ────────────────────────────────────────────────────────────

function todayIso() { return new Date().toISOString().slice(0, 10) }

function entityIdForCustomer(customer) {
  return customer.ownership?.entityId ?? customer.entityId ?? 1
}

function buildInvoiceLines(sub, addons) {
  const lines = [{
    description: sub.packageName || 'Internet Service',
    quantity: 1,
    unitPrice: sub.price || 0,
    amount: sub.price || 0,
    hsnSac: sub.hsnSac || '998422',
  }]
  for (const addon of (addons || [])) {
    lines.push({
      description: addon.name || addon.packageName || 'Add-on',
      quantity: 1,
      unitPrice: addon.price || 0,
      amount: addon.price || 0,
      hsnSac: addon.hsnSac || '998422',
    })
  }
  return lines
}

function addDays(isoDate, days) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtIso(isoDate) {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── renewSubscription ─────────────────────────────────────────────────────────

export function renewSubscription(customerId, {
  tenureDays,
  paymentCollected = false,
  paymentDetails = {},
} = {}) {
  const customer = getCustomer(customerId)
  if (!customer) return { error: 'Customer not found' }

  const sub = getCustomerSubscription(customer)
  if (!sub) return { error: 'No subscription found' }

  const today = todayIso()
  const isActive = sub.expiry && sub.expiry >= today
  const startFrom = isActive ? sub.expiry : today
  const days = tenureDays || sub.tenureDays || 30
  const newExpiry = addDays(startFrom, days)

  // Choose tenure pricing if the plan has tenures
  const plans = getPlans()
  const plan = plans.find(p => p.id === sub.packageId)
  const tenureObj = plan?.tenures?.find(t => t.days === days) ?? plan?.tenures?.[0]
  const price = tenureObj?.price ?? sub.price ?? 0

  const renewSub = { ...sub, tenureDays: days, price }
  const lines = buildInvoiceLines(renewSub, sub.addons)
  const taxable = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const entityId = entityIdForCustomer(customer)
  const entity = getCompanyEntity(entityId)
  const entityState = getEntityState(entity)
  const customerState = customer.gstState || customer.address?.state || ''
  const gst = computeGst(taxable, sub.gstRate ?? 18, entityState, customerState)
  const totalAmount = gst.total

  const dueDate = today
  const billingPeriod = `${fmtIso(startFrom)} – ${fmtIso(newExpiry)}`

  const invoice = addInvoice({
    customerId,
    entityId,
    packageId: sub.packageId,
    packageName: sub.packageName,
    issueDate: today,
    dueDate,
    billingPeriod,
    lines,
    taxableAmount: taxable,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    totalAmount,
    status: 'pending',
  })

  if (paymentCollected && paymentDetails.amount) {
    recordPayment({
      customerId,
      amount: Number(paymentDetails.amount),
      mode: paymentDetails.mode || 'Cash',
      invoiceNos: [invoice.no],
      txnId: paymentDetails.txnId,
      notes: `Renewal payment — ${billingPeriod}`,
      source: 'renewal',
    })
  }

  // Update subscription expiry and customer expiry
  const updates = {
    expiry: newExpiry,
    subscription: {
      ...sub,
      tenureDays: days,
      price,
      expiry: newExpiry,
      status: 'active',
      history: [
        ...(sub.history || []),
        {
          type: 'renewal',
          from: startFrom,
          to: newExpiry,
          tenureDays: days,
          invoiceNo: invoice.no,
          date: today,
          by: 'Admin',
        },
      ],
    },
  }
  if (!isActive) updates.status = 'active'
  updateCustomer(customerId, updates)

  // Check for unpaid invoices (warning metadata — callers show UI)
  const hasUnpaid = getInvoices().some(
    i => i.customerId === customerId && i.status !== 'paid' && i.no !== invoice.no
  )

  logAudit({
    module: 'Customers',
    action: 'Edit',
    details: `Subscription renewed for ${customerId}: ${billingPeriod} (Invoice ${invoice.no})`,
  })

  return { invoice, newExpiry, hasUnpaid }
}

// ── changePlan ────────────────────────────────────────────────────────────────

export function changePlan(customerId, { newPackageId, tenureDays } = {}) {
  const customer = getCustomer(customerId)
  if (!customer) return { error: 'Customer not found' }

  const sub = getCustomerSubscription(customer)
  if (!sub) return { error: 'No subscription found' }

  const today = todayIso()

  // Calculate unused value of old plan
  const oldExpiry = sub.expiry || today
  const remainingDays = Math.max(
    0,
    Math.floor((new Date(oldExpiry) - new Date(today)) / 86400000)
  )
  const oldDailyRate = (sub.price || 0) / (sub.tenureDays || 30)
  const unusedValue = parseFloat((oldDailyRate * remainingDays).toFixed(2))

  // Credit the unused value to customer
  if (unusedValue > 0) {
    const currentCredit = customer.creditBalance || 0
    updateCustomer(customerId, { creditBalance: currentCredit + unusedValue })
  }

  // Find new plan
  const plans = getPlans()
  const newPlan = plans.find(p => p.id === newPackageId)
  if (!newPlan) return { error: 'Plan not found' }

  const days = tenureDays || newPlan.tenures?.[0]?.days || 30
  const tenureObj = newPlan.tenures?.find(t => t.days === days) ?? newPlan.tenures?.[0]
  const newPrice = tenureObj?.price ?? newPlan.price ?? 0
  const newExpiry = addDays(today, days)

  const newSubFields = {
    packageId: newPlan.id,
    packageName: newPlan.name,
    tenureDays: days,
    price: newPrice,
    gstRate: newPlan.gstRate ?? 18,
    hsnSac: newPlan.hsnSac ?? '998422',
    startDate: today,
    expiry: newExpiry,
    status: 'active',
    addons: sub.addons || [],
  }

  const lines = buildInvoiceLines(newSubFields, sub.addons)
  const taxable = lines.reduce((s, l) => s + (l.amount || 0), 0)

  const entityId = entityIdForCustomer(customer)
  const entity = getCompanyEntity(entityId)
  const entityState = getEntityState(entity)
  const customerState = customer.gstState || customer.address?.state || ''
  const gst = computeGst(taxable, newSubFields.gstRate, entityState, customerState)
  const totalAmount = gst.total

  const billingPeriod = `${fmtIso(today)} – ${fmtIso(newExpiry)}`

  const invoice = addInvoice({
    customerId,
    entityId,
    packageId: newPlan.id,
    packageName: newPlan.name,
    issueDate: today,
    dueDate: today,
    billingPeriod,
    lines,
    taxableAmount: taxable,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    totalAmount,
    status: 'pending',
  })

  const historyEntry = {
    type: 'plan_change',
    fromPackage: sub.packageName || sub.packageId,
    toPackage: newPlan.name,
    creditGiven: unusedValue,
    invoiceNo: invoice.no,
    date: today,
    by: 'Admin',
  }

  updateCustomer(customerId, {
    expiry: newExpiry,
    subscription: {
      ...newSubFields,
      history: [
        ...(sub.history || []),
        historyEntry,
      ],
    },
  })

  logAudit({
    module: 'Customers',
    action: 'Edit',
    details: `Plan changed for ${customerId}: ${sub.packageName} → ${newPlan.name}. Credit given: ₹${unusedValue}. Invoice ${invoice.no}.`,
  })

  return { invoice, newExpiry, unusedValue, creditApplied: invoice.creditApplied || 0 }
}
