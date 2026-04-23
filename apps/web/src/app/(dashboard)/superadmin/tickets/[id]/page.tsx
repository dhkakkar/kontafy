"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "default",
};

export default function SuperadminTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "tickets", ticketId],
    queryFn: () => api.get<any>(`/superadmin/tickets/${ticketId}`),
    enabled: !!ticketId,
  });

  const result = data?.data || data;
  const ticket = result?.ticket;
  const messages = result?.messages || [];

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(`/superadmin/tickets/${ticketId}/messages`, { body }),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "tickets"] });
    },
    onError: (e: any) => alert(e?.message || "Failed to send reply"),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: { status?: string; priority?: string }) =>
      api.patch(`/superadmin/tickets/${ticketId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "tickets"] });
    },
    onError: (e: any) => alert(e?.message || "Update failed"),
  });

  if (isLoading || !ticket) {
    return (
      <div>
        <Link href="/superadmin/tickets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to tickets
          </Button>
        </Link>
        <p className="mt-6 text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/superadmin/tickets">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to tickets
        </Button>
      </Link>

      <Card padding="lg">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Organization: <span className="font-medium text-gray-700">{ticket.organization?.name || ticket.org_id}</span>
              {" · "}Category: {ticket.category}
              {" · "}Opened {new Date(ticket.created_at).toLocaleString("en-IN")}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[ticket.status] || "default"} dot>
            {ticket.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Priority</label>
            <select
              value={ticket.priority}
              onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Original request</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>
      </Card>

      <div className="space-y-3">
        {messages.map((m: any) => {
          const mine = m.author_id === user?.id;
          return (
            <div
              key={m.id}
              className={`flex ${m.is_staff_reply ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  m.is_staff_reply
                    ? "bg-primary-50 text-primary-900 border border-primary-100"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-60">
                  {m.is_staff_reply ? (mine ? "You (Staff)" : "Staff") : "Customer"}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="text-[10px] mt-1 opacity-60">
                  {new Date(m.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No replies yet.</p>
        )}
      </div>

      {ticket.status !== "closed" && (
        <Card padding="lg">
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Reply as Kontafy Support
          </label>
          <textarea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your response..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
          />
          <div className="flex justify-end gap-2 mt-3">
            {ticket.status !== "resolved" && (
              <Button
                variant="outline"
                onClick={() => updateMutation.mutate({ status: "resolved" })}
              >
                Mark Resolved
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => replyMutation.mutate(reply)}
              disabled={!reply.trim()}
              loading={replyMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" /> Send Reply
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
