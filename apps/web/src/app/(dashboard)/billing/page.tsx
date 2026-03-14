"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentSubscription, useUsage } from "@/hooks/use-subscription";
import {
  CreditCard,
  ArrowUpRight,
  FileText,
  Users,
  HardDrive,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function UsageMeter({
  label,
  used,
  limit,
  percentage,
  icon,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  percentage: number;
  icon: React.ReactNode;
  unit?: string;
}) {
  const isUnlimited = limit === -1;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-500">
          {used}
          {unit ? ` ${unit}` : ""} /{" "}
          {isUnlimited ? "Unlimited" : `${limit}${unit ? ` ${unit}` : ""}`}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isAtLimit
              ? "bg-danger-500"
              : isNearLimit
                ? "bg-warning-500"
                : "bg-primary-500"
          )}
          style={{ width: `${isUnlimited ? 0 : Math.min(percentage, 100)}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-danger-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Limit reached. Upgrade to continue.
        </p>
      )}
    </div>
  );
}

const statusVariants: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success",
  pending_cancellation: "warning",
  past_due: "danger",
  cancelled: "danger",
  expired: "danger",
  paused: "warning",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  pending_cancellation: "Cancelling",
  past_due: "Past Due",
  cancelled: "Cancelled",
  expired: "Expired",
  paused: "Paused",
};

export default function BillingPage() {
  const { data: subscription, isLoading: subLoading } = useCurrentSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();

  if (subLoading || usageLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your subscription and billing
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-gray-100 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const status = subscription?.status || "active";
  const isFree = subscription?.planId === "free";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your subscription and billing
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/billing/invoices">
            <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />}>
              Billing History
            </Button>
          </Link>
          <Link href="/billing/settings">
            <Button variant="outline" size="sm" icon={<CreditCard className="h-4 w-4" />}>
              Billing Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Current Plan</CardTitle>
            <Badge
              variant={statusVariants[status] || "default"}
              dot
            >
              {statusLabels[status] || status}
            </Badge>
          </div>
          {!isFree && (
            <Link href="/billing/plans">
              <Button variant="secondary" size="sm" icon={<ArrowUpRight className="h-4 w-4" />}>
                Change Plan
              </Button>
            </Link>
          )}
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Info */}
          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">
              {subscription?.planName || "Free"}
            </p>
            <p className="text-sm text-gray-500">
              {isFree
                ? "Free forever"
                : `${subscription?.billingCycle === "yearly" ? "Annual" : "Monthly"} billing`}
            </p>
          </div>

          {/* Next Billing */}
          {!isFree && subscription?.currentPeriodEnd && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {subscription.cancelAtPeriodEnd
                  ? "Subscription ends"
                  : "Next billing date"}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
          )}

          {/* CTA */}
          {isFree && (
            <div className="flex items-center">
              <Link href="/billing/plans">
                <Button icon={<ArrowUpRight className="h-4 w-4" />}>
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          )}
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="mt-4 p-3 bg-warning-50 rounded-lg border border-warning-200">
            <p className="text-sm text-warning-800">
              Your subscription will be cancelled at the end of the current
              billing period. You can continue using all features until then.
            </p>
          </div>
        )}
      </Card>

      {/* Usage Meters */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
        </CardHeader>
        <div className="space-y-6">
          <UsageMeter
            label="Invoices"
            used={usage?.invoices.used || 0}
            limit={usage?.invoices.limit || 0}
            percentage={usage?.invoices.percentage || 0}
            icon={<FileText className="h-4 w-4" />}
          />
          <UsageMeter
            label="Team Members"
            used={usage?.users.used || 0}
            limit={usage?.users.limit || 0}
            percentage={usage?.users.percentage || 0}
            icon={<Users className="h-4 w-4" />}
          />
          <UsageMeter
            label="Storage"
            used={usage?.storage.usedMb || 0}
            limit={usage?.storage.limitMb || 0}
            percentage={usage?.storage.percentage || 0}
            icon={<HardDrive className="h-4 w-4" />}
            unit="MB"
          />
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/billing/plans">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Compare Plans
                </p>
                <p className="text-xs text-gray-500">
                  View all features and pricing
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/billing/invoices">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Payment History
                </p>
                <p className="text-xs text-gray-500">
                  View invoices and receipts
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/billing/settings">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Payment Settings
                </p>
                <p className="text-xs text-gray-500">
                  Manage payment method and address
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
