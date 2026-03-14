"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useBranch,
  useBranchSummary,
  useBranchStock,
} from "@/hooks/use-branches";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  FileText,
} from "lucide-react";

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;

  const { data: branch, isLoading } = useBranch(branchId);
  const { data: summaryData } = useBranchSummary(branchId);
  const { data: stockData } = useBranchStock(branchId);

  const summary = summaryData?.summary;
  const stockItems = stockData?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/branches">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card><div className="h-40 bg-gray-100 rounded animate-pulse" /></Card>
          </div>
          <Card><div className="h-40 bg-gray-100 rounded animate-pulse" /></Card>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/branches">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Branch not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/branches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
            {branch.is_main && (
              <Badge variant="info" dot>
                <Star className="h-3 w-3 mr-1" />
                Main
              </Badge>
            )}
            <Badge variant={branch.is_active ? "success" : "default"} dot>
              {branch.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{branch.code}</p>
        </div>
      </div>

      {/* P&L Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success-700" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Revenue</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary.revenue)}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-danger-50 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-danger-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Expenses</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary.expenses)}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary-800" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Profit</p>
                <p className={`text-lg font-bold ${summary.profit >= 0 ? "text-success-700" : "text-danger-600"}`}>
                  {formatCurrency(summary.profit)}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Invoices</p>
                <p className="text-lg font-bold text-gray-900">
                  {summary.invoiceCount}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Info */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Branch Information</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm">
            {branch.address && (branch.address.line1 || branch.address.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-700">
                  {[
                    branch.address.line1,
                    branch.address.line2,
                    branch.address.city,
                    branch.address.state,
                    branch.address.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {branch.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-700">{branch.phone}</span>
              </div>
            )}
            {branch.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-700">{branch.email}</span>
              </div>
            )}
            {branch.manager_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-700">
                  Manager: {branch.manager_name}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Stock Levels */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="p-4 border-b border-gray-200">
              <CardHeader className="!mb-0">
                <CardTitle>
                  <Package className="h-4 w-4 mr-2 inline" />
                  Stock Levels
                </CardTitle>
              </CardHeader>
            </div>
            {stockItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No stock data for this branch
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {item.product.name}
                        </td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                          {item.product.sku}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {item.warehouse.name}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {item.quantity} {item.product.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(item.quantity * item.product.selling_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
