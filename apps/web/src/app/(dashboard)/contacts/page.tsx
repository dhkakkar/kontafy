"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  MapPin,
  MoreHorizontal,
  Loader2,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  type: "customer" | "vendor" | "both";
  email: string | null;
  phone: string | null;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  pan?: string | null;
  outstanding_receivable?: number;
  outstanding_payable?: number;
}

interface ApiResponse<T> {
  data: T;
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGstin, setFormGstin] = useState("");
  const [formPan, setFormPan] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");

  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ["contacts", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.type = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ApiResponse<Contact[]>>("/bill/contacts", params);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/bill/contacts", {
        name: formName,
        type: formType || "customer",
        email: formEmail || undefined,
        phone: formPhone || undefined,
        gstin: formGstin || undefined,
        pan: formPan || undefined,
        address: formAddress || undefined,
        city: formCity || undefined,
        state: formState || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowModal(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormType("");
    setFormEmail("");
    setFormPhone("");
    setFormGstin("");
    setFormPan("");
    setFormAddress("");
    setFormCity("");
    setFormState("");
  };

  const tabs = [
    { value: "all", label: "All Contacts", count: contacts.length },
    {
      value: "customer",
      label: "Customers",
      count: contacts.filter((c) => c.type === "customer" || c.type === "both").length,
    },
    {
      value: "vendor",
      label: "Vendors",
      count: contacts.filter((c) => c.type === "vendor" || c.type === "both").length,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your customers and vendors
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowModal(true)}
        >
          Add Contact
        </Button>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-danger-600">
            Failed to load contacts. Please try again.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-4"
              >
                <div className="h-11 w-11 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary-800">
                    {contact.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {contact.name}
                    </h3>
                    <Badge
                      variant={
                        contact.type === "customer"
                          ? "info"
                          : contact.type === "vendor"
                          ? "warning"
                          : "default"
                      }
                    >
                      {contact.type === "both"
                        ? "Customer & Vendor"
                        : contact.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {contact.city}
                      </span>
                    )}
                    {contact.gstin && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.gstin}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 hidden md:block">
                  {(contact.outstanding_receivable ?? 0) > 0 && (
                    <p className="text-sm">
                      <span className="text-gray-500">Receivable: </span>
                      <span className="font-medium text-success-700">
                        {formatCurrency(contact.outstanding_receivable!)}
                      </span>
                    </p>
                  )}
                  {(contact.outstanding_payable ?? 0) > 0 && (
                    <p className="text-sm">
                      <span className="text-gray-500">Payable: </span>
                      <span className="font-medium text-warning-700">
                        {formatCurrency(contact.outstanding_payable!)}
                      </span>
                    </p>
                  )}
                </div>

                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && contacts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No contacts found</p>
          </div>
        )}
      </Card>

      {/* Add Contact Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Contact"
        description="Add a customer or vendor to your contacts"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Contact Name" placeholder="Business or person name" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Select
            label="Contact Type"
            options={[
              { value: "customer", label: "Customer" },
              { value: "vendor", label: "Vendor" },
              { value: "both", label: "Both" },
            ]}
            value={formType}
            onChange={setFormType}
            placeholder="Select type"
          />
          <Input label="Email" type="email" placeholder="email@company.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          <Input label="Phone" placeholder="+91 XXXXX XXXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          <Input label="GSTIN (Optional)" placeholder="15-character GSTIN" value={formGstin} onChange={(e) => setFormGstin(e.target.value)} />
          <Input label="PAN" placeholder="ABCDE1234F" value={formPan} onChange={(e) => setFormPan(e.target.value)} />
          <div className="md:col-span-2">
            <Input label="Address" placeholder="Full address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          </div>
          <Input label="City" placeholder="City" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
          <Select
            label="State"
            options={[
              { value: "MH", label: "Maharashtra" },
              { value: "DL", label: "Delhi" },
              { value: "KA", label: "Karnataka" },
              { value: "GJ", label: "Gujarat" },
              { value: "TN", label: "Tamil Nadu" },
              { value: "UP", label: "Uttar Pradesh" },
              { value: "RJ", label: "Rajasthan" },
              { value: "WB", label: "West Bengal" },
              { value: "AP", label: "Andhra Pradesh" },
              { value: "TS", label: "Telangana" },
            ]}
            value={formState}
            onChange={setFormState}
            searchable
            placeholder="Select state"
          />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!formName}
          >
            Save Contact
          </Button>
        </div>
      </Modal>
    </div>
  );
}
