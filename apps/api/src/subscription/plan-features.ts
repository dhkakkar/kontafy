// ═══════════════════════════════════════════════════════════════
// Kontafy — Plan Definitions & Feature Gates
// ═══════════════════════════════════════════════════════════════

export type PlanId = 'free' | 'starter' | 'professional' | 'enterprise';

export interface PlanFeatures {
  maxUsers: number;            // -1 = unlimited
  maxInvoicesPerMonth: number; // -1 = unlimited
  maxStorageMb: number;        // -1 = unlimited
  whatsappMessaging: boolean;
  ecommerceSync: boolean;
  aiInsights: boolean;
  caPortal: boolean;
  bankReconciliation: boolean;
  multiWarehouse: boolean;
  customReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  dedicatedManager: boolean;
  tdsTracking: boolean;
  gstFiling: boolean;
  bulkInvoicing: boolean;
  auditTrail: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;        // in INR, 0 for free
  priceYearly: number;         // in INR per year (discounted)
  razorpayPlanIdMonthly?: string;  // populated from env/config
  razorpayPlanIdYearly?: string;
  features: PlanFeatures;
  popular?: boolean;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'For individuals and micro businesses getting started',
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      maxUsers: 1,
      maxInvoicesPerMonth: 50,
      maxStorageMb: 100,
      whatsappMessaging: false,
      ecommerceSync: false,
      aiInsights: false,
      caPortal: false,
      bankReconciliation: true,
      multiWarehouse: false,
      customReports: false,
      apiAccess: false,
      prioritySupport: false,
      dedicatedManager: false,
      tdsTracking: false,
      gstFiling: true,
      bulkInvoicing: false,
      auditTrail: false,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For small businesses with basic accounting needs',
    priceMonthly: 499,
    priceYearly: 4990,
    features: {
      maxUsers: 3,
      maxInvoicesPerMonth: 500,
      maxStorageMb: 1024, // 1 GB
      whatsappMessaging: true,
      ecommerceSync: false,
      aiInsights: false,
      caPortal: true,
      bankReconciliation: true,
      multiWarehouse: false,
      customReports: false,
      apiAccess: false,
      prioritySupport: false,
      dedicatedManager: false,
      tdsTracking: true,
      gstFiling: true,
      bulkInvoicing: false,
      auditTrail: true,
    },
    popular: true,
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses with advanced requirements',
    priceMonthly: 999,
    priceYearly: 9990,
    features: {
      maxUsers: 10,
      maxInvoicesPerMonth: -1, // unlimited
      maxStorageMb: 5120, // 5 GB
      whatsappMessaging: true,
      ecommerceSync: true,
      aiInsights: true,
      caPortal: true,
      bankReconciliation: true,
      multiWarehouse: true,
      customReports: true,
      apiAccess: true,
      prioritySupport: true,
      dedicatedManager: false,
      tdsTracking: true,
      gstFiling: true,
      bulkInvoicing: true,
      auditTrail: true,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with unlimited scale',
    priceMonthly: 2499,
    priceYearly: 24990,
    features: {
      maxUsers: -1, // unlimited
      maxInvoicesPerMonth: -1, // unlimited
      maxStorageMb: -1, // unlimited
      whatsappMessaging: true,
      ecommerceSync: true,
      aiInsights: true,
      caPortal: true,
      bankReconciliation: true,
      multiWarehouse: true,
      customReports: true,
      apiAccess: true,
      prioritySupport: true,
      dedicatedManager: true,
      tdsTracking: true,
      gstFiling: true,
      bulkInvoicing: true,
      auditTrail: true,
    },
  },
};

/**
 * Plan tier ordering for upgrade/downgrade checks.
 */
export const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

/**
 * Feature label mapping for the comparison matrix.
 */
export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  maxUsers: 'Team Members',
  maxInvoicesPerMonth: 'Invoices per Month',
  maxStorageMb: 'Storage',
  whatsappMessaging: 'WhatsApp Messaging',
  ecommerceSync: 'E-commerce Sync',
  aiInsights: 'AI Insights & Forecasts',
  caPortal: 'CA Portal Access',
  bankReconciliation: 'Bank Reconciliation',
  multiWarehouse: 'Multi-Warehouse Inventory',
  customReports: 'Custom Reports',
  apiAccess: 'API Access',
  prioritySupport: 'Priority Support',
  dedicatedManager: 'Dedicated Account Manager',
  tdsTracking: 'TDS Tracking',
  gstFiling: 'GST Filing',
  bulkInvoicing: 'Bulk Invoicing',
  auditTrail: 'Audit Trail',
};

/**
 * Get plan definition by ID.
 */
export function getPlan(planId: PlanId): PlanDefinition {
  return PLAN_DEFINITIONS[planId];
}

/**
 * Check if a plan is higher than another.
 */
export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return PLAN_ORDER[to] > PLAN_ORDER[from];
}

/**
 * Check if a plan is lower than another.
 */
export function isDowngrade(from: PlanId, to: PlanId): boolean {
  return PLAN_ORDER[to] < PLAN_ORDER[from];
}
