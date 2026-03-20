"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import {
  Plus,
  Shield,
  Trash2,
  Mail,
  Calendar,
  UserCircle,
  Loader2,
} from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  joined_at: string;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "viewer", label: "Viewer" },
];

const roleVariantMap: Record<string, "info" | "success" | "warning" | "default"> = {
  owner: "info",
  admin: "success",
  accountant: "warning",
  viewer: "default",
};

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Load team members from API
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: TeamMember[] }>("/settings/users");
        setMembers(res.data || []);
      } catch {
        // API may not exist yet, show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const newMember = await api.post<TeamMember>("/settings/users/invite", {
        email: inviteEmail,
        role: inviteRole,
      });
      setMembers((prev) => [...prev, newMember]);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("viewer");
    } catch (err) {
      console.error("Failed to invite user:", err);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await api.patch(`/settings/users/${memberId}/role`, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleRemove = async (memberId: string) => {
    setRemoving(true);
    try {
      await api.delete(`/settings/users/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setShowRemoveModal(null);
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally {
      setRemoving(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return "?";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const memberToRemove = members.find((m) => m.id === showRemoveModal);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card padding="none">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Team Members
            </h3>
            <p className="text-sm text-gray-500">
              Manage who has access to your organization
            </p>
          </div>
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Member
          </Button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-800">
                    {getInitials(member.name, member.email)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {member.name || member.email || "Unknown User"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {member.email && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {formatDate(member.joined_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {member.role === "owner" ? (
                  <Badge
                    variant="info"
                    className="flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    Owner
                  </Badge>
                ) : (
                  <Select
                    options={ROLES.filter((r) => r.value !== "owner")}
                    value={member.role}
                    onChange={(v) => handleRoleChange(member.id, v)}
                    className="w-36"
                  />
                )}
                {member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowRemoveModal(member.id)}
                    className="text-gray-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        )}

        {!loading && members.length === 0 && (
          <div className="py-12 text-center">
            <UserCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No team members yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Invite your team to collaborate
            </p>
          </div>
        )}
      </Card>

      {/* Invite Member Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        description="Send an invitation to join your organization"
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.in"
            leftIcon={<Mail className="h-4 w-4" />}
          />
          <Select
            label="Role"
            options={ROLES}
            value={inviteRole}
            onChange={setInviteRole}
          />
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Role Permissions
            </h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>
                <strong>Owner</strong> -- Full access, can manage billing and
                delete organization
              </li>
              <li>
                <strong>Admin</strong> -- Manage settings, team, and all
                financial data
              </li>
              <li>
                <strong>Accountant</strong> -- Create and edit invoices,
                entries, and reports
              </li>
              <li>
                <strong>Viewer</strong> -- Read-only access to all data
              </li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            loading={inviting}
            disabled={!inviteEmail.trim()}
            icon={<Plus className="h-4 w-4" />}
          >
            Send Invitation
          </Button>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        open={!!showRemoveModal}
        onClose={() => setShowRemoveModal(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${
          memberToRemove?.name || memberToRemove?.email || "this member"
        } from the organization? They will lose access immediately.`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setShowRemoveModal(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => showRemoveModal && handleRemove(showRemoveModal)}
            loading={removing}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Remove Member
          </Button>
        </div>
      </Modal>
    </div>
  );
}
