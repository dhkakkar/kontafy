"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useCaApprovals, useApproveEntry } from "@/hooks/use-ca-portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

export default function CaApprovalsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: entries, isLoading, error } = useCaApprovals(orgId);
  const approveMutation = useApproveEntry();

  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");

  const handleAction = async () => {
    if (!selectedEntry || !action) return;
    try {
      await approveMutation.mutateAsync({
        journalEntryId: selectedEntry,
        orgId,
        approved: action === "approve",
        comment: comment || undefined,
      });
      setSelectedEntry(null);
      setAction(null);
      setComment("");
    } catch {
      // Error handled by mutation
    }
  };

  const openActionModal = (
    entryId: string,
    actionType: "approve" | "reject"
  ) => {
    setSelectedEntry(entryId);
    setAction(actionType);
    setComment("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Journal entries awaiting your review and approval
          </p>
        </div>
        {entries && entries.length > 0 && (
          <Badge variant="warning" dot>
            {entries.length} pending
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {(error as Error)?.message || "Failed to load approvals."}
          </p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && entries && entries.length === 0 && (
        <div className="text-center py-20">
          <ClipboardCheck className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            All caught up
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            No journal entries are pending your approval. New entries will appear
            here when the business creates them.
          </p>
        </div>
      )}

      {/* Entries List */}
      {!isLoading && entries && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} padding="none" hover>
              {/* Entry Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-warning-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Entry #{entry.entryNumber}
                      </span>
                      <Badge variant="warning" dot>
                        Pending
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{formatDate(entry.date)}</span>
                      {entry.narration && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{entry.narration}</span>
                        </>
                      )}
                      {entry.reference && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>Ref: {entry.reference}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-danger-600 border-danger-200 hover:bg-danger-50"
                    icon={<XCircle className="h-4 w-4" />}
                    onClick={() => openActionModal(entry.id, "reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success-600 hover:bg-success-700"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => openActionModal(entry.id, "approve")}
                  >
                    Approve
                  </Button>
                </div>
              </div>

              {/* Journal Lines */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2.5 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="text-left py-2.5 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-right py-2.5 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debit
                      </th>
                      <th className="text-right py-2.5 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit
                      </th>
                      <th className="text-left py-2.5 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((line, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2.5 px-6">
                          <div className="flex items-center gap-2">
                            {line.accountCode && (
                              <span className="text-xs font-mono text-gray-400">
                                {line.accountCode}
                              </span>
                            )}
                            <span className="font-medium text-gray-900">
                              {line.accountName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-6">
                          <Badge variant="default" className="capitalize">
                            {line.accountType}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-6 text-right font-mono">
                          {line.debit > 0 ? (
                            <span className="text-gray-900">
                              {formatCurrency(line.debit)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-6 text-right font-mono">
                          {line.credit > 0 ? (
                            <span className="text-gray-900">
                              {formatCurrency(line.credit)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-6 text-gray-600">
                          {line.description || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={2}
                        className="py-2.5 px-6 text-sm font-semibold text-gray-700"
                      >
                        Total
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(entry.totalDebit)}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(entry.totalCredit)}
                      </td>
                      <td className="py-2.5 px-6">
                        {entry.totalDebit !== entry.totalCredit && (
                          <Badge variant="danger" dot>
                            Unbalanced
                          </Badge>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approve/Reject Modal */}
      <Modal
        open={!!selectedEntry && !!action}
        onClose={() => {
          setSelectedEntry(null);
          setAction(null);
          setComment("");
        }}
        title={
          action === "approve"
            ? "Approve Journal Entry"
            : "Reject Journal Entry"
        }
        description={
          action === "approve"
            ? "This will post the journal entry to the ledger."
            : "The entry will remain unposted. Please provide a reason."
        }
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Comment {action === "reject" ? "(recommended)" : "(optional)"}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={
                action === "approve"
                  ? "Optional approval notes..."
                  : "Reason for rejection..."
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedEntry(null);
                setAction(null);
              }}
            >
              Cancel
            </Button>
            {action === "approve" ? (
              <Button
                className="bg-success-600 hover:bg-success-700"
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={handleAction}
                loading={approveMutation.isPending}
              >
                Approve & Post
              </Button>
            ) : (
              <Button
                variant="destructive"
                icon={<XCircle className="h-4 w-4" />}
                onClick={handleAction}
                loading={approveMutation.isPending}
              >
                Reject
              </Button>
            )}
          </div>

          {approveMutation.isError && (
            <p className="text-sm text-danger-500">
              {(approveMutation.error as Error)?.message || "Action failed"}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
