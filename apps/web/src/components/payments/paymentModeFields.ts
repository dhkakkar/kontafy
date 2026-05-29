/**
 * Per-method UI hints for the Record Payment / Receipt flows.
 *
 * The Payment Mode dropdown drives three things on the form:
 *   1. Whether to show the Bank Account picker (everything except cash).
 *   2. What to label the Reference field — UTR for bank transfer, UPI
 *      Txn ID for UPI, Cheque No for cheque, Auth Code for card.
 *   3. The placeholder text inside that field so users have an example
 *      of the expected format.
 *
 * Centralised here so the three Record Payment surfaces (sales receipt,
 * purchase payment, standalone modal) all stay consistent without
 * each page hand-rolling its own switch statement.
 */

export interface PaymentModeUi {
  // Hide the bank picker entirely when true — cash hits 1101 directly.
  isCash: boolean;
  // Hide the picker (used for cash); falls back to label text otherwise.
  showBankPicker: boolean;
  // Hide the reference field when there's nothing to capture (we keep
  // it shown for every mode currently but the flag exists for future
  // modes like "Internal Transfer" where reference doesn't apply).
  showReference: boolean;
  referenceLabel: string;
  referencePlaceholder: string;
  // Optional helper hint shown below the bank picker for that mode.
  // Empty string means no hint.
  bankHint: string;
}

const DEFAULT: PaymentModeUi = {
  isCash: false,
  showBankPicker: true,
  showReference: true,
  referenceLabel: "Reference Number",
  referencePlaceholder: "Optional reference",
  bankHint: "",
};

export function getPaymentModeUi(method: string): PaymentModeUi {
  switch (method) {
    case "cash":
      // Cash: no bank picker. Reference is optional and usually the
      // physical receipt number.
      return {
        ...DEFAULT,
        isCash: true,
        showBankPicker: false,
        referenceLabel: "Receipt #",
        referencePlaceholder: "Optional",
      };
    case "upi":
      // UPI lands in a specific bank — the one linked to the UPI ID.
      // Reference is the UPI transaction id printed on the customer's
      // receipt (e.g. 4239xxxxxx@oksbi or a Razorpay txn id).
      return {
        ...DEFAULT,
        referenceLabel: "UPI Transaction ID",
        referencePlaceholder: "e.g. 4239xxxxxx",
        bankHint: "Which bank received the UPI settlement",
      };
    case "bank_transfer":
      return {
        ...DEFAULT,
        referenceLabel: "UTR Number",
        referencePlaceholder: "e.g. UTRNXXXXXXXXXXXX",
        bankHint: "Which bank account received the transfer",
      };
    case "cheque":
      return {
        ...DEFAULT,
        referenceLabel: "Cheque Number",
        referencePlaceholder: "e.g. 123456",
        bankHint: "Which bank account the cheque is drawn on / deposited into",
      };
    case "card":
      // Card receipts settle into a merchant bank (Razorpay/Stripe payout
      // or PoS terminal settlement). Reference stores auth code or
      // card last-4 — single field keeps the modal lean.
      return {
        ...DEFAULT,
        referenceLabel: "Auth Code / Card Last 4",
        referencePlaceholder: "e.g. AUTH123 or ****1234",
        bankHint: "Merchant settlement bank",
      };
    default:
      return DEFAULT;
  }
}
