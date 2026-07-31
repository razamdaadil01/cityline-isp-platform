// Shared hardware/inventory item list — reused by Ticket Detail's Hardware
// Assignment card and Create Outage's Hardware Requirement section, so both
// pick from the same catalog instead of maintaining separate lists.
export const HARDWARE_CATALOG = [
  { name: 'ONT Device', unitPrice: 1800 },
  { name: 'WiFi Router', unitPrice: 1500 },
  { name: 'Wall Mount Bracket', unitPrice: 150 },
  { name: 'POE Switch', unitPrice: 2200 },
  { name: 'Drop Wire (per m)', unitPrice: 12 },
  { name: 'Patch Cord (LC-LC, 5m)', unitPrice: 90 },
  { name: 'Optical Splitter 1x8', unitPrice: 650 },
  { name: 'SFP Module 1G', unitPrice: 900 },
]
