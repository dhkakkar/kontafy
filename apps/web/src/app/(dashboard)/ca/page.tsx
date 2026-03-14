"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCaClients } from "@/hooks/use-ca-portal";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  Search,
  ArrowRight,
  Loader2,
  Shield,
} from "lucide-react";

export default function CaClientListPage() {
  const { data: clients, isLoading, error } = useCaClients();
  const [search, setSearch] = useState("");

  const filteredClients = (clients || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase())) ||
      (c.legalName && c.legalName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organizations you have CA access to
          </p>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name, GSTIN, or legal name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
        className="max-w-md"
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">
            Failed to load clients. Please try again.
          </p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredClients.length === 0 && (
        <div className="text-center py-20">
          <Shield className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {search ? "No matching clients" : "No clients yet"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {search
              ? "Try a different search term."
              : "When businesses invite you as their CA, they will appear here."}
          </p>
        </div>
      )}

      {/* Client Grid */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Link key={client.orgId} href={`/ca/${client.orgId}`}>
              <Card
                hover
                className="group cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary-800" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-primary-800 group-hover:translate-x-1 transition-all" />
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {client.name}
                </h3>
                {client.legalName && client.legalName !== client.name && (
                  <p className="text-xs text-gray-500 mb-2">{client.legalName}</p>
                )}

                <div className="space-y-2 mt-3">
                  {client.gstin && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12">GSTIN</span>
                      <span className="text-xs font-mono text-gray-700">
                        {client.gstin}
                      </span>
                    </div>
                  )}
                  {client.businessType && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12">Type</span>
                      <Badge variant="default">{client.businessType}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12">Since</span>
                    <span className="text-xs text-gray-600">
                      {formatDate(client.joinedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100">
                  {(client.permissions || []).slice(0, 3).map((perm) => (
                    <Badge key={perm} variant="info">
                      {perm.replace(/_/g, " ")}
                    </Badge>
                  ))}
                  {(client.permissions || []).length > 3 && (
                    <Badge variant="default">
                      +{(client.permissions || []).length - 3}
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
