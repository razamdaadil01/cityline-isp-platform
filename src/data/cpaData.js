export const CPA_PROFILE = {
  id: 'CPA-001', name: 'Emeka Okonkwo', ican: 'ICAN-2019-07831',
  email: 'emeka.okonkwo@cpaconnect.ng', phone: '+234 803 456 7890',
  city: 'Lagos', bio: 'Experienced CPA with 8+ years in tax compliance, audit, and financial advisory for SMEs and enterprises across Nigeria.',
  specializations: ['Tax Compliance', 'Audit & Assurance', 'VAT Returns', 'CFO Advisory'],
  languages: ['English', 'Igbo'], rating: 4.9, reviewCount: 47,
  profilePhoto: null, icanYear: 2019, experience: '6-10',
  profileViews: 312, monthlyEarnings: 485000, activeClients: 18,
}

export const CPA_CLIENTS = [
  { id: 'CLI-001', name: 'Tunde Bakare', type: 'Individual', phone: '+234 801 234 5678', email: 'tunde.bakare@gmail.com', city: 'Lagos', tags: ['VIP', 'Recurring'], status: 'Active', appointments: 12, totalBilled: 185000, outstanding: 0, lastActivity: '2026-06-10', joinedDate: '2025-01-15', avatar: 'TB' },
  { id: 'CLI-002', name: 'Amina Suleiman', type: 'SME', phone: '+234 802 345 6789', email: 'amina@suleimanfarms.com', city: 'Abuja', tags: ['Corporate'], status: 'Active', appointments: 8, totalBilled: 420000, outstanding: 75000, lastActivity: '2026-06-08', joinedDate: '2025-03-20', avatar: 'AS' },
  { id: 'CLI-003', name: 'Ifeanyi Okafor', type: 'Enterprise', phone: '+234 803 456 7890', email: 'i.okafor@okaforgroup.ng', city: 'Port Harcourt', tags: ['Corporate', 'VIP'], status: 'Active', appointments: 15, totalBilled: 870000, outstanding: 120000, lastActivity: '2026-06-12', joinedDate: '2024-11-05', avatar: 'IO' },
  { id: 'CLI-004', name: 'Blessing Osei', type: 'Individual', phone: '+234 804 567 8901', email: 'blessing.osei@yahoo.com', city: 'Lagos', tags: [], status: 'Active', appointments: 4, totalBilled: 62000, outstanding: 0, lastActivity: '2026-05-28', joinedDate: '2025-08-10', avatar: 'BO' },
  { id: 'CLI-005', name: 'Chukwudi Eze', type: 'SME', phone: '+234 805 678 9012', email: 'ceze@ezetechsolutions.com', city: 'Enugu', tags: ['Recurring'], status: 'Inactive', appointments: 6, totalBilled: 195000, outstanding: 45000, lastActivity: '2026-04-15', joinedDate: '2025-02-28', avatar: 'CE' },
  { id: 'CLI-006', name: 'Ngozi Adeyemi', type: 'SME', phone: '+234 806 789 0123', email: 'ngozi@adeyemibakery.ng', city: 'Ibadan', tags: ['Recurring'], status: 'Active', appointments: 9, totalBilled: 310000, outstanding: 30000, lastActivity: '2026-06-11', joinedDate: '2025-05-17', avatar: 'NA' },
]

export const CPA_APPOINTMENTS = [
  { id: 'APT-001', clientId: 'CLI-001', clientName: 'Tunde Bakare', clientType: 'Individual', service: 'Tax Filing', date: '2026-06-16', time: '10:00 AM', duration: '60 min', amount: 25000, status: 'Pending', clientNote: 'I need help with Q4 VAT returns and annual filing', phone: '+234 801 234 5678', email: 'tunde.bakare@gmail.com' },
  { id: 'APT-002', clientId: 'CLI-002', clientName: 'Amina Suleiman', clientType: 'SME', service: 'Audit & Assurance', date: '2026-06-17', time: '2:00 PM', duration: '90 min', amount: 75000, status: 'Confirmed', clientNote: 'Annual audit review for 2025', phone: '+234 802 345 6789', email: 'amina@suleimanfarms.com' },
  { id: 'APT-003', clientId: 'CLI-003', clientName: 'Ifeanyi Okafor', clientType: 'Enterprise', service: 'CFO Advisory', date: '2026-06-18', time: '11:00 AM', duration: '120 min', amount: 120000, status: 'Confirmed', clientNote: 'Strategic financial planning for Q3', phone: '+234 803 456 7890', email: 'i.okafor@okaforgroup.ng' },
  { id: 'APT-004', clientId: 'CLI-004', clientName: 'Blessing Osei', clientType: 'Individual', service: 'Bookkeeping', date: '2026-06-14', time: '9:00 AM', duration: '45 min', amount: 15000, status: 'Completed', clientNote: '', phone: '+234 804 567 8901', email: 'blessing.osei@yahoo.com' },
  { id: 'APT-005', clientId: 'CLI-005', clientName: 'Chukwudi Eze', clientType: 'SME', service: 'VAT Returns', date: '2026-06-13', time: '3:00 PM', duration: '60 min', amount: 35000, status: 'Cancelled', clientNote: 'Monthly VAT filing', phone: '+234 805 678 9012', email: 'ceze@ezetechsolutions.com' },
  { id: 'APT-006', clientId: 'CLI-006', clientName: 'Ngozi Adeyemi', clientType: 'SME', service: 'Payroll Management', date: '2026-06-19', time: '1:00 PM', duration: '60 min', amount: 40000, status: 'Pending', clientNote: 'June payroll processing and PAYE filing', phone: '+234 806 789 0123', email: 'ngozi@adeyemibakery.ng' },
  { id: 'APT-007', clientId: 'CLI-001', clientName: 'Tunde Bakare', clientType: 'Individual', service: 'Tax Compliance', date: '2026-06-20', time: '11:30 AM', duration: '60 min', amount: 25000, status: 'Pending', clientNote: '', phone: '+234 801 234 5678', email: 'tunde.bakare@gmail.com' },
  { id: 'APT-008', clientId: 'CLI-002', clientName: 'Amina Suleiman', clientType: 'SME', service: 'VAT Returns', date: '2026-05-20', time: '10:00 AM', duration: '60 min', amount: 35000, status: 'Completed', clientNote: '', phone: '+234 802 345 6789', email: 'amina@suleimanfarms.com' },
]

export const CPA_DOCUMENTS = [
  { id: 'DOC-001', clientId: 'CLI-001', clientName: 'Tunde Bakare', name: 'Income Statement 2025.pdf', type: 'ITR', date: '2026-06-01', uploadedBy: 'Client', size: '1.2 MB', ext: 'pdf' },
  { id: 'DOC-002', clientId: 'CLI-001', clientName: 'Tunde Bakare', name: 'Bank Statement Q4 2025.pdf', type: 'Other', date: '2026-06-02', uploadedBy: 'Client', size: '856 KB', ext: 'pdf' },
  { id: 'DOC-003', clientId: 'CLI-002', clientName: 'Amina Suleiman', name: 'Audit Report 2025.pdf', type: 'Audit Report', date: '2026-05-28', uploadedBy: 'CPA', size: '2.4 MB', ext: 'pdf' },
  { id: 'DOC-004', clientId: 'CLI-002', clientName: 'Amina Suleiman', name: 'VAT Return June.xlsx', type: 'VAT Return', date: '2026-06-10', uploadedBy: 'CPA', size: '345 KB', ext: 'xlsx' },
  { id: 'DOC-005', clientId: 'CLI-003', clientName: 'Ifeanyi Okafor', name: 'Balance Sheet 2025.pdf', type: 'Balance Sheet', date: '2026-05-15', uploadedBy: 'Client', size: '1.8 MB', ext: 'pdf' },
  { id: 'DOC-006', clientId: 'CLI-003', clientName: 'Ifeanyi Okafor', name: 'Payroll Report May 2026.xlsx', type: 'Payroll', date: '2026-05-31', uploadedBy: 'CPA', size: '678 KB', ext: 'xlsx' },
  { id: 'DOC-007', clientId: 'CLI-004', clientName: 'Blessing Osei', name: 'Tax Filing Receipt.pdf', type: 'ITR', date: '2026-06-05', uploadedBy: 'CPA', size: '234 KB', ext: 'pdf' },
  { id: 'DOC-008', clientId: 'CLI-006', clientName: 'Ngozi Adeyemi', name: 'Payroll June 2026.xlsx', type: 'Payroll', date: '2026-06-11', uploadedBy: 'Client', size: '412 KB', ext: 'xlsx' },
]

export const CPA_INVOICES = [
  { id: 'INV-CPA-001', clientId: 'CLI-001', clientName: 'Tunde Bakare', service: 'Tax Filing', amount: 25000, vat: 1875, total: 26875, issued: '2026-06-01', due: '2026-06-15', status: 'Paid', avatar: 'TB' },
  { id: 'INV-CPA-002', clientId: 'CLI-002', clientName: 'Amina Suleiman', service: 'Audit & Assurance', amount: 75000, vat: 5625, total: 80625, issued: '2026-05-20', due: '2026-06-05', status: 'Paid', avatar: 'AS' },
  { id: 'INV-CPA-003', clientId: 'CLI-003', clientName: 'Ifeanyi Okafor', service: 'CFO Advisory - May', amount: 120000, vat: 9000, total: 129000, issued: '2026-06-01', due: '2026-06-20', status: 'Sent', avatar: 'IO' },
  { id: 'INV-CPA-004', clientId: 'CLI-005', clientName: 'Chukwudi Eze', service: 'VAT Returns', amount: 35000, vat: 2625, total: 37625, issued: '2026-05-01', due: '2026-05-15', status: 'Overdue', avatar: 'CE' },
  { id: 'INV-CPA-005', clientId: 'CLI-006', clientName: 'Ngozi Adeyemi', service: 'Payroll Management', amount: 40000, vat: 3000, total: 43000, issued: '2026-06-10', due: '2026-06-25', status: 'Draft', avatar: 'NA' },
  { id: 'INV-CPA-006', clientId: 'CLI-004', clientName: 'Blessing Osei', service: 'Bookkeeping', amount: 15000, vat: 1125, total: 16125, issued: '2026-06-05', due: '2026-06-19', status: 'Sent', avatar: 'BO' },
]

export const CPA_MESSAGES = {
  'CLI-001': [
    { id: 1, from: 'client', text: 'Good morning Emeka! I wanted to confirm our appointment for next Monday.', time: '2026-06-12 09:15' },
    { id: 2, from: 'cpa', text: 'Good morning Tunde! Yes, we are all set for Monday 10 AM. Please bring your Q4 bank statements.', time: '2026-06-12 09:32' },
    { id: 3, from: 'client', text: 'Perfect. I also uploaded the income statement to the documents section.', time: '2026-06-12 10:05' },
    { id: 4, from: 'cpa', text: 'Great, I can see it. I will review before our meeting. See you Monday!', time: '2026-06-12 10:18' },
    { id: 5, from: 'client', text: 'Thank you so much. Have a great weekend!', time: '2026-06-13 08:00' },
  ],
  'CLI-002': [
    { id: 1, from: 'client', text: 'Hello, I need the audit report to be ready before end of June.', time: '2026-06-08 14:20' },
    { id: 2, from: 'cpa', text: 'Noted Amina. I have started the audit review. I will share a draft by June 20.', time: '2026-06-08 14:45' },
    { id: 3, from: 'client', text: 'Also, can you check the VAT compliance for Q1?', time: '2026-06-09 09:00' },
    { id: 4, from: 'cpa', text: 'Of course. I will include that in the scope. I will upload the VAT summary separately.', time: '2026-06-09 09:30' },
  ],
  'CLI-003': [
    { id: 1, from: 'cpa', text: 'Good morning Ifeanyi, I have completed the financial analysis for Q2. Ready to discuss?', time: '2026-06-10 08:00' },
    { id: 2, from: 'client', text: 'Yes please. Can we do Wednesday at 11 AM?', time: '2026-06-10 08:45' },
    { id: 3, from: 'cpa', text: 'Wednesday 11 AM works. I will send a calendar invite.', time: '2026-06-10 09:00' },
    { id: 4, from: 'client', text: 'Also, three documents have been uploaded for your review.', time: '2026-06-11 16:00' },
    { id: 5, from: 'cpa', text: 'Thank you, I can see them. Will review tonight and come prepared.', time: '2026-06-11 16:30' },
  ],
}

export const CPA_REVIEWS = [
  { id: 'REV-001', clientId: 'CLI-001', clientName: 'Tunde Bakare', rating: 5, text: 'Emeka is exceptional. He handled my annual tax filing professionally and saved me over ₦80,000 in unnecessary deductions. Highly recommended!', service: 'Tax Filing', date: '2026-05-15', replied: false },
  { id: 'REV-002', clientId: 'CLI-002', clientName: 'Amina Suleiman', rating: 5, text: 'The audit was thorough and delivered on time. Great communication throughout the process. Will definitely use again for next year.', service: 'Audit & Assurance', date: '2026-04-20', replied: true, reply: 'Thank you Amina! It was a pleasure working with Suleiman Farms. Looking forward to our continued partnership.' },
  { id: 'REV-003', clientId: 'CLI-003', clientName: 'Ifeanyi Okafor', rating: 5, text: 'Best CFO advisory service I have received. Emeka truly understands enterprise finance. His strategic insights have been invaluable.', service: 'CFO Advisory', date: '2026-03-10', replied: false },
  { id: 'REV-004', clientId: 'CLI-004', clientName: 'Blessing Osei', rating: 4, text: 'Very professional and knowledgeable. The bookkeeping was well organized. Only minor delay in delivery but overall great service.', service: 'Bookkeeping', date: '2026-02-28', replied: true, reply: 'Thank you Blessing! Apologies for the slight delay. Your feedback helps me improve.' },
  { id: 'REV-005', clientId: 'CLI-006', clientName: 'Ngozi Adeyemi', rating: 5, text: 'Payroll management has never been this smooth. Emeka handles everything including PAYE filings. Stress-free experience!', service: 'Payroll Management', date: '2026-01-15', replied: false },
]

export const REVENUE_MONTHLY = [
  { month: 'Jan', revenue: 320000 }, { month: 'Feb', revenue: 285000 }, { month: 'Mar', revenue: 410000 },
  { month: 'Apr', revenue: 375000 }, { month: 'May', revenue: 460000 }, { month: 'Jun', revenue: 485000 },
  { month: 'Jul', revenue: 0 }, { month: 'Aug', revenue: 0 }, { month: 'Sep', revenue: 0 },
  { month: 'Oct', revenue: 0 }, { month: 'Nov', revenue: 0 }, { month: 'Dec', revenue: 0 },
]

export const CPA_ENGAGEMENTS = [
  {
    id: 'ENG-001', clientId: 'CLI-001', clientName: 'Tunde Bakare', service: 'Annual Tax Filing 2025',
    startDate: '2026-05-15', dueDate: '2026-06-30', stage: 2, status: 'Active',
    checklist: [
      { id: 1, text: 'Collect income documents', done: true },
      { id: 2, text: 'Review financials', done: true },
      { id: 3, text: 'Prepare tax return', done: false },
      { id: 4, text: 'Client review & approval', done: false },
      { id: 5, text: 'File with authorities', done: false },
      { id: 6, text: 'Send confirmation', done: false },
    ],
    notes: 'Client has submitted all income docs. Need to cross-check with FIRS records.',
  },
  {
    id: 'ENG-002', clientId: 'CLI-002', clientName: 'Amina Suleiman', service: 'Audit & Assurance 2025',
    startDate: '2026-04-01', dueDate: '2026-06-25', stage: 1, status: 'Active',
    checklist: [
      { id: 1, text: 'Receive financial statements', done: true },
      { id: 2, text: 'Internal audit review', done: false },
      { id: 3, text: 'Draft audit report', done: false },
      { id: 4, text: 'Management review', done: false },
      { id: 5, text: 'Issue final report', done: false },
    ],
    notes: 'Waiting for Q1 bank reconciliation from client.',
  },
  {
    id: 'ENG-003', clientId: 'CLI-003', clientName: 'Ifeanyi Okafor', service: 'CFO Advisory Q2 2026',
    startDate: '2026-04-15', dueDate: '2026-07-15', stage: 3, status: 'Active',
    checklist: [
      { id: 1, text: 'Financial health analysis', done: true },
      { id: 2, text: 'Cash flow projections', done: true },
      { id: 3, text: 'Budget review', done: true },
      { id: 4, text: 'Strategic recommendations report', done: false },
      { id: 5, text: 'Board presentation', done: false },
    ],
    notes: 'Cash flow projections complete. Working on strategic recommendations.',
  },
]
