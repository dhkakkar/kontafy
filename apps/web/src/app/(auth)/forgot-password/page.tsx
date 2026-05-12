"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.error?.message || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card padding="lg" className="shadow-2xl border-0 text-center">
        <div className="h-14 w-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Check your email
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          If an account exists for <span className="font-medium text-gray-900">{email}</span>,
          we&apos;ve sent a password reset link. The link expires in 1 hour.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="shadow-2xl border-0">
      <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
        Forgot password?
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Enter your email and we&apos;ll send you a reset link
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-danger-700 bg-danger-50 rounded-lg border border-danger-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          className="w-full"
          onClick={handleSubmit}
          loading={loading}
          disabled={!email}
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Send Reset Link
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary-800 hover:text-primary-600"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
