// Invoices store — Finance tab's Invoices sub-tab and Add Payment both read/
// write this. Mirrors the module-level pub/sub pattern already used
// throughout this app (settlementStore.js, customerRecoveryStore.js, etc.).
//
// Still a single shared invoice list rather than genuinely per-customer data
// (same pre-existing limitation as the rest of Finance's mock data) — every
// customer's Finance tab shows the same invoices. Out of scope to fix here;
// this only makes the shared list a real, mutable store instead of a dead
// local const, so Add Payment's Submit action can actually mark an invoice
// Paid and have it persist/reflect live everywhere this data is read.
import { getNextInvoiceNumber, getNextCreditNoteNumber } from './companyEntities'
import { getCustomer, updateCustomer } from './customersData'

// GST breakdown for seed invoices: 18% intra-state (CGST 9% + SGST 9%).
// All amounts follow the pattern: taxable = total/1.18 rounded to 2dp;
// cgst = sgst = taxable*0.09 rounded to 2dp; totalAmount = face value.
// Minor rounding differences (±₹1) are expected and match the pre-existing pattern.
let _invoices = [
  // ── RES-2026-0001 (Rajan Mehta — FTTH 100Mbps, ₹999/mo) ──────────────────
  { no: 'INV-2025-0987', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Dec 2025', issueDate: '2025-12-10', dueDate: '2025-12-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0052', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Jan 2026', issueDate: '2026-01-10', dueDate: '2026-01-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0088', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Feb 2026', issueDate: '2026-02-10', dueDate: '2026-02-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0189', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Mar 2026', issueDate: '2026-03-10', dueDate: '2026-03-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0312', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Apr 2026', issueDate: '2026-04-10', dueDate: '2026-04-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0451', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 May 2026', issueDate: '2026-05-10', dueDate: '2026-05-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0512', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Jun 2026', issueDate: '2026-06-10', dueDate: '2026-06-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-1014', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Jul 2026', issueDate: '2026-07-10', dueDate: '2026-07-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-1021', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Aug 2026', issueDate: '2026-08-10', dueDate: '2026-08-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-1026', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '10 Sep 2026', issueDate: '2026-09-10', dueDate: '2026-09-17',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  // ── RES-2026-0004 (Anita Desai — FTTH 200Mbps, ₹1499/mo) ─────────────────
  { no: 'INV-2026-1001', customerId: 'RES-2026-0004', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '20 Apr 2026', issueDate: '2026-04-20', dueDate: '2026-04-27',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1002', customerId: 'RES-2026-0004', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '20 May 2026', issueDate: '2026-05-20', dueDate: '2026-05-27',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1007', customerId: 'RES-2026-0004', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '20 Jun 2026', issueDate: '2026-06-20', dueDate: '2026-06-27',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1015', customerId: 'RES-2026-0004', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '20 Jul 2026', issueDate: '2026-07-20', dueDate: '2026-07-27',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1022', customerId: 'RES-2026-0004', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '20 Aug 2026', issueDate: '2026-08-20', dueDate: '2026-08-27',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1027', customerId: 'RES-2026-0004', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '20 Sep 2026', issueDate: '2026-09-20', dueDate: '2026-09-27',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'pending' },
  // ── ENT-2026-0001 (Vikram Industries — P2P 1Gbps, ₹12999/qtr) ────────────
  { no: 'INV-2026-1003', customerId: 'ENT-2026-0001', entityId: 1, packageId: null,
    pkg: 'P2P 1Gbps', packageName: 'P2P 1Gbps',
    date: '05 Apr 2026', issueDate: '2026-04-05', dueDate: '2026-04-12',
    lines: [{ description: 'P2P 1Gbps', quantity: 1, unitPrice: 11016.10, amount: 11016.10, hsnSac: '998422' }],
    taxableAmount: 11016.10, cgst: 991.45, sgst: 991.45, igst: 0, amount: 12999, totalAmount: 12999, status: 'paid' },
  { no: 'INV-2026-1016', customerId: 'ENT-2026-0001', entityId: 1, packageId: null,
    pkg: 'P2P 1Gbps', packageName: 'P2P 1Gbps',
    date: '05 Jul 2026', issueDate: '2026-07-05', dueDate: '2026-07-12',
    lines: [{ description: 'P2P 1Gbps', quantity: 1, unitPrice: 11016.10, amount: 11016.10, hsnSac: '998422' }],
    taxableAmount: 11016.10, cgst: 991.45, sgst: 991.45, igst: 0, amount: 12999, totalAmount: 12999, status: 'paid' },
  // ── RES-2026-0012 (Meera Gupta — FTTH 200Mbps, ₹1499/mo) ─────────────────
  { no: 'INV-2026-1004', customerId: 'RES-2026-0012', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '01 Apr 2026', issueDate: '2026-04-01', dueDate: '2026-04-08',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1011', customerId: 'RES-2026-0012', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '01 Jun 2026', issueDate: '2026-06-01', dueDate: '2026-06-08',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  // ── ENT-2026-0002 (Mehta Infotech — ILL 500Mbps, ₹45000/qtr) ────────────
  { no: 'INV-2026-1005', customerId: 'ENT-2026-0002', entityId: 1, packageId: null,
    pkg: 'ILL 500Mbps', packageName: 'ILL 500Mbps',
    date: '22 Apr 2026', issueDate: '2026-04-22', dueDate: '2026-04-29',
    lines: [{ description: 'ILL 500Mbps', quantity: 1, unitPrice: 38135.59, amount: 38135.59, hsnSac: '998422' }],
    taxableAmount: 38135.59, cgst: 3432.20, sgst: 3432.20, igst: 0, amount: 45000, totalAmount: 45000, status: 'paid' },
  { no: 'INV-2026-1018', customerId: 'ENT-2026-0002', entityId: 1, packageId: null,
    pkg: 'ILL 500Mbps', packageName: 'ILL 500Mbps',
    date: '22 Jul 2026', issueDate: '2026-07-22', dueDate: '2026-07-29',
    lines: [{ description: 'ILL 500Mbps', quantity: 1, unitPrice: 38135.59, amount: 38135.59, hsnSac: '998422' }],
    taxableAmount: 38135.59, cgst: 3432.20, sgst: 3432.20, igst: 0, amount: 45000, totalAmount: 45000, status: 'paid' },
  // ── RES-2026-0010 (Kavitha Rao — FTTH 100Mbps, ₹999/mo) ──────────────────
  { no: 'INV-2026-1006', customerId: 'RES-2026-0010', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '18 May 2026', issueDate: '2026-05-18', dueDate: '2026-05-25',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-1010', customerId: 'RES-2026-0010', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '18 Jun 2026', issueDate: '2026-06-18', dueDate: '2026-06-25',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-1017', customerId: 'RES-2026-0010', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '18 Jul 2026', issueDate: '2026-07-18', dueDate: '2026-07-25',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-1023', customerId: 'RES-2026-0010', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTH 100Mbps', packageName: 'FTTH 100Mbps',
    date: '18 Aug 2026', issueDate: '2026-08-18', dueDate: '2026-08-25',
    lines: [{ description: 'FTTH 100Mbps', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, amount: 999, totalAmount: 999, status: 'paid' },
  // ── RES-2026-0020 (Swati Jain — FTTH 200Mbps, ₹1499/mo) ─────────────────
  { no: 'INV-2026-1008', customerId: 'RES-2026-0020', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '10 May 2026', issueDate: '2026-05-10', dueDate: '2026-05-17',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-1024', customerId: 'RES-2026-0020', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '10 Aug 2026', issueDate: '2026-08-10', dueDate: '2026-08-17',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  // ── IC-CUST-2026-000001 (Mohan Das — Intercom Basic, ₹299/mo) ────────────
  { no: 'INV-2026-1009', customerId: 'IC-CUST-2026-000001', entityId: 1, packageId: null,
    pkg: 'Intercom Basic', packageName: 'Intercom Basic',
    date: '12 May 2026', issueDate: '2026-05-12', dueDate: '2026-05-19',
    lines: [{ description: 'Intercom Basic', quantity: 1, unitPrice: 253.39, amount: 253.39, hsnSac: '998422' }],
    taxableAmount: 253.39, cgst: 22.81, sgst: 22.81, igst: 0, amount: 299, totalAmount: 299, status: 'paid' },
  // ── RES-2026-0024 (Chandra Sekhar — P2P 10Gbps, ₹49999/mo) ──────────────
  { no: 'INV-2026-1012', customerId: 'RES-2026-0024', entityId: 1, packageId: null,
    pkg: 'P2P 10Gbps', packageName: 'P2P 10Gbps',
    date: '18 Jun 2026', issueDate: '2026-06-18', dueDate: '2026-06-25',
    lines: [{ description: 'P2P 10Gbps', quantity: 1, unitPrice: 42372.88, amount: 42372.88, hsnSac: '998422' }],
    taxableAmount: 42372.88, cgst: 3813.56, sgst: 3813.56, igst: 0, amount: 49999, totalAmount: 49999, status: 'paid' },
  // ── RES-2026-0026 (Sunil Kadam — FTTB 100Mbps, ₹1199/mo) ────────────────
  { no: 'INV-2026-1013', customerId: 'RES-2026-0026', entityId: 1, packageId: 'BWP-001',
    pkg: 'FTTB 100Mbps', packageName: 'FTTB 100Mbps',
    date: '22 Jun 2026', issueDate: '2026-06-22', dueDate: '2026-06-29',
    lines: [{ description: 'FTTB 100Mbps', quantity: 1, unitPrice: 1016.10, amount: 1016.10, hsnSac: '998422' }],
    taxableAmount: 1016.10, cgst: 91.45, sgst: 91.45, igst: 0, amount: 1199, totalAmount: 1199, status: 'paid' },
  // ── RES-2026-0016 (Rekha Shetty — FTTH 200Mbps, ₹1499/mo) ───────────────
  { no: 'INV-2026-1019', customerId: 'RES-2026-0016', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '28 Jul 2026', issueDate: '2026-07-28', dueDate: '2026-08-04',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  // ── RES-2026-0027 (Geetha Iyer — FTTH 200Mbps, ₹1499/mo) ────────────────
  { no: 'INV-2026-1020', customerId: 'RES-2026-0027', entityId: 1, packageId: 'BWP-002',
    pkg: 'FTTH 200Mbps', packageName: 'FTTH 200Mbps',
    date: '15 Jul 2026', issueDate: '2026-07-15', dueDate: '2026-07-22',
    lines: [{ description: 'FTTH 200Mbps', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0, amount: 1499, totalAmount: 1499, status: 'paid' },
  // ── RES-2026-0017 (Dinesh Naik — P2P 100Mbps, ₹3999/mo) ─────────────────
  { no: 'INV-2026-1025', customerId: 'RES-2026-0017', entityId: 1, packageId: null,
    pkg: 'P2P 100Mbps', packageName: 'P2P 100Mbps',
    date: '05 Aug 2026', issueDate: '2026-08-05', dueDate: '2026-08-12',
    lines: [{ description: 'P2P 100Mbps', quantity: 1, unitPrice: 3389.83, amount: 3389.83, hsnSac: '998422' }],
    taxableAmount: 3389.83, cgst: 305.08, sgst: 305.08, igst: 0, amount: 3999, totalAmount: 3999, status: 'paid' },
  // ── ENT-2026-0003 (Sheikh Media — P2P 2Gbps, ₹19999/mo) ─────────────────
  { no: 'INV-2026-1028', customerId: 'ENT-2026-0003', entityId: 1, packageId: null,
    pkg: 'P2P 2Gbps', packageName: 'P2P 2Gbps',
    date: '25 Sep 2026', issueDate: '2026-09-25', dueDate: '2026-10-02',
    lines: [{ description: 'P2P 2Gbps', quantity: 1, unitPrice: 16948.31, amount: 16948.31, hsnSac: '998422' }],
    taxableAmount: 16948.31, cgst: 1525.35, sgst: 1525.35, igst: 0, amount: 19999, totalAmount: 19999, status: 'paid' },
  // ── RES-2026-0013 (Sanjay Verma — FTTH 500Mbps, ₹2999/mo) ───────────────
  { no: 'INV-2026-1029', customerId: 'RES-2026-0013', entityId: 1, packageId: null,
    pkg: 'FTTH 500Mbps', packageName: 'FTTH 500Mbps',
    date: '20 Sep 2026', issueDate: '2026-09-20', dueDate: '2026-09-27',
    lines: [{ description: 'FTTH 500Mbps', quantity: 1, unitPrice: 2541.52, amount: 2541.52, hsnSac: '998422' }],
    taxableAmount: 2541.52, cgst: 228.74, sgst: 228.74, igst: 0, amount: 2999, totalAmount: 2999, status: 'paid' },
  // ── RES-2026-0021 (Harish Pillai — FTTH 1Gbps, ₹4999/mo) ────────────────
  { no: 'INV-2026-1030', customerId: 'RES-2026-0021', entityId: 1, packageId: null,
    pkg: 'FTTH 1Gbps', packageName: 'FTTH 1Gbps',
    date: '20 Sep 2026', issueDate: '2026-09-20', dueDate: '2026-09-27',
    lines: [{ description: 'FTTH 1Gbps', quantity: 1, unitPrice: 4236.44, amount: 4236.44, hsnSac: '998422' }],
    taxableAmount: 4236.44, cgst: 381.28, sgst: 381.28, igst: 0, amount: 4999, totalAmount: 4999, status: 'paid' },
  // ── RES-2026-0029 (Jayashree Kulkarni — FTTH 500Mbps, ₹2999/mo) ──────────
  { no: 'INV-2026-1031', customerId: 'RES-2026-0029', entityId: 1, packageId: null,
    pkg: 'FTTH 500Mbps', packageName: 'FTTH 500Mbps',
    date: '08 Sep 2026', issueDate: '2026-09-08', dueDate: '2026-09-15',
    lines: [{ description: 'FTTH 500Mbps', quantity: 1, unitPrice: 2541.52, amount: 2541.52, hsnSac: '998422' }],
    taxableAmount: 2541.52, cgst: 228.74, sgst: 228.74, igst: 0, amount: 2999, totalAmount: 2999, status: 'paid' },
]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._invoices])) }

export function getInvoices() { return [..._invoices] }

export function getOutstandingInvoicesAll() { return _invoices.filter(i => i.status !== 'paid') }

export function getOutstandingTotalAll() {
  return getOutstandingInvoicesAll().reduce((sum, i) => sum + i.amount, 0)
}

export function getOutstandingInvoices(customerId) {
  return _invoices.filter(i => i.customerId === customerId && i.status !== 'paid')
}

export function getOutstandingTotal(customerId) {
  return getOutstandingInvoices(customerId).reduce((sum, i) => sum + (i.totalAmount || i.amount || 0), 0)
}

export function markInvoicesPaid(invoiceNos, paymentMeta = {}) {
  const set = new Set(invoiceNos)
  _invoices = _invoices.map(i => set.has(i.no) ? {
    ...i,
    status: 'paid',
    paidOn: paymentMeta.paymentDate || '',
    paymentMode: paymentMeta.mode || '',
    txnId: paymentMeta.txnId || '',
  } : i)
  notify()
}

export function updateInvoice(no, fields) {
  _invoices = _invoices.map(i => i.no === no ? { ...i, ...fields } : i)
  notify()
}

export function addInvoice(data) {
  if (!data.customerId) return { error: 'customerId required' }
  const entityId = data.entityId ?? 1
  const no = getNextInvoiceNumber(entityId)

  const customer = getCustomer(data.customerId)
  const credit = customer?.creditBalance || 0
  const invoiceAmount = data.totalAmount || 0
  let creditApplied = 0
  let invoiceStatus = data.status || 'pending'
  if (credit > 0) {
    creditApplied = Math.min(credit, invoiceAmount)
    updateCustomer(data.customerId, { creditBalance: credit - creditApplied })
    if (creditApplied >= invoiceAmount) invoiceStatus = 'paid'
  }

  const invoice = {
    ...data,
    no,
    createdAt: new Date().toISOString(),
    creditApplied,
    amountPaid: creditApplied,
    // Compatibility aliases — CustomerDetail Finance tab reads inv.pkg, inv.date, inv.amount
    pkg: data.packageName || '',
    date: data.issueDate
      ? new Date(data.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '',
    amount: data.totalAmount || 0,
    status: invoiceStatus,
  }
  _invoices = [..._invoices, invoice]
  notify()
  return invoice
}

export function getOverdueInvoices() {
  const today = new Date().toISOString().split('T')[0]
  return _invoices.filter(i => i.status === 'pending' && i.dueDate && i.dueDate < today)
}

export function getPendingInvoices() {
  return _invoices.filter(i => i.status === 'pending')
}

export function cancelInvoice(no) {
  _invoices = _invoices.map(i => i.no === no ? { ...i, status: 'cancelled' } : i)
  notify()
}

export function getCollectedTotal() {
  return _invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

export function getPendingTotal() {
  return _invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

export function getOverdueTotal() {
  return getOverdueInvoices().reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

// Purely pending: unpaid and NOT yet past due date (distinct from overdue)
export function getPurelyPendingInvoices() {
  const today = new Date().toISOString().split('T')[0]
  return _invoices.filter(i => i.status === 'pending' && (!i.dueDate || i.dueDate >= today))
}

export function getPurelyPendingTotal() {
  return getPurelyPendingInvoices().reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

export function subscribeInvoices(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

// ── Credit Notes ──────────────────────────────────────────────────────────
let _creditNotes = []
const _cnListeners = []

function notifyCn() { _cnListeners.forEach(fn => fn([..._creditNotes])) }

export function getCreditNotes() { return [..._creditNotes] }

export function getCreditNote(no) { return _creditNotes.find(c => c.no === no) ?? null }

export function subscribeCreditNotes(fn) {
  _cnListeners.push(fn)
  return () => {
    const i = _cnListeners.indexOf(fn)
    if (i > -1) _cnListeners.splice(i, 1)
  }
}

export function issueCreditNote({ invoiceNo, reason, amount, entityId, customerId, issuedBy }) {
  const resolvedEntityId = entityId ?? 1
  const no = getNextCreditNoteNumber(resolvedEntityId)
  const taxable = Number((amount / 1.18).toFixed(2))
  const cgst = Number((taxable * 0.09).toFixed(2))
  const sgst = Number((taxable * 0.09).toFixed(2))
  const cn = {
    no,
    invoiceNo: invoiceNo ?? '—',
    customerId: customerId ?? '—',
    entityId: resolvedEntityId,
    reason: reason ?? '',
    amount: Number(amount) || 0,
    taxableAmount: taxable,
    cgst,
    sgst,
    igst: 0,
    issuedOn: new Date().toISOString().slice(0, 10),
    issuedBy: issuedBy ?? '—',
    status: 'issued',
  }
  _creditNotes = [..._creditNotes, cn]
  notifyCn()

  // Reduce invoice outstanding: if CN amount covers full invoice amount, mark paid
  if (invoiceNo && invoiceNo !== '—') {
    const inv = _invoices.find(i => i.no === invoiceNo)
    if (inv && inv.status !== 'paid' && inv.status !== 'cancelled') {
      const invAmt = inv.totalAmount || inv.amount || 0
      const prevCnApplied = inv.cnApplied || 0
      const newCnApplied = prevCnApplied + Number(amount)
      if (newCnApplied >= invAmt) {
        _invoices = _invoices.map(i => i.no === invoiceNo
          ? { ...i, status: 'paid', cnApplied: newCnApplied, paidOn: cn.issuedOn, paymentMode: 'Credit Note' }
          : i)
      } else {
        _invoices = _invoices.map(i => i.no === invoiceNo ? { ...i, cnApplied: newCnApplied } : i)
      }
      notify()
    }
  }
  return cn
}
