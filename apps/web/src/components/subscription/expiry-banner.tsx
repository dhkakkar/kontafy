"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Clock } from "lucide-react";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { useAuthStore } from "@/stores/auth.store";

const WARN_WITHIN_DAYS = 10;

export function ExpiryBanner() {
  const pathname = usePathname();
  const { organization, isSuperadmin } = useAuthStore();
  const hasOrg = !!organization?.id;
  const { data: sub } = useCurrentSubscription();

  // Don't show on superadmin pages or when there's no org context
  if (!hasOrg || pathname?.startsWith("/superadmin")) return null;
  if (!sub) return null;

  // Free plan has no expiry — nothing to warn about
  if (sub.planId === "free") return null;

  // Org is inactive — AccessGate handles that; no banner here
  if (sub.orgActive === false) return null;

  const days = sub.daysUntilExpiry;
  const isExpired = sub.isExpired;

  // Expired plan — AccessGate shows the full blocking screen, but for
  // superadmins (who bypass the gate) we still show a warning banner.
  if (isExpired) {
    if (!isSuperadmin) return null; // regular users see the gate, not a banner
    return (
      <div className="bg-danger-50 border-b border-danger-200 px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-danger-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This organization&apos;s <strong>{sub.planName}</strong> plan has expired.
              Members cannot access core features until it&apos;s renewed.
            </span>
          </div>
          <Link
            href="/billing/plans"
            className="shrink-0 text-sm font-medium text-danger-800 underline hover:no-underline"
          >
            Renew plan →
          </Link>
        </div>
      </div>
    );
  }

  // Show 10-day warning banner
  if (days === null || days > WARN_WITHIN_DAYS) return null;

  return (
    <div className="bg-warning-50 border-b border-warning-200 px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-warning-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Your <strong>{sub.planName}</strong> plan expires{" "}
            {days <= 0
              ? "today"
              : days === 1
                ? "tomorrow"
                : `in ${days} days`}
            . Renew now to avoid interruption.
          </span>
        </div>
        <Link
          href="/billing/plans"
          className="shrink-0 text-sm font-medium text-warning-800 underline hover:no-underline"
        >
          Renew plan →
        </Link>
      </div>
    </div>
  );
}
