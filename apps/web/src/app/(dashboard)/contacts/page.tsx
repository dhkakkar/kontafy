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
  Upload,
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

const INDIAN_STATES = [
  { value: "AN", label: "Andaman & Nicobar Islands" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CH", label: "Chandigarh" },
  { value: "CT", label: "Chhattisgarh" },
  { value: "DN", label: "Dadra & Nagar Haveli and Daman & Diu" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JK", label: "Jammu & Kashmir" },
  { value: "JH", label: "Jharkhand" },
  { value: "KA", label: "Karnataka" },
  { value: "KL", label: "Kerala" },
  { value: "LA", label: "Ladakh" },
  { value: "MP", label: "Madhya Pradesh" },
  { value: "MH", label: "Maharashtra" },
  { value: "MN", label: "Manipur" },
  { value: "ML", label: "Meghalaya" },
  { value: "MZ", label: "Mizoram" },
  { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" },
  { value: "PB", label: "Punjab" },
  { value: "PY", label: "Puducherry" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TS", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" },
  { value: "WB", label: "West Bengal" },
];

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

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
  const [formOpeningBalance, setFormOpeningBalance] = useState("");
  const [formCreditPeriod, setFormCreditPeriod] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formContactPersonPhone, setFormContactPersonPhone] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAccount, setFormBankAccount] = useState("");
  const [formBankIfsc, setFormBankIfsc] = useState("");

  // Bulk add state
  const [bulkText, setBulkText] = useState("");
  const [bulkType, setBulkType] = useState("customer");
  const [bulkAdding, setBulkAdding] = useState(false);

  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ["contacts", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab === "customer" || activeTab === "vendor") params.type = activeTab;
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
        opening_balance: formOpeningBalance ? Number(formOpeningBalance) : undefined,
        payment_terms: formCreditPeriod ? Number(formCreditPeriod) : undefined,
        contact_person: formContactPerson || undefined,
        contact_person_phone: formContactPersonPhone || undefined,
        bank_name: formBankName || undefined,
        bank_account_number: formBankAccount || undefined,
        bank_ifsc: formBankIfsc || undefined,
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
    setFormOpeningBalance("");
    setFormCreditPeriod("");
    setFormContactPerson("");
    setFormContactPersonPhone("");
    setFormBankName("");
    setFormBankAccount("");
    setFormBankIfsc("");
  };

  const handleBulkAdd = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setBulkAdding(true);
    try {
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        const name = parts[0];
        if (!name) continue;
        await api.post("/bill/contacts", {
          name,
          type: bulkType,
          phone: parts[1] || undefined,
          email: parts[2] || undefined,
          gstin: parts[3] || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowBulkModal(false);
      setBulkText("");
    } catch (err) {
      console.error("Bulk add failed:", err);
    } finally {
      setBulkAdding(false);
    }
  };

  // Filter contacts based on active tab
  const filteredContacts = contacts.filter((c) => {
    if (activeTab === "to_collect") return (c.outstanding_receivable ?? 0) > 0;
    if (activeTab === "to_pay") return (c.outstanding_payable ?? 0) > 0;
    return true;
  });

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
    {
      value: "to_collect",
      label: "To Collect",
      count: contacts.filter((c) => (c.outstanding_receivable ?? 0) > 0).length,
    },
    {
      value: "to_pay",
      label: "To Pay",
      count: contacts.filter((c) => (c.outstanding_payable ?? 0) > 0).length,
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => setShowBulkModal(true)}
          >
            Bulk Add
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowModal(true)}
          >
            Add Contact
          </Button>
        </div>
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
            {filteredContacts.map((contact) => (
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

        {!isLoading && !error && filteredContacts.length === 0 && (
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
          <Input label="Contact Name *" placeholder="Business or person name" value={formName} onChange={(e) => setFormName(e.target.value)} />
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
          <Input label="GSTIN" placeholder="15-character GSTIN" value={formGstin} onChange={(e) => setFormGstin(e.target.value)} />
          <Input label="PAN" placeholder="ABCDE1234F" value={formPan} onChange={(e) => setFormPan(e.target.value)} />
          <div className="md:col-span-2">
            <Input label="Address" placeholder="Full address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          </div>
          <Input label="City" placeholder="City" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
          <Select
            label="State"
            options={INDIAN_STATES}
            value={formState}
            onChange={setFormState}
            searchable
            placeholder="Select state"
          />

          {/* New fields */}
          <Input
            label="Opening Balance"
            type="number"
            placeholder="0.00"
            value={formOpeningBalance}
            onChange={(e) => setFormOpeningBalance(e.target.value)}
            hint="Outstanding amount as of today"
          />
          <Input
            label="Credit Period (days)"
            type="number"
            placeholder="e.g., 30"
            value={formCreditPeriod}
            onChange={(e) => setFormCreditPeriod(e.target.value)}
          />

          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Person</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Person Name"
                placeholder="Name"
                value={formContactPerson}
                onChange={(e) => setFormContactPerson(e.target.value)}
              />
              <Input
                label="Contact Person Phone"
                placeholder="+91 XXXXX XXXXX"
                value={formContactPersonPhone}
                onChange={(e) => setFormContactPersonPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Bank Name"
                placeholder="e.g., HDFC Bank"
                value={formBankName}
                onChange={(e) => setFormBankName(e.target.value)}
              />
              <Input
                label="Account Number"
                placeholder="Account number"
                value={formBankAccount}
                onChange={(e) => setFormBankAccount(e.target.value)}
              />
              <Input
                label="IFSC Code"
                placeholder="e.g., HDFC0001234"
                value={formBankIfsc}
                onChange={(e) => setFormBankIfsc(e.target.value)}
              />
            </div>
          </div>
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

      {/* Bulk Add Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Add Contacts"
        description="Add multiple contacts at once. One per line: Name, Phone, Email, GSTIN"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Contact Type"
            options={[
              { value: "customer", label: "Customer" },
              { value: "vendor", label: "Vendor" },
            ]}
            value={bulkType}
            onChange={setBulkType}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contacts (one per line)
            </label>
            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Business Name, Phone, Email, GSTIN\nABC Corp, 9876543210, abc@corp.com, 27AABCA1234A1Z5\nXYZ Ltd, 9876543211, xyz@ltd.com`}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Format: Name, Phone, Email, GSTIN (only Name is required)
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowBulkModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkAdd}
            loading={bulkAdding}
            disabled={!bulkText.trim()}
          >
            Add {bulkText.split("\n").filter((l) => l.trim()).length} Contacts
          </Button>
        </div>
      </Modal>
    </div>
  );
}
