"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Save,
  TestTube2,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function WhatsAppSettingsPage() {
  const [provider, setProvider] = useState("gupshup");
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("https://api.gupshup.io/wa/api/v1/msg");
  const [senderNumber, setSenderNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      // These are stored as environment variables on the server.
      // In production, this would call a settings API to persist them.
      alert(
        "WhatsApp configuration should be set via environment variables:\n\n" +
          "WHATSAPP_PROVIDER=" + provider + "\n" +
          "WHATSAPP_API_KEY=" + (apiKey ? "****" : "(not set)") + "\n" +
          "WHATSAPP_API_URL=" + apiUrl + "\n" +
          "WHATSAPP_SENDER_NUMBER=" + senderNumber + "\n\n" +
          "Update your .env file or deployment config."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhone) {
      alert("Please enter a phone number for the test message.");
      return;
    }
    setTestSending(true);
    try {
      alert(
        `Test message would be sent to ${testPhone}.\n\nEnsure your WhatsApp API credentials are configured in environment variables.`
      );
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/whatsapp">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              WhatsApp Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your WhatsApp Business API provider
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Configuration */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              API Configuration
            </CardTitle>
          </CardHeader>

          <div className="space-y-4 mt-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Provider
              </label>
              <div className="flex gap-3">
                {["gupshup", "twilio", "meta", "custom"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      provider === p
                        ? "border-primary-800 bg-primary-50 text-primary-800"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="API URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.gupshup.io/wa/api/v1/msg"
            />

            <Input
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your WhatsApp API key"
            />

            <Input
              label="Sender Number"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="919876543210"
              hint="Include country code without + sign"
            />

            <Button
              variant="primary"
              size="md"
              icon={<Save className="h-4 w-4" />}
              onClick={handleSave}
              loading={saving}
              className="w-full"
            >
              Save Configuration
            </Button>
          </div>
        </Card>

        {/* Test & Status */}
        <div className="space-y-6">
          <Card padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-4 w-4" />
                Send Test Message
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 mt-4">
              <Input
                label="Test Phone Number"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="919876543210"
              />
              <Button
                variant="outline"
                size="md"
                icon={<MessageSquare className="h-4 w-4" />}
                onClick={handleTestMessage}
                loading={testSending}
                className="w-full"
              >
                Send Test Message
              </Button>
            </div>
          </Card>

          <Card padding="md">
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
            </CardHeader>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Provider</span>
                <Badge variant="info">
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">API Key</span>
                <Badge variant={apiKey ? "success" : "warning"} dot>
                  {apiKey ? "Configured" : "Not Set"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Sender Number</span>
                <Badge variant={senderNumber ? "success" : "warning"} dot>
                  {senderNumber || "Not Set"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Webhook URL</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                  /api/whatsapp/webhook
                </code>
              </div>
            </div>
          </Card>

          <Card padding="md" className="bg-primary-50/50 border-primary-200">
            <div className="text-sm text-primary-800">
              <p className="font-medium mb-2">Environment Variables</p>
              <p className="text-primary-600 text-xs leading-relaxed">
                Set these in your <code className="bg-white/50 px-1 rounded">.env</code> file:
              </p>
              <pre className="mt-2 text-xs bg-white/70 p-3 rounded-lg overflow-x-auto text-primary-700 leading-relaxed">
{`WHATSAPP_PROVIDER=gupshup
WHATSAPP_API_KEY=your_api_key
WHATSAPP_API_URL=https://api.gupshup.io/wa/api/v1/msg
WHATSAPP_SENDER_NUMBER=919876543210`}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
