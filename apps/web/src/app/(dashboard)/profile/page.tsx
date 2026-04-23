"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  Save,
  Upload,
  UserCircle,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Load fresh profile data from API
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: any }>("/profile");
        const profile = res.data || res;
        setForm((prev) => ({
          ...prev,
          fullName: profile.name || profile.fullName || prev.fullName,
          email: profile.email || prev.email,
          phone: profile.phone || "",
        }));
      } catch {
        // Fall back to auth store values
      }
    })();
  }, []);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again re-fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setAvatarError("");

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setAvatarError("File too large. Max 1MB.");
      return;
    }
    if (!user?.id) {
      setAvatarError("Not signed in.");
      return;
    }

    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadErr) {
        setAvatarError(
          uploadErr.message.toLowerCase().includes("bucket")
            ? 'Avatar storage not configured. Create a public bucket named "avatars" in Supabase.'
            : `Upload failed: ${uploadErr.message}`,
        );
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

      const result = await api.patch<{
        data?: { avatar_url?: string };
        avatar_url?: string;
      }>("/profile", { avatar_url: avatarUrl });
      // Response is wrapped by backend interceptor: { data: { avatar_url } }
      const finalUrl =
        result?.data?.avatar_url || result?.avatar_url || avatarUrl;

      setUser({
        ...user,
        avatarUrl: finalUrl,
      });
    } catch (err: any) {
      setAvatarError(err?.message || "Failed to update avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const updatePasswordField = (field: string, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordSuccess(false);
    setPasswordError("");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      type ProfilePayload = {
        id: string;
        email: string | null;
        phone: string | null;
        name: string | null;
        avatar_url: string | null;
      };
      const response = await api.patch<{
        data?: ProfilePayload;
      } & Partial<ProfilePayload>>("/profile", {
        name: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
      });

      // Response is wrapped by backend interceptor: { success, data, meta }
      const updated = response.data || response;

      if (user) {
        setUser({
          ...user,
          fullName: updated?.name || user.fullName,
          email: updated?.email || user.email,
          phone: updated?.phone || undefined,
        });
      }
      setSuccess(true);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordSaving(true);
    setPasswordSuccess(false);
    setPasswordError("");
    try {
      await api.patch("/profile/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess(true);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const getInitials = () => {
    if (form.fullName) {
      return form.fullName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    if (form.email) return form.email[0].toUpperCase();
    return "U";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal account settings
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Information */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-gray-400" />
              Personal Information
            </CardTitle>
          </CardHeader>

          {/* Avatar */}
          <div className="flex items-center gap-6 mb-6">
            <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center border-2 border-primary-100 overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary-800">
                  {getInitials()}
                </span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                variant="outline"
                size="sm"
                icon={<Upload className="h-4 w-4" />}
                onClick={() => fileInputRef.current?.click()}
                loading={avatarUploading}
              >
                Change Avatar
              </Button>
              <p className="text-xs text-gray-500 mt-1.5">
                PNG, JPG up to 1MB. Square images work best.
              </p>
              {avatarError && (
                <p className="text-xs text-danger-600 mt-1">{avatarError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@company.in"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div className="flex items-center gap-3 justify-end mt-6">
            {success && (
              <span className="text-sm text-success-700">Profile updated!</span>
            )}
            <Button
              icon={<Save className="h-4 w-4" />}
              onClick={handleSaveProfile}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Change Password */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-400" />
              Change Password
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <Input
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordForm.current_password}
              onChange={(e) =>
                updatePasswordField("current_password", e.target.value)
              }
              placeholder="Enter current password"
              rightIcon={
                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(!showCurrentPassword)
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.new_password}
                onChange={(e) =>
                  updatePasswordField("new_password", e.target.value)
                }
                placeholder="At least 8 characters"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  updatePasswordField("confirm_password", e.target.value)
                }
                placeholder="Re-enter new password"
                error={
                  passwordForm.confirm_password &&
                  passwordForm.new_password !== passwordForm.confirm_password
                    ? "Passwords do not match"
                    : undefined
                }
              />
            </div>
          </div>

          {passwordError && (
            <p className="mt-3 text-sm text-danger-600">{passwordError}</p>
          )}

          <div className="flex items-center gap-3 justify-end mt-6">
            {passwordSuccess && (
              <span className="text-sm text-success-700">
                Password changed!
              </span>
            )}
            <Button
              variant="outline"
              icon={<Lock className="h-4 w-4" />}
              onClick={handleChangePassword}
              loading={passwordSaving}
              disabled={
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                !passwordForm.confirm_password
              }
            >
              Change Password
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
