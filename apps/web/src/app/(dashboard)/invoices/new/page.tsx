"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Save, Send, Upload, ScanLine, X } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LineItem {
  id: string;
  productId?: string;
  productName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  amount: number;
}

interface Contact {
  id: string;
  name: string;
  gstin?: string;
  type: string;
  // Customer-specific credit period. Falls back to the org default
  // when null (and ultimately to 30 days). The backend's Contact
  // model calls this `payment_terms` — the same field is reused for
  // both customer-side credit window and vendor-side payable terms.
  payment_terms?: number | null;
  billing_address?: Record<string, any>;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  hsn_code?: string;
  selling_price?: number;
  tax_rate?: number;
  unit?: string;
}

const taxOptions = [
  { value: "0", label: "No Tax (0%)" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

const INDIAN_STATES = [
  { value: "AN", label: "Andaman and Nicobar Islands" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CH", label: "Chandigarh" },
  { value: "CT", label: "Chhattisgarh" },
  { value: "DN", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JK", label: "Jammu and Kashmir" },
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
  { value: "PY", label: "Puducherry" },
  { value: "PB", label: "Punjab" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TG", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" },
  { value: "WB", label: "West Bengal" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function calcAmount(qty: number, rate: number, discount: number = 0): number {
  return qty * rate * (1 - discount / 100);
}

function calcTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}

// GSTIN's first 2 chars are the state code. Map them back to the
// abbreviation used by the INDIAN_STATES dropdown so the customer's
// state can be auto-resolved from their GSTIN. Kept in sync with the
// backend's apps/api/src/common/utils/gst.util.ts; if you add codes
// there, mirror them here.
const GSTIN_CODE_TO_STATE_ABBR: Record<string, string> = {
  "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
  "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
  "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
  "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
  "21": "OD", "22": "CT", "23": "MP", "24": "GJ", "25": "DN",
  "26": "DN", "27": "MH", "28": "AP", "29": "KA", "30": "GA",
  "31": "LA", "32": "KL", "33": "TN", "34": "PY", "35": "AN",
  "36": "TG", "37": "AP", "38": "LA",
};

function stateAbbrFromGstin(gstin?: string | null): string {
  if (!gstin) return "";
  const code = gstin.trim().slice(0, 2);
  return GSTIN_CODE_TO_STATE_ABBR[code] || "";
}

// Add `days` to a YYYY-MM-DD date string and return the result in the
// same format. Uses local-time Date arithmetic so a "+30 days" lands
// on the same calendar day everywhere — UTC math here would drift in
// IST and produce off-by-one due dates near month boundaries.
function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + (Number.isFinite(days) ? days : 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function NewInvoicePageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <NewInvoicePage />
    </Suspense>
  );
}

function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || null;
  const isEditing = !!editId;

  const [customer, setCustomer] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  // Once the user has touched POS (either manually picked a value or
  // we hydrated one from an existing invoice on edit), we stop
  // auto-overwriting on customer change. Declared up here because the
  // prefill useEffect below references setPosTouched.
  const [posTouched, setPosTouched] = useState(false);

  // Same idea for Due Date — once the user picks a date manually (or
  // we loaded one from an existing invoice on edit), stop auto-
  // recomputing from invoice_date + credit_days.
  const [dueDateTouched, setDueDateTouched] = useState(false);
  // Org's default payment terms, fed from /settings/invoice-config.
  // Acts as the fallback when the customer has no `payment_terms` of
  // its own — system fallback is 30 days. Source attribution is kept
  // so the hint can say where the value came from.
  const [defaultPaymentDays, setDefaultPaymentDays] = useState<number | null>(
    null,
  );
  const [creditDaysSource, setCreditDaysSource] = useState<
    "customer" | "config" | "fallback" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState("Shipping");
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");

  // Auto-fill terms, notes, and default-payment-terms from invoice
  // settings. Notes / terms only run on NEW invoices (we'd clobber
  // saved values on edit). Default payment days, however, we
  // *always* fetch — it feeds the due-date fallback hint even in
  // edit mode.
  useEffect(() => {
    api
      .get<{ data: Record<string, unknown> }>("/settings/invoice-config")
      .then((res) => {
        const d = res.data;
        if (!d) return;
        if (!isEditing) {
          if (d.default_terms_conditions) {
            setTerms(String(d.default_terms_conditions));
          }
          if (d.default_notes) {
            setNotes(String(d.default_notes));
          }
        }
        const n =
          typeof d.default_payment_terms === "number"
            ? d.default_payment_terms
            : Number(d.default_payment_terms);
        if (Number.isFinite(n) && n > 0) {
          setDefaultPaymentDays(n);
        }
      })
      .catch(() => {});
  }, [isEditing]);

  // Fetch the existing invoice when editing, then prefill every field.
  const { data: existingInvoice } = useQuery<any>({
    queryKey: ["invoice", editId],
    queryFn: async () => {
      const res = await api.get<{ data: any } | any>(
        `/bill/invoices/${editId}`,
      );
      return (res as any)?.data ?? res;
    },
    enabled: isEditing,
  });

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!isEditing || !existingInvoice || prefilled) return;
    const inv = existingInvoice;
    setCustomer(inv.contact_id || "");
    if (inv.date) setInvoiceDate(String(inv.date).slice(0, 10));
    if (inv.due_date) {
      setDueDate(String(inv.due_date).slice(0, 10));
      // Preserve the saved due date — don't let the auto-recompute
      // effect overwrite it on subsequent customer / date changes.
      setDueDateTouched(true);
    }
    if (inv.place_of_supply) {
      setPlaceOfSupply(inv.place_of_supply);
      // Treat any saved POS as user-confirmed so swapping customers
      // mid-edit doesn't silently overwrite the value GSTR-1 was
      // computed against.
      setPosTouched(true);
    }
    if (typeof inv.notes === "string") setNotes(inv.notes);
    if (typeof inv.terms === "string") setTerms(inv.terms);
    if (inv.discount_amount) setAdditionalDiscount(Number(inv.discount_amount));
    if (typeof inv.signature_url === "string" && inv.signature_url) {
      setSignaturePreview(inv.signature_url);
    }

    if (Array.isArray(inv.items) && inv.items.length > 0) {
      setItems(
        inv.items.map((it: any) => {
          const cgst = Number(it.cgst_rate) || 0;
          const sgst = Number(it.sgst_rate) || 0;
          const igst = Number(it.igst_rate) || 0;
          const taxRate = igst > 0 ? igst : cgst + sgst;
          const qty = Number(it.quantity) || 0;
          const rate = Number(it.rate) || 0;
          const discount = Number(it.discount_pct) || 0;
          return {
            id: it.id || generateId(),
            productId: it.product_id || undefined,
            productName: it.description || "",
            description: it.description || "",
            hsnCode: it.hsn_code || "",
            quantity: qty,
            rate,
            discount,
            taxRate,
            amount: calcAmount(qty, rate, discount),
          };
        }),
      );
    }
    setPrefilled(true);
  }, [isEditing, existingInvoice, prefilled]);

  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(),
      productName: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      taxRate: 18,
      amount: 0,
    },
  ]);

  // Fetch contacts (customers) from API. We pull GSTIN and
  // billing_address so the place-of-supply can auto-resolve when a
  // customer is picked. GSTIN takes precedence; for B2C / unregistered
  // we fall back to billing_address.state.
  const { data: contacts = [] } = useQuery<
    Array<Contact & { billing_address?: Record<string, any> }>
  >({
    queryKey: ["contacts", "customer-for-invoice"],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<Contact & { billing_address?: Record<string, any> }>;
      }>("/bill/contacts", {
        type: "customer",
        limit: "100",
      });
      return res.data;
    },
  });

  // Supplier (org) state — derived from the org's GSTIN so a single
  // source of truth feeds the inter-state check. Falls back to the
  // legacy hardcoded "MH" only if no GSTIN is registered, which the
  // org-profile setup wizard makes mandatory anyway.
  const { data: orgMeta } = useQuery<{
    gstin?: string | null;
    address?: Record<string, any>;
  }>({
    queryKey: ["settings", "organization-meta"],
    queryFn: async () => {
      const res = await api.get<{ data: any }>("/settings/organization");
      return (res as any)?.data || (res as any);
    },
    staleTime: 5 * 60 * 1000,
  });
  const supplierState =
    stateAbbrFromGstin(orgMeta?.gstin) ||
    (orgMeta?.address?.state as string | undefined) ||
    "";

  // Fetch products from API
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] }>("/stock/products", {
        limit: "200",
      });
      return res.data;
    },
  });

  const customerOptions = contacts.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.gstin ? `GSTIN: ${c.gstin}` : undefined,
  }));

  // Resolve credit days for a customer with the documented fallback
  // chain: contact's own payment_terms → invoice-config default →
  // 30. Returned alongside the source so the UI can attribute the
  // hint ("from customer terms" / "org default" / "system default").
  const resolveCreditDays = (
    picked?: Pick<Contact, "payment_terms"> | null,
  ): { days: number; source: "customer" | "config" | "fallback" } => {
    const cust =
      picked && typeof picked.payment_terms === "number"
        ? picked.payment_terms
        : null;
    if (cust != null && cust > 0) return { days: cust, source: "customer" };
    if (defaultPaymentDays && defaultPaymentDays > 0)
      return { days: defaultPaymentDays, source: "config" };
    return { days: 30, source: "fallback" };
  };

  const handleCustomerChange = (contactId: string) => {
    setCustomer(contactId);
    const picked = contacts.find((c) => c.id === contactId);
    if (!picked) return;

    // Place of Supply — GSTIN-derived state preferred; B2C / no-GSTIN
    // falls back to billing_address.state. Skipped if user has
    // already overridden POS so we don't clobber an audit-relevant
    // choice.
    if (!posTouched) {
      const derived =
        stateAbbrFromGstin(picked.gstin) ||
        (picked.billing_address?.state as string | undefined) ||
        "";
      if (derived) setPlaceOfSupply(derived);
    }

    // Due Date — invoiceDate + customer credit days. Attribution is
    // recorded so the hint text can explain *why* it picked this
    // number (helps the user trust the auto-fill before clicking
    // Send Invoice).
    const { days, source } = resolveCreditDays(picked);
    setCreditDaysSource(source);
    if (!dueDateTouched && invoiceDate) {
      setDueDate(addDaysToDate(invoiceDate, days));
    }
  };

  // Recompute due date when the invoice date moves and the user
  // hasn't manually overridden it. We need the most up-to-date
  // customer here, hence the lookup off `contacts`.
  useEffect(() => {
    if (dueDateTouched) return;
    if (!invoiceDate) return;
    const picked = contacts.find((c) => c.id === customer);
    const { days, source } = resolveCreditDays(picked);
    setCreditDaysSource(picked ? source : source);
    setDueDate(addDaysToDate(invoiceDate, days));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceDate, customer, defaultPaymentDays]);

  // Inter-state when the place of supply is in a different state than
  // the supplier. Empty POS or empty supplier defaults to intra-state
  // (CGST+SGST) — the safer default that matches the historical
  // behaviour for users who haven't picked a customer yet.
  const isInterState =
    !!placeOfSupply && !!supplierState && placeOfSupply !== supplierState;

  // Create-or-update invoice mutation.
  const createInvoice = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      const halfRate = (rate: number) => rate / 2;
      // Tell the backend explicitly whether this invoice is
      // inter-state. The backend also runs its own GSTIN-vs-POS
      // check, but passing is_igst lets us be authoritative from the
      // UI (which the user can override via the POS dropdown).
      const payload: Record<string, unknown> = {
        type: "sale",
        contact_id: customer,
        date: invoiceDate,
        due_date: dueDate || undefined,
        place_of_supply: placeOfSupply || undefined,
        is_igst: isInterState,
        notes: notes || undefined,
        terms: terms || undefined,
        signature_url: signaturePreview || null,
        items: items
          .filter((item) => item.productName || item.description || item.productId)
          .map((item) => ({
            product_id: item.productId || undefined,
            description: item.productName || item.description || "Item",
            hsn_code: item.hsnCode || undefined,
            quantity: item.quantity,
            rate: item.rate,
            discount_pct: item.discount || undefined,
            // Inter-state: full rate goes on IGST, zero CGST/SGST.
            // Intra-state: standard half-and-half split. Both forms
            // sum to the same line tax — the backend re-validates.
            cgst_rate: isInterState ? 0 : halfRate(item.taxRate),
            sgst_rate: isInterState ? 0 : halfRate(item.taxRate),
            igst_rate: isInterState ? item.taxRate : 0,
          })),
      };

      let invoiceId: string | undefined;

      if (isEditing && editId) {
        // Update an existing draft invoice. Type can't change on update;
        // backend treats it as immutable, so drop from payload.
        const { type: _type, ...updatePayload } = payload;
        void _type;
        const res = await api.patch<{ data: { id: string } } | { id: string }>(
          `/bill/invoices/${editId}`,
          updatePayload,
        );
        invoiceId =
          (res as any)?.data?.id || (res as any)?.id || editId;
      } else {
        const res = await api.post<{ data: { id: string } } | { id: string }>(
          "/bill/invoices",
          payload,
        );
        invoiceId = (res as any)?.data?.id || (res as any)?.id;
      }

      if (status === "sent" && invoiceId) {
        await api.patch(`/bill/invoices/${invoiceId}/status`, {
          status: "sent",
        });
      }
      return { id: invoiceId };
    },
    onSuccess: async (result) => {
      // Bust the invoice list cache so the new row shows immediately,
      // plus the single-invoice cache for edits so the detail page
      // reflects the saved changes. Sending an invoice also touches
      // dashboard counters and contact outstanding — invalidate those
      // generously so the home dashboard and the contact's ledger
      // don't lag behind.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["invoice", result?.id] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["contacts"] }),
      ]);
      if (isEditing && result?.id) {
        router.push(`/invoices/${result.id}`);
      } else {
        router.push("/invoices");
      }
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        productName: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        taxRate: 18,
        amount: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.amount = calcAmount(updated.quantity, updated.rate, updated.discount);
        return updated;
      })
    );
  };

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const rate = product.selling_price || 0;
        return {
          ...item,
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsn_code || "",
          rate,
          taxRate: product.tax_rate || 18,
          amount: calcAmount(item.quantity, rate, item.discount),
        };
      })
    );
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBarcodeScan = () => {
    if (!barcodeValue.trim()) return;
    const product = products.find(
      (p) => p.sku === barcodeValue.trim() || p.name.toLowerCase().includes(barcodeValue.trim().toLowerCase())
    );
    if (product) {
      const newId = generateId();
      const rate = product.selling_price || 0;
      setItems([...items, {
        id: newId, productId: product.id, productName: product.name,
        description: "", hsnCode: product.hsn_code || "",
        quantity: 1, rate, discount: 0, taxRate: product.tax_rate || 18,
        amount: calcAmount(1, rate, 0),
      }]);
    }
    setBarcodeValue("");
    setShowBarcodeInput(false);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + item.quantity * item.rate * (item.discount / 100),
    0
  );

  const taxBreakdown: Record<number, { rate: number; taxable: number; tax: number }> = {};
  items.forEach((item) => {
    if (!taxBreakdown[item.taxRate]) {
      taxBreakdown[item.taxRate] = { rate: item.taxRate, taxable: 0, tax: 0 };
    }
    taxBreakdown[item.taxRate].taxable += item.amount;
    taxBreakdown[item.taxRate].tax += calcTax(item.amount, item.taxRate);
  });

  const totalTax = Object.values(taxBreakdown).reduce(
    (sum, t) => sum + t.tax,
    0
  );
  const grandTotal = subtotal + totalTax - additionalDiscount + additionalCharges;

  // Block save when the due date is set but predates the invoice
  // date — that would let through a GSTR-1 row with a negative
  // payment window, which the GST portal rejects.
  const dueDateInvalid =
    !!dueDate && !!invoiceDate && dueDate < invoiceDate;
  const canSubmit =
    customer && items.some((i) => i.amount > 0) && !dueDateInvalid;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update this sales invoice"
                : "Create a new sales invoice"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={() => createInvoice.mutate("draft")}
            loading={createInvoice.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save Changes" : "Save Draft"}
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            onClick={() => createInvoice.mutate("sent")}
            loading={createInvoice.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save & Send" : "Send Invoice"}
          </Button>
        </div>
      </div>

      {createInvoice.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createInvoice.error?.message ||
            (isEditing
              ? "Failed to update invoice"
              : "Failed to create invoice")}
        </div>
      )}

      {/* Customer & Dates */}
      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Customer"
            options={customerOptions}
            value={customer}
            onChange={handleCustomerChange}
            searchable
            placeholder="Select a customer"
          />
          <div>
            <Select
              label="Place of Supply"
              options={INDIAN_STATES}
              value={placeOfSupply}
              onChange={(v) => {
                setPlaceOfSupply(v);
                setPosTouched(true);
              }}
              searchable
              placeholder="Select state"
            />
            {placeOfSupply && supplierState && (
              <p
                className={`mt-1 text-xs font-medium ${
                  isInterState ? "text-primary-700" : "text-success-700"
                }`}
              >
                {isInterState
                  ? `Inter-State — IGST applies (supplier: ${supplierState})`
                  : `Intra-State — CGST + SGST applies (supplier: ${supplierState})`}
              </p>
            )}
            {!supplierState && (
              <p className="mt-1 text-xs text-warning-700">
                Set the org GSTIN in Settings → Tax to enable correct IGST/CGST detection.
              </p>
            )}
          </div>
          <Input
            label="Invoice Date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
          <div>
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              min={invoiceDate || undefined}
              onChange={(e) => {
                setDueDate(e.target.value);
                setDueDateTouched(true);
              }}
              error={
                dueDate && invoiceDate && dueDate < invoiceDate
                  ? "Due date can't be before the invoice date"
                  : undefined
              }
              hint={
                dueDate && invoiceDate && dueDate >= invoiceDate && !dueDateTouched
                  ? `Auto: Net ${Math.round(
                      (new Date(dueDate).getTime() -
                        new Date(invoiceDate).getTime()) /
                        86_400_000,
                    )}${
                      creditDaysSource === "customer"
                        ? " (from customer terms)"
                        : creditDaysSource === "config"
                          ? " (from invoice config default)"
                          : " (system default)"
                    }`
                  : undefined
              }
            />
            {dueDateTouched && (
              <button
                type="button"
                onClick={() => setDueDateTouched(false)}
                className="mt-1 text-xs text-primary-700 hover:underline"
              >
                Reset to auto
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <CardHeader className="!mb-0">
            <CardTitle>Line Items</CardTitle>
            <div className="flex items-center gap-2">
              {showBarcodeInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
                    placeholder="Enter SKU / barcode..."
                    className="h-9 w-48 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleBarcodeScan}>Go</Button>
                  <button onClick={() => setShowBarcodeInput(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ScanLine className="h-4 w-4" />}
                  onClick={() => setShowBarcodeInput(true)}
                >
                  Scan Barcode
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={addItem}
              >
                Add Item
              </Button>
            </div>
          </CardHeader>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Item
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                  HSN/SAC
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                  Qty
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                  Rate
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                  Disc %
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                  Tax
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                  Amount
                </th>
                <th className="w-[50px]" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 px-4">
                    {products.length > 0 ? (
                      <Select
                        options={products.map((p) => ({
                          value: p.id,
                          label: p.name,
                          description: p.sku || undefined,
                        }))}
                        value={item.productId || ""}
                        onChange={(val) => selectProduct(item.id, val)}
                        searchable
                        placeholder="Select product"
                      />
                    ) : (
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) =>
                          updateItem(item.id, "productName", e.target.value)
                        }
                        placeholder="Product or service name"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) =>
                        updateItem(item.id, "hsnCode", e.target.value)
                      }
                      placeholder="Code"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.rate || ""}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "rate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.discount || ""}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "discount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      min="0"
                      max="100"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Select
                      options={taxOptions}
                      value={String(item.taxRate)}
                      onChange={(val) =>
                        updateItem(item.id, "taxRate", parseInt(val))
                      }
                    />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms, validity, etc."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {/* Signature Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature</label>
              {signaturePreview ? (
                <div className="relative inline-block">
                  <img src={signaturePreview} alt="Signature" className="h-16 border border-gray-200 rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setSignaturePreview(null)}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-danger-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Upload signature image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                </label>
              )}
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(subtotal + totalDiscount)}
              </span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Item Discount</span>
                <span className="text-danger-600">
                  - {formatCurrency(totalDiscount)}
                </span>
              </div>
            )}

            {Object.values(taxBreakdown).map(
              (tax) =>
                tax.rate > 0 && (
                  <div
                    key={tax.rate}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-500">
                      {isInterState
                        ? `IGST @${tax.rate}%`
                        : `CGST @${tax.rate / 2}% + SGST @${tax.rate / 2}%`}
                    </span>
                    <span className="text-gray-700">
                      {formatCurrency(tax.tax)}
                    </span>
                  </div>
                )
            )}

            {/* Additional Discount */}
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-500 whitespace-nowrap">Discount</span>
              <input
                type="number"
                value={additionalDiscount || ""}
                onChange={(e) => setAdditionalDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-28 h-8 rounded-md border border-gray-300 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Additional Charges */}
            <div className="flex items-center justify-between text-sm gap-4">
              <input
                type="text"
                value={additionalChargesLabel}
                onChange={(e) => setAdditionalChargesLabel(e.target.value)}
                className="w-28 h-8 rounded-md border border-gray-200 px-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                value={additionalCharges || ""}
                onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-28 h-8 rounded-md border border-gray-300 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">
                Total
              </span>
              <span className="text-xl font-bold text-primary-800">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
