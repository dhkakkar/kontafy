"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/v1";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("Missing reset token. Use the link from your email.");
  }, [token]);

  const handleSubmit = async () => {
    if (!token || !password) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(
          json?.error?.message ||
            "Failed to reset password. The link may have expired.",
        );
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card padding="lg" className="shadow-2xl border-0 text-center">
        <div className="h-14 w-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Password updated
        </h2>
        <p className="text-sm text-gray-500 mb-6">Redirecting you to sign in...</p>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="shadow-2xl border-0">
      <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
        Set a new password
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Choose a password of at least 8 characters
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-danger-700 bg-danger-50 rounded-lg border border-danger-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="New password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />
        <Input
          label="Confirm new password"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          className="w-full"
          onClick={handleSubmit}
          loading={loading}
          disabled={!token || !password || !confirm}
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Update Password
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          <Link
            href="/login"
            className="font-semibold text-primary-800 hover:text-primary-600"
          >
            Back to Sign In
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
