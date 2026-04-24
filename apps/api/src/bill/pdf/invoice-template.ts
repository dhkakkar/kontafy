/**
 * HTML/CSS template for Indian GST invoices.
 * Generates a professional invoice with Kontafy branding.
 */

import { formatIndianNumber, numberToIndianWords } from './pdf.helpers';

export interface InvoiceTemplateData {
  // Organization
  org: {
    name: string;
    legal_name?: string;
    gstin?: string;
    pan?: string;
    address: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    logo_url?: string;
  };

  // Customer / Contact
  contact: {
    name: string;
    company_name?: string;
    gstin?: string;
    billing_address: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
    shipping_address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
  };

  // Invoice header
  invoice_number: string;
  type: string;
  date: string;
  due_date?: string;
  place_of_supply?: string;
  is_igst: boolean;

  // Line items
  items: Array<{
    sno: number;
    description: string;
    hsn_code?: string;
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
  }>;

  // Totals
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;

  // Tax summary grouped by rate
  tax_summary: Array<{
    rate: string;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
  }>;

  // Extras
  notes?: string;
  terms?: string;
  signature_url?: string;
  bank_details?: {
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    branch?: string;
    upi_id?: string;
  };
}

function formatAddress(addr: Record<string, string | undefined>): string {
  if (!addr) return '';
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean);
  return parts.join(', ');
}

function getInvoiceTitle(type: string): string {
  switch (type) {
    case 'sale': return 'Tax Invoice';
    case 'purchase': return 'Purchase Bill';
    case 'credit_note': return 'Credit Note';
    case 'debit_note': return 'Debit Note';
    default: return 'Invoice';
  }
}

// Accepts EITHER a 2-digit GSTIN state code ('27') OR a state abbreviation
// ('MH') and returns the full state name. Falls back to the input if the
// key isn't recognized so we never render nothing.
function getStateNameByCode(code: string): string {
  if (!code) return '';
  const byCode: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
    '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
    '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
    '37': 'Andhra Pradesh (New)', '38': 'Ladakh',
  };
  const byAbbr: Record<string, string> = {
    JK: 'Jammu & Kashmir', HP: 'Himachal Pradesh', PB: 'Punjab',
    CH: 'Chandigarh', UK: 'Uttarakhand', HR: 'Haryana',
    DL: 'Delhi', RJ: 'Rajasthan', UP: 'Uttar Pradesh',
    BR: 'Bihar', SK: 'Sikkim', AR: 'Arunachal Pradesh',
    NL: 'Nagaland', MN: 'Manipur', MZ: 'Mizoram',
    TR: 'Tripura', ML: 'Meghalaya', AS: 'Assam',
    WB: 'West Bengal', JH: 'Jharkhand', OD: 'Odisha',
    CT: 'Chhattisgarh', MP: 'Madhya Pradesh', GJ: 'Gujarat',
    DN: 'Dadra & Nagar Haveli and Daman & Diu', MH: 'Maharashtra',
    AP: 'Andhra Pradesh', KA: 'Karnataka', GA: 'Goa',
    LD: 'Lakshadweep', KL: 'Kerala', TN: 'Tamil Nadu',
    PY: 'Puducherry', AN: 'Andaman & Nicobar', TG: 'Telangana',
    LA: 'Ladakh',
  };
  const key = code.toUpperCase();
  return byCode[key] || byAbbr[key] || code;
}

export function generateInvoiceHtml(data: InvoiceTemplateData): string {
  const title = getInvoiceTitle(data.type);
  const totalInWords = numberToIndianWords(data.total);

  // Seller state is derived from the org's GSTIN (first two digits, a
  // numeric state code). Buyer state comes from place_of_supply, which
  // the rest of the app stores as a 2-letter abbreviation (e.g. "MH").
  const sellerStateName = data.org.gstin
    ? getStateNameByCode(data.org.gstin.slice(0, 2))
    : '';
  const buyerStateName = data.place_of_supply
    ? getStateNameByCode(data.place_of_supply)
    : '';
  const placeOfSupply = buyerStateName
    ? sellerStateName && sellerStateName !== buyerStateName
      ? `${sellerStateName} → ${buyerStateName}`
      : buyerStateName
    : '';

  const hasCess = data.items.some((item) => Number(item.cess_amount) > 0);

  // Build tax columns based on IGST or CGST+SGST
  const taxHeaders = data.is_igst
    ? '<th class="right">IGST</th>'
    : '<th class="right">CGST</th><th class="right">SGST</th>';

  const taxColCount = data.is_igst ? 1 : 2;
  const cessHeader = hasCess ? '<th class="right">Cess</th>' : '';
  const cessColCount = hasCess ? 1 : 0;
  // sno + desc + hsn + qty + unit + rate + disc + taxable + tax cols + cess + total
  const totalCols = 8 + taxColCount + cessColCount + 1;

  const itemRows = data.items
    .map((item) => {
      const taxCells = data.is_igst
        ? `<td class="right">${formatIndianNumber(Number(item.igst_amount))}<br/><small>${Number(item.igst_rate)}%</small></td>`
        : `<td class="right">${formatIndianNumber(Number(item.cgst_amount))}<br/><small>${Number(item.cgst_rate)}%</small></td>
           <td class="right">${formatIndianNumber(Number(item.sgst_amount))}<br/><small>${Number(item.sgst_rate)}%</small></td>`;

      const cessCells = hasCess
        ? `<td class="right">${formatIndianNumber(Number(item.cess_amount))}<br/><small>${Number(item.cess_rate)}%</small></td>`
        : '';

      return `
        <tr>
          <td class="center">${item.sno}</td>
          <td>${item.description}</td>
          <td class="center">${item.hsn_code || '-'}</td>
          <td class="right">${Number(item.quantity)}</td>
          <td class="center">${item.unit}</td>
          <td class="right">${formatIndianNumber(Number(item.rate))}</td>
          <td class="right">${Number(item.discount_pct) > 0 ? Number(item.discount_pct) + '%' : '-'}</td>
          <td class="right">${formatIndianNumber(Number(item.taxable_amount))}</td>
          ${taxCells}
          ${cessCells}
          <td class="right bold">${formatIndianNumber(Number(item.total))}</td>
        </tr>`;
    })
    .join('\n');

  // Tax summary rows
  const taxSummaryHeaders = data.is_igst
    ? '<th class="right">IGST</th>'
    : '<th class="right">CGST</th><th class="right">SGST</th>';

  const taxSummaryRows = data.tax_summary
    .map((row) => {
      const taxCells = data.is_igst
        ? `<td class="right">${formatIndianNumber(row.igst)}</td>`
        : `<td class="right">${formatIndianNumber(row.cgst)}</td>
           <td class="right">${formatIndianNumber(row.sgst)}</td>`;
      const cessCells = hasCess
        ? `<td class="right">${formatIndianNumber(row.cess)}</td>`
        : '';

      return `
        <tr>
          <td class="center">${row.rate}%</td>
          <td class="right">${formatIndianNumber(row.taxable_amount)}</td>
          ${taxCells}
          ${cessCells}
          <td class="right bold">${formatIndianNumber(row.total_tax)}</td>
        </tr>`;
    })
    .join('\n');

  // Bank details section
  const bankDetailsHtml = data.bank_details
    ? `
    <div class="bank-details">
      <h4>Bank Details</h4>
      <table class="bank-table">
        ${data.bank_details.bank_name ? `<tr><td class="label">Bank</td><td>${data.bank_details.bank_name}</td></tr>` : ''}
        ${data.bank_details.account_name ? `<tr><td class="label">A/C Name</td><td>${data.bank_details.account_name}</td></tr>` : ''}
        ${data.bank_details.account_number ? `<tr><td class="label">A/C No.</td><td>${data.bank_details.account_number}</td></tr>` : ''}
        ${data.bank_details.ifsc ? `<tr><td class="label">IFSC</td><td>${data.bank_details.ifsc}</td></tr>` : ''}
        ${data.bank_details.branch ? `<tr><td class="label">Branch</td><td>${data.bank_details.branch}</td></tr>` : ''}
        ${data.bank_details.upi_id ? `<tr><td class="label">UPI ID</td><td>${data.bank_details.upi_id}</td></tr>` : ''}
      </table>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - ${data.invoice_number}</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy: #0F2D5E;
      --green: #0A8A54;
      --green-light: #E8F5EE;
      --gray-50: #F9FAFB;
      --gray-100: #F3F4F6;
      --gray-200: #E5E7EB;
      --gray-300: #D1D5DB;
      --gray-500: #6B7280;
      --gray-700: #374151;
      --gray-900: #111827;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: var(--gray-900);
      background: #fff;
    }

    .invoice-wrapper {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 18mm;
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid var(--navy);
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .company-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 6px;
    }

    .company-name {
      font-size: 20px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 3px;
    }

    .company-legal {
      font-size: 10px;
      color: var(--gray-500);
    }

    .company-info {
      font-size: 10px;
      color: var(--gray-700);
      line-height: 1.6;
      margin-top: 4px;
    }

    .company-info .gstin {
      font-weight: 600;
      color: var(--navy);
    }

    .header-right {
      text-align: right;
    }

    .invoice-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--navy);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .invoice-number {
      font-size: 13px;
      font-weight: 600;
      color: var(--green);
      margin-top: 4px;
    }

    /* Info grid */
    .info-grid {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-bottom: 20px;
    }

    .info-box {
      flex: 1;
    }

    .info-box h4 {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-500);
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--gray-200);
    }

    .info-box p {
      font-size: 11px;
      line-height: 1.6;
      color: var(--gray-700);
    }

    .info-box .name {
      font-weight: 600;
      font-size: 12px;
      color: var(--gray-900);
    }

    .info-box .gstin {
      font-weight: 600;
      color: var(--navy);
    }

    /* Meta row (dates, POS) */
    .meta-row {
      display: flex;
      gap: 20px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 6px;
      padding: 10px 15px;
      margin-bottom: 20px;
    }

    .meta-item {
      flex: 1;
    }

    .meta-item .label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-500);
    }

    .meta-item .value {
      font-size: 12px;
      font-weight: 600;
      color: var(--gray-900);
      margin-top: 2px;
    }

    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }

    .items-table thead th {
      background: var(--navy);
      color: #fff;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 8px 6px;
      white-space: nowrap;
    }

    .items-table thead th:first-child {
      border-radius: 4px 0 0 0;
    }

    .items-table thead th:last-child {
      border-radius: 0 4px 0 0;
    }

    .items-table tbody td {
      padding: 7px 6px;
      border-bottom: 1px solid var(--gray-200);
      vertical-align: top;
    }

    .items-table tbody tr:nth-child(even) {
      background: var(--gray-50);
    }

    .items-table tbody td small {
      color: var(--gray-500);
      font-size: 8px;
    }

    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 600; }

    /* Totals footer */
    .totals-section {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-bottom: 20px;
    }

    .totals-left {
      flex: 1;
    }

    .totals-right {
      width: 280px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 11px;
      color: var(--gray-700);
    }

    .total-row.subtotal {
      border-top: 1px solid var(--gray-200);
      padding-top: 8px;
    }

    .total-row.grand-total {
      border-top: 2px solid var(--navy);
      margin-top: 4px;
      padding-top: 8px;
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
    }

    .total-row.balance-due {
      background: var(--green-light);
      margin: 4px -8px 0;
      padding: 8px;
      border-radius: 4px;
      font-weight: 700;
      color: var(--green);
      font-size: 13px;
    }

    .words-row {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 20px;
      font-size: 10px;
    }

    .words-row .label {
      font-weight: 600;
      color: var(--gray-500);
      text-transform: uppercase;
      font-size: 9px;
    }

    .words-row .value {
      font-weight: 600;
      color: var(--gray-900);
      font-size: 11px;
      margin-top: 2px;
    }

    /* Tax summary */
    .tax-summary {
      margin-bottom: 20px;
    }

    .tax-summary h4 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-500);
      margin-bottom: 6px;
    }

    .tax-summary table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .tax-summary thead th {
      background: var(--gray-100);
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      padding: 6px 8px;
      border: 1px solid var(--gray-200);
      color: var(--gray-700);
    }

    .tax-summary tbody td {
      padding: 5px 8px;
      border: 1px solid var(--gray-200);
    }

    /* Bank details */
    .bank-details {
      margin-bottom: 15px;
    }

    .bank-details h4 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-500);
      margin-bottom: 6px;
    }

    .bank-table {
      font-size: 10px;
    }

    .bank-table td {
      padding: 2px 0;
    }

    .bank-table td.label {
      font-weight: 600;
      color: var(--gray-700);
      width: 100px;
      padding-right: 10px;
    }

    /* Notes / Terms */
    .notes-section {
      margin-bottom: 15px;
    }

    .notes-section h4 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-500);
      margin-bottom: 4px;
    }

    .notes-section p {
      font-size: 10px;
      color: var(--gray-700);
      line-height: 1.6;
      white-space: pre-line;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 2px solid var(--navy);
      padding-top: 15px;
      margin-top: 30px;
    }

    .footer-left {
      font-size: 9px;
      color: var(--gray-500);
    }

    .footer-right {
      text-align: right;
    }

    .signature-line {
      width: 180px;
      border-bottom: 1px solid var(--gray-300);
      margin-bottom: 5px;
      height: 50px;
    }

    .signature-label {
      font-size: 9px;
      color: var(--gray-500);
      text-align: center;
    }

    .powered-by {
      font-size: 8px;
      color: var(--gray-500);
      margin-top: 10px;
    }

    .powered-by span {
      font-weight: 700;
      color: var(--navy);
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice-wrapper { padding: 10mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${data.org.logo_url ? `<img class="company-logo" src="${data.org.logo_url}" alt="Logo" />` : ''}
        <div>
          <div class="company-name">${data.org.name}</div>
          ${data.org.legal_name && data.org.legal_name !== data.org.name ? `<div class="company-legal">${data.org.legal_name}</div>` : ''}
          <div class="company-info">
            ${data.org.gstin ? `<div class="gstin">GSTIN: ${data.org.gstin}</div>` : ''}
            ${data.org.pan ? `<div>PAN: ${data.org.pan}</div>` : ''}
            <div>${formatAddress(data.org.address)}</div>
            ${data.org.phone ? `<div>Ph: ${data.org.phone}</div>` : ''}
            ${data.org.email ? `<div>${data.org.email}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-title">${title}</div>
        <div class="invoice-number">${data.invoice_number}</div>
      </div>
    </div>

    <!-- Meta Row -->
    <div class="meta-row">
      <div class="meta-item">
        <div class="label">Invoice Date</div>
        <div class="value">${data.date}</div>
      </div>
      ${data.due_date ? `
      <div class="meta-item">
        <div class="label">Due Date</div>
        <div class="value">${data.due_date}</div>
      </div>` : ''}
      ${placeOfSupply ? `
      <div class="meta-item">
        <div class="label">Place of Supply</div>
        <div class="value">${placeOfSupply}</div>
      </div>` : ''}
      <div class="meta-item">
        <div class="label">Supply Type</div>
        <div class="value">${data.is_igst ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
      </div>
    </div>

    <!-- Billing / Shipping Info -->
    <div class="info-grid">
      <div class="info-box">
        <h4>Bill To</h4>
        <p>
          <span class="name">${data.contact.company_name || data.contact.name}</span><br/>
          ${data.contact.company_name && data.contact.name !== data.contact.company_name ? data.contact.name + '<br/>' : ''}
          ${data.contact.gstin ? `<span class="gstin">GSTIN: ${data.contact.gstin}</span><br/>` : ''}
          ${formatAddress(data.contact.billing_address)}
          ${data.contact.phone ? `<br/>Ph: ${data.contact.phone}` : ''}
          ${data.contact.email ? `<br/>${data.contact.email}` : ''}
        </p>
      </div>
      ${data.contact.shipping_address && formatAddress(data.contact.shipping_address) ? `
      <div class="info-box">
        <h4>Ship To</h4>
        <p>${formatAddress(data.contact.shipping_address)}</p>
      </div>` : ''}
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="center">#</th>
          <th>Description</th>
          <th class="center">HSN/SAC</th>
          <th class="right">Qty</th>
          <th class="center">Unit</th>
          <th class="right">Rate</th>
          <th class="right">Disc%</th>
          <th class="right">Taxable</th>
          ${taxHeaders}
          ${cessHeader}
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Amount in Words -->
    <div class="words-row">
      <div class="label">Total Amount in Words</div>
      <div class="value">INR ${totalInWords} Only</div>
    </div>

    <!-- Totals Section -->
    <div class="totals-section">
      <div class="totals-left">
        <!-- Tax Summary -->
        <div class="tax-summary">
          <h4>Tax Summary</h4>
          <table>
            <thead>
              <tr>
                <th class="center">Rate</th>
                <th class="right">Taxable Amt</th>
                ${taxSummaryHeaders}
                ${hasCess ? '<th class="right">Cess</th>' : ''}
                <th class="right">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              ${taxSummaryRows}
            </tbody>
          </table>
        </div>

        ${bankDetailsHtml}
      </div>

      <div class="totals-right">
        <div class="total-row subtotal">
          <span>Subtotal</span>
          <span>${formatIndianNumber(data.subtotal)}</span>
        </div>
        ${data.discount_amount > 0 ? `
        <div class="total-row">
          <span>Discount</span>
          <span>- ${formatIndianNumber(data.discount_amount)}</span>
        </div>` : ''}
        <div class="total-row">
          <span>Tax</span>
          <span>${formatIndianNumber(data.tax_amount)}</span>
        </div>
        <div class="total-row grand-total">
          <span>Grand Total</span>
          <span>${formatIndianNumber(data.total)}</span>
        </div>
        ${data.amount_paid > 0 ? `
        <div class="total-row">
          <span>Amount Paid</span>
          <span>- ${formatIndianNumber(data.amount_paid)}</span>
        </div>` : ''}
        ${data.balance_due > 0 ? `
        <div class="total-row balance-due">
          <span>Balance Due</span>
          <span>${formatIndianNumber(data.balance_due)}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Notes & Terms -->
    ${data.notes ? `
    <div class="notes-section">
      <h4>Notes</h4>
      <p>${data.notes}</p>
    </div>` : ''}
    ${data.terms ? `
    <div class="notes-section">
      <h4>Terms & Conditions</h4>
      <p>${data.terms}</p>
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <div>This is a computer-generated document. No signature is required.</div>
        <div class="powered-by">Powered by <span>Kontafy</span></div>
      </div>
      <div class="footer-right">
        <div class="signature-line">
          ${data.signature_url ? `<img src="${data.signature_url}" alt="Signature" style="max-height: 48px; max-width: 170px; object-fit: contain; display: block; margin: 0 auto;" />` : ''}
        </div>
        <div class="signature-label">Authorised Signatory</div>
        <div class="signature-label">${data.org.name}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
