const SEED_COLLECTIONS = [
  { id: 'COL-001', refId: 'INS-001', refType: 'Installation', customerId: '', customerName: 'Rahul Sharma',    customerPhone: '9876000001', engineerName: 'Karan Mehta',            amount: 999,  paid: 999,  due: 0,   date: '2026-09-01', status: 'Paid',    paymentMode: 'Cash',   remarks: '', paymentProof: '', createdAt: '2026-09-01' },
  { id: 'COL-002', refId: 'INS-002', refType: 'Installation', customerId: '', customerName: 'Priya Singh',     customerPhone: '9876000002', engineerName: 'Arjun Kumar',            amount: 1180, paid: 1180, due: 0,   date: '2026-09-03', status: 'Paid',    paymentMode: 'UPI',    remarks: '', paymentProof: '', createdAt: '2026-09-03' },
  { id: 'COL-003', refId: 'INS-003', refType: 'Installation', customerId: '', customerName: 'Suresh Patel',    customerPhone: '9876000003', engineerName: 'Karan Mehta',            amount: 999,  paid: 0,    due: 999, date: '2026-09-05', status: 'Pending', paymentMode: '',       remarks: '', paymentProof: '', createdAt: '2026-09-05' },
  { id: 'COL-004', refId: 'TKT-2026-000101', refType: 'Ticket', customerId: '', customerName: 'Amit Verma',   customerPhone: '9876000004', engineerName: 'Ravi T.',                amount: 500,  paid: 500,  due: 0,   date: '2026-09-08', status: 'Paid',    paymentMode: 'Cash',   remarks: '', paymentProof: '', createdAt: '2026-09-08' },
  { id: 'COL-005', refId: 'TKT-2026-000102', refType: 'Ticket', customerId: '', customerName: 'Neha Sharma',  customerPhone: '9876000005', engineerName: 'Neha M.',                amount: 300,  paid: 300,  due: 0,   date: '2026-09-10', status: 'Paid',    paymentMode: 'UPI',    remarks: '', paymentProof: '', createdAt: '2026-09-10' },
  { id: 'COL-006', refId: 'INS-004', refType: 'Installation', customerId: '', customerName: 'Deepak Kumar',   customerPhone: '9876000006', engineerName: 'Rohit Singh, Karan Mehta', amount: 2500, paid: 1500, due: 1000,date: '2026-09-12', status: 'Partial', paymentMode: 'Cash',   remarks: '', paymentProof: '', createdAt: '2026-09-12' },
  { id: 'COL-007', refId: 'TKT-2026-000103', refType: 'Ticket', customerId: '', customerName: 'Sunita Gupta', customerPhone: '9876000007', engineerName: 'Ravi T.',                amount: 500,  paid: 0,    due: 500, date: '2026-09-14', status: 'Pending', paymentMode: '',       remarks: '', paymentProof: '', createdAt: '2026-09-14' },
  { id: 'COL-008', refId: 'INS-005', refType: 'Installation', customerId: '', customerName: 'Rajesh Mehta',   customerPhone: '9876000008', engineerName: 'Vikram Joshi',           amount: 999,  paid: 999,  due: 0,   date: '2026-09-15', status: 'Paid',    paymentMode: 'Cheque', remarks: '', paymentProof: '', createdAt: '2026-09-15' },
  { id: 'COL-009', refId: 'TKT-2026-000104', refType: 'Ticket', customerId: '', customerName: 'Kavita Shah',  customerPhone: '9876000009', engineerName: 'Neha M., Vikram Joshi',  amount: 300,  paid: 0,    due: 300, date: '2026-09-18', status: 'Pending', paymentMode: '',       remarks: '', paymentProof: '', createdAt: '2026-09-18' },
  { id: 'COL-010', refId: 'INS-006', refType: 'Installation', customerId: '', customerName: 'Mohan Lal',      customerPhone: '9876000010', engineerName: 'Arjun Kumar',            amount: 1180, paid: 1180, due: 0,   date: '2026-09-20', status: 'Paid',    paymentMode: 'UPI',    remarks: '', paymentProof: '', createdAt: '2026-09-20' },
  { id: 'COL-011', refId: 'INS-007', refType: 'Installation', customerId: '', customerName: 'Anita Desai',    customerPhone: '9876000011', engineerName: 'Priya Nair',             amount: 999,  paid: 500,  due: 499, date: '2026-09-22', status: 'Partial', paymentMode: 'Cash',   remarks: '', paymentProof: '', createdAt: '2026-09-22' },
  { id: 'COL-012', refId: 'TKT-2026-000105', refType: 'Ticket', customerId: '', customerName: 'Farhan Sheikh', customerPhone: '9876000012', engineerName: 'Vikram Joshi',          amount: 500,  paid: 0,    due: 500, date: '2026-09-25', status: 'Pending', paymentMode: '',       remarks: '', paymentProof: '', createdAt: '2026-09-25' },
]

let _collections = [...SEED_COLLECTIONS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._collections])) }

export function getCollections() { return [..._collections] }

export function getCollection(id) { return _collections.find(c => c.id === id) ?? null }

export function subscribeCollections(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function addCollection(data) {
  const nums = _collections.map(c => Number(c.id.replace('COL-', ''))).filter(Number.isFinite)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  const id = `COL-${String(next).padStart(3, '0')}`
  const record = { ...data, id, createdAt: new Date().toISOString().slice(0, 10) }
  _collections = [record, ..._collections]
  notify()
  return record
}

export function updateCollection(id, fields) {
  _collections = _collections.map(c => c.id === id ? { ...c, ...fields } : c)
  notify()
}

export function getTotalAmount()   { return _collections.reduce((s, c) => s + c.amount, 0) }
export function getTotalReceived() { return _collections.reduce((s, c) => s + c.paid,   0) }
export function getTotalPending()  { return _collections.reduce((s, c) => s + c.due,    0) }
