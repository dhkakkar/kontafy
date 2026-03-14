"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  usePlans,
  useCurrentSubscription,
  useUpgradePlan,
  useDowngradePlan,
  type Plan,
  type PlanFeatures,
} from "@/hooks/use-subscription";
import {
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  maxUsers: "Team Members",
  maxInvoicesPerMonth: "Invoices per Month",
  maxStorageMb: "Storage",
  whatsappMessaging: "WhatsApp Messaging",
  ecommerceSync: "E-commerce Sync",
  aiInsights: "AI Insights & Forecasts",
  caPortal: "CA Portal Access",
  bankReconciliation: "Bank Reconciliation",
  multiWarehouse: "Multi-Warehouse Inventory",
  customReports: "Custom Reports",
  apiAccess: "API Access",
  prioritySupport: "Priority Support",
  dedicatedManager: "Dedicated Account Manager",
  tdsTracking: "TDS Tracking",
  gstFiling: "GST Filing",
  bulkInvoicing: "Bulk Invoicing",
  auditTrail: "Audit Trail",
};

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

function formatFeatureValue(key: keyof PlanFeatures, value: any): React.ReactNode {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-success-600" />
    ) : (
      <Minus className="h-4 w-4 text-gray-300" />
    );
  }
  if (typeof value === "number") {
    if (value === -1) return "Unlimited";
    if (key === "maxStorageMb") {
      return value >= 1024 ? `${(value / 1024).toFixed(0)} GB` : `${value} MB`;
    }
    return value.toLocaleString("en-IN");
  }
  return String(value);
}

export default function PlansPage() {
  const router = useRouter();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subscription, isLoading: subLoading } = useCurrentSubscription();
  const upgradeMutation = useUpgradePlan();
  const downgradeMutation = useDowngradePlan();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(null);

  const currentPlanId = subscription?.planId || "free";
  const currentOrder = PLAN_ORDER[currentPlanId] ?? 0;

  const handlePlanAction = async (planId: string) => {
    const targetOrder = PLAN_ORDER[planId] ?? 0;

    if (targetOrder > currentOrder) {
      // Upgrade — redirect to checkout for paid plans
      if (currentPlanId === "free") {
        router.push(`/billing/checkout?plan=${planId}&cycle=${billingCycle}`);
        return;
      }
      try {
        const result = await upgradeMutation.mutateAsync({ planId });
        if (result?.subscriptionId) {
          router.push(
            `/billing/checkout?plan=${planId}&cycle=${billingCycle}&subscriptionId=${result.subscriptionId}`
          );
        }
      } catch {
        // Error handled by mutation
      }
    } else if (targetOrder < currentOrder) {
      // Downgrade
      setConfirmingPlan(planId);
    }
  };

  const confirmDowngrade = async () => {
    if (!confirmingPlan) return;
    try {
      await downgradeMutation.mutateAsync({ planId: confirmingPlan });
      setConfirmingPlan(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (plansLoading || subLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Choose Your Plan</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-80 bg-gray-100 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const sortedPlans = (plans || []).sort(
    (a, b) => (PLAN_ORDER[a.id] ?? 0) - (PLAN_ORDER[b.id] ?? 0)
  );

  const featureKeys = Object.keys(FEATURE_LABELS) as (keyof PlanFeatures)[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/billing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Choose Your Plan
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select the plan that best fits your business needs
            </p>
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            billingCycle === "monthly"
              ? "bg-primary-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            billingCycle === "yearly"
              ? "bg-primary-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Yearly
          <span className="ml-1.5 text-xs opacity-80">(Save ~17%)</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sortedPlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isHigher = (PLAN_ORDER[plan.id] ?? 0) > currentOrder;
          const isLower = (PLAN_ORDER[plan.id] ?? 0) < currentOrder;
          const price =
            billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const monthlyEquivalent =
            billingCycle === "yearly"
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.popular && "ring-2 ring-primary-500",
                isCurrent && "ring-2 ring-primary-500 bg-primary-50/30"
              )}
            >
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="info">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success" dot>
                    Current Plan
                  </Badge>
                </div>
              )}

              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.description}
                  </p>
                </div>

                <div>
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">
                        Free
                      </span>
                      <span className="text-sm text-gray-500">forever</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">
                          {"\u20B9"}{monthlyEquivalent.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-gray-500">/month</span>
                      </div>
                      {billingCycle === "yearly" && (
                        <p className="text-xs text-gray-400 mt-1">
                          {"\u20B9"}{price.toLocaleString("en-IN")} billed annually
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Key limits */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-success-600 shrink-0" />
                    <span>
                      {plan.features.maxUsers === -1
                        ? "Unlimited"
                        : plan.features.maxUsers}{" "}
                      team members
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-success-600 shrink-0" />
                    <span>
                      {plan.features.maxInvoicesPerMonth === -1
                        ? "Unlimited"
                        : plan.features.maxInvoicesPerMonth}{" "}
                      invoices/month
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-success-600 shrink-0" />
                    <span>
                      {plan.features.maxStorageMb === -1
                        ? "Unlimited"
                        : plan.features.maxStorageMb >= 1024
                          ? `${(plan.features.maxStorageMb / 1024).toFixed(0)} GB`
                          : `${plan.features.maxStorageMb} MB`}{" "}
                      storage
                    </span>
                  </div>
                  {plan.features.whatsappMessaging && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-success-600 shrink-0" />
                      <span>WhatsApp messaging</span>
                    </div>
                  )}
                  {plan.features.aiInsights && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-success-600 shrink-0" />
                      <span>AI insights</span>
                    </div>
                  )}
                  {plan.features.dedicatedManager && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-success-600 shrink-0" />
                      <span>Dedicated account manager</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isHigher ? (
                  <Button
                    className="w-full"
                    onClick={() => handlePlanAction(plan.id)}
                    loading={upgradeMutation.isPending}
                  >
                    Upgrade to {plan.name}
                  </Button>
                ) : isLower ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handlePlanAction(plan.id)}
                    loading={downgradeMutation.isPending}
                  >
                    Downgrade to {plan.name}
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <Card padding="none">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Feature Comparison
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Detailed breakdown of all features across plans
          </p>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-500 bg-gray-50 min-w-[200px]">
                  Feature
                </th>
                {sortedPlans.map((plan) => (
                  <th
                    key={plan.id}
                    className={cn(
                      "text-center px-6 py-3 font-medium bg-gray-50 min-w-[140px]",
                      plan.id === currentPlanId
                        ? "text-primary-800"
                        : "text-gray-500"
                    )}
                  >
                    {plan.name}
                    {plan.id === currentPlanId && (
                      <span className="block text-xs text-primary-600 font-normal mt-0.5">
                        (Current)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureKeys.map((key) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="px-6 py-3 text-gray-700">
                    {FEATURE_LABELS[key]}
                  </td>
                  {sortedPlans.map((plan) => (
                    <td
                      key={`${plan.id}-${key}`}
                      className={cn(
                        "text-center px-6 py-3",
                        plan.id === currentPlanId && "bg-primary-50/30"
                      )}
                    >
                      <span className="inline-flex items-center justify-center">
                        {formatFeatureValue(key, plan.features[key])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Downgrade Confirmation Modal */}
      {confirmingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmingPlan(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Confirm Downgrade
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your plan will be downgraded to{" "}
              <span className="font-medium">
                {sortedPlans.find((p) => p.id === confirmingPlan)?.name}
              </span>{" "}
              at the end of your current billing period. You will continue to
              have access to all current features until then.
            </p>
            <p className="mt-3 text-sm text-warning-700 bg-warning-50 rounded-lg p-3">
              Some features may become unavailable after the downgrade takes
              effect. Please ensure your usage is within the new plan limits.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmingPlan(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDowngrade}
                loading={downgradeMutation.isPending}
              >
                Confirm Downgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
