"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBranches, type Branch } from "@/hooks/use-branches";
import { Plus, Search, MapPin, Phone, Mail, Building2, Star } from "lucide-react";

export default function BranchesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useBranches({ search: searchQuery || undefined });

  const branches: Branch[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your organization branches and locations
          </p>
        </div>
        <Link href="/branches/new">
          <Button icon={<Plus className="h-4 w-4" />}>New Branch</Button>
        </Link>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search branches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md">
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card padding="md" className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No branches found</p>
          <Link href="/branches/new" className="mt-4 inline-block">
            <Button size="sm">Create your first branch</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Link key={branch.id} href={`/branches/${branch.id}`}>
              <Card
                padding="md"
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-800" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {branch.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono">
                        {branch.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {branch.is_main && (
                      <Badge variant="info" dot>
                        <Star className="h-3 w-3 mr-1" />
                        Main
                      </Badge>
                    )}
                    <Badge
                      variant={branch.is_active ? "success" : "default"}
                      dot
                    >
                      {branch.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-600">
                  {branch.address && (branch.address.line1 || branch.address.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span>
                        {[branch.address.line1, branch.address.city, branch.address.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>{branch.email}</span>
                    </div>
                  )}
                  {branch.manager_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Manager:</span>
                      <span className="font-medium">{branch.manager_name}</span>
                    </div>
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
