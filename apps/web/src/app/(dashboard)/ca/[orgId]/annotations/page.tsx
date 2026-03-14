"use client";

import React, { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useCaAnnotations,
  useAddAnnotation,
} from "@/hooks/use-ca-portal";
import { formatDate } from "@/lib/utils";
import {
  MessageSquareText,
  Plus,
  Filter,
  Loader2,
  FileText,
  BookOpen,
  Users,
  Send,
} from "lucide-react";

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "journal_entry", label: "Journal Entry" },
  { value: "invoice", label: "Invoice" },
  { value: "contact", label: "Contact" },
];

const entityTypeIcons: Record<string, React.ReactNode> = {
  journal_entry: <BookOpen className="h-4 w-4 text-primary-800" />,
  invoice: <FileText className="h-4 w-4 text-success-700" />,
  contact: <Users className="h-4 w-4 text-warning-700" />,
};

const entityTypeBadgeVariant: Record<string, "info" | "success" | "warning"> = {
  journal_entry: "info",
  invoice: "success",
  contact: "warning",
};

export default function CaAnnotationsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const initialEntityType = searchParams.get("entityType") || "";

  const [filterType, setFilterType] = useState(initialEntityType);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntityType, setNewEntityType] = useState("journal_entry");
  const [newEntityId, setNewEntityId] = useState("");
  const [newComment, setNewComment] = useState("");

  const { data: annotations, isLoading } = useCaAnnotations(
    orgId,
    filterType || undefined
  );
  const addMutation = useAddAnnotation();

  const handleSubmitAnnotation = async () => {
    if (!newEntityId || !newComment) return;
    try {
      await addMutation.mutateAsync({
        orgId,
        entityType: newEntityType,
        entityId: newEntityId,
        comment: newComment,
      });
      setNewComment("");
      setNewEntityId("");
      setShowAddForm(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annotations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comments and notes on financial records
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          Add Annotation
        </Button>
      </div>

      {/* Add Annotation Form */}
      {showAddForm && (
        <Card padding="md" className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="text-base">New Annotation</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Entity Type"
                options={ENTITY_TYPE_OPTIONS.filter((o) => o.value !== "")}
                value={newEntityType}
                onChange={setNewEntityType}
              />
              <Input
                label="Entity ID"
                placeholder="UUID of the journal entry, invoice, or contact"
                value={newEntityId}
                onChange={(e) => setNewEntityId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Comment
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Add your observation, suggestion, or note..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                icon={<Send className="h-4 w-4" />}
                onClick={handleSubmitAnnotation}
                loading={addMutation.isPending}
                disabled={!newEntityId || !newComment}
              >
                Submit
              </Button>
            </div>

            {addMutation.isError && (
              <p className="text-sm text-danger-500">
                {(addMutation.error as Error)?.message || "Failed to add annotation"}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <Select
          options={ENTITY_TYPE_OPTIONS}
          value={filterType}
          onChange={setFilterType}
          placeholder="Filter by type"
          className="w-48"
        />
      </div>

      {/* Annotations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : annotations && annotations.length > 0 ? (
        <div className="space-y-3">
          {annotations.map((ann) => (
            <Card key={ann.id} padding="md" hover>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  {entityTypeIcons[ann.entity_type] || (
                    <MessageSquareText className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={entityTypeBadgeVariant[ann.entity_type] || "default"}
                    >
                      {ann.entity_type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-gray-400 font-mono">
                      {ann.entity_id.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatDate(ann.created_at, "DD MMM YYYY, HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {ann.comment}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <MessageSquareText className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No annotations yet
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Add annotations to journal entries, invoices, and contacts to share your
            observations with the business.
          </p>
        </div>
      )}
    </div>
  );
}
