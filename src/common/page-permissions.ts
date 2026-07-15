import { StaffRole } from '../entities/staff.entity';

export const PAGE_KEYS = [
  'dashboard',
  'sales',
  'receipts',
  'credits',
  'inventory',
  'restock',
  'expenses',
  'reports',
  'financials',
  'cashFlow',
  'incomeComparison',
  'suppliers',
  'staff',
  'settings',
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

export type PagePermissions = Record<PageKey, boolean>;

export const ALL_PAGES: PagePermissions = PAGE_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {} as PagePermissions,
);

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, PagePermissions> = {
  [StaffRole.OWNER]: { ...ALL_PAGES },
  [StaffRole.MANAGER]: {
    ...ALL_PAGES,
    staff: false,
    settings: false,
  },
  [StaffRole.CASHIER]: {
    dashboard: true,
    sales: true,
    receipts: true,
    credits: false,
    inventory: false,
    restock: false,
    expenses: false,
    reports: false,
    financials: false,
    cashFlow: false,
    incomeComparison: false,
    suppliers: false,
    staff: false,
    settings: false,
  },
  [StaffRole.STOCK_KEEPER]: {
    dashboard: true,
    sales: false,
    receipts: false,
    credits: false,
    inventory: true,
    restock: true,
    expenses: false,
    reports: false,
    financials: false,
    cashFlow: false,
    incomeComparison: false,
    suppliers: true,
    staff: false,
    settings: false,
  },
};

export function resolvePagePermissions(
  role: StaffRole,
  stored?: Partial<PagePermissions> | null,
): PagePermissions {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? ROLE_DEFAULT_PERMISSIONS[StaffRole.CASHIER];
  const merged = { ...defaults, ...(stored ?? {}) };
  return PAGE_KEYS.reduce((acc, key) => {
    acc[key] = !!merged[key];
    return acc;
  }, {} as PagePermissions);
}

/** Migrate legacy boolean flags into page permissions */
export function legacyToPagePermissions(staff: {
  role: StaffRole;
  canAccessInventory?: boolean;
  canApproveCredits?: boolean;
  canViewReports?: boolean;
  pagePermissions?: Partial<PagePermissions> | null;
}): PagePermissions {
  if (staff.pagePermissions && Object.keys(staff.pagePermissions).length > 0) {
    return resolvePagePermissions(staff.role, staff.pagePermissions);
  }

  const base = resolvePagePermissions(staff.role, null);
  if (staff.canAccessInventory) {
    base.inventory = true;
    base.restock = true;
    base.suppliers = true;
  }
  if (staff.canApproveCredits) {
    base.credits = true;
  }
  if (staff.canViewReports) {
    base.dashboard = true;
    base.reports = true;
    base.financials = true;
    base.cashFlow = true;
    base.incomeComparison = true;
  }
  return base;
}

export function hasPageAccess(
  user: { accountType?: string; pagePermissions?: PagePermissions },
  page: PageKey,
): boolean {
  if (!user || user.accountType === 'owner') return true;
  return !!user.pagePermissions?.[page];
}

export function hasAnyPageAccess(
  user: { accountType?: string; pagePermissions?: PagePermissions },
  pages: PageKey[],
): boolean {
  if (!user || user.accountType === 'owner') return true;
  return pages.some((page) => !!user.pagePermissions?.[page]);
}
