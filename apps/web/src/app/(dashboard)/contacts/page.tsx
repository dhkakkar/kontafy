"use client";

import React, { useState, useRef, useCallback } from "react";
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
import { createClient } from "@/lib/supabase/client";
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
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// GST state code to state abbreviation mapping
const GST_STATE_CODE_MAP: Record<string, string> = {
  "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
  "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
  "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
  "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
  "21": "OD", "22": "CT", "23": "MP", "24": "GJ", "25": "DN",
  "26": "DN", "27": "MH", "28": "AP", "29": "KA", "30": "GA",
  "31": "LA", "32": "KL", "33": "TN", "34": "PY", "35": "AN",
  "36": "TS", "37": "AP",
};

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

interface BankAccount {
  account_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  branch: string;
}

const emptyBankAccount = (): BankAccount => ({
  account_name: "",
  account_number: "",
  ifsc_code: "",
  bank_name: "",
  branch: "",
});

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

  // Billing Address
  const [formAddressLine1, setFormAddressLine1] = useState("");
  const [formAddressLine2, setFormAddressLine2] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formPincode, setFormPincode] = useState("");

  // Shipping Address
  const [formShippingAddressLine1, setFormShippingAddressLine1] = useState("");
  const [formShippingAddressLine2, setFormShippingAddressLine2] = useState("");
  const [formShippingCity, setFormShippingCity] = useState("");
  const [formShippingState, setFormShippingState] = useState("");
  const [formShippingPincode, setFormShippingPincode] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [formOpeningBalance, setFormOpeningBalance] = useState("");
  const [formBalanceType, setFormBalanceType] = useState("");
  const [formCreditPeriod, setFormCreditPeriod] = useState("");
  const [formCreditLimit, setFormCreditLimit] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formDateOfBirth, setFormDateOfBirth] = useState("");

  // Bank accounts (multiple)
  const [formBankAccounts, setFormBankAccounts] = useState<BankAccount[]>([emptyBankAccount()]);

  // GSTIN lookup state
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinError, setGstinError] = useState("");

  // Bulk add state
  const [bulkText, setBulkText] = useState("");
  const [bulkType, setBulkType] = useState("customer");
  const [bulkAdding, setBulkAdding] = useState(false);

  // Excel import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUploading, setImportUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleSameAsBillingChange = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) {
      setFormShippingAddressLine1(formAddressLine1);
      setFormShippingAddressLine2(formAddressLine2);
      setFormShippingCity(formCity);
      setFormShippingState(formState);
      setFormShippingPincode(formPincode);
    }
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    setFormBankAccounts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBankAccount = () => {
    setFormBankAccounts((prev) => [...prev, emptyBankAccount()]);
  };

  const removeBankAccount = (index: number) => {
    setFormBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGstinLookup = async () => {
    const gstin = formGstin.trim().toUpperCase();
    if (!gstin || gstin.length !== 15) {
      setGstinError("Please enter a valid 15-character GSTIN");
      return;
    }
    setGstinLoading(true);
    setGstinError("");
    try {
      const res = await fetch(`https://sheet.gstincheck.co.in/check/free/${gstin}`);
      const json = await res.json();
      if (!json.flag) {
        setGstinError(json.message || "Invalid GSTIN or lookup failed");
        return;
      }
      const data = json.data;
      const addr = data.pradr?.addr || {};
      const stateCode = addr.stcd ? GST_STATE_CODE_MAP[addr.stcd] || "" : "";
      const addressParts = [addr.flno, addr.bno, addr.st].filter(Boolean);
      if (data.lgnm) setFormName(data.lgnm);
      setFormPan(gstin.substring(2, 12));
      if (stateCode) setFormState(stateCode);
      if (addr.loc) setFormCity(addr.loc);
      if (addr.pncd) setFormPincode(addr.pncd);
      if (addressParts.length > 0) setFormAddressLine1(addressParts.join(", "));
    } catch (err) {
      setGstinError("Failed to fetch GSTIN details. Please try again.");
    } finally {
      setGstinLoading(false);
    }
  };

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
      // Filter out empty bank accounts
      const nonEmptyBankAccounts = formBankAccounts.filter(
        (ba) => ba.account_name || ba.account_number || ba.ifsc_code || ba.bank_name || ba.branch
      );

      return api.post("/bill/contacts", {
        name: formName,
        type: formType || "customer",
        email: formEmail || undefined,
        phone: formPhone || undefined,
        gstin: formGstin || undefined,
        pan: formPan || undefined,
        address_line1: formAddressLine1 || undefined,
        address_line2: formAddressLine2 || undefined,
        city: formCity || undefined,
        state: formState || undefined,
        pincode: formPincode || undefined,
        shipping_address_line1: formShippingAddressLine1 || undefined,
        shipping_address_line2: formShippingAddressLine2 || undefined,
        shipping_city: formShippingCity || undefined,
        shipping_state: formShippingState || undefined,
        shipping_pincode: formShippingPincode || undefined,
        opening_balance: formOpeningBalance ? Number(formOpeningBalance) : undefined,
        balance_type: formBalanceType || undefined,
        payment_terms: formCreditPeriod ? Number(formCreditPeriod) : undefined,
        credit_limit: formCreditLimit ? Number(formCreditLimit) : undefined,
        contact_person: formContactPerson || undefined,
        date_of_birth: formDateOfBirth || undefined,
        bank_accounts: nonEmptyBankAccounts.length > 0 ? nonEmptyBankAccounts : undefined,
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
    setFormAddressLine1("");
    setFormAddressLine2("");
    setFormCity("");
    setFormState("");
    setFormPincode("");
    setFormShippingAddressLine1("");
    setFormShippingAddressLine2("");
    setFormShippingCity("");
    setFormShippingState("");
    setFormShippingPincode("");
    setSameAsBilling(false);
    setFormOpeningBalance("");
    setFormBalanceType("");
    setFormCreditPeriod("");
    setFormCreditLimit("");
    setFormContactPerson("");
    setFormDateOfBirth("");
    setFormBankAccounts([emptyBankAccount()]);
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

  const handleDownloadTemplate = () => {
    const headers = "Name,Type,Email,Phone,GSTIN,PAN,Opening Balance,Balance Type,Address Line 1,City,State,Pincode";
    const sampleRow = "ABC Corporation,customer,abc@corp.com,9876543210,27AABCA1234A1Z5,AABCA1234A,5000,to_collect,123 Main Street,Mumbai,MH,400001";
    const csv = `${headers}\n${sampleRow}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (file: File | null) => {
    setImportFile(file);
    setImportResult(null);
  };

  const handleImportDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        handleImportFileChange(file);
      }
    }
  }, []);

  const handleImportUpload = async () => {
    if (!importFile) return;
    setImportUploading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      // Build auth headers manually — api.post forces JSON Content-Type
      const headers: Record<string, string> = {};
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
        }
      } catch {}
      try {
        const stored = localStorage.getItem("kontafy-auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          const orgId = parsed?.state?.organization?.id;
          if (orgId) headers["X-Org-Id"] = orgId;
        }
      } catch {}

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const response = await fetch(`${apiBase}/bill/contacts/import`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errBody.message || `HTTP ${response.status}`);
      }
      const res = await response.json();
      const count = res?.data?.count ?? 0;
      setImportResult({ success: true, message: `Successfully imported ${count} contact${count !== 1 ? "s" : ""}.` });
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err: any) {
      setImportResult({ success: false, message: err?.message || "Failed to import contacts. Please check your file and try again." });
    } finally {
      setImportUploading(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setImportUploading(false);
    setIsDragOver(false);
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
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() => { resetImportModal(); setShowImportModal(true); }}
          >
            Import Excel
          </Button>
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
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="GSTIN"
                  placeholder="15-character GSTIN"
                  value={formGstin}
                  onChange={(e) => { setFormGstin(e.target.value); setGstinError(""); }}
                  hint={gstinError || undefined}
                  error={gstinError || undefined}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGstinLookup}
                disabled={gstinLoading || !formGstin.trim()}
                icon={gstinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                className="mb-[2px]"
              >
                {gstinLoading ? "Fetching..." : "Get Details"}
              </Button>
            </div>
          </div>
          <Input label="PAN" placeholder="ABCDE1234F" value={formPan} onChange={(e) => setFormPan(e.target.value)} />

          {/* Billing Address */}
          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Billing Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Address Line 1" placeholder="Street address" value={formAddressLine1} onChange={(e) => setFormAddressLine1(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Input label="Address Line 2" placeholder="Apartment, suite, etc." value={formAddressLine2} onChange={(e) => setFormAddressLine2(e.target.value)} />
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
              <Input label="Pincode" placeholder="e.g., 110001" value={formPincode} onChange={(e) => setFormPincode(e.target.value)} />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Shipping Address</h4>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => handleSameAsBillingChange(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Same as Billing Address
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Address Line 1" placeholder="Street address" value={formShippingAddressLine1} onChange={(e) => setFormShippingAddressLine1(e.target.value)} disabled={sameAsBilling} />
              </div>
              <div className="md:col-span-2">
                <Input label="Address Line 2" placeholder="Apartment, suite, etc." value={formShippingAddressLine2} onChange={(e) => setFormShippingAddressLine2(e.target.value)} disabled={sameAsBilling} />
              </div>
              <Input label="City" placeholder="City" value={formShippingCity} onChange={(e) => setFormShippingCity(e.target.value)} disabled={sameAsBilling} />
              <Select
                label="State"
                options={INDIAN_STATES}
                value={formShippingState}
                onChange={setFormShippingState}
                searchable
                placeholder="Select state"
              />
              <Input label="Pincode" placeholder="e.g., 110001" value={formShippingPincode} onChange={(e) => setFormShippingPincode(e.target.value)} disabled={sameAsBilling} />
            </div>
          </div>

          {/* Opening Balance & Balance Type */}
          <Input
            label="Opening Balance"
            type="number"
            placeholder="0.00"
            value={formOpeningBalance}
            onChange={(e) => setFormOpeningBalance(e.target.value)}
            hint="Outstanding amount as of today"
          />
          <Select
            label="To Collect / To Pay"
            options={[
              { value: "to_collect", label: "To Collect" },
              { value: "to_pay", label: "To Pay" },
            ]}
            value={formBalanceType}
            onChange={setFormBalanceType}
            placeholder="Select balance type"
          />

          {/* Credit Period & Credit Limit */}
          <Input
            label="Credit Period (days)"
            type="number"
            placeholder="e.g., 30"
            value={formCreditPeriod}
            onChange={(e) => setFormCreditPeriod(e.target.value)}
          />
          <Input
            label="Credit Limit"
            type="number"
            placeholder="e.g., 100000"
            value={formCreditLimit}
            onChange={(e) => setFormCreditLimit(e.target.value)}
          />

          {/* Contact Person */}
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
                label="Date of Birth"
                type="date"
                value={formDateOfBirth}
                onChange={(e) => setFormDateOfBirth(e.target.value)}
              />
            </div>
          </div>

          {/* Bank Details (Multiple) */}
          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Bank Details</h4>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="h-3 w-3" />}
                onClick={addBankAccount}
              >
                Add Bank Account
              </Button>
            </div>
            {formBankAccounts.map((bank, index) => (
              <div key={index} className="relative border border-gray-200 rounded-lg p-4 mb-4">
                {formBankAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBankAccount(index)}
                    className="absolute top-2 right-2 h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <p className="text-xs font-medium text-gray-500 mb-3">Bank Account {index + 1}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Account Holder Name"
                    placeholder="Account holder name"
                    value={bank.account_name}
                    onChange={(e) => updateBankAccount(index, "account_name", e.target.value)}
                  />
                  <Input
                    label="Account Number"
                    placeholder="Account number"
                    value={bank.account_number}
                    onChange={(e) => updateBankAccount(index, "account_number", e.target.value)}
                  />
                  <Input
                    label="IFSC Code"
                    placeholder="e.g., HDFC0001234"
                    value={bank.ifsc_code}
                    onChange={(e) => updateBankAccount(index, "ifsc_code", e.target.value)}
                  />
                  <Input
                    label="Bank Name"
                    placeholder="e.g., HDFC Bank"
                    value={bank.bank_name}
                    onChange={(e) => updateBankAccount(index, "bank_name", e.target.value)}
                  />
                  <Input
                    label="Branch"
                    placeholder="Branch name"
                    value={bank.branch}
                    onChange={(e) => updateBankAccount(index, "branch", e.target.value)}
                  />
                </div>
              </div>
            ))}
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

      {/* Import from Excel Modal */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Contacts from Excel"
        description="Upload a CSV or Excel file to import contacts in bulk"
      >
        <div className="space-y-4">
          {/* Download Template */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Template (CSV)
          </button>

          {/* File Drop Zone */}
          <input
            ref={importFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              handleImportFileChange(file);
              e.target.value = "";
            }}
          />

          {!importFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleImportDrop}
              onClick={() => importFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary-400 bg-primary-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Drop file here or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports .xlsx, .xls, and .csv files
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{importFile.name}</p>
                  <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleImportFileChange(null)}
                className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Result Message */}
          {importResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              importResult.success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}>
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <p>{importResult.message}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowImportModal(false)}>
            {importResult?.success ? "Close" : "Cancel"}
          </Button>
          {!importResult?.success && (
            <Button
              onClick={handleImportUpload}
              loading={importUploading}
              disabled={!importFile}
              icon={<Upload className="h-4 w-4" />}
            >
              Upload
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
