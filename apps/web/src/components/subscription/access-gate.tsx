"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, AlertOctagon, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { useAuthStore } from "@/stores/auth.store";

// Routes that should remain accessible even when the org is expired/inactive,
// so the user can renew or contact support.
const ALWAYS_ALLOWED_PREFIXES = [
  "/billing",
  "/superadmin",
  "/profile",
  "/help",
  "/support",
];

export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { isSuperadmin, organization } = useAuthStore();
  const hasOrg = !!organization?.id;
  const { data: sub, isLoading } = useCurrentSubscription();

  // No org yet (e.g. onboarding) — pass through
  if (!hasOrg) return <>{children}</>;

  // Superadmins can access everything unconditionally
  if (isSuperadmin) return <>{children}</>;

  // Allow renewal / support paths without gating
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // While loading subscription state, render children optimistically to avoid
  // flashing the gate for active users on every navigation.
  if (isLoading || !sub) return <>{children}</>;

  // Org explicitly deactivated by a superadmin
  if (sub.orgActive === false) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <Card padding="lg" className="max-w-lg w-full text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-danger-50 flex items-center justify-center mb-4">
            <Lock className="h-7 w-7 text-danger-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Account Deactivated
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            This organization has been deactivated by the platform administrator.
            Please contact support to restore access.
          </p>
          {sub.deactivationReason && (
            <div className="text-left text-sm bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
              <p className="font-medium text-gray-700 mb-1">Reason</p>
              <p className="text-gray-600">{sub.deactivationReason}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/help">
              <Button variant="primary">Contact Support</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Plan expired (and not free) — show renewal screen
  if (sub.isExpired && sub.planId !== "free") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <Card padding="lg" className="max-w-lg w-full text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-warning-50 flex items-center justify-center mb-4">
            <AlertOctagon className="h-7 w-7 text-warning-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Your plan has expired
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            The <strong>{sub.planName}</strong> plan for{" "}
            <strong>{organization?.name}</strong> has expired. Renew your plan to
            regain access to invoicing, accounting, and all other features.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/billing/plans">
              <Button variant="primary" icon={<CreditCard className="h-4 w-4" />}>
                Renew Plan
              </Button>
            </Link>
            <Link href="/billing">
              <Button variant="outline">View Billing</Button>
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Need help? Reach out to{" "}
            <Link href="/help" className="underline hover:text-gray-600">
              support
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
