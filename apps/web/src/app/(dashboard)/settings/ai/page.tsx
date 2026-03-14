"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiSettings, useUpdateAiSettings } from "@/hooks/use-ai";
import {
  Brain,
  BarChart3,
  ShieldAlert,
  Lightbulb,
  Tags,
  Link2,
  Save,
  Key,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface FeatureToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function FeatureToggle({
  icon,
  label,
  description,
  enabled,
  onChange,
  disabled,
}: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{label}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? "bg-primary-800" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function AiSettingsPage() {
  const { data: settings, isLoading } = useAiSettings();
  const updateMutation = useUpdateAiSettings();

  const [localSettings, setLocalSettings] = useState<{
    cashFlowForecast: boolean;
    anomalyDetection: boolean;
    insightGeneration: boolean;
    transactionCategorization: boolean;
    reconciliationAssist: boolean;
  } | null>(null);

  // Use local state if modified, else use server state
  const current = localSettings ?? settings;
  const hasChanges =
    localSettings !== null &&
    settings &&
    (localSettings.cashFlowForecast !== settings.cashFlowForecast ||
      localSettings.anomalyDetection !== settings.anomalyDetection ||
      localSettings.insightGeneration !== settings.insightGeneration ||
      localSettings.transactionCategorization !==
        settings.transactionCategorization ||
      localSettings.reconciliationAssist !== settings.reconciliationAssist);

  const handleToggle = (
    key: keyof NonNullable<typeof localSettings>,
    value: boolean
  ) => {
    const base = localSettings ?? settings;
    if (!base) return;
    setLocalSettings({
      cashFlowForecast: base.cashFlowForecast,
      anomalyDetection: base.anomalyDetection,
      insightGeneration: base.insightGeneration,
      transactionCategorization: base.transactionCategorization,
      reconciliationAssist: base.reconciliationAssist,
      [key]: value,
    });
  };

  const handleSave = async () => {
    if (!localSettings) return;
    await updateMutation.mutateAsync(localSettings);
    setLocalSettings(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary-600" />
            AI Features
          </CardTitle>
          <Badge variant={settings?.apiKeyConfigured ? "success" : "warning"} dot>
            {settings?.apiKeyConfigured ? "API Connected" : "No API Key"}
          </Badge>
        </CardHeader>

        <p className="text-sm text-gray-500 mb-6">
          Configure AI-powered features for your organization. These features
          use OpenAI to analyze your financial data and provide intelligent
          insights.
        </p>

        {/* API Key Status */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
            settings?.apiKeyConfigured
              ? "bg-success-50 border border-success-200"
              : "bg-warning-50 border border-warning-200"
          }`}
        >
          {settings?.apiKeyConfigured ? (
            <>
              <CheckCircle className="h-5 w-5 text-success-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-success-800">
                  OpenAI API key configured
                </p>
                <p className="text-xs text-success-600 mt-0.5">
                  All AI features are available. The API key is configured via
                  the OPENAI_API_KEY environment variable.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning-800">
                  OpenAI API key not configured
                </p>
                <p className="text-xs text-warning-600 mt-0.5">
                  AI features will use basic statistical analysis instead of
                  GPT-powered insights. Set OPENAI_API_KEY in your environment
                  to enable full AI capabilities.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Feature Toggles */}
        <div>
          <FeatureToggle
            icon={<BarChart3 className="h-4.5 w-4.5" />}
            label="Cash Flow Forecast"
            description="AI-powered 30/60/90 day cash flow predictions based on historical payment patterns"
            enabled={current?.cashFlowForecast ?? true}
            onChange={(v) => handleToggle("cashFlowForecast", v)}
          />
          <FeatureToggle
            icon={<ShieldAlert className="h-4.5 w-4.5" />}
            label="Anomaly Detection"
            description="Automatically detect unusual transactions, duplicate invoices, and expense spikes"
            enabled={current?.anomalyDetection ?? true}
            onChange={(v) => handleToggle("anomalyDetection", v)}
          />
          <FeatureToggle
            icon={<Lightbulb className="h-4.5 w-4.5" />}
            label="Business Insights"
            description="Generate actionable insights about collections, expenses, GST deadlines, and cash runway"
            enabled={current?.insightGeneration ?? true}
            onChange={(v) => handleToggle("insightGeneration", v)}
          />
          <FeatureToggle
            icon={<Tags className="h-4.5 w-4.5" />}
            label="Transaction Categorization"
            description="AI-suggest account categories for imported bank transactions"
            enabled={current?.transactionCategorization ?? true}
            onChange={(v) => handleToggle("transactionCategorization", v)}
          />
          <FeatureToggle
            icon={<Link2 className="h-4.5 w-4.5" />}
            label="Reconciliation Assist"
            description="Suggest matching journal entries for bank reconciliation"
            enabled={current?.reconciliationAssist ?? true}
            onChange={(v) => handleToggle("reconciliationAssist", v)}
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          {updateMutation.isSuccess && !hasChanges && (
            <span className="text-sm text-success-700">Settings saved!</span>
          )}
          <Button
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            loading={updateMutation.isPending}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Usage Stats Card */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-gray-400" />
            Usage
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Forecasts
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">Daily</p>
            <p className="text-xs text-gray-400 mt-0.5">Refreshed at 6 AM</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Anomaly Scans
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">Daily</p>
            <p className="text-xs text-gray-400 mt-0.5">Scanned at 7 AM</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Insights
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">Weekly</p>
            <p className="text-xs text-gray-400 mt-0.5">Generated Mon 8 AM</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
