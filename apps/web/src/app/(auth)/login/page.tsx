"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Phone, Mail, ArrowRight, ShieldCheck } from "lucide-react";

type AuthTab = "phone" | "email";

export default function LoginPage() {
  const [tab, setTab] = useState<AuthTab>("phone");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) return;
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    // Would redirect on success
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
  };

  return (
    <Card padding="lg" className="shadow-2xl border-0">
      <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
        Welcome back
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Sign in to your Kontafy account
      </p>

      {/* Tab Switcher */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        <button
          onClick={() => {
            setTab("phone");
            setOtpSent(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "phone"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Phone className="h-4 w-4" />
          Phone
        </button>
        <button
          onClick={() => setTab("email")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "email"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
      </div>

      {tab === "phone" ? (
        <div className="space-y-4">
          {!otpSent ? (
            <>
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
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <div className="text-center mb-2">
                <div className="h-12 w-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-6 w-6 text-primary-800" />
                </div>
                <p className="text-sm text-gray-600">
                  OTP sent to{" "}
                  <span className="font-medium text-gray-900">
                    +91 {phone}
                  </span>
                </p>
              </div>
              <Input
                label="Enter OTP"
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
                Verify & Sign In
              </Button>
              <button
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="w-full text-sm text-primary-800 hover:text-primary-600 font-medium"
              >
                Change phone number
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
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
            placeholder="Enter your password"
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-800 hover:text-primary-600 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            className="w-full"
            onClick={handleEmailLogin}
            loading={loading}
            disabled={!email || !password}
          >
            Sign In
          </Button>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary-800 hover:text-primary-600"
          >
            Create account
          </Link>
        </p>
      </div>
    </Card>
  );
}
