"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  useConnectedCAs,
  useInviteCA,
  useRevokeCA,
  type CaPermission,
} from "@/hooks/use-ca-portal";
import { formatDate } from "@/lib/utils";
import {
  UserPlus,
  Shield,
  Trash2,
  Mail,
  Clock,
  CheckCircle2,
  Loader2,
  FileText,
  BarChart3,
  Receipt,
  Download,
  ClipboardCheck,
} from "lucide-react";

// ─── Permission Config ────────────────────────────────────────

const PERMISSION_OPTIONS: {
  key: CaPermission;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "view_reports",
    label: "View Reports",
    description: "Access P&L, Balance Sheet, Trial Balance",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    key: "view_invoices",
    label: "View Invoices",
    description: "Access sales invoices and purchase bills",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "view_gst",
    label: "View GST",
    description: "Access GST returns and tax data",
    icon: <Receipt className="h-4 w-4" />,
  },
  {
    key: "approve_entries",
    label: "Approve Entries",
    description: "Approve or reject journal entries",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    key: "download_data",
    label: "Download Data",
    description: "Download annual data packs",
    icon: <Download className="h-4 w-4" />,
  },
];

// ─── Page ─────────────────────────────────────────────────────

export default function CASettingsPage() {
  const { data, isLoading, error } = useConnectedCAs();
  const inviteMutation = useInviteCA();
  const revokeMutation = useRevokeCA();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<CaPermission[]>([
    "view_reports",
    "view_invoices",
    "view_gst",
  ]);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const togglePermission = (perm: CaPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleInvite = async () => {
    if (!inviteEmail || selectedPermissions.length === 0) return;
    try {
      await inviteMutation.mutateAsync({
        email: inviteEmail,
        permissions: selectedPermissions,
      });
      setShowInviteModal(false);
      setInviteEmail("");
      setSelectedPermissions(["view_reports", "view_invoices", "view_gst"]);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      await revokeMutation.mutateAsync(userId);
      setRevokeConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CA Portal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage Chartered Accountant access to your organization
          </p>
        </div>
        <Button
          size="sm"
          icon={<UserPlus className="h-4 w-4" />}
          onClick={() => setShowInviteModal(true)}
        >
          Invite CA
        </Button>
      </div>

      {/* Active CAs */}
      <Card padding="none">
        <div className="p-6 pb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-800" />
              Connected Chartered Accountants
            </CardTitle>
          </CardHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Failed to load connected CAs. Please try again.
          </div>
        ) : (
          <div>
            {/* Active CAs */}
            {data?.activeCAs && data.activeCAs.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {data.activeCAs.map((ca) => (
                  <div
                    key={ca.userId}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary-800" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          CA User
                        </p>
                        <p className="text-xs text-gray-500">
                          Joined {formatDate(ca.joinedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {((ca.permissions as any) || []).map((perm: string) => (
                          <Badge key={perm} variant="info">
                            {perm.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="success" dot>
                        Active
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-danger-500"
                        onClick={() => setRevokeConfirm(ca.userId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-4 text-sm text-gray-500">
                No active CA connections.
              </div>
            )}

            {/* Pending Invitations */}
            {data?.pendingInvitations && data.pendingInvitations.length > 0 && (
              <>
                <div className="px-6 pt-4 pb-2">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Pending Invitations
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-warning-50 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-warning-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {inv.email}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            Expires {formatDate(inv.expiresAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {((inv.permissions as any) || []).map((perm: string) => (
                          <Badge key={perm} variant="default">
                            {perm.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        <Badge variant="warning" dot>
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(!data?.activeCAs || data.activeCAs.length === 0) &&
              (!data?.pendingInvitations || data.pendingInvitations.length === 0) && (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">
                    No CAs connected yet. Invite your Chartered Accountant to get started.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    icon={<UserPlus className="h-4 w-4" />}
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite CA
                  </Button>
                </div>
              )}
          </div>
        )}
      </Card>

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Chartered Accountant"
        description="Send an invitation to your CA with specific access permissions"
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="CA Email Address"
            type="email"
            placeholder="ca@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissions
            </label>
            <div className="space-y-2">
              {PERMISSION_OPTIONS.map((perm) => (
                <label
                  key={perm.key}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPermissions.includes(perm.key)
                      ? "border-primary-500 bg-primary-50/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      {perm.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {perm.label}
                      </p>
                      <p className="text-xs text-gray-500">{perm.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              loading={inviteMutation.isPending}
              disabled={!inviteEmail || selectedPermissions.length === 0}
              icon={<Mail className="h-4 w-4" />}
            >
              Send Invitation
            </Button>
          </div>

          {inviteMutation.isError && (
            <p className="text-sm text-danger-500">
              {(inviteMutation.error as Error)?.message || "Failed to send invitation"}
            </p>
          )}
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        open={!!revokeConfirm}
        onClose={() => setRevokeConfirm(null)}
        title="Revoke CA Access"
        description="Are you sure you want to revoke this CA's access? They will no longer be able to view your financial data."
        size="sm"
      >
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setRevokeConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={revokeMutation.isPending}
            onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}
          >
            Revoke Access
          </Button>
        </div>
      </Modal>
    </div>
  );
}
