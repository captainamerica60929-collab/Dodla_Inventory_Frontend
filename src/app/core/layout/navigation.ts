export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  description: string;
  badge?: string;
  dataTour?: string;
}

export interface NavGroup {
  groupName: string;
  dataTour?: string;
  items: NavItem[];
}

export const SVG_ICONS: Record<string, string> = {
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L12 11l-4-4-6 6 8 8 6-6-1.5-1.5M16 7l2 2"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z M14 3v5h5"/></svg>`,
  inw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12 M7 10l5 5 5-5 M4 20h16"/></svg>`,
  out: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9 M7 14l5-5 5 5 M4 4h16"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h13 M16 3l4 4-4 4 M17 17H4 M8 13l-4 4 4 4"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>`,
  rep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10 M10 20V4 M16 20v-8 M22 20H2"/></svg>`,
};

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupName: 'Overview',
    items: [
      {
        id: 'dash',
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'dash',
        description: 'Overview of warehouse operations',
        dataTour: 'nav-dashboard',
      },
    ],
  },
  {
    groupName: 'Masters',
    dataTour: 'nav-masters',
    items: [
      {
        id: 'mat',
        label: 'Material',
        route: '/masters/material',
        icon: 'box',
        description: 'Masters / Material catalog',
      },
      {
        id: 'loc',
        label: 'Location',
        route: '/masters/location',
        icon: 'pin',
        description: 'Masters / Location bins and zones',
      },
      {
        id: 'emp',
        label: 'Employee',
        route: '/masters/employee',
        icon: 'user',
        description: 'Masters / Employee records',
      },
      {
        id: 'usr',
        label: 'User',
        route: '/masters/user',
        icon: 'shield',
        description: 'Masters / User accounts and roles',
      },
      {
        id: 'branch',
        label: 'Branch',
        route: '/masters/branch',
        icon: 'building',
        description: 'Masters / Warehouse branches',
      },
      {
        id: 'api-credential',
        label: 'API Credential',
        route: '/masters/api-credential',
        icon: 'key',
        description: 'Masters / SAP API and service credentials',
      },
    ],
  },
  {
    groupName: 'Transactions',
    dataTour: 'nav-transactions',
    items: [
      {
        id: 'grn',
        label: 'GRN and Sticker',
        route: '/transactions/grn',
        icon: 'doc',
        description: 'Transactions / GRN from SAP and barcode printing',
      },
      {
        id: 'in',
        label: 'Inward and Putaway',
        route: '/transactions/inward',
        icon: 'inw',
        description: 'Transactions / Inward scan and bin mapping',
      },
      {
        id: 'out',
        label: 'Outward FIFO',
        route: '/transactions/outward',
        icon: 'out',
        description: 'Transactions / Outward FIFO dispatch',
      },
      {
        id: 'tr',
        label: 'Location Transfer',
        route: '/transactions/transfer',
        icon: 'swap',
        description: 'Transactions / Move stock between bins',
      },
      {
        id: 'accept',
        label: 'User Accept',
        route: '/transactions/accept',
        icon: 'check',
        description: 'Transactions / User acceptance verification',
      },
    ],
  },
  {
    groupName: 'Reports',
    dataTour: 'nav-reports',
    items: [
      {
        id: 'rep',
        label: 'All Reports',
        route: '/reports',
        icon: 'rep',
        description: 'Stock, FIFO, location and movement reports',
      },
    ],
  },
];
