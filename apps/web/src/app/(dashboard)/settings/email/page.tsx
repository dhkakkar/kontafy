"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Mail,
  Send,
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function EmailSettingsPage() {
  const [smtpConfig, setSmtpConfig] = useState({
    host: "smtp.gmail.com",
    port: "587",
    secure: "false",
    user: "",
    fromName: "",
    replyTo: "",
  });
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // In production, this would call api.post('/settings/email', smtpConfig)
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTestStatus("sending");
    // In production, this would call api.post('/email/test', { to: testEmail })
    await new Promise((r) => setTimeout(r, 2000));
    setTestStatus("success");
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/settings"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure SMTP for sending invoices, reminders, and receipts
          </p>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* SMTP Configuration */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              SMTP Configuration
            </CardTitle>
            <Badge variant="info">Gmail recommended</Badge>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMTP Host"
              value={smtpConfig.host}
              onChange={(e) =>
                setSmtpConfig((p) => ({ ...p, host: e.target.value }))
              }
              placeholder="smtp.gmail.com"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Port"
                value={smtpConfig.port}
                onChange={(e) =>
                  setSmtpConfig((p) => ({ ...p, port: e.target.value }))
                }
                placeholder="587"
              />
              <Select
                label="Encryption"
                options={[
                  { value: "false", label: "STARTTLS (587)" },
                  { value: "true", label: "SSL/TLS (465)" },
                ]}
                value={smtpConfig.secure}
                onChange={(val) =>
                  setSmtpConfig((p) => ({ ...p, secure: val }))
                }
              />
            </div>
            <Input
              label="SMTP Username"
              value={smtpConfig.user}
              onChange={(e) =>
                setSmtpConfig((p) => ({ ...p, user: e.target.value }))
              }
              placeholder="your-email@gmail.com"
            />
            <Input
              label="SMTP Password / App Password"
              type="password"
              placeholder="Enter app password"
            />
          </div>

          <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary-900">
                  Using Gmail?
                </p>
                <p className="text-xs text-primary-700 mt-0.5">
                  Enable 2-Step Verification, then generate an{" "}
                  <strong>App Password</strong> at{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                  . Use that as your SMTP password.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Sender Identity */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-gray-400" />
              Sender Identity
            </CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Sender Name"
              value={smtpConfig.fromName}
              onChange={(e) =>
                setSmtpConfig((p) => ({ ...p, fromName: e.target.value }))
              }
              placeholder="Kontafy Demo Pvt Ltd"
            />
            <Input
              label="Reply-To Email"
              type="email"
              value={smtpConfig.replyTo}
              onChange={(e) =>
                setSmtpConfig((p) => ({ ...p, replyTo: e.target.value }))
              }
              placeholder="accounts@yourbusiness.com"
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            The sender name appears in the recipient's inbox. Reply-To is where
            customer replies go.
          </p>
        </Card>

        {/* Test Email */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
          </CardHeader>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Recipient Email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <Button
              variant="outline"
              loading={testStatus === "sending"}
              onClick={handleTestEmail}
              disabled={!testEmail || testStatus === "sending"}
              icon={<Send className="h-4 w-4" />}
            >
              Send Test
            </Button>
          </div>

          {testStatus === "success" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-success-700">
              <CheckCircle className="h-4 w-4" />
              Test email sent successfully. Check your inbox.
            </div>
          )}
          {testStatus === "error" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-danger-700">
              <XCircle className="h-4 w-4" />
              Failed to send test email. Please check your SMTP settings.
            </div>
          )}
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            loading={saving}
            onClick={handleSave}
            icon={<Save className="h-4 w-4" />}
          >
            Save Email Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
