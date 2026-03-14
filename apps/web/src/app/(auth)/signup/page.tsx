"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";

type Step = "phone" | "otp" | "details";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setStep("otp");
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setStep("details");
    setLoading(false);
  };

  const handleCreateAccount = async () => {
    if (!businessName || !fullName || !email || !password || !agreedToTerms)
      return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
  };

  return (
    <Card padding="lg" className="shadow-2xl border-0">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {(["phone", "otp", "details"] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`h-2 flex-1 rounded-full transition-colors ${
                (["phone", "otp", "details"] as Step[]).indexOf(step) >= i
                  ? "bg-primary-800"
                  : "bg-gray-200"
              }`}
            />
          </React.Fragment>
        ))}
      </div>

      {step === "phone" && (
        <>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Create your account
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Start with your phone number
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 h-10 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600 font-medium shrink-0">
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Enter 10-digit number"
                  className="flex-1 h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSendOTP}
              loading={loading}
              disabled={phone.length !== 10}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          </div>
        </>
      )}

      {step === "otp" && (
        <>
          <button
            onClick={() => {
              setStep("phone");
              setOtp("");
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-6 w-6 text-primary-800" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Verify your phone
            </h2>
            <p className="text-sm text-gray-500">
              Enter the OTP sent to{" "}
              <span className="font-medium text-gray-900">+91 {phone}</span>
            </p>
          </div>
          <div className="space-y-4">
            <Input
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit OTP"
              className="text-center text-lg tracking-[0.5em] font-semibold"
            />
            <Button
              className="w-full"
              onClick={handleVerifyOTP}
              loading={loading}
              disabled={otp.length !== 6}
            >
              Verify
            </Button>
            <p className="text-center text-sm text-gray-500">
              Didn&apos;t receive?{" "}
              <button className="font-medium text-primary-800 hover:text-primary-600">
                Resend OTP
              </button>
            </p>
          </div>
        </>
      )}

      {step === "details" && (
        <>
          <button
            onClick={() => setStep("otp")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Business details
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Tell us about your business
          </p>
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
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
              disabled={
                !businessName || !fullName || !email || !password || !agreedToTerms
              }
            >
              Create Account
            </Button>
          </div>
        </>
      )}

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
