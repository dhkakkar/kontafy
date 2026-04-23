"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  LifeBuoy,
  MessageCircle,
  ArrowLeft,
  Send,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical" },
  { value: "feature_request", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
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

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_VARIANT: Record<string, "default" | "warning" | "danger"> = {
  low: "default",
  normal: "default",
  high: "warning",
  urgent: "danger",
};

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  _count?: { messages: number };
}

interface Message {
  id: string;
  author_id: string;
  body: string;
  is_staff_reply: boolean;
  created_at: string;
}

export default function HelpCenterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["support", "tickets"],
    queryFn: () => api.get<any>("/support/tickets"),
  });

  const result = listData?.data || listData;
  const tickets: Ticket[] = result?.data || [];

  const createMutation = useMutation({
    mutationFn: () => api.post("/support/tickets", draft),
    onSuccess: () => {
      setDraft({ subject: "", description: "", category: "general", priority: "normal" });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["support"] });
    },
    onError: (e: any) => alert(e?.message || "Failed to create ticket"),
  });

  if (selectedId) {
    return (
      <TicketDetail
        ticketId={selectedId}
        onBack={() => setSelectedId(null)}
        currentUserId={user?.id || ""}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit a support ticket or track the status of existing requests.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      </div>

      {showForm && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create a new ticket</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Subject <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Briefly describe the issue"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Category
                </label>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Priority
                </label>
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                placeholder="Please describe the issue in detail..."
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!draft.subject.trim() || !draft.description.trim()}
              >
                Submit Ticket
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card padding="none">
        <CardHeader className="p-6 pb-0 mb-0">
          <CardTitle>Your Tickets</CardTitle>
          <span className="text-sm text-gray-500">{tickets.length} total</span>
        </CardHeader>
        <div className="p-6 pt-4">
          {isLoading ? (
            <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <LifeBuoy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No tickets yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &quot;New Ticket&quot; above to submit a support request.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className="w-full flex items-start justify-between py-3 hover:bg-gray-50 -mx-6 px-6 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                      <Badge variant={STATUS_VARIANT[t.status] || "default"} dot>
                        {STATUS_LABEL[t.status] || t.status}
                      </Badge>
                      {t.priority !== "normal" && t.priority !== "low" && (
                        <Badge variant={PRIORITY_VARIANT[t.priority] || "default"}>
                          {t.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(t.updated_at).toLocaleDateString("en-IN")}
                    </p>
                    {t._count && t._count.messages > 0 && (
                      <div className="flex items-center justify-end gap-1 mt-1 text-xs text-gray-400">
                        <MessageCircle className="h-3 w-3" />
                        {t._count.messages}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function TicketDetail({
  ticketId,
  onBack,
  currentUserId,
}: {
  ticketId: string;
  onBack: () => void;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["support", "tickets", ticketId],
    queryFn: () => api.get<any>(`/support/tickets/${ticketId}`),
  });

  const result = data?.data || data;
  const ticket: Ticket | null = result?.ticket || null;
  const messages: Message[] = result?.messages || [];

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(`/support/tickets/${ticketId}/messages`, { body }),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["support", "tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
    onError: (e: any) => alert(e?.message || "Failed to send reply"),
  });

  if (isLoading || !ticket) {
    return (
      <div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="mt-6 text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Badge variant={STATUS_VARIANT[ticket.status] || "default"} dot>
          {STATUS_LABEL[ticket.status] || ticket.status}
        </Badge>
      </div>

      <Card padding="lg">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          {ticket.priority !== "normal" && (
            <Badge variant={PRIORITY_VARIANT[ticket.priority] || "default"}>
              {ticket.priority}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Category: {ticket.category} · Opened{" "}
          {new Date(ticket.created_at).toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {ticket.description}
        </p>
      </Card>

      <div className="space-y-3">
        {messages.map((m) => {
          const mine = m.author_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  m.is_staff_reply
                    ? "bg-primary-50 text-primary-900 border border-primary-100"
                    : mine
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-60">
                  {m.is_staff_reply ? "Kontafy Support" : mine ? "You" : "Teammate"}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="text-[10px] mt-1 opacity-60">
                  {new Date(m.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!isClosed && (
        <Card padding="lg">
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Add a reply
          </label>
          <textarea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
          />
          <div className="flex justify-end mt-3">
            <Button
              variant="primary"
              onClick={() => replyMutation.mutate(reply)}
              disabled={!reply.trim()}
              loading={replyMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </div>
        </Card>
      )}

      {isClosed && (
        <Card padding="md" className="bg-gray-50 text-sm text-gray-600 text-center">
          This ticket is closed.
        </Card>
      )}
    </div>
  );
}
