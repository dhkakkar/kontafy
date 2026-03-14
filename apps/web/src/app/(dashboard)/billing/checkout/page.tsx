"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCreateCheckout,
  usePlans,
  type CheckoutResponse,
} from "@/hooks/use-subscription";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type CheckoutState = "loading" | "ready" | "processing" | "success" | "failed";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") || "starter";
  const billingCycle =
    (searchParams.get("cycle") as "monthly" | "yearly") || "monthly";

  const { data: plans } = usePlans();
  const checkoutMutation = useCreateCheckout();

  const [state, setState] = useState<CheckoutState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(
    null
  );

  const selectedPlan = plans?.find((p) => p.id === planId);
  const price =
    billingCycle === "yearly"
      ? selectedPlan?.priceYearly || 0
      : selectedPlan?.priceMonthly || 0;
  const monthlyEquivalent =
    billingCycle === "yearly"
      ? Math.round((selectedPlan?.priceYearly || 0) / 12)
      : selectedPlan?.priceMonthly || 0;

  // Initialize checkout
  const initCheckout = useCallback(async () => {
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMessage("Failed to load payment gateway. Please try again.");
        setState("failed");
        return;
      }

      const data = await checkoutMutation.mutateAsync({
        planId,
        billingCycle,
      });

      setCheckoutData(data);
      setState("ready");
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Failed to create checkout session. Please try again."
      );
      setState("failed");
    }
  }, [planId, billingCycle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initCheckout();
  }, [initCheckout]);

  const openRazorpay = useCallback(() => {
    if (!checkoutData || typeof window === "undefined" || !window.Razorpay) {
      return;
    }

    setState("processing");

    const options = {
      key: checkoutData.razorpayKeyId,
      subscription_id: checkoutData.subscriptionId,
      name: "Kontafy",
      description: checkoutData.description,
      currency: checkoutData.currency,
      handler: function (response: {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }) {
        setState("success");
      },
      modal: {
        ondismiss: function () {
          setState("ready");
        },
        confirm_close: true,
        escape: true,
      },
      theme: {
        color: "#1e3a5f",
      },
      prefill: {},
      notes: {
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", function (response: any) {
      setErrorMessage(
        response?.error?.description || "Payment failed. Please try again."
      );
      setState("failed");
    });

    rzp.open();
  }, [checkoutData, planId, billingCycle]);

  // Success state
  if (state === "success") {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-success-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Payment Successful!
            </h2>
            <p className="text-sm text-gray-600">
              Your subscription to{" "}
              <span className="font-medium">{selectedPlan?.name}</span> has been
              activated. You now have access to all features included in your
              plan.
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="/billing">
                <Button variant="outline">View Billing</Button>
              </Link>
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Failed state
  if (state === "failed") {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-danger-50 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-danger-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Payment Failed
            </h2>
            <p className="text-sm text-gray-600">{errorMessage}</p>
            <div className="flex gap-3 mt-4">
              <Link href="/billing/plans">
                <Button variant="outline">Back to Plans</Button>
              </Link>
              <Button onClick={initCheckout}>Try Again</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing/plans">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete your subscription upgrade
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Order Summary
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">
                Kontafy {selectedPlan?.name || planId}
              </p>
              <p className="text-sm text-gray-500">
                {billingCycle === "yearly" ? "Annual" : "Monthly"} subscription
              </p>
            </div>
            <Badge variant="info">{selectedPlan?.name}</Badge>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {billingCycle === "yearly" ? "Annual" : "Monthly"} price
            </span>
            <span>
              {"\u20B9"}{price.toLocaleString("en-IN")}
              {billingCycle === "yearly" ? "/year" : "/month"}
            </span>
          </div>

          {billingCycle === "yearly" && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Monthly equivalent</span>
              <span>
                {"\u20B9"}{monthlyEquivalent.toLocaleString("en-IN")}/month
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-base font-semibold text-gray-900">
            <span>Total due today</span>
            <span>
              {"\u20B9"}{price.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment Button */}
      <Card>
        <div className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={openRazorpay}
            loading={state === "loading" || state === "processing"}
            disabled={state !== "ready"}
            icon={<Lock className="h-4 w-4" />}
          >
            {state === "loading"
              ? "Preparing checkout..."
              : state === "processing"
                ? "Processing payment..."
                : `Pay ${"\u20B9"}${price.toLocaleString("en-IN")}`}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Secured by Razorpay. 256-bit SSL encryption.</span>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By proceeding, you agree to our terms of service. Your subscription
            will auto-renew at the end of each billing period. You can cancel
            anytime from Billing Settings.
          </p>
        </div>
      </Card>
    </div>
  );
}
