import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Kontafy",
  description:
    "Learn how Kontafy collects, uses, and protects your personal and business data.",
};

/* ------------------------------------------------------------------ */
/*  Reusable prose helpers                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function PrivacyPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
            Legal
          </span>
          <h1 className="font-heading text-4xl font-extrabold text-ink md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-muted">
            Effective date: 1 March 2026 &middot; Last updated: 14 March 2026
          </p>
          <p className="mt-2 text-muted">
            This Privacy Policy explains how <strong>Syscode Technology Pvt Ltd</strong>{" "}
            (&quot;Kontafy&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses,
            stores, and protects your information when you use the Kontafy platform
            and related services.
          </p>
        </div>

        <div className="space-y-10">
          {/* 1 */}
          <Section id="information-we-collect" title="1. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Account information:</strong> Name, email address, phone
                number, business name, GSTIN, and billing address provided during
                registration.
              </li>
              <li>
                <strong>Financial data:</strong> Invoices, expenses, purchase
                orders, journal entries, ledger data, bank statements, and other
                accounting records you create or upload.
              </li>
              <li>
                <strong>Usage data:</strong> Pages visited, features used, session
                duration, device information, browser type, and IP address.
              </li>
              <li>
                <strong>Communication data:</strong> Support tickets, emails, and
                chat messages exchanged with our team.
              </li>
              <li>
                <strong>Payment information:</strong> Billing details processed
                through our third-party payment providers (we do not store full
                card numbers).
              </li>
            </ul>
          </Section>

          {/* 2 */}
          <Section id="how-we-use" title="2. How We Use Your Information">
            <ul className="list-disc space-y-2 pl-6">
              <li>To provide, maintain, and improve the Kontafy platform.</li>
              <li>To process transactions and send invoices and receipts.</li>
              <li>To generate GST returns and compliance reports on your behalf.</li>
              <li>To send product updates, security alerts, and support messages.</li>
              <li>To personalize your experience with AI-powered insights.</li>
              <li>To detect and prevent fraud, abuse, or security threats.</li>
              <li>To comply with legal obligations under Indian law.</li>
            </ul>
          </Section>

          {/* 3 */}
          <Section id="data-storage" title="3. Data Storage & Security">
            <p>
              Your data is stored on servers hosted in <strong>AWS Mumbai
              (ap-south-1)</strong> data centres within India. We use 256-bit AES
              encryption at rest and TLS 1.2+ encryption in transit. Access to
              production systems is restricted through role-based access controls,
              multi-factor authentication, and audit logging.
            </p>
            <p>
              We perform daily encrypted backups with a 30-day retention period.
              Backups are stored in geographically separate Indian data centres.
            </p>
          </Section>

          {/* 4 */}
          <Section id="cookies" title="4. Cookies & Tracking">
            <p>
              We use essential cookies to keep you signed in and remember your
              preferences. We also use analytics cookies (such as Google Analytics)
              to understand how users interact with the platform. You can disable
              non-essential cookies through your browser settings at any time.
            </p>
            <p>
              We do not sell or share cookie data with third-party advertisers.
            </p>
          </Section>

          {/* 5 */}
          <Section id="third-party" title="5. Third-Party Services">
            <p>
              We may share limited data with trusted third-party services that help
              us operate the platform:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Payment processors</strong> (Razorpay) for subscription billing.</li>
              <li><strong>Email providers</strong> (for transactional emails and notifications).</li>
              <li><strong>Analytics</strong> (Google Analytics) for usage insights.</li>
              <li><strong>Cloud infrastructure</strong> (AWS) for hosting and storage.</li>
            </ul>
            <p>
              These providers are contractually obligated to protect your data and
              use it only for the purposes we specify.
            </p>
          </Section>

          {/* 6 */}
          <Section id="data-rights" title="6. Your Data Rights">
            <p>You have the right to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Access:</strong> Request a copy of all personal and
                business data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Update or correct inaccurate
                information in your account.
              </li>
              <li>
                <strong>Export:</strong> Download your data in standard formats
                (CSV, JSON, PDF) at any time from your account settings.
              </li>
              <li>
                <strong>Deletion:</strong> Request permanent deletion of your
                account and associated data. We will process deletion requests
                within 30 days, subject to legal retention requirements.
              </li>
              <li>
                <strong>Portability:</strong> Transfer your data to another
                service provider.
              </li>
            </ul>
          </Section>

          {/* 7 */}
          <Section id="data-retention" title="7. Data Retention">
            <p>
              We retain your data for as long as your account is active. After
              account deletion, we may retain certain records for up to 8 years as
              required by Indian tax and financial regulations (Income Tax Act,
              GST Act). Anonymized, aggregated data may be retained indefinitely
              for analytical purposes.
            </p>
          </Section>

          {/* 8 */}
          <Section id="children" title="8. Children's Privacy">
            <p>
              Kontafy is designed for business use and is not intended for
              individuals under the age of 18. We do not knowingly collect data
              from minors.
            </p>
          </Section>

          {/* 9 */}
          <Section id="changes" title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make
              significant changes, we will notify you via email or an in-app
              notification at least 14 days before the changes take effect. The
              &quot;Last updated&quot; date at the top of this page reflects the most
              recent revision.
            </p>
          </Section>

          {/* 10 */}
          <Section id="contact" title="10. Contact Us">
            <p>
              If you have questions about this Privacy Policy or wish to exercise
              your data rights, please contact us:
            </p>
            <ul className="list-none space-y-1 pl-0">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:privacy@kontafy.com"
                  className="text-green underline underline-offset-2 hover:text-green/80"
                >
                  privacy@kontafy.com
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
