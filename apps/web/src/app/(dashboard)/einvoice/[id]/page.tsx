"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  FileCheck,
  XCircle,
  Loader2,
  Copy,
  CheckCircle,
  QrCode,
  Code,
} from "lucide-react";
import {
  useEInvoiceStatus,
  useGenerateEInvoice,
  useCancelEInvoice,
} from "@/hooks/use-einvoice";

export default function EInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const { data: status, isLoading } = useEInvoiceStatus(invoiceId);
  const generateMutation = useGenerateEInvoice();
  const cancelMutation = useCancelEInvoice();

  const [showPayload, setShowPayload] = useState(false);
  const [cancelForm, setCancelForm] = useState({ show: false, reason: "1", remarks: "" });
  const [copied, setCopied] = useState(false);

  const handleCopyIRN = () => {
    if (status?.irn) {
      navigator.clipboard.writeText(status.irn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync(invoiceId);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancel = async () => {
    if (cancelForm.remarks.length < 5) return;
    try {
      await cancelMutation.mutateAsync({
        invoiceId,
        reason: cancelForm.reason,
        remarks: cancelForm.remarks,
      });
      setCancelForm({ show: false, reason: "1", remarks: "" });
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          </Card>
          <Card>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  const isGenerated = status.einvoice_status === "generated";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/einvoice")}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {status.invoice_number}
            </h1>
            <p className="text-sm text-gray-500 mt-1">E-Invoice Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isGenerated && (
            <Button
              icon={
                generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )
              }
              disabled={generateMutation.isPending}
              onClick={handleGenerate}
            >
              Generate E-Invoice
            </Button>
          )}
          {isGenerated && (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              icon={<XCircle className="h-4 w-4" />}
              onClick={() => setCancelForm({ ...cancelForm, show: true })}
            >
              Cancel E-Invoice
            </Button>
          )}
        </div>
      </div>

      {(generateMutation.isError || cancelMutation.isError) && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            {generateMutation.error?.message || cancelMutation.error?.message}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Invoice Information
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Invoice Number</dt>
              <dd className="text-sm font-medium text-gray-900">
                {status.invoice_number}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Customer</dt>
              <dd className="text-sm font-medium text-gray-900">
                {status.contact_name || "N/A"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">GSTIN</dt>
              <dd className="text-sm font-mono text-gray-900">
                {status.contact_gstin || "N/A"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Date</dt>
              <dd className="text-sm text-gray-900">
                {formatDate(status.date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Amount</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {formatCurrency(status.total)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Invoice Status</dt>
              <dd>
                <Badge variant="info">{status.invoice_status}</Badge>
              </dd>
            </div>
          </dl>
        </Card>

        {/* E-Invoice Status */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            E-Invoice Status
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <Badge
                  variant={isGenerated ? "success" : "warning"}
                  dot
                >
                  {isGenerated ? "Generated" : "Pending"}
                </Badge>
              </dd>
            </div>
            {status.irn && (
              <div>
                <dt className="text-sm text-gray-500 mb-1">IRN</dt>
                <dd className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">
                    {status.irn}
                  </code>
                  <button
                    onClick={handleCopyIRN}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Copy IRN"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </dd>
              </div>
            )}
            {status.ack_no && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ack Number</dt>
                <dd className="text-sm font-mono text-gray-900">
                  {status.ack_no}
                </dd>
              </div>
            )}
            {status.eway_bill_no && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">E-Way Bill</dt>
                <dd>
                  <Badge variant="info">{status.eway_bill_no}</Badge>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* QR Code & Payload */}
      {isGenerated && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                Signed QR Code
              </h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                  <QrCode className="h-16 w-16 text-gray-300" />
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  QR code generated from signed invoice data
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  NIC JSON Payload
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPayload(!showPayload)}
              >
                {showPayload ? "Hide" : "Show"} Payload
              </Button>
            </div>
            {showPayload && status.nic_status && (
              <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono overflow-auto max-h-80">
                {JSON.stringify(status.nic_status, null, 2)}
              </pre>
            )}
            {showPayload && !status.nic_status && (
              <p className="text-sm text-gray-500">
                Payload data not available from NIC at this time.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Cancel Dialog */}
      {cancelForm.show && (
        <Card className="border-red-200">
          <h3 className="text-sm font-semibold text-red-700 mb-4">
            Cancel E-Invoice
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            E-Invoice can only be cancelled within 24 hours of generation.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <select
                value={cancelForm.reason}
                onChange={(e) =>
                  setCancelForm({ ...cancelForm, reason: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="1">Duplicate</option>
                <option value="2">Data Entry Mistake</option>
                <option value="3">Order Cancelled</option>
                <option value="4">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks (min 5 characters)
              </label>
              <textarea
                value={cancelForm.remarks}
                onChange={(e) =>
                  setCancelForm({ ...cancelForm, remarks: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Enter cancellation remarks..."
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setCancelForm({ show: false, reason: "1", remarks: "" })
                }
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={
                  cancelForm.remarks.length < 5 || cancelMutation.isPending
                }
                onClick={handleCancel}
                icon={
                  cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : undefined
                }
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
