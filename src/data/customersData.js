export const CUSTOMERS = [
  { id: 'RES-2026-0001', name: 'Rajan Mehta',       phone: '9876543210', plan: 'FTTH 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0002', name: 'Priya Sharma',       phone: '9812345678', plan: 'FTTB 50Mbps',     status: 'active'    },
  { id: 'RES-2026-0003', name: 'Suresh Kumar',       phone: '9988776655', plan: 'Wireless 25Mbps', status: 'suspended' },
  { id: 'RES-2026-0004', name: 'Anita Desai',        phone: '9123456789', plan: 'FTTH 200Mbps',    status: 'active'    },
  { id: 'ENT-2026-0001', name: 'Vikram Singh',       phone: '9011223344', plan: 'P2P 1Gbps',       status: 'active'    },
  { id: 'RES-2026-0005', name: 'Mohan Lal',          phone: '9765432198', plan: 'FTTH 100Mbps',    status: 'inactive'  },
  { id: 'RES-2026-0006', name: 'Deepa Nair',         phone: '9332144556', plan: 'FTTH 200Mbps',    status: 'active'    },
  { id: 'RES-2026-0007', name: 'Rahul Patil',        phone: '9700112233', plan: 'FTTB 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0008', name: 'Sunita Joshi',       phone: '9180009988', plan: 'FTTH 40Mbps',     status: 'expired'   },
  { id: 'RES-2026-0009', name: 'Arun Kapoor',        phone: '9855577889', plan: 'ILL 10Mbps',      status: 'active'    },
  { id: 'RES-2026-0010', name: 'Kavitha Rao',        phone: '9600123456', plan: 'FTTH 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0011', name: 'Nitin Bhatt',        phone: '9900156789', plan: 'Wireless 10Mbps', status: 'suspended' },
  { id: 'RES-2026-0012', name: 'Meera Gupta',        phone: '9776543210', plan: 'FTTH 200Mbps',    status: 'active'    },
  { id: 'RES-2026-0013', name: 'Sanjay Verma',       phone: '9543210987', plan: 'FTTH 500Mbps',    status: 'active'    },
  { id: 'RES-2026-0014', name: 'Pooja Menon',        phone: '9123400987', plan: 'FTTB 50Mbps',     status: 'active'    },
  { id: 'RES-2026-0015', name: 'Amol Tiwari',        phone: '9890876543', plan: 'FTTH 100Mbps',    status: 'inactive'  },
  { id: 'RES-2026-0016', name: 'Rekha Shetty',       phone: '9765400123', plan: 'FTTH 200Mbps',    status: 'active'    },
  { id: 'RES-2026-0017', name: 'Dinesh Naik',        phone: '9330122334', plan: 'P2P 100Mbps',     status: 'active'    },
  { id: 'RES-2026-0018', name: 'Lalitha Kumar',      phone: '9870112398', plan: 'FTTH 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0019', name: 'Prakash Yadav',      phone: '9456078901', plan: 'Wireless 25Mbps', status: 'expired'   },
  { id: 'RES-2026-0020', name: 'Swati Jain',         phone: '9678901234', plan: 'FTTH 200Mbps',    status: 'active'    },
  { id: 'RES-2026-0021', name: 'Harish Pillai',      phone: '9110023456', plan: 'FTTH 1Gbps',      status: 'active'    },
  { id: 'RES-2026-0022', name: 'Nandita Shah',       phone: '9860034567', plan: 'FTTB 50Mbps',     status: 'suspended' },
  { id: 'RES-2026-0023', name: 'Rohit Bose',         phone: '9770045678', plan: 'FTTH 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0024', name: 'Chandra Sekhar',     phone: '9550056789', plan: 'P2P 10Gbps',      status: 'active'    },
  { id: 'RES-2026-0025', name: 'Vandana Mishra',     phone: '9220067890', plan: 'FTTH 40Mbps',     status: 'inactive'  },
  { id: 'RES-2026-0026', name: 'Sunil Kadam',        phone: '9000078901', plan: 'FTTB 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0027', name: 'Geetha Iyer',        phone: '9830089012', plan: 'FTTH 200Mbps',    status: 'active'    },
  { id: 'RES-2026-0028', name: 'Mahesh Patkar',      phone: '9710090123', plan: 'FTTH 100Mbps',    status: 'active'    },
  { id: 'RES-2026-0029', name: 'Jayashree Kulkarni', phone: '9610001234', plan: 'FTTH 500Mbps',    status: 'active'    },
  { id: 'INC-2026-0001', name: 'Mohan Das', phone: '9345678901', services: ['Intercom'], plan: 'Intercom Basic', zone: 'Andheri West', status: 'active', type: 'Intercom' },
]

// ── Dynamically added customers (e.g. from Intercom Customer creation) ───────

let _addedCustomers = []
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._addedCustomers])) }

export function getAddedCustomers() { return [..._addedCustomers] }

export function addCustomer(customer) {
  _addedCustomers = [customer, ..._addedCustomers]
  notify()
}

export function subscribeCustomers(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function getAllCustomers() {
  return [..._addedCustomers, ...CUSTOMERS]
}

export function nextIntercomCustomerId() {
  const year = new Date().getFullYear()
  const nums = _addedCustomers
    .map(c => c.id.match(/^INC-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `INC-${year}-${String(next).padStart(4, '0')}`
}
