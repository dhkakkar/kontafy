"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  useCurrentSubscription,
  useCancelSubscription,
} from "@/hooks/use-subscription";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function BillingSettingsPage() {
  const { data: subscription } = useCurrentSubscription();
  const cancelMutation = useCancelSubscription();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAtEnd, setCancelAtEnd] = useState(true);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);

  const isFree = subscription?.planId === "free";
  const isCancelling =
    subscription?.status === "pending_cancellation" ||
    subscription?.cancelAtPeriodEnd;

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        cancelAtPeriodEnd: cancelAtEnd,
        reason: cancelReason || undefined,
      });
      setShowCancelModal(false);
      setShowCancelSuccess(true);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Billing Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your payment method and billing preferences
          </p>
        </div>
      </div>

      {/* Success banner */}
      {showCancelSuccess && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-success-800">
              Subscription cancellation requested
            </p>
            <p className="text-sm text-success-700 mt-1">
              {cancelAtEnd
                ? "Your subscription will remain active until the end of your current billing period."
                : "Your subscription has been cancelled immediately."}
            </p>
          </div>
          <button
            onClick={() => setShowCancelSuccess(false)}
            className="ml-auto text-success-600 hover:text-success-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <CardTitle>Payment Method</CardTitle>
          </div>
        </CardHeader>

        {isFree ? (
          <div className="text-sm text-gray-500">
            <p>
              No payment method on file. You are currently on the free plan.
            </p>
            <Link href="/billing/plans" className="inline-block mt-3">
              <Button variant="secondary" size="sm">
                Upgrade to add a payment method
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-16 bg-gradient-to-r from-gray-700 to-gray-900 rounded-md flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Payment managed by Razorpay
                  </p>
                  <p className="text-xs text-gray-500">
                    Your payment method is securely stored by Razorpay
                  </p>
                </div>
              </div>
              <Badge variant="success" dot>
                Active
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              Payment methods are managed through Razorpay&apos;s secure
              platform. To update your payment method, your next payment will
              prompt you to enter new details.
            </p>
          </div>
        )}
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <CardTitle>Billing Address</CardTitle>
          </div>
        </CardHeader>

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Your billing address is derived from your organization settings.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            To update your billing address, go to{" "}
            <Link
              href="/settings"
              className="text-primary-700 hover:underline"
            >
              Organization Settings
            </Link>
            .
          </p>
        </div>
      </Card>

      {/* Subscription ID */}
      {!isFree && subscription?.razorpaySubscriptionId && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Subscription ID</span>
              <span className="font-mono text-xs text-gray-700">
                {subscription.razorpaySubscriptionId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Billing Cycle</span>
              <span className="text-gray-700 capitalize">
                {subscription.billingCycle}
              </span>
            </div>
            {subscription.currentPeriodStart && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Current Period</span>
                <span className="text-gray-700">
                  {new Date(
                    subscription.currentPeriodStart
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  -{" "}
                  {subscription.currentPeriodEnd
                    ? new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Ongoing"}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cancel Subscription */}
      {!isFree && (
        <Card className="border-danger-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger-500" />
              <CardTitle className="text-danger-700">Danger Zone</CardTitle>
            </div>
          </CardHeader>

          {isCancelling ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Your subscription is scheduled for cancellation at the end of
                the current billing period.
              </p>
              <Badge variant="warning" dot>
                Cancellation Pending
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Cancel your subscription. You can choose to keep access until
                the end of the current billing period, or cancel immediately.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel Subscription
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        description="We're sorry to see you go. Please let us know why you're cancelling."
        size="md"
      >
        <div className="space-y-4">
          {/* Cancellation type */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
              <input
                type="radio"
                name="cancelType"
                checked={cancelAtEnd}
                onChange={() => setCancelAtEnd(true)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Cancel at end of billing period
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Keep access to all features until{" "}
                  {subscription?.currentPeriodEnd
                    ? new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "the end of your period"}
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-danger-300 transition-colors">
              <input
                type="radio"
                name="cancelType"
                checked={!cancelAtEnd}
                onChange={() => setCancelAtEnd(false)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Cancel immediately
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lose access to paid features right away. You will be
                  downgraded to the Free plan.
                </p>
              </div>
            </label>
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reason for cancelling (optional)
            </label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Tell us why you're cancelling so we can improve..."
            />
          </div>

          {!cancelAtEnd && (
            <div className="p-3 bg-danger-50 rounded-lg border border-danger-200">
              <p className="text-sm text-danger-700">
                <span className="font-medium">Warning:</span> Immediate
                cancellation cannot be undone. You will lose access to all paid
                features right away and no refund will be issued for the
                remaining period.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              loading={cancelMutation.isPending}
            >
              {cancelAtEnd
                ? "Cancel at Period End"
                : "Cancel Immediately"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
