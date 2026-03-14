import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Kontafy",
  description:
    "Read the Terms of Service governing your use of the Kontafy accounting platform.",
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

export default function TermsPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
            Legal
          </span>
          <h1 className="font-heading text-4xl font-extrabold text-ink md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-lg text-muted">
            Effective date: 1 March 2026 &middot; Last updated: 14 March 2026
          </p>
          <p className="mt-2 text-muted">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of
            the Kontafy platform operated by <strong>Syscode Technology Pvt Ltd</strong>{" "}
            (&quot;Kontafy&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By creating an account or
            using our services, you agree to be bound by these Terms.
          </p>
        </div>

        <div className="space-y-10">
          <Section id="account" title="1. Account Creation & Responsibilities">
            <p>
              You must provide accurate, complete, and current information when
              creating an account. You are responsible for maintaining the
              confidentiality of your login credentials and for all activities
              that occur under your account.
            </p>
            <p>
              You must be at least 18 years old and have the legal authority to
              enter into these Terms on behalf of yourself or your business
              entity. Each account is intended for use by a single business
              entity.
            </p>
          </Section>

          <Section id="acceptable-use" title="2. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Use Kontafy for any unlawful purpose or to facilitate illegal activity.</li>
              <li>Upload malicious code, viruses, or any harmful content.</li>
              <li>Attempt to gain unauthorized access to other accounts or our systems.</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the platform.</li>
              <li>Use automated tools to scrape or harvest data from the platform.</li>
              <li>Resell or sublicense access to Kontafy without our written consent.</li>
              <li>Misrepresent your identity or business information.</li>
            </ul>
          </Section>

          <Section id="payment" title="3. Payment Terms">
            <p>
              Kontafy offers both free and paid subscription plans. Paid plans are
              billed monthly or annually as selected at the time of purchase. All
              prices are listed in Indian Rupees (INR) and are inclusive of
              applicable GST.
            </p>
            <p>
              Payments are processed securely through our payment partner
              (Razorpay). You authorize us to charge your selected payment method
              on a recurring basis until you cancel your subscription.
            </p>
            <p>
              We reserve the right to change pricing with at least 30 days&apos;
              written notice. Existing subscribers will be grandfathered at their
              current rate until the end of their billing cycle.
            </p>
          </Section>

          <Section id="refund" title="4. Refund Policy">
            <p>
              We offer a <strong>14-day money-back guarantee</strong> on all paid
              plans. If you are not satisfied with Kontafy within the first 14
              days of your paid subscription, you may request a full refund by
              contacting us at{" "}
              <a
                href="mailto:support@kontafy.com"
                className="text-green underline underline-offset-2 hover:text-green/80"
              >
                support@kontafy.com
              </a>
              .
            </p>
            <p>
              Refunds after the 14-day period are issued at our discretion on a
              pro-rata basis. Annual subscriptions may receive a pro-rated refund
              for unused months. No refunds are issued for partial months of
              service.
            </p>
          </Section>

          <Section id="data-ownership" title="5. Data Ownership">
            <p>
              <strong>You own your data.</strong> All financial records, invoices,
              reports, and business data you create or upload to Kontafy remain
              your property. We do not claim ownership over any of your content.
            </p>
            <p>
              You grant us a limited licence to store, process, and display your
              data solely for the purpose of providing the Kontafy services. This
              licence terminates when you delete your account.
            </p>
            <p>
              You can export your data at any time in standard formats (CSV, JSON,
              PDF) from your account settings.
            </p>
          </Section>

          <Section id="ip" title="6. Intellectual Property">
            <p>
              The Kontafy platform — including its design, code, features,
              documentation, branding, and trademarks — is the intellectual
              property of Syscode Technology Pvt Ltd and is protected by Indian
              and international intellectual property laws.
            </p>
            <p>
              Your subscription grants you a limited, non-exclusive,
              non-transferable, revocable licence to use the platform for your
              internal business purposes during the term of your subscription.
            </p>
          </Section>

          <Section id="availability" title="7. Service Availability">
            <p>
              We target <strong>99.9% uptime</strong> for the Kontafy platform.
              However, we do not guarantee uninterrupted availability. Scheduled
              maintenance windows will be communicated at least 48 hours in
              advance via email or in-app notification.
            </p>
            <p>
              We are not liable for downtime caused by factors beyond our
              reasonable control, including internet outages, third-party service
              failures, natural disasters, or government actions.
            </p>
          </Section>

          <Section id="termination" title="8. Termination">
            <p>
              You may cancel your account at any time from your account settings.
              Upon cancellation, your data will remain accessible for 30 days,
              after which it will be permanently deleted unless retention is
              required by law.
            </p>
            <p>
              We may suspend or terminate your account if you violate these Terms,
              engage in fraudulent activity, or fail to pay outstanding fees. We
              will provide reasonable notice before termination, except in cases
              of severe violations.
            </p>
          </Section>

          <Section id="liability" title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by Indian law, Kontafy and its
              directors, employees, and affiliates shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages
              arising from your use of the platform.
            </p>
            <p>
              Our total cumulative liability to you for any claims arising from
              these Terms or your use of the platform shall not exceed the amount
              you paid to Kontafy in the 12 months preceding the claim.
            </p>
            <p>
              Kontafy provides tools to assist with accounting and GST
              compliance, but does not provide tax advice. You are responsible for
              the accuracy of your financial records and tax filings.
            </p>
          </Section>

          <Section id="governing-law" title="10. Governing Law & Disputes">
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of India. Any disputes arising from these Terms or your use
              of Kontafy shall be subject to the exclusive jurisdiction of the
              courts in Yamunanagar, Haryana, India.
            </p>
            <p>
              Before initiating legal proceedings, both parties agree to attempt
              resolution through good-faith negotiation for a period of 30 days.
              If negotiation fails, disputes may be referred to arbitration under
              the Arbitration and Conciliation Act, 1996.
            </p>
          </Section>

          <Section id="changes" title="11. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When we make material
              changes, we will notify you via email or in-app notification at
              least 30 days before the changes take effect. Continued use of
              Kontafy after changes take effect constitutes acceptance of the
              updated Terms.
            </p>
          </Section>

          <Section id="contact" title="12. Contact">
            <p>
              For questions about these Terms, please contact us:
            </p>
            <ul className="list-none space-y-1 pl-0">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:legal@kontafy.com"
                  className="text-green underline underline-offset-2 hover:text-green/80"
                >
                  legal@kontafy.com
                </a>
              </li>
              <li>
                <strong>Company:</strong> Syscode Technology Pvt Ltd
              </li>
              <li>
                <strong>Address:</strong> Yamunanagar, Haryana 135001, India
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
