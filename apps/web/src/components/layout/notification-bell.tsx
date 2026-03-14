"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  FileText,
  CreditCard,
  AlertTriangle,
  Package,
  Calendar,
  Info,
  CheckCheck,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  invoice_sent: <FileText className="h-3.5 w-3.5 text-primary-600" />,
  payment_received: <CreditCard className="h-3.5 w-3.5 text-success-600" />,
  invoice_overdue: <AlertTriangle className="h-3.5 w-3.5 text-danger-600" />,
  low_stock: <Package className="h-3.5 w-3.5 text-warning-600" />,
  gst_deadline: <Calendar className="h-3.5 w-3.5 text-warning-600" />,
  system: <Info className="h-3.5 w-3.5 text-gray-500" />,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>("/notifications/unread-count");
      setUnreadCount(res.count);
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch recent notifications when dropdown opens
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        data: Notification[];
        pagination: { total: number };
      }>("/notifications", { limit: "8" });
      setNotifications(res.data);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // noop
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // noop
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 bg-danger-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary-800 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                      !n.is_read && "bg-primary-50/40"
                    )}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      if (n.link) {
                        setOpen(false);
                        window.location.href = n.link;
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                        !n.is_read ? "bg-primary-100" : "bg-gray-100"
                      )}
                    >
                      {typeIcons[n.type] || typeIcons.system}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-tight",
                          !n.is_read
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-600"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatDate(n.created_at, "DD MMM, h:mm A")}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-2 h-2 w-2 bg-primary-600 rounded-full shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <a
              href="/notifications"
              className="block text-center text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
