"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  FileText,
  CreditCard,
  AlertTriangle,
  Package,
  Calendar,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface PaginatedResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const typeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; badgeVariant: "success" | "info" | "warning" | "danger" | "default" }
> = {
  invoice_sent: {
    icon: <FileText className="h-4 w-4" />,
    color: "text-primary-600",
    badgeVariant: "info",
  },
  payment_received: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-success-600",
    badgeVariant: "success",
  },
  invoice_overdue: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-danger-600",
    badgeVariant: "danger",
  },
  low_stock: {
    icon: <Package className="h-4 w-4" />,
    color: "text-warning-600",
    badgeVariant: "warning",
  },
  gst_deadline: {
    icon: <Calendar className="h-4 w-4" />,
    color: "text-warning-600",
    badgeVariant: "warning",
  },
  system: {
    icon: <Info className="h-4 w-4" />,
    color: "text-gray-500",
    badgeVariant: "default",
  },
};

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig.system;
}

function formatTypeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse>("/notifications", {
        page: String(page),
        limit: "20",
      });
      setNotifications(res.data);
      setPagination(res.pagination);
    } catch {
      // Silently handle — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // noop
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // noop
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with your business activity
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={markingAll}
            icon={<CheckCheck className="h-4 w-4" />}
            onClick={markAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      <Card padding="none">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-800 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-500">
              No notifications yet
            </p>
            <p className="text-sm text-gray-400 mt-1">
              You will see updates about invoices, payments, and more here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const config = getTypeConfig(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 transition-colors cursor-pointer hover:bg-gray-50 ${
                    !notification.is_read ? "bg-primary-50/30" : ""
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      !notification.is_read
                        ? "bg-primary-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <span className={config.color}>{config.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={`text-sm leading-tight ${
                          !notification.is_read
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 bg-primary-600 rounded-full shrink-0" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-sm text-gray-500 leading-snug">
                        {notification.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={config.badgeVariant}>
                        {formatTypeLabel(notification.type)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatDate(notification.created_at, "DD MMM YYYY, h:mm A")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchNotifications(pagination.page - 1)}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchNotifications(pagination.page + 1)}
                icon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
