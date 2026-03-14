"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  MapPin,
  MoreHorizontal,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  type: "customer" | "vendor" | "both";
  email: string;
  phone: string;
  gstin?: string;
  city: string;
  outstandingReceivable: number;
  outstandingPayable: number;
}

const contacts: Contact[] = [
  {
    id: "1",
    name: "TechStar Solutions",
    type: "customer",
    email: "accounts@techstar.in",
    phone: "+91 98765 43210",
    gstin: "27AABCT1234A1Z5",
    city: "Mumbai",
    outstandingReceivable: 125000,
    outstandingPayable: 0,
  },
  {
    id: "2",
    name: "GreenLeaf Exports",
    type: "customer",
    email: "finance@greenleaf.co.in",
    phone: "+91 87654 32109",
    gstin: "07AABCG5678B1Z3",
    city: "Delhi",
    outstandingReceivable: 87500,
    outstandingPayable: 0,
  },
  {
    id: "3",
    name: "Skyline Properties",
    type: "vendor",
    email: "rent@skylineprop.com",
    phone: "+91 76543 21098",
    gstin: "27AABCS9012C1Z1",
    city: "Mumbai",
    outstandingReceivable: 0,
    outstandingPayable: 45000,
  },
  {
    id: "4",
    name: "Apex Manufacturing",
    type: "customer",
    email: "billing@apexmfg.in",
    phone: "+91 65432 10987",
    gstin: "24AABCA3456D1Z9",
    city: "Ahmedabad",
    outstandingReceivable: 75000,
    outstandingPayable: 0,
  },
  {
    id: "5",
    name: "Prism Digital",
    type: "both",
    email: "hello@prismdigital.in",
    phone: "+91 54321 09876",
    city: "Bangalore",
    outstandingReceivable: 56000,
    outstandingPayable: 22000,
  },
  {
    id: "6",
    name: "NovaTech Infra",
    type: "customer",
    email: "accounts@novatech.co",
    phone: "+91 43210 98765",
    gstin: "29AABCN7890E1Z7",
    city: "Bangalore",
    outstandingReceivable: 142000,
    outstandingPayable: 0,
  },
];

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const tabs = [
    { value: "all", label: "All Contacts", count: contacts.length },
    {
      value: "customer",
      label: "Customers",
      count: contacts.filter(
        (c) => c.type === "customer" || c.type === "both"
      ).length,
    },
    {
      value: "vendor",
      label: "Vendors",
      count: contacts.filter(
        (c) => c.type === "vendor" || c.type === "both"
      ).length,
    },
  ];

  const filtered = contacts.filter((c) => {
    if (activeTab === "customer" && c.type !== "customer" && c.type !== "both")
      return false;
    if (activeTab === "vendor" && c.type !== "vendor" && c.type !== "both")
      return false;
    if (
      searchQuery &&
      !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

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

        <div className="divide-y divide-gray-100">
          {filtered.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="block p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="h-11 w-11 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary-800">
                  {contact.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>

              {/* Info */}
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
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {contact.city}
                  </span>
                  {contact.gstin && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {contact.gstin}
                    </span>
                  )}
                </div>
              </div>

              {/* Balances */}
              <div className="text-right shrink-0 hidden md:block">
                {contact.outstandingReceivable > 0 && (
                  <p className="text-sm">
                    <span className="text-gray-500">Receivable: </span>
                    <span className="font-medium text-success-700">
                      {formatCurrency(contact.outstandingReceivable)}
                    </span>
                  </p>
                )}
                {contact.outstandingPayable > 0 && (
                  <p className="text-sm">
                    <span className="text-gray-500">Payable: </span>
                    <span className="font-medium text-warning-700">
                      {formatCurrency(contact.outstandingPayable)}
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

        {filtered.length === 0 && (
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
          <Input label="Contact Name" placeholder="Business or person name" />
          <Select
            label="Contact Type"
            options={[
              { value: "customer", label: "Customer" },
              { value: "vendor", label: "Vendor" },
              { value: "both", label: "Both" },
            ]}
            value=""
            onChange={() => {}}
            placeholder="Select type"
          />
          <Input label="Email" type="email" placeholder="email@company.com" />
          <Input label="Phone" placeholder="+91 XXXXX XXXXX" />
          <Input label="GSTIN (Optional)" placeholder="15-character GSTIN" />
          <Input label="PAN" placeholder="ABCDE1234F" />
          <div className="md:col-span-2">
            <Input label="Address" placeholder="Full address" />
          </div>
          <Input label="City" placeholder="City" />
          <Select
            label="State"
            options={[
              { value: "MH", label: "Maharashtra" },
              { value: "DL", label: "Delhi" },
              { value: "KA", label: "Karnataka" },
              { value: "GJ", label: "Gujarat" },
              { value: "TN", label: "Tamil Nadu" },
            ]}
            value=""
            onChange={() => {}}
            searchable
            placeholder="Select state"
          />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button>Save Contact</Button>
        </div>
      </Modal>
    </div>
  );
}
