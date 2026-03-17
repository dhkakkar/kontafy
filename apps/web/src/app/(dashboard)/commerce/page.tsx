"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import {
  ShoppingBag,
  Link2,
  Unlink,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

// Platform metadata
const PLATFORMS = [
  {
    id: "amazon",
    name: "Amazon Seller Central",
    logo: "/icons/amazon.svg",
    color: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600",
    fields: [
      { key: "seller_id", label: "Seller ID", type: "text" },
      { key: "refresh_token", label: "Refresh Token", type: "password" },
      { key: "client_id", label: "Client ID (LWA)", type: "text" },
      { key: "client_secret", label: "Client Secret (LWA)", type: "password" },
      { key: "marketplace_id", label: "Marketplace ID", type: "text", placeholder: "A21TJRUUN4KGV (India)" },
    ],
  },
  {
    id: "flipkart",
    name: "Flipkart Seller Hub",
    logo: "/icons/flipkart.svg",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    fields: [
      { key: "app_id", label: "Application ID", type: "text" },
      { key: "app_secret", label: "Application Secret", type: "password" },
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    logo: "/icons/shopify.svg",
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    fields: [
      { key: "shop_domain", label: "Shop Domain", type: "text", placeholder: "my-store.myshopify.com" },
      { key: "access_token", label: "Admin API Access Token", type: "password" },
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    logo: "/icons/woocommerce.svg",
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
    fields: [
      { key: "store_url", label: "Store URL", type: "text", placeholder: "https://mystore.com" },
      { key: "consumer_key", label: "Consumer Key", type: "text" },
      { key: "consumer_secret", label: "Consumer Secret", type: "password" },
    ],
  },
];

interface ConnectionStatus {
  platform: string;
  display_name: string;
  connected: boolean;
  connection_id: string | null;
  store_name: string | null;
  last_synced_at: string | null;
  connected_at: string | null;
}

export default function CommerceConnectionsPage() {
  const queryClient = useQueryClient();
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [disconnectModal, setDisconnectModal] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const { data: statuses = [], isLoading } = useQuery<ConnectionStatus[]>({
    queryKey: ["commerce-status"],
    queryFn: () => api.get("/commerce/status"),
  });

  const connectMutation = useMutation({
    mutationFn: (data: { platform: string; store_name: string; credentials: Record<string, string> }) =>
      api.post("/commerce/connect", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commerce-status"] });
      setConnectModal(null);
      setStoreName("");
      setCredentials({});
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (platform: string) => api.delete(`/commerce/disconnect/${platform}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commerce-status"] });
      setDisconnectModal(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (platform: string) =>
      api.post(`/commerce/sync/${platform}`, { type: "orders" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commerce-status"] });
    },
  });

  const handleConnect = (platformId: string) => {
    connectMutation.mutate({
      platform: platformId,
      store_name: storeName,
      credentials,
    });
  };

  const openConnectModal = (platformId: string) => {
    setConnectModal(platformId);
    setStoreName("");
    setCredentials({});
  };

  const connectedPlatform = connectModal
    ? PLATFORMS.find((p) => p.id === connectModal)
    : null;

  const formatLastSync = (date: string | null) => {
    if (!date) return "Never synced";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-commerce</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect your marketplace accounts to auto-sync orders and create invoices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/commerce/orders">
            <Button variant="outline" icon={<ShoppingCart className="h-4 w-4" />}>
              Synced Orders
            </Button>
          </Link>
          <Link href="/commerce/dashboard">
            <Button variant="outline" icon={<BarChart3 className="h-4 w-4" />}>
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-primary-800" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Connected Platforms</p>
              <p className="text-xl font-bold text-gray-900">
                {statuses.filter((s) => s.connected).length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Platforms</p>
              <p className="text-xl font-bold text-gray-900">4</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary-800" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Auto-Sync</p>
              <p className="text-xl font-bold text-gray-900">Hourly</p>
              <p className="text-xs text-gray-400">Orders auto-create invoices</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Platform Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Marketplace Connections
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-32 bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const status = statuses.find((s) => s.platform === platform.id);
              const connected = status?.connected ?? false;

              return (
                <Card
                  key={platform.id}
                  className={`border ${connected ? platform.color : "border-gray-200"}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          connected ? platform.color : "bg-gray-100"
                        }`}
                      >
                        <ShoppingBag
                          className={`h-6 w-6 ${
                            connected ? platform.iconColor : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {platform.name}
                        </h3>
                        {connected && status?.store_name && (
                          <p className="text-xs text-gray-500">
                            {status.store_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={connected ? "success" : "default"}
                    >
                      {connected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>

                  {connected && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      <Clock className="h-3 w-3" />
                      <span>
                        Last synced: {formatLastSync(status?.last_synced_at ?? null)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {connected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<RefreshCw className="h-3.5 w-3.5" />}
                          onClick={() => syncMutation.mutate(platform.id)}
                          loading={
                            syncMutation.isPending &&
                            syncMutation.variables === platform.id
                          }
                        >
                          Sync Now
                        </Button>
                        <Link href={`/commerce/orders?platform=${platform.id}`}>
                          <Button size="sm" variant="ghost">
                            View Orders
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger-600 hover:text-danger-700"
                          onClick={() => setDisconnectModal(platform.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        icon={<Link2 className="h-3.5 w-3.5" />}
                        onClick={() => openConnectModal(platform.id)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      <Modal
        open={!!connectModal}
        onClose={() => setConnectModal(null)}
        title={`Connect ${connectedPlatform?.name ?? ""}`}
        description="Enter your platform API credentials to start syncing orders"
      >
        <div className="space-y-4">
          <Input
            label="Store Name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g., My Online Store"
          />

          {connectedPlatform?.fields.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              type={field.type}
              value={credentials[field.key] ?? ""}
              onChange={(e) =>
                setCredentials({ ...credentials, [field.key]: e.target.value })
              }
              placeholder={field.placeholder ?? ""}
            />
          ))}

          {connectMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-danger-600 bg-danger-50 rounded-lg p-3">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{(connectMutation.error as Error)?.message ?? "Connection failed"}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConnectModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => connectModal && handleConnect(connectModal)}
              loading={connectMutation.isPending}
              disabled={!storeName}
            >
              Connect Platform
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disconnect Confirmation Modal */}
      <Modal
        open={!!disconnectModal}
        onClose={() => setDisconnectModal(null)}
        title="Disconnect Platform"
        description="Are you sure you want to disconnect this platform? Existing synced orders will remain, but auto-sync will stop."
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDisconnectModal(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => disconnectModal && disconnectMutation.mutate(disconnectModal)}
            loading={disconnectMutation.isPending}
          >
            Disconnect
          </Button>
        </div>
      </Modal>
    </div>
  );
}
