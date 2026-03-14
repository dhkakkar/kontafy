import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "GST Compliance Guide for Indian Businesses — Kontafy",
  description:
    "Complete guide to GST registration, returns (GSTR-1, GSTR-3B, GSTR-9), e-invoicing, input tax credit, HSN/SAC codes, and common mistakes.",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-heading text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function GSTGuidePage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/resources"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Resources
        </Link>

        {/* Header */}
        <div className="mb-12">
          <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
            Guide
          </span>
          <h1 className="font-heading text-4xl font-extrabold text-ink md:text-5xl">
            GST Compliance Guide for Indian Businesses
          </h1>
          <p className="mt-4 text-lg text-muted">
            Everything you need to know about Goods and Services Tax — from
            registration to filing returns. Written for business owners, not
            accountants.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-heading text-lg font-bold text-ink">In this guide</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-green">
            <li><a href="#what-is-gst" className="hover:underline">What is GST?</a></li>
            <li><a href="#registration" className="hover:underline">GST Registration</a></li>
            <li><a href="#types" className="hover:underline">Types of GST (CGST, SGST, IGST)</a></li>
            <li><a href="#returns" className="hover:underline">GST Returns</a></li>
            <li><a href="#e-invoicing" className="hover:underline">E-invoicing Requirements</a></li>
            <li><a href="#itc" className="hover:underline">Input Tax Credit (ITC)</a></li>
            <li><a href="#hsn-sac" className="hover:underline">HSN & SAC Codes</a></li>
            <li><a href="#mistakes" className="hover:underline">Common Mistakes to Avoid</a></li>
            <li><a href="#kontafy" className="hover:underline">How Kontafy Automates GST</a></li>
          </ol>
        </nav>

        <div className="space-y-12">
          <Section id="what-is-gst" title="1. What is GST?">
            <p>
              The Goods and Services Tax (GST) is an indirect tax that replaced
              multiple cascading taxes like VAT, Service Tax, Excise Duty, and
              Octroi when it was implemented on 1 July 2017. It is a single,
              unified tax levied on the supply of goods and services across
              India.
            </p>
            <p>
              GST follows a <strong>destination-based taxation</strong> model,
              meaning the tax is collected by the state where goods or services
              are consumed, not where they are produced. This eliminates the
              tax-on-tax effect and creates a common national market.
            </p>
            <p>
              The current GST rate slabs are: <strong>0%, 5%, 12%, 18%, and 28%</strong>.
              Most business services fall under the 18% slab, while essential
              goods are taxed at 0% or 5%.
            </p>
          </Section>

          <Section id="registration" title="2. GST Registration">
            <p>
              GST registration is mandatory if your aggregate turnover exceeds:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Rs 40 lakhs</strong> for suppliers of goods (Rs 20 lakhs for special category states).</li>
              <li><strong>Rs 20 lakhs</strong> for suppliers of services (Rs 10 lakhs for special category states).</li>
              <li>Any amount if you engage in inter-state supply, e-commerce selling, or are required to deduct TDS/TCS under GST.</li>
            </ul>
            <p>
              Registration is done online through the GST portal (gst.gov.in).
              You will need your PAN, Aadhaar, business address proof, bank
              account details, and a digital signature (for companies). The GSTIN
              (15-digit number) is issued within 3-7 working days.
            </p>
            <p>
              <strong>Composition Scheme:</strong> Businesses with turnover up to
              Rs 1.5 crore (Rs 75 lakhs for services) can opt for the
              Composition Scheme, which allows them to pay GST at a flat rate
              (1-6%) with simplified quarterly returns. However, they cannot
              collect GST from customers or claim input tax credit.
            </p>
          </Section>

          <Section id="types" title="3. Types of GST">
            <p>GST in India has three components:</p>
            <ul className="list-disc space-y-3 pl-6">
              <li>
                <strong>CGST (Central GST):</strong> Collected by the Central
                Government on intra-state supplies. For example, if a product
                attracts 18% GST and is sold within the same state, 9% goes as
                CGST to the Centre.
              </li>
              <li>
                <strong>SGST (State GST):</strong> Collected by the State
                Government on intra-state supplies. Using the same example, 9%
                goes as SGST to the State.
              </li>
              <li>
                <strong>IGST (Integrated GST):</strong> Collected by the Central
                Government on inter-state supplies and imports. For the same 18%
                rate, the full 18% is charged as IGST when goods move between
                states.
              </li>
            </ul>
            <p>
              <strong>UTGST</strong> replaces SGST for Union Territories without
              a legislature (e.g., Chandigarh, Lakshadweep).
            </p>
          </Section>

          <Section id="returns" title="4. GST Returns">
            <p>
              Regular taxpayers must file the following returns:
            </p>
            <div className="space-y-6">
              <div className="rounded-xl border border-border p-5">
                <h4 className="font-heading font-bold text-ink">GSTR-1 — Outward Supplies</h4>
                <p className="mt-2">
                  Details of all sales invoices issued during the month. Filed
                  monthly by the 11th of the following month. Businesses with
                  turnover up to Rs 5 crore can opt for quarterly filing under
                  the QRMP scheme (due by the 13th of the month following the
                  quarter).
                </p>
              </div>
              <div className="rounded-xl border border-border p-5">
                <h4 className="font-heading font-bold text-ink">GSTR-3B — Summary Return</h4>
                <p className="mt-2">
                  A summary of outward supplies, input tax credit claimed, and
                  tax payable. Filed monthly by the 20th of the following month.
                  QRMP taxpayers file this quarterly by the 22nd or 24th
                  depending on the state.
                </p>
              </div>
              <div className="rounded-xl border border-border p-5">
                <h4 className="font-heading font-bold text-ink">GSTR-9 — Annual Return</h4>
                <p className="mt-2">
                  A consolidated summary of all monthly/quarterly returns filed
                  during the financial year. Due by 31st December of the
                  following year. Taxpayers with turnover above Rs 5 crore must
                  also file GSTR-9C (reconciliation statement).
                </p>
              </div>
            </div>
          </Section>

          <Section id="e-invoicing" title="5. E-invoicing Requirements">
            <p>
              E-invoicing is mandatory for businesses with aggregate turnover
              exceeding <strong>Rs 5 crore</strong> (as of August 2023). Under
              e-invoicing, every B2B invoice must be reported to the Invoice
              Registration Portal (IRP) to obtain an Invoice Reference Number
              (IRN) and QR code.
            </p>
            <p>Key points about e-invoicing:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>The IRN must be generated within 30 days of the invoice date.</li>
              <li>E-invoicing auto-populates GSTR-1 — reducing manual filing effort.</li>
              <li>B2C invoices and certain exempted categories (banks, insurance, SEZs) are excluded.</li>
              <li>Non-compliance can result in penalties and denial of ITC to the buyer.</li>
            </ul>
          </Section>

          <Section id="itc" title="6. Input Tax Credit (ITC)">
            <p>
              Input Tax Credit allows you to reduce your GST liability by
              claiming credit for the GST you have already paid on business
              purchases. For example, if you collect Rs 18,000 GST on sales and
              paid Rs 12,000 GST on purchases, you only owe Rs 6,000 to the
              government.
            </p>
            <p>To claim ITC, you must:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Have a valid tax invoice or debit note from the supplier.</li>
              <li>Have actually received the goods or services.</li>
              <li>File your returns on time.</li>
              <li>Ensure the supplier has filed their GSTR-1 and the invoice appears in your GSTR-2B.</li>
              <li>Pay the supplier within 180 days (otherwise ITC must be reversed).</li>
            </ul>
            <p>
              <strong>Blocked ITC:</strong> Credit cannot be claimed on certain
              items like motor vehicles (with exceptions), food and beverages,
              personal consumption, and construction of immovable property.
            </p>
          </Section>

          <Section id="hsn-sac" title="7. HSN & SAC Codes">
            <p>
              <strong>HSN (Harmonised System of Nomenclature)</strong> codes are
              used to classify goods, while <strong>SAC (Services Accounting
              Codes)</strong> classify services. These codes determine the
              applicable GST rate for each item.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Businesses with turnover up to Rs 5 crore must mention 4-digit HSN codes on invoices.</li>
              <li>Businesses above Rs 5 crore must use 6-digit HSN codes.</li>
              <li>SAC codes are always 6 digits, starting with &quot;99&quot; (e.g., 997331 for software services).</li>
            </ul>
            <p>
              Incorrect HSN/SAC codes can lead to misclassification of tax rates,
              ITC mismatches, and potential penalties during GST audits.
            </p>
          </Section>

          <Section id="mistakes" title="8. Common Mistakes to Avoid">
            <ul className="list-disc space-y-3 pl-6">
              <li>
                <strong>Late filing:</strong> Missing return deadlines attracts a
                late fee of Rs 50/day (Rs 20/day for nil returns) plus 18%
                annual interest on unpaid tax.
              </li>
              <li>
                <strong>Claiming ineligible ITC:</strong> Claiming credit on
                blocked items or from non-compliant suppliers is the most common
                audit trigger.
              </li>
              <li>
                <strong>Wrong GST type:</strong> Charging CGST+SGST on an
                inter-state sale (should be IGST) or vice versa.
              </li>
              <li>
                <strong>Not reconciling GSTR-2B:</strong> Failing to match your
                purchase records with GSTR-2B leads to ITC mismatches.
              </li>
              <li>
                <strong>Ignoring e-invoicing:</strong> Not generating IRN for
                eligible invoices makes them invalid, and the buyer loses ITC.
              </li>
              <li>
                <strong>Not issuing credit/debit notes:</strong> For returns,
                price adjustments, or discounts, proper notes must be issued
                within the prescribed time.
              </li>
            </ul>
          </Section>

          <Section id="kontafy" title="9. How Kontafy Automates GST">
            <p>
              Kontafy is built to take the pain out of GST compliance. Here is
              what the platform handles for you:
            </p>
            <ul className="list-disc space-y-3 pl-6">
              <li>
                <strong>Auto-detect GST type:</strong> Kontafy automatically
                determines whether to charge CGST+SGST or IGST based on your
                and your customer&apos;s state.
              </li>
              <li>
                <strong>HSN/SAC code library:</strong> Built-in searchable
                database of HSN and SAC codes. Add them once to your products,
                and they auto-populate on every invoice.
              </li>
              <li>
                <strong>One-click GSTR-1 and GSTR-3B:</strong> Generate
                return-ready JSON files directly from your invoice data. No
                manual data entry on the GST portal.
              </li>
              <li>
                <strong>GSTR-2B reconciliation:</strong> Upload your GSTR-2B and
                Kontafy automatically matches it against your purchase records,
                highlighting mismatches.
              </li>
              <li>
                <strong>E-invoicing integration:</strong> Generate IRN and QR
                codes directly from Kontafy without visiting the IRP portal.
              </li>
              <li>
                <strong>Filing reminders:</strong> Automated reminders before
                every GST filing deadline so you never pay a late fee.
              </li>
            </ul>
            <div className="mt-6 rounded-xl border border-green/20 bg-green/5 p-6">
              <p className="font-medium text-ink">
                Ready to simplify your GST compliance?{" "}
                <a href="/signup" className="text-green underline underline-offset-2 hover:text-green/80">
                  Start your free trial
                </a>{" "}
                and see how Kontafy handles GST automatically.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
