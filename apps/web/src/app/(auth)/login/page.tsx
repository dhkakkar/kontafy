"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Fetch user's organizations
      const res = await api.get<{
        data: Array<{
          id: string;
          name: string;
          gstin?: string;
          logo_url?: string;
          fiscal_year_start: number;
          role: string;
        }>;
      }>("/organizations");
      const orgs = res.data;

      const user = authData.user;
      const meta = user?.user_metadata || {};

      if (orgs.length > 0) {
        // Set the first org as active
        login(
          {
            id: user.id,
            email: user.email!,
            fullName: meta.full_name || user.email!,
            avatarUrl: meta.avatar_url,
          },
          {
            id: orgs[0].id,
            name: orgs[0].name,
            gstin: orgs[0].gstin,
            logoUrl: orgs[0].logo_url,
            financialYearStart: orgs[0].fiscal_year_start,
          }
        );
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="shadow-2xl border-0">
      <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
        Welcome back
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Sign in to your Kontafy account
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
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
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
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Sign In
        </Button>
      </div>

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
