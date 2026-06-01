export const SERVICE_TYPES = ['FTTH', 'FTTB', 'Wireless', 'P2P', 'Leased Line', 'ILL']

export const BILLING_TYPES = [
  'One Time', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly',
  '1+1', '3+1', '6+1', '12+1', '12+2', 'Diwali Dhamaka',
]

export const SERVICE_BADGE = {
  FTTH: 'blue',
  FTTB: 'cyan',
  Wireless: 'purple',
  P2P: 'orange',
  'Leased Line': 'navy',
  ILL: 'gray',
}

export const MOCK_PLANS = [
  { id: 1,  name: '50 Mbps Monthly',       serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Monthly',       price: 699,   speed: '50 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 2,  name: '100 Mbps Monthly',      serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Monthly',       price: 899,   speed: '100 Mbps', validity: 30,  ottBundle: true,  offer: false, status: 'active'   },
  { id: 3,  name: '200 Mbps Quarterly',    serviceType: 'FTTH',        server: 'Jaze-02',     packageType: 'Public',  billingType: 'Quarterly',     price: 2499,  speed: '200 Mbps', validity: 90,  ottBundle: true,  offer: false, status: 'active'   },
  { id: 4,  name: '500 Mbps Half Yearly',  serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Private', billingType: 'Half Yearly',   price: 5999,  speed: '500 Mbps', validity: 180, ottBundle: false, offer: true,  status: 'active'   },
  { id: 5,  name: '30 Mbps Monthly',       serviceType: 'Wireless',    server: 'Jaze-03',     packageType: 'Public',  billingType: 'Monthly',       price: 499,   speed: '30 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 6,  name: '50 Mbps Yearly',        serviceType: 'Wireless',    server: 'Jaze-03',     packageType: 'Public',  billingType: 'Yearly',        price: 5500,  speed: '50 Mbps',  validity: 365, ottBundle: false, offer: true,  status: 'inactive' },
  { id: 7,  name: '100 Mbps P2P Monthly',  serviceType: 'P2P',         server: 'Jaze-02',     packageType: 'Private', billingType: 'Monthly',       price: 1999,  speed: '100 Mbps', validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 8,  name: 'FTTB 20 Mbps Monthly',  serviceType: 'FTTB',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Monthly',       price: 599,   speed: '20 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 9,  name: '1 Gbps Yearly',         serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Private', billingType: 'Yearly',        price: 11999, speed: '1 Gbps',   validity: 365, ottBundle: true,  offer: true,  status: 'active'   },
  { id: 10, name: 'Leased 10 Mbps Monthly',serviceType: 'Leased Line', server: 'IPACCAT-01',  packageType: 'Private', billingType: 'Monthly',       price: 4999,  speed: '10 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 11, name: 'ILL 100 Mbps Monthly',  serviceType: 'ILL',         server: 'IPACCAT-01',  packageType: 'Private', billingType: 'Monthly',       price: 15000, speed: '100 Mbps', validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 12, name: '75 Mbps 12+2 Offer',    serviceType: 'FTTH',        server: 'Jaze-02',     packageType: 'Public',  billingType: '12+2',          price: 8500,  speed: '75 Mbps',  validity: 420, ottBundle: true,  offer: true,  status: 'active'   },
  { id: 13, name: '50 Mbps Diwali Dhamaka',serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Diwali Dhamaka',price: 599,   speed: '50 Mbps',  validity: 30,  ottBundle: true,  offer: true,  status: 'inactive' },
  { id: 14, name: '100 Mbps 3+1 Offer',    serviceType: 'FTTH',        server: 'Jaze-02',     packageType: 'Public',  billingType: '3+1',           price: 2699,  speed: '100 Mbps', validity: 120, ottBundle: false, offer: true,  status: 'active'   },
  { id: 15, name: 'Wireless 20 Mbps 6+1',  serviceType: 'Wireless',    server: 'Jaze-03',     packageType: 'Public',  billingType: '6+1',           price: 3200,  speed: '20 Mbps',  validity: 210, ottBundle: false, offer: true,  status: 'active'   },
]
