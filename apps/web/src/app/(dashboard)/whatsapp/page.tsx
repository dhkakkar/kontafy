"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  MessageSquare,
  CheckCheck,
  XCircle,
  Send,
  Clock,
  Settings,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  sentToday: number;
  delivered: number;
  failed: number;
  total: number;
}

interface WhatsAppMessage {
  id: string;
  contact_id: string;
  invoice_id?: string;
  type: string;
  status: string;
  phone: string;
  template: string;
  sent_at?: string;
  delivered_at?: string;
  error?: string;
  created_at: string;
}

export default function WhatsAppDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    sentToday: 0,
    delivered: 0,
    failed: 0,
    total: 0,
  });
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingBulk, setSendingBulk] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, messagesRes] = await Promise.all([
        api.get<{ success: boolean; data: Stats }>("/whatsapp/stats"),
        api.get<{ success: boolean; data: { data: WhatsAppMessage[] } }>("/whatsapp/recent"),
      ]);
      setStats(statsRes.data);
      const msgData = messagesRes.data;
      // The recent endpoint returns { data: messages[] } which the interceptor wraps
      setMessages(Array.isArray(msgData) ? msgData : (msgData?.data || []));
    } catch {
      // API may not be connected yet; show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBulkReminders = async () => {
    setSendingBulk(true);
    try {
      const res = await api.post<{ success: boolean; data: { total: number; queued: number; failed: number } }>(
        "/whatsapp/bulk-reminders"
      );
      const result = res.data;
      alert(
        `Bulk reminders: ${result.queued} queued, ${result.failed} failed out of ${result.total} overdue invoices.`
      );
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to send bulk reminders");
    } finally {
      setSendingBulk(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "read":
        return <Badge variant="success" dot>{status}</Badge>;
      case "sent":
        return <Badge variant="info" dot>{status}</Badge>;
      case "queued":
        return <Badge variant="default" dot>{status}</Badge>;
      case "failed":
        return <Badge variant="danger" dot>{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "invoice":
        return <Badge variant="info">Invoice</Badge>;
      case "reminder":
        return <Badge variant="warning">Reminder</Badge>;
      case "receipt":
        return <Badge variant="success">Receipt</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const kpiCards = [
    {
      title: "Sent Today",
      value: stats.sentToday,
      icon: <Send className="h-5 w-5 text-primary-800" />,
      iconBg: "bg-primary-50",
    },
    {
      title: "Delivered (All Time)",
      value: stats.delivered,
      icon: <CheckCheck className="h-5 w-5 text-success-700" />,
      iconBg: "bg-success-50",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: <XCircle className="h-5 w-5 text-danger-700" />,
      iconBg: "bg-danger-50",
    },
    {
      title: "Total Messages",
      value: stats.total,
      icon: <MessageSquare className="h-5 w-5 text-primary-800" />,
      iconBg: "bg-primary-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messaging</h1>
          <p className="text-sm text-gray-500 mt-1">
            Send invoices, reminders, and receipts via WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Clock className="h-4 w-4" />}
            onClick={handleBulkReminders}
            loading={sendingBulk}
          >
            Send Bulk Reminders
          </Button>
          <Link href="/whatsapp/settings">
            <Button
              variant="outline"
              size="sm"
              icon={<Settings className="h-4 w-4" />}
            >
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}
              >
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Messages */}
      <Card padding="none">
        <div className="p-6 pb-0">
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No messages sent yet. Send your first invoice via WhatsApp!
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3.5 px-6 font-medium text-gray-900">
                    {msg.phone}
                  </td>
                  <td className="py-3.5 px-6">{typeBadge(msg.type)}</td>
                  <td className="py-3.5 px-6">{statusBadge(msg.status)}</td>
                  <td className="py-3.5 px-6 text-gray-600">
                    {msg.sent_at ? formatDate(msg.sent_at) : "-"}
                  </td>
                  <td className="py-3.5 px-6 text-gray-500 text-xs max-w-[200px] truncate">
                    {msg.error || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
