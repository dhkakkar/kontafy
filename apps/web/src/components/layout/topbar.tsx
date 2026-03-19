"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  Search,
  ChevronDown,
  UserCircle,
  Settings,
  LogOut,
  Building2,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationBell } from "./notification-bell";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface OrgItem {
  id: string;
  name: string;
  gstin?: string;
  logoUrl?: string;
  role?: string;
}

export function Topbar() {
  const { sidebarCollapsed } = useUIStore();
  const { user, organization, logout, setOrganization } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  const { data: organizations = [] } = useQuery<OrgItem[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ data: OrgItem[] }>("/organizations");
      return res.data;
    },
    enabled: !!user,
  });

  const switchOrg = (org: OrgItem) => {
    setOrganization({
      id: org.id,
      name: org.name,
      gstin: org.gstin,
      financialYearStart: organization?.financialYearStart || 4,
    });
    setShowOrgMenu(false);
    window.location.reload();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setShowOrgMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-200",
        "flex items-center justify-between px-6 transition-all duration-300",
        sidebarCollapsed ? "left-[72px]" : "left-[260px]"
      )}
    >
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200" />

        {/* Org Switcher */}
        {organizations.length > 1 && (
          <div className="relative" ref={orgMenuRef}>
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">
                {organization?.name || "Select Org"}
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", showOrgMenu && "rotate-180")} />
            </button>

            {showOrgMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Switch Organization</p>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => switchOrg(org)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        org.id === organization?.id
                          ? "bg-primary-50 text-primary-800"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-800">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{org.name}</p>
                        {org.gstin && <p className="text-xs text-gray-500 truncate">{org.gstin}</p>}
                      </div>
                      {org.id === organization?.id && (
                        <Check className="h-4 w-4 text-primary-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {organization?.name || "My Business"}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                {user?.fullName || "User"}
              </p>
            </div>
            <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-800">
                {(user?.fullName || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                showUserMenu && "rotate-180"
              )}
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {user?.fullName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  My Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    logout();
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
