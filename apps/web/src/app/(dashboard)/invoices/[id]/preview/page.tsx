"use client";

import React, { Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download, Printer } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  rate: number;
  discount_pct: number;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_rate: number;
  cess_amount: number;
  total: number;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  date: string;
  due_date: string | null;
  place_of_supply: string | null;
  is_igst: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  signature_url: string | null;
  items: InvoiceItem[];
  contact: {
    name: string;
    company_name: string | null;
    gstin: string | null;
    billing_address: Address;
    phone: string | null;
    email: string | null;
  } | null;
  organization: {
    name: string;
    legal_name: string | null;
    gstin: string | null;
    pan: string | null;
    address: Address;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
  };
}

// ─── Helpers ───────────────────────────────────────────────────

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

function fmtAddr(addr: Address | undefined | null): string {
  if (!addr) return "";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");
}

function fmtIndian(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function getInvoiceTitle(type: string): string {
  switch (type) {
    case "sale":
      return "Tax Invoice";
    case "purchase":
      return "Purchase Bill";
    case "credit_note":
      return "Credit Note";
    case "debit_note":
      return "Debit Note";
    default:
      return "Invoice";
  }
}

// Resolve a GSTIN state code (e.g. "27") OR a state abbreviation (e.g.
// "MH") to a full state name. Returns the input if unrecognized.
const STATE_NAME_BY_CODE: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
  "37": "Andhra Pradesh (New)", "38": "Ladakh",
};
const STATE_NAME_BY_ABBR: Record<string, string> = {
  JK: "Jammu & Kashmir", HP: "Himachal Pradesh", PB: "Punjab",
  CH: "Chandigarh", UK: "Uttarakhand", HR: "Haryana",
  DL: "Delhi", RJ: "Rajasthan", UP: "Uttar Pradesh",
  BR: "Bihar", SK: "Sikkim", AR: "Arunachal Pradesh",
  NL: "Nagaland", MN: "Manipur", MZ: "Mizoram",
  TR: "Tripura", ML: "Meghalaya", AS: "Assam",
  WB: "West Bengal", JH: "Jharkhand", OD: "Odisha",
  CT: "Chhattisgarh", MP: "Madhya Pradesh", GJ: "Gujarat",
  DN: "Dadra & Nagar Haveli and Daman & Diu", MH: "Maharashtra",
  AP: "Andhra Pradesh", KA: "Karnataka", GA: "Goa",
  LD: "Lakshadweep", KL: "Kerala", TN: "Tamil Nadu",
  PY: "Puducherry", AN: "Andaman & Nicobar", TG: "Telangana",
  LA: "Ladakh",
};
function resolveStateName(code: string | null | undefined): string {
  if (!code) return "";
  const key = code.toUpperCase();
  return STATE_NAME_BY_CODE[key] || STATE_NAME_BY_ABBR[key] || code;
}

// ─── Component ─────────────────────────────────────────────────

export default function InvoicePreviewPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <InvoicePreviewPage />
    </Suspense>
  );
}

function InvoicePreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;
  const autoPrint = searchParams.get("print") === "1";

  const { data: invoice, isLoading } = useQuery<InvoiceData>({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      // Response is wrapped by the backend interceptor as { success, data, meta }.
      const res = await api.get<{ data: InvoiceData } | InvoiceData>(
        `/bill/invoices/${invoiceId}`,
      );
      return ((res as { data?: InvoiceData })?.data ?? res) as InvoiceData;
    },
  });

  useEffect(() => {
    if (autoPrint && invoice) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, invoice]);

  const downloadPdf = async () => {
    try {
      const result = await api.get<{
        data?: { url?: string };
        url?: string;
      }>(`/bill/invoices/${invoiceId}/pdf`);
      const url = result?.data?.url || result?.url;
      if (url) {
        window.open(url, "_blank");
        return;
      }
    } catch {
      // fall through to direct download endpoint
    }
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/bill/invoices/${invoiceId}/pdf/download`,
      "_blank",
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center print:bg-white">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center print:bg-white">
        <p className="text-gray-500">Invoice not found.</p>
      </div>
    );
  }

  const title = getInvoiceTitle(invoice.type);
  const org = invoice.organization;
  const contact = invoice.contact;
  const items = invoice.items || [];
  const hasCess = items.some((i) => toNum(i.cess_amount) > 0);

  // Tax totals
  const totalCgst = items.reduce((s, i) => s + toNum(i.cgst_amount), 0);
  const totalSgst = items.reduce((s, i) => s + toNum(i.sgst_amount), 0);
  const totalIgst = items.reduce((s, i) => s + toNum(i.igst_amount), 0);
  const totalCess = items.reduce((s, i) => s + toNum(i.cess_amount), 0);

  return (
    <>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          /* Hide the surrounding dashboard chrome */
          aside,
          header,
          nav[aria-label="Breadcrumb"] { display: none !important; }
          /* Reset the main content shell so the invoice page is the only
             thing on the printed page */
          main {
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }
          main > div {
            padding: 0 !important;
          }
          /* The on-screen invoice uses min-height:297mm so it looks like a
             full A4 page in the browser preview. In print, that min-height
             combined with the @page margins pushes one pixel past the page
             boundary and produces a blank second page. Drop the min-height
             and force no page-break inside the invoice card so it fits on
             a single printed page. */
          .print-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            max-width: none !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Nothing after the invoice card should trigger an extra page. */
          .print-page + * { display: none !important; }
        }
      ` }} />

      {/* Action Bar */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/invoices/${invoiceId}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Invoice
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={downloadPdf}
          >
            Download PDF
          </Button>
          <Button
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="flex justify-center no-print-bg">
        <div
          className="print-page bg-white shadow-xl rounded-lg max-w-[210mm] w-full"
          style={{ padding: "40px 36px", minHeight: "297mm" }}
        >
          {/* ─── Header ─────────────────────────────────────── */}
          <div
            className="flex justify-between items-start pb-4 mb-5"
            style={{ borderBottom: "3px solid #0F2D5E" }}
          >
            <div className="flex items-start gap-4">
              {org?.logo_url && (
                <img
                  src={org.logo_url}
                  alt="Logo"
                  className="w-14 h-14 object-contain rounded-md"
                />
              )}
              <div>
                <h1
                  className="text-xl font-bold"
                  style={{ color: "#0F2D5E" }}
                >
                  {org?.name}
                </h1>
                {org?.legal_name && org.legal_name !== org.name && (
                  <p className="text-xs text-gray-500">{org.legal_name}</p>
                )}
                <div className="text-[10px] text-gray-700 mt-1 leading-relaxed">
                  {org?.gstin && (
                    <p className="font-semibold" style={{ color: "#0F2D5E" }}>
                      GSTIN: {org.gstin}
                    </p>
                  )}
                  {org?.pan && <p>PAN: {org.pan}</p>}
                  <p>{fmtAddr(org?.address)}</p>
                  {org?.phone && <p>Ph: {org.phone}</p>}
                  {org?.email && <p>{org.email}</p>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2
                className="text-2xl font-bold uppercase tracking-wider"
                style={{ color: "#0F2D5E" }}
              >
                {title}
              </h2>
              <p
                className="text-sm font-semibold mt-1"
                style={{ color: "#0A8A54" }}
              >
                {invoice.invoice_number}
              </p>
            </div>
          </div>

          {/* ─── Meta Row ───────────────────────────────────── */}
          <div
            className="flex gap-5 rounded-md p-3 mb-5"
            style={{
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
            }}
          >
            <MetaItem label="Invoice Date" value={formatDate(invoice.date)} />
            {invoice.due_date && (
              <MetaItem label="Due Date" value={formatDate(invoice.due_date)} />
            )}
            {invoice.place_of_supply && (
              <MetaItem
                label="Place of Supply"
                value={(() => {
                  const sellerCode = org?.gstin ? org.gstin.slice(0, 2) : "";
                  const sellerName = resolveStateName(sellerCode);
                  const buyerName = resolveStateName(invoice.place_of_supply);
                  if (sellerName && sellerName !== buyerName) {
                    return `${sellerName} → ${buyerName}`;
                  }
                  return buyerName || invoice.place_of_supply;
                })()}
              />
            )}
            <MetaItem
              label="Supply Type"
              value={
                invoice.is_igst
                  ? "Inter-State (IGST)"
                  : "Intra-State (CGST+SGST)"
              }
            />
          </div>

          {/* ─── Bill To ────────────────────────────────────── */}
          <div className="flex gap-8 mb-5">
            <div className="flex-1">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1 pb-1 border-b border-gray-200">
                Bill To
              </h4>
              {contact ? (
                <div className="text-[11px] leading-relaxed text-gray-700">
                  <p className="font-semibold text-xs text-gray-900">
                    {contact.company_name || contact.name}
                  </p>
                  {contact.company_name &&
                    contact.name !== contact.company_name && (
                      <p>{contact.name}</p>
                    )}
                  {contact.gstin && (
                    <p className="font-semibold" style={{ color: "#0F2D5E" }}>
                      GSTIN: {contact.gstin}
                    </p>
                  )}
                  <p>{fmtAddr(contact.billing_address)}</p>
                  {contact.phone && <p>Ph: {contact.phone}</p>}
                  {contact.email && <p>{contact.email}</p>}
                </div>
              ) : (
                <p className="text-xs text-gray-400">-</p>
              )}
            </div>
          </div>

          {/* ─── Items Table ────────────────────────────────── */}
          <table className="w-full mb-5 text-[10px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Description", "HSN/SAC", "Qty", "Unit", "Rate", "Disc%", "Taxable"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-2 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white whitespace-nowrap ${
                        i >= 3 ? "text-right" : i === 0 || i === 2 || i === 4 ? "text-center" : "text-left"
                      }`}
                      style={{
                        background: "#0F2D5E",
                        borderRadius:
                          i === 0
                            ? "4px 0 0 0"
                            : undefined,
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
                {invoice.is_igst ? (
                  <th
                    className="py-2 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white text-right"
                    style={{ background: "#0F2D5E" }}
                  >
                    IGST
                  </th>
                ) : (
                  <>
                    <th
                      className="py-2 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white text-right"
                      style={{ background: "#0F2D5E" }}
                    >
                      CGST
                    </th>
                    <th
                      className="py-2 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white text-right"
                      style={{ background: "#0F2D5E" }}
                    >
                      SGST
                    </th>
                  </>
                )}
                {hasCess && (
                  <th
                    className="py-2 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white text-right"
                    style={{ background: "#0F2D5E" }}
                  >
                    Cess
                  </th>
                )}
                <th
                  className="py-2 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-white text-right"
                  style={{
                    background: "#0F2D5E",
                    borderRadius: "0 4px 0 0",
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className={idx % 2 === 1 ? "bg-gray-50" : ""}
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                >
                  <td className="py-1.5 px-1.5 text-center">{idx + 1}</td>
                  <td className="py-1.5 px-1.5">{item.description}</td>
                  <td className="py-1.5 px-1.5 text-center">
                    {item.hsn_code || "-"}
                  </td>
                  <td className="py-1.5 px-1.5 text-right">
                    {toNum(item.quantity)}
                  </td>
                  <td className="py-1.5 px-1.5 text-center">{item.unit}</td>
                  <td className="py-1.5 px-1.5 text-right">
                    {fmtIndian(toNum(item.rate))}
                  </td>
                  <td className="py-1.5 px-1.5 text-right">
                    {toNum(item.discount_pct) > 0
                      ? `${toNum(item.discount_pct)}%`
                      : "-"}
                  </td>
                  <td className="py-1.5 px-1.5 text-right">
                    {fmtIndian(toNum(item.taxable_amount))}
                  </td>
                  {invoice.is_igst ? (
                    <td className="py-1.5 px-1.5 text-right">
                      {fmtIndian(toNum(item.igst_amount))}
                      <br />
                      <span className="text-gray-500 text-[8px]">
                        {toNum(item.igst_rate)}%
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="py-1.5 px-1.5 text-right">
                        {fmtIndian(toNum(item.cgst_amount))}
                        <br />
                        <span className="text-gray-500 text-[8px]">
                          {toNum(item.cgst_rate)}%
                        </span>
                      </td>
                      <td className="py-1.5 px-1.5 text-right">
                        {fmtIndian(toNum(item.sgst_amount))}
                        <br />
                        <span className="text-gray-500 text-[8px]">
                          {toNum(item.sgst_rate)}%
                        </span>
                      </td>
                    </>
                  )}
                  {hasCess && (
                    <td className="py-1.5 px-1.5 text-right">
                      {fmtIndian(toNum(item.cess_amount))}
                      <br />
                      <span className="text-gray-500 text-[8px]">
                        {toNum(item.cess_rate)}%
                      </span>
                    </td>
                  )}
                  <td className="py-1.5 px-1.5 text-right font-semibold">
                    {fmtIndian(toNum(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ─── Totals ─────────────────────────────────────── */}
          <div className="flex justify-end mb-5">
            <div className="w-72">
              <TotalRow
                label="Subtotal"
                value={fmtIndian(toNum(invoice.subtotal))}
                className="border-t border-gray-200 pt-2"
              />
              {toNum(invoice.discount_amount) > 0 && (
                <TotalRow
                  label="Discount"
                  value={`- ${fmtIndian(toNum(invoice.discount_amount))}`}
                />
              )}
              {!invoice.is_igst && totalCgst > 0 && (
                <TotalRow label="CGST" value={fmtIndian(totalCgst)} />
              )}
              {!invoice.is_igst && totalSgst > 0 && (
                <TotalRow label="SGST" value={fmtIndian(totalSgst)} />
              )}
              {invoice.is_igst && totalIgst > 0 && (
                <TotalRow label="IGST" value={fmtIndian(totalIgst)} />
              )}
              {totalCess > 0 && (
                <TotalRow label="Cess" value={fmtIndian(totalCess)} />
              )}
              <div
                className="flex justify-between py-2 mt-1 text-sm font-bold"
                style={{
                  borderTop: "2px solid #0F2D5E",
                  color: "#0F2D5E",
                }}
              >
                <span>Grand Total</span>
                <span>{fmtIndian(toNum(invoice.total))}</span>
              </div>
              {toNum(invoice.amount_paid) > 0 && (
                <TotalRow
                  label="Amount Paid"
                  value={`- ${fmtIndian(toNum(invoice.amount_paid))}`}
                />
              )}
              {toNum(invoice.balance_due) > 0 && (
                <div
                  className="flex justify-between py-2 px-2 mt-1 rounded font-bold text-[13px]"
                  style={{
                    background: "#E8F5EE",
                    color: "#0A8A54",
                  }}
                >
                  <span>Balance Due</span>
                  <span>{fmtIndian(toNum(invoice.balance_due))}</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Notes & Terms ──────────────────────────────── */}
          {invoice.notes && (
            <div className="mb-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Notes
              </h4>
              <p className="text-[10px] text-gray-700 whitespace-pre-line leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.terms && (
            <div className="mb-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Terms & Conditions
              </h4>
              <p className="text-[10px] text-gray-700 whitespace-pre-line leading-relaxed">
                {invoice.terms}
              </p>
            </div>
          )}

          {/* ─── Footer ─────────────────────────────────────── */}
          <div
            className="flex justify-between items-end pt-4 mt-8"
            style={{ borderTop: "2px solid #0F2D5E" }}
          >
            <div className="text-[9px] text-gray-500">
              <p>This is a computer-generated document. No signature is required.</p>
              <p className="mt-2">
                Powered by{" "}
                <span className="font-bold" style={{ color: "#0F2D5E" }}>
                  Kontafy
                </span>
              </p>
            </div>
            <div className="text-right">
              <div
                className="w-44 mb-1 flex items-end justify-center"
                style={{
                  borderBottom: "1px solid #D1D5DB",
                  height: 50,
                }}
              >
                {invoice.signature_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invoice.signature_url}
                    alt="Signature"
                    className="max-h-12 max-w-40 object-contain"
                  />
                )}
              </div>
              <p className="text-[9px] text-gray-500 text-center">
                Authorised Signatory
              </p>
              <p className="text-[9px] text-gray-500 text-center">
                {org?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="text-xs font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex justify-between py-1 text-[11px] text-gray-700 ${className}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
