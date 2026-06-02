export const FIELD_ENGINEERS = [
  { id: 'eng-001', name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'  },
  { id: 'eng-002', name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500' },
  { id: 'eng-003', name: 'Ravi Menon',   initials: 'RM', color: 'bg-teal-500'    },
  { id: 'eng-004', name: 'Kiran Raj',    initials: 'KR', color: 'bg-indigo-500'  },
]

// Status: Pending | Assigned | Scheduled | In Progress | Completed | Cancelled
const INIT_INSTALLATIONS = [
  {
    id: 'INS-001', leadId: 'LD-215',
    customerName: 'Ramesh Nair',        customerPhone: '9876001890',
    address: '12, Brigade Road',        area: 'Koramangala', city: 'Bangalore', pincode: '560001',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-02', slotTime: '10:00',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    status: 'In Progress',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Drop Wire (m)', qty: 50 }],
    wireRequired: true,
    wires: [{ name: 'Ethernet Cat6 (m)', qty: 20 }],
    notes: 'Customer prefers morning slot. Building access on ground floor.',
    createdAt: '2026-05-22',
    timeline: [
      { status: 'Pending',     date: '2026-05-22', by: 'System'       },
      { status: 'Assigned',    date: '2026-05-22', by: 'Arjun Kumar'  },
      { status: 'Scheduled',   date: '2026-05-30', by: 'Arjun Kumar'  },
      { status: 'In Progress', date: '2026-06-02', by: 'Arjun Kumar'  },
    ],
  },
  {
    id: 'INS-002', leadId: null,
    customerName: 'Sridhar Rao',        customerPhone: '9845021345',
    address: '45, MG Road',             area: 'MG Road', city: 'Bangalore', pincode: '560001',
    plan: '50 Mbps Monthly (FTTH)',
    slotDate: '2026-06-02', slotTime: '14:30',
    engineerId: null, engineerName: null,
    status: 'Pending',
    hardwareRequired: false, hardware: [],
    wireRequired: false,     wires: [],
    notes: '',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Pending', date: '2026-06-01', by: 'System' },
    ],
  },
  {
    id: 'INS-003', leadId: null,
    customerName: 'Kavya Reddy',        customerPhone: '9876543211',
    address: '78, 100ft Road',          area: 'Indiranagar', city: 'Bangalore', pincode: '560038',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-03', slotTime: '09:30',
    engineerId: 'eng-002', engineerName: 'Suresh Babu',
    status: 'Assigned',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }],
    wireRequired: false, wires: [],
    notes: '',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Pending',  date: '2026-06-01', by: 'System'      },
      { status: 'Assigned', date: '2026-06-01', by: 'Suresh Babu' },
    ],
  },
  {
    id: 'INS-004', leadId: null,
    customerName: 'Venkat Subramaniam', customerPhone: '9988001145',
    address: '23, Whitefield Main Road',area: 'Whitefield', city: 'Bangalore', pincode: '560066',
    plan: '200 Mbps Quarterly (FTTH)',
    slotDate: '2026-06-03', slotTime: '11:00',
    engineerId: null, engineerName: null,
    status: 'Pending',
    hardwareRequired: false, hardware: [],
    wireRequired: false,     wires: [],
    notes: 'High-rise building, cable from 12th floor.',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Pending', date: '2026-06-01', by: 'System' },
    ],
  },
  {
    id: 'INS-005', leadId: null,
    customerName: 'Preeti Agarwal',     customerPhone: '9012345678',
    address: '11, Sector 2',            area: 'HSR Layout', city: 'Bangalore', pincode: '560102',
    plan: '500 Mbps Half Yearly (FTTH)',
    slotDate: '2026-06-04', slotTime: '10:00',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    status: 'Scheduled',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }, { name: 'Wall Mount Bracket', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Drop Wire (m)', qty: 30 }, { name: 'Ethernet Cat6 (m)', qty: 15 }],
    notes: '',
    createdAt: '2026-06-01',
    timeline: [
      { status: 'Pending',   date: '2026-06-01', by: 'System'      },
      { status: 'Assigned',  date: '2026-06-01', by: 'Arjun Kumar' },
      { status: 'Scheduled', date: '2026-06-01', by: 'Arjun Kumar' },
    ],
  },
  {
    id: 'INS-006', leadId: null,
    customerName: 'Rajan Singh',        customerPhone: '9765001234',
    address: '34, 2nd Stage',           area: 'BTM Layout', city: 'Bangalore', pincode: '560076',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-06-08', slotTime: '11:00',
    engineerId: 'eng-002', engineerName: 'Suresh Babu',
    status: 'Assigned',
    hardwareRequired: false, hardware: [],
    wireRequired: false,     wires: [],
    notes: '',
    createdAt: '2026-06-02',
    timeline: [
      { status: 'Pending',  date: '2026-06-02', by: 'System'      },
      { status: 'Assigned', date: '2026-06-02', by: 'Suresh Babu' },
    ],
  },
  {
    id: 'INS-007', leadId: null,
    customerName: 'Meera Pillai',       customerPhone: '9845678901',
    address: '89, Phase I',             area: 'Electronic City', city: 'Bangalore', pincode: '560100',
    plan: '50 Mbps Monthly (FTTH)',
    slotDate: '2026-06-10', slotTime: '10:00',
    engineerId: null, engineerName: null,
    status: 'Pending',
    hardwareRequired: false, hardware: [],
    wireRequired: false,     wires: [],
    notes: '',
    createdAt: '2026-06-02',
    timeline: [
      { status: 'Pending', date: '2026-06-02', by: 'System' },
    ],
  },
  {
    id: 'INS-008', leadId: null,
    customerName: 'Kishore T',          customerPhone: '9090001234',
    address: '56, Bridge Road',         area: 'Marathahalli', city: 'Bangalore', pincode: '560037',
    plan: '200 Mbps Quarterly (FTTH)',
    slotDate: '2026-06-12', slotTime: '14:00',
    engineerId: 'eng-003', engineerName: 'Ravi Menon',
    status: 'Pending',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }],
    wireRequired: false, wires: [],
    notes: '',
    createdAt: '2026-06-02',
    timeline: [
      { status: 'Pending', date: '2026-06-02', by: 'System' },
    ],
  },
  {
    id: 'INS-009', leadId: null,
    customerName: 'Ananya Shetty',      customerPhone: '9988556677',
    address: '12, 5th Block',           area: 'Koramangala', city: 'Bangalore', pincode: '560034',
    plan: '100 Mbps Monthly (FTTH)',
    slotDate: '2026-05-28', slotTime: '10:00',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    status: 'Completed',
    hardwareRequired: true,
    hardware: [{ name: 'ONT Device', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Ethernet Cat6 (m)', qty: 10 }],
    notes: 'Installation completed successfully.',
    createdAt: '2026-05-25',
    timeline: [
      { status: 'Pending',     date: '2026-05-25', by: 'System'      },
      { status: 'Assigned',    date: '2026-05-25', by: 'Arjun Kumar' },
      { status: 'Scheduled',   date: '2026-05-27', by: 'Arjun Kumar' },
      { status: 'In Progress', date: '2026-05-28', by: 'Arjun Kumar' },
      { status: 'Completed',   date: '2026-05-28', by: 'Arjun Kumar' },
    ],
  },
  {
    id: 'INS-010', leadId: null,
    customerName: 'Pradeep Varma',      customerPhone: '9765123456',
    address: '23, 4th Block',           area: 'Jayanagar', city: 'Bangalore', pincode: '560011',
    plan: '1 Gbps Yearly (FTTH)',
    slotDate: '2026-06-15', slotTime: '11:00',
    engineerId: 'eng-004', engineerName: 'Kiran Raj',
    status: 'Assigned',
    hardwareRequired: true,
    hardware: [{ name: 'Gigabit ONT Device', qty: 1 }, { name: 'POE Switch', qty: 1 }],
    wireRequired: true,
    wires: [{ name: 'Drop Wire (m)', qty: 40 }],
    notes: 'Premium customer — priority installation.',
    createdAt: '2026-06-02',
    timeline: [
      { status: 'Pending',  date: '2026-06-02', by: 'System'    },
      { status: 'Assigned', date: '2026-06-02', by: 'Kiran Raj' },
    ],
  },
]

let _installations = [...INIT_INSTALLATIONS]
const _listeners = []

export function getInstallations() {
  return [..._installations]
}

export function saveInstallation(inst) {
  const exists = _installations.find(i => i.id === inst.id)
  if (exists) {
    _installations = _installations.map(i => i.id === inst.id ? inst : i)
  } else {
    _installations = [inst, ..._installations]
  }
  _listeners.forEach(fn => fn([..._installations]))
}

export function subscribeInstallations(fn) {
  _listeners.push(fn)
  return () => {
    const idx = _listeners.indexOf(fn)
    if (idx > -1) _listeners.splice(idx, 1)
  }
}
