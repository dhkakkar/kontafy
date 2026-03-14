"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plug,
  ShoppingBag,
  CreditCard,
  MessageCircle,
  Mail,
  Cloud,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "available" | "coming_soon";
  category: string;
}

const integrations: Integration[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept payments via UPI, cards, and net banking",
    icon: <CreditCard className="h-6 w-6" />,
    status: "available",
    category: "Payments",
  },
  {
    id: "amazon",
    name: "Amazon Seller",
    description: "Sync orders and settlements from Amazon India",
    icon: <ShoppingBag className="h-6 w-6" />,
    status: "coming_soon",
    category: "E-commerce",
  },
  {
    id: "flipkart",
    name: "Flipkart Seller",
    description: "Import orders and reconcile marketplace fees",
    icon: <ShoppingBag className="h-6 w-6" />,
    status: "coming_soon",
    category: "E-commerce",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send invoices and reminders via WhatsApp",
    icon: <MessageCircle className="h-6 w-6" />,
    status: "available",
    category: "Communication",
  },
  {
    id: "email",
    name: "Email (SMTP)",
    description: "Send invoices and reports via email",
    icon: <Mail className="h-6 w-6" />,
    status: "available",
    category: "Communication",
  },
  {
    id: "tally",
    name: "Tally Import",
    description: "Import your existing data from Tally ERP",
    icon: <Cloud className="h-6 w-6" />,
    status: "coming_soon",
    category: "Data Import",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">
              Integrations
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Connect third-party services to extend Kontafy
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500">
                  {integration.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {integration.name}
                    </h4>
                    {integration.status === "connected" && (
                      <Badge variant="success" dot>
                        Connected
                      </Badge>
                    )}
                    {integration.status === "coming_soon" && (
                      <Badge variant="default">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {integration.description}
                  </p>
                </div>
              </div>

              <div>
                {integration.status === "connected" && (
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                )}
                {integration.status === "available" && (
                  <Button variant="secondary" size="sm">
                    Connect
                  </Button>
                )}
                {integration.status === "coming_soon" && (
                  <Button variant="ghost" size="sm" disabled>
                    Notify Me
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
