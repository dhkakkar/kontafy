"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreateAccount = async () => {
    if (!fullName || !email || !password || !agreedToTerms) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            business_name: businessName,
            gstin: gstin || undefined,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card padding="lg" className="shadow-2xl border-0 text-center">
        <div className="h-14 w-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Check your email
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          We&apos;ve sent a confirmation link to{" "}
          <span className="font-medium text-gray-900">{email}</span>. Click the
          link to verify your account.
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
        Create your account
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Start your free Kontafy account
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-danger-700 bg-danger-50 rounded-lg border border-danger-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Your Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
        />
        <Input
          label="Business Name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Pvt Ltd"
        />
        <Input
          label="GSTIN (Optional)"
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
          placeholder="22AAAAA0000A1Z5"
          hint="15-character GST Identification Number"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          rightIcon={
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-800 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600">
            I agree to the{" "}
            <Link
              href="/terms"
              className="font-medium text-primary-800 hover:text-primary-600"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary-800 hover:text-primary-600"
            >
              Privacy Policy
            </Link>
          </span>
        </label>

        <Button
          className="w-full"
          onClick={handleCreateAccount}
          loading={loading}
          disabled={!fullName || !email || !password || !agreedToTerms}
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Create Account
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{" "}
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
