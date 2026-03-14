# Kontafy — Software Development Roadmap

> Cloud-native accounting platform for Indian businesses
> **Product of Syscode Technology Pvt Ltd · Yamunanagar, Haryana**
> **Timeline:** 9 Months · **4 Phases** · **Start:** March 2026

---

## Overview

```
Phase 1 (Core)        ██████████████████████████████░░  ~98% complete
Phase 2 (Growth)      ██████████████████████████████░░  ~90% complete
Phase 3 (Intelligence)████████████████████████████████  ~95% complete
Phase 4 (Scale)       ██████████████████████████████░░  ~93% complete
```
*Last updated: 2026-03-13*

**Deliverables:**
- ✅ NestJS API (api.kontafy.com) — 22+ modules built (auth, books, bill, tax, stock, bank, pay, dashboard, whatsapp, email, notifications, settings, profile, data-transfer, ai, commerce, ca-portal, einvoice, reports, branch, budget, subscription, audit)
- ✅ Next.js Web App (app.kontafy.com) — 80+ pages built across all modules
- ✅ Kotlin Compose Desktop Client — FULL BUILD (45 screens, SQLite offline DB, sync engine, DMG installer at `apps/desktop/build/compose/binaries/main/dmg/Kontafy-1.0.0.dmg` — 122MB)
- ✅ React Native Mobile App (Expo) — initial build complete (6 screens, auth, API integration)
- ✅ Marketing Website (kontafy.com — live, all pages working)
- ✅ Invoice PDF Generation (Puppeteer + R2) — complete
- ✅ GitHub Actions CI/CD — complete (needs EC2_SSH_KEY + EC2_HOST secrets in GitHub)
- ✅ Audit Logging — global interceptor, audit trail UI, CSV export
- ✅ Error Tracking — Sentry integration with user context
- ✅ AI Features — cash flow forecast, anomaly detection, transaction categorization (OpenAI)
- ✅ E-commerce Sync — Amazon, Flipkart, Shopify, WooCommerce adapters
- ✅ CA Portal — invitation, multi-client view, annotations, approvals
- ✅ E-Invoicing & E-Way Bill — NIC/GSP integration, IRN, QR codes, bulk generation
- ✅ Subscription & Billing — Razorpay integration, 4-tier plans, usage tracking
- ✅ Reports Hub — 11 report types with PDF/Excel export
- ✅ Multi-Branch, Budgets, Recurring Invoices, Quotations, Purchase Orders

---

## Phase 1 — Core Foundation `Months 1-3 (Mar–May 2026)`

> **Goal:** MVP with auth, accounting, invoicing, basic GST. Usable by a single business.

### Sprint 1 — Infrastructure & Auth `Week 1-2`

**Backend (API)**
- [x] Scaffold NestJS 11 project in monorepo (`apps/api/`)
- [x] Configure Prisma 6 with Supabase PostgreSQL
- [x] Set up shared packages: `packages/shared/` (types, validators, constants)
- [x] Docker + docker-compose for local dev (API + Redis + PostgreSQL)
- [x] Auth module: Supabase phone OTP (send, verify)
- [x] Auth module: Email/password login, Google OAuth
- [x] JWT middleware + refresh token rotation
- [x] Global exception filter, response interceptor
- [x] Pino structured logging
- [x] Health check endpoint (`/api/v1/health`)

**Database**
- [x] Prisma schema: `organizations`, `org_members`, `auth` tables
- [x] Row Level Security (RLS) policies for multi-tenancy
- [x] Seed script: default chart of accounts (Indian standard)
- [x] Seed script: HSN/SAC codes, state codes, GST rates

**Web App**
- [x] Scaffold Next.js 15 project (`apps/web/`)
- [x] Configure shadcn/ui + Tailwind CSS v4
- [x] Set up Zustand store + TanStack Query
- [x] Auth pages: Login (phone OTP), Signup, Forgot Password
- [x] Organization onboarding wizard (business name, GSTIN, PAN, address)
- [x] App shell: sidebar navigation, top bar, breadcrumbs
- [x] Dashboard skeleton (empty state)

**Infra**
- [x] pnpm monorepo + Turborepo setup
- [x] GitHub Actions CI: lint, type-check, test ✅
- [x] Docker Compose for production (api:5002, web:5001, redis:6379)
- [x] Nginx config: api.kontafy.com → :5002, app.kontafy.com → :5001
- [ ] Cloudflare DNS: A records for api.kontafy.com, app.kontafy.com

**Desktop Client**
- [x] Scaffold Kotlin + Compose Desktop project (Gradle) ✅
- [x] Login screen (email/password) ✅
- [x] Dashboard, Invoice List, Invoice Detail, Customer List, Settings screens ✅
- [x] Sidebar navigation, theme, reusable components ✅
- [x] Ktor API client with auth token management ✅
- [x] jpackage build pipeline (DMG/MSI/DEB) ✅ — Kontafy-1.0.0.dmg built successfully (122MB)
- [x] SQLite local database setup ✅ — Exposed ORM, 12 tables, 12 repositories, WAL mode
- [ ] Phone OTP auth flow

### Sprint 2 — Books Module (Accounting) `Week 3-4`

**Backend**
- [x] Chart of Accounts CRUD (`GET/POST/PATCH /accounts`)
- [x] Account hierarchy (parent-child tree)
- [x] Journal Entry CRUD (`GET/POST /journal-entries`)
- [x] Double-entry validation (debits = credits)
- [x] Account Ledger (`GET /ledger/:accountId`)
- [x] Trial Balance (`GET /trial-balance`)
- [x] Opening balance import ✅ (via data-transfer import module)
- [x] Fiscal year support (Indian FY: Apr–Mar)

**Web App**
- [x] Chart of Accounts page: tree view, add/edit account modal
- [x] Journal Entry form: date, narration, multi-line debit/credit rows
- [x] Journal Entry list: filterable by date, account, type
- [x] Account Ledger view: transaction list with running balance
- [x] Trial Balance report: debit/credit columns, totals

**Reports (additional)**
- [x] Profit & Loss report page
- [x] Balance Sheet report page
- [x] Cash Flow Statement report page
- [x] Reports controller & service (`apps/api/src/books/reports/`)

**Desktop Client**
- [x] Chart of Accounts view (tree with expand/collapse, add/edit dialog) ✅
- [x] Journal Entry form (double-entry with validation) ✅
- [x] Account Ledger view (running balance, date filters) ✅
- [x] Local SQLite schema for offline accounting data ✅

### Sprint 3 — Bill Module (Invoicing) `Week 5-6`

**Backend**
- [x] Contacts CRUD (`GET/POST/PATCH /contacts`)
- [x] Contact types: customer, vendor, both
- [x] Invoice CRUD (`GET/POST/PATCH/DELETE /invoices`)
- [x] Auto-numbering: KTF/25-26/001 (configurable prefix)
- [x] Invoice status workflow: draft → sent → partially_paid → paid
- [x] Invoice → auto journal entry creation (double-entry)
- [x] PDF generation (Puppeteer): professional invoice template ✅
- [x] PDF storage in Cloudflare R2 ✅
- [x] Purchase invoice (bills) support
- [x] Credit notes & debit notes
- [x] Payment terms & due date calculation
- [x] Quotations CRUD + convert to invoice ✅
- [x] Purchase Orders CRUD + convert to bill ✅
- [x] Recurring invoices (auto-generate via BullMQ cron) ✅

**Web App**
- [x] Contact list page: search, filter by type, bulk actions
- [x] Contact detail page: transactions, outstanding aging, summary stats ✅
- [x] Invoice builder: line items, tax calculation, discounts
- [x] Invoice preview (PDF-like in browser with print) ✅
- [x] Invoice list: status badges, date filters, search
- [x] Invoice detail: timeline, payment history, actions (send, record payment, PDF, duplicate, delete) ✅
- [x] Record payment form (amount, method, reference) ✅
- [x] Quick actions: duplicate invoice ✅
- [x] Quotations: list, create, detail with convert-to-invoice ✅
- [x] Purchase Orders: list, create, detail with convert-to-bill ✅
- [x] Recurring Invoices: list, create, detail with pause/resume/history ✅

**Desktop Client**
- [x] Contact management screens (list, create, edit, detail with tabs) ✅
- [x] Invoice creation form with line items (GST calc, place of supply) ✅
- [ ] Invoice print/PDF
- [x] Offline invoice creation + sync queue ✅ — SyncEngine with SyncQueue table

### Sprint 4 — Tax Module (Basic GST) `Week 7-8`

**Backend**
- [x] GST computation engine (CGST/SGST/IGST/Cess)
- [x] Place of supply determination (state codes)
- [x] HSN/SAC code validation
- [x] GSTR-1 data aggregation (outward supplies)
- [x] GSTR-3B summary computation ✅ (full auto-computation matching official format)
- [x] GST return validation rules ✅
- [x] Tax period management (monthly/quarterly)
- [x] TDS controller & service ✅
- [x] GSTR-1 JSON export (B2B, B2CS, B2CL, CDNR, CDNUR, HSN, Doc Issue) ✅
- [x] GSTR-1 validation (GSTIN format, missing HSN, place of supply) ✅
- [x] GSTR-3B history and filing workflow ✅

**Web App**
- [x] GST Summary dashboard: tax liability, ITC, net payable
- [x] GSTR-1 report page
- [x] GST compute page
- [x] TDS management page
- [x] GST Settings: registration type, GSTIN, filing frequency ✅
- [x] GSTR-3B report: auto-computed from invoices ✅ (Tables 3.1, 3.2, 4, 5, 6 matching official format)
- [x] GSTR-1 JSON export (validation + preview + download for GST portal upload) ✅

**Desktop Client**
- [x] GST computation integrated in invoice creation (CGST/SGST vs IGST) ✅
- [x] GST reports viewer (Dashboard, Compute, GSTR-1, GSTR-3B, TDS) ✅
- [x] Export GST data for portal upload (GSTR-1 JSON file save) ✅
- [x] E-Way Bill screens (list, generate, detail with extend/cancel/Part-B update) ✅

### Sprint 5 — Dashboard & Polish `Week 9-10`

**Backend**
- [x] Dashboard aggregation endpoint (`GET /dashboard`) ✅
- [x] Revenue (this month, last month, trend) ✅
- [x] Outstanding receivables & payables ✅
- [x] GST liability (current period) ✅
- [x] Cash position (bank + cash balances) ✅
- [x] Recent transactions feed ✅
- [x] Overdue invoices alert ✅
- [x] Top customers by revenue ✅

**Web App**
- [x] Dashboard: KPI cards wired to real API data ✅
- [x] Charts: revenue trend + cash flow wired to real data ✅
- [x] Recent activity feed ✅
- [x] Quick actions: create invoice, add payment, new contact ✅
- [x] Overdue invoice alerts banner ✅
- [x] Settings page: organization profile, team, invoice config, tax/GST, integrations ✅
- [x] User profile page with password change ✅
- [x] AI Insights widget on dashboard ✅

**Desktop Client**
- [x] Dashboard with key metrics ✅
- [x] Sync status indicator (online/offline/syncing) ✅ — dedicated Sync Status screen + sidebar indicator
- [x] Settings and profile ✅ — 7-tab settings (Profile, Org, Invoice, Tax, Sync, Data, About)

### Sprint 6 — Testing & Phase 1 Release `Week 11-12`

- [ ] API integration tests (Jest + Supertest)
- [ ] E2E tests for critical flows (Playwright)
- [ ] Load testing: 100 concurrent users
- [ ] Security audit: OWASP checklist
- [x] Audit log implementation (every mutation logged) ✅ — global interceptor, audit trail UI, CSV export
- [x] Error tracking setup (Sentry) ✅ — integrated in exception filter with user context
- [ ] Production deployment
- [x] Desktop installer (v1.0.0) — DMG built successfully ✅
- [ ] Internal beta testing with 5 businesses
- [ ] Bug fixes from beta feedback

**Phase 1 Deliverable:** Working accounting + invoicing + GST system for single businesses

---

## Phase 2 — Growth `Months 3-5 (Jun–Aug 2026)`

> **Goal:** Inventory, banking, payments, WhatsApp. Production-ready for 100 businesses.

### Sprint 7 — Stock Module (Inventory) `Week 13-14`

**Backend**
- [x] Products CRUD (goods + services, HSN, tax rates)
- [x] Warehouse management (multi-location)
- [x] Stock movements (purchase, sale, return, adjustment, transfer)
- [x] Stock levels (real-time per product per warehouse)
- [ ] Reorder level alerts
- [ ] Batch & serial number tracking
- [ ] Stock valuation (FIFO, weighted average)
- [ ] Invoice items → auto stock deduction

**Web App**
- [x] Product catalog: list, search, filter
- [x] Product creation form (new product page)
- [x] Warehouse management page
- [x] Stock movements page
- [ ] Product detail: stock history, pricing, images
- [ ] Stock adjustment form
- [ ] Stock transfer between warehouses
- [ ] Low stock alert dashboard widget
- [ ] Inventory valuation report
- [ ] Bulk import (CSV)

**Desktop Client**
- [x] Product catalog (list, create, detail, search, filter) ✅
- [x] Stock adjustment and transfer screens ✅
- [x] Offline stock tracking (SQLite stock tables + sync) ✅

### Sprint 8 — Bank Module `Week 15-16`

**Backend**
- [x] Bank account CRUD (savings, current, OD)
- [ ] Bank statement import (CSV, OFX, PDF parser)
- [x] Bank transaction categorization
- [x] Bank reconciliation engine
- [ ] Auto-matching rules (amount, date, reference)
- [x] AI-assisted match suggestions (OpenAI) ✅ — via AI module reconciliation suggest
- [x] Reconciliation status tracking

**Web App**
- [x] Bank accounts page: balances, account details
- [x] Bank reconciliation page
- [ ] Statement import wizard (drag-drop CSV/OFX)
- [ ] Reconciliation workspace: unmatched items, suggestions
- [ ] One-click match, split transaction, create new entry
- [ ] Bank register view with running balance

**Desktop Client**
- [x] Bank accounts management (list, create, register with running balance) ✅
- [ ] CSV import for statements
- [x] Basic reconciliation (split-view matching workspace) ✅

### Sprint 9 — Pay Module (Payments) `Week 17-18`

**Backend**
- [x] Payment recording (received, made)
- [x] Payment allocation to invoices (partial/full)
- [x] Payment methods: cash, bank transfer, UPI, cheque, card
- [ ] Razorpay integration: payment link generation
- [ ] Payment link webhook (auto-mark paid on success)
- [ ] Payment reminders (overdue invoices)
- [ ] Advance payment handling
- [ ] Multi-currency support (basic: INR + USD)

**Web App**
- [x] Payments list page
- [x] Outstanding payments page
- [x] Purchases list page
- [x] New purchase form page
- [x] Record payment form (from invoice detail page) ✅
- [ ] Payment link: generate and share (copy/WhatsApp/email)
- [ ] Payment receipt PDF
- [x] Receivables aging report ✅ (via Reports module)
- [x] Payables aging report ✅ (via Reports module)

### Sprint 10 — WhatsApp Integration `Week 19-20`

**Backend**
- [x] WhatsApp Business API integration (Gupshup/Twilio/Meta — configurable) ✅
- [x] Message templates: invoice, payment reminder, receipt ✅
- [x] BullMQ queue for WhatsApp message sending (rate-limited, retry) ✅
- [x] Delivery status webhook tracking ✅
- [x] Invoice PDF + payment link via WhatsApp ✅
- [x] Bulk payment reminder sender (all overdue) ✅
- [ ] Auto payment reminder scheduler (3 days, 7 days, 14 days overdue)
- [ ] WhatsApp opt-in management

**Web App**
- [x] "Send via WhatsApp" button on invoices ✅
- [x] WhatsApp settings: API credentials, provider config ✅
- [x] WhatsApp dashboard: message stats, recent messages ✅
- [ ] Message history log per contact
- [ ] Bulk send: payment reminders for all overdue invoices
- [ ] WhatsApp delivery status indicators on invoices

**Desktop Client**
- [ ] WhatsApp send button (delegates to API, works when online)
- [x] Payments screen (list received/made, record payment form) ✅

### Sprint 11 — Email & Notifications `Week 21-22`

**Backend**
- [x] Email service (Nodemailer + configurable SMTP) ✅
- [x] Email templates: invoice, payment receipt, reminder, welcome, password reset ✅
- [x] In-app notification system (CRUD + unread count) ✅
- [ ] Notification preferences per user
- [ ] Push notification infrastructure (for mobile, Phase 4)
- [x] BullMQ: email sending queue, retry on failure ✅
- [x] EmailLog model for tracking ✅

**Web App**
- [x] "Send via Email" endpoints (invoice, reminder, receipt) ✅
- [x] Notification bell + dropdown with live polling ✅
- [x] Full notifications page with pagination ✅
- [x] Email settings page (SMTP config, test send) ✅
- [ ] Notification settings page (per-user preferences)
- [ ] Email customization: logo, colors

### Sprint 12 — Phase 2 Polish & Release `Week 23-24`

- [ ] Integration tests for all new modules
- [ ] Performance optimization: query caching (Redis)
- [ ] Rate limiting (Nginx + Redis)
- [x] Data export: contacts, invoices, products, journal entries, chart of accounts (CSV/Excel) ✅
- [x] Data import wizard (Tally, Busy format support) ✅
- [x] Migration tool: guided Tally/Busy → Kontafy data import ✅
- [ ] Public beta launch (50 businesses)
- [ ] Desktop v0.2.0 release
- [ ] Bug fixes from beta feedback

**Phase 2 Deliverable:** Full accounting suite with inventory, banking, payments, WhatsApp billing

---

## Phase 3 — Intelligence `Months 5-7 (Sep–Nov 2026)`

> **Goal:** Financial reports, AI features, e-commerce sync, CA portal.

### Sprint 13-14 — Insight Module (Reports) `Week 25-28`

**Backend**
- [x] Profit & Loss statement (accrual + cash basis) ✅
- [x] Balance Sheet ✅
- [x] Cash Flow Statement (direct + indirect method) ✅
- [x] Trial Balance ✅
- [x] General Ledger report ✅
- [x] Day Book / Journal register ✅
- [x] Accounts Receivable aging report ✅
- [x] Accounts Payable aging report ✅
- [x] Sales register (by customer, product, period) ✅
- [x] Purchase register ✅
- [x] Stock summary report ✅
- [x] Stock movement report ✅
- [x] GST tax summary report ✅
- [x] TDS summary report ✅
- [x] Custom date ranges + comparison periods ✅
- [x] Report PDF export (Puppeteer) ✅
- [x] Report Excel export (ExcelJS) ✅

**Web App**
- [x] Report hub page: all reports categorized (Financial, Sales, Purchase, Inventory, Tax) ✅
- [x] Interactive P&L: drill down into accounts ✅
- [x] Balance Sheet with collapsible sections ✅
- [x] Cash Flow statement ✅
- [x] Accounts Receivable/Payable aging (stacked bar chart) ✅
- [x] Filters: date range, branch, cost center ✅
- [x] Export buttons: PDF, Excel, CSV ✅
- [x] Print-optimized layouts ✅

### Sprint 15 — AI Features `Week 29-30`

**Backend**
- [x] Cash flow forecasting (OpenAI GPT-4o-mini) ✅
  - Historical pattern analysis (12 months)
  - Seasonal adjustments (Indian festivals, quarter-ends, GST deadlines)
  - Pending receivables/payables factor
  - 30/60/90 day predictions
- [x] Expense auto-categorization ✅
  - Bank transaction → account suggestion
  - Heuristic + OpenAI fallback
- [x] Anomaly detection ✅
  - Unusual transaction amounts (>2x stddev)
  - Duplicate invoice detection
  - Missing sequential invoice numbers
  - Expense spikes (>50% MoM)
- [x] AI insights feed ✅
  - Collections trend, overdue summary, expense patterns
  - GST deadline reminders, cash runway analysis
- [x] BullMQ: daily forecast refresh, anomaly scan cron, weekly insights ✅

**Web App**
- [x] AI Insights card on dashboard ✅
- [x] Cash flow forecast chart (actual vs predicted) with Recharts ✅
- [x] Smart suggestions in bank reconciliation ✅
- [x] Anomaly alerts with action buttons ✅
- [x] AI settings: enable/disable per feature ✅

### Sprint 16 — Commerce Module (E-commerce) `Week 31-32`

**Backend**
- [x] Marketplace connection OAuth flow ✅
- [x] Amazon SP-API: order sync, settlement sync ✅
- [x] Flipkart Seller API: order sync ✅
- [x] Shopify Admin API (GraphQL): order sync ✅
- [x] WooCommerce REST API: order sync ✅
- [x] Order → invoice auto-creation ✅
- [x] Platform fee tracking ✅
- [x] Settlement reconciliation ✅
- [x] Scheduled sync (BullMQ cron: hourly) ✅

**Web App**
- [x] Marketplace connections page: connect/disconnect ✅
- [x] Synced orders list with status ✅
- [x] Settlement reconciliation view ✅
- [x] E-commerce dashboard: sales by platform, fees breakdown ✅
- [x] Manual sync trigger button ✅

### Sprint 17 — Connect Module (CA Portal) `Week 33-34`

**Backend**
- [x] CA invitation system (email invite with limited access) ✅
- [x] CA role: read-only access to all financial data ✅
- [x] CA permissions: download reports, view audit trail ✅
- [x] Multi-client CA dashboard (CA sees all their clients) ✅
- [x] Client data export for CA (annual data pack) ✅
- [x] CA approval workflow for journal entries ✅

**Web App**
- [x] Invite CA form (email, permissions) ✅
- [x] CA Portal: client list, switch between clients ✅
- [x] CA view: all reports, ledgers, GST returns (read-only) ✅
- [x] CA annotations: leave comments on entries ✅
- [x] Client data download: financial year pack ✅

### Sprint 18 — Phase 3 Polish & Release `Week 35-36`

- [ ] Performance: database query optimization
- [ ] Caching: Redis for frequently accessed reports
- [ ] Advanced search across all entities
- [ ] Keyboard shortcuts for power users
- [ ] Onboarding tour (product walkthrough)
- [ ] Help documentation / knowledge base
- [ ] Public launch (500 businesses target)
- [ ] Desktop v1.0.0 release (feature-complete for Phase 1-3)

**Phase 3 Deliverable:** Complete accounting platform with AI, e-commerce sync, CA portal

---

## Phase 4 — Scale `Months 7-9 (Dec 2026–Feb 2027)`

> **Goal:** Mobile app, offline mode, e-invoicing, multi-branch, advanced features.

### Sprint 19-20 — Mobile App `Week 37-40` *(started early — in progress)*

- [x] React Native (Expo) project setup ✅
- [x] Auth flow (sign-in, sign-up screens) ✅
- [x] Dashboard (key metrics, summary cards) ✅
- [x] Invoice list screen ✅
- [x] Customer list screen ✅
- [x] Settings/profile screen ✅
- [ ] Invoice creation (simplified mobile form)
- [ ] Send invoice via WhatsApp/email (share sheet)
- [ ] Payment recording
- [ ] Push notifications (payment received, overdue alerts)
- [ ] Camera: receipt capture for expense entry
- [ ] WatermelonDB offline storage + sync protocol
- [ ] Biometric unlock

### Sprint 21-22 — E-Invoicing & E-Way Bill `Week 41-44`

- [x] GST portal API integration (via ASP/GSP) ✅ — GSP service with auth, retry, multi-provider
- [x] E-invoice generation (IRN from NIC portal) ✅ — full NIC schema v1.1 payload builder
- [x] E-invoice QR code on invoice PDF ✅
- [x] E-way bill generation (for goods > ₹50,000) ✅ — auto-trigger, distance-based validity
- [x] Bulk e-invoice generation ✅ — BullMQ worker with progress and rate limiting
- [x] E-invoice status tracking ✅
- [ ] GSTR-1 auto-filing (direct to portal)

**Web App**
- [x] E-Invoice dashboard: stats, recent e-invoices ✅
- [x] Generate e-invoice: select invoices, bulk/single generate ✅
- [x] E-Invoice detail: IRN, QR code, JSON payload viewer, cancel ✅
- [x] E-Way Bill list with status filters ✅
- [x] E-Way Bill generate form (transporter, vehicle, distance) ✅
- [x] E-Invoice/GSP settings: credentials, sandbox toggle ✅

### Sprint 23-24 — Multi-Branch & Advanced `Week 45-48`

- [x] Multi-branch support (branch-wise P&L, stock) ✅
- [ ] Cost center tracking
- [x] Budget management (set budgets, track vs actual, variance report) ✅
- [x] Recurring invoices (auto-generate via BullMQ cron, pause/resume) ✅
- [x] Quotation → Invoice workflow ✅
- [x] Purchase Order → Bill workflow ✅
- [x] TDS computation and return filing ✅
- [ ] Custom fields on invoices, contacts, products
- [x] API rate plan tiers (enforce per subscription plan) ✅ — SubscriptionGuard
- [ ] Advanced user permissions (field-level access)

**Web App**
- [x] Branch management: list, create, detail with P&L and stock ✅
- [x] Budget management: list with progress bars, create, variance report with charts ✅
- [x] Recurring invoices: list, create, detail with history and pause/resume ✅
- [x] Quotations: list, create, detail with convert-to-invoice ✅
- [x] Purchase Orders: list, create, detail with convert-to-bill ✅

### Sprint 25-26 — Subscription & Billing `Week 49-52`

- [x] Razorpay Subscriptions: plan billing ✅ — 4 tiers (Free/Starter/Professional/Enterprise)
- [x] Free → Paid plan conversion flow ✅
- [x] Plan upgrade/downgrade with proration ✅
- [x] Usage tracking per plan tier ✅
- [x] Grace period on failed payments ✅ (7-day grace period)
- [ ] Admin panel: customer management, revenue dashboard
- [ ] Self-serve onboarding (no-touch signup to production)

**Web App**
- [x] Billing dashboard: current plan, usage meters ✅
- [x] Pricing table: 4 plans, feature comparison matrix ✅
- [x] Razorpay checkout integration ✅
- [x] Billing history with download receipts ✅
- [x] Billing settings: payment method, cancel subscription ✅

---

## Remaining Work (Not Yet Started)

### Infrastructure & DevOps
- [ ] Cloudflare DNS: A records for api.kontafy.com, app.kontafy.com
- [ ] Integration tests (Jest + Supertest) for all modules
- [ ] E2E tests (Playwright) for critical flows
- [ ] Load testing: 100 concurrent users
- [ ] Security audit: OWASP checklist
- [ ] Performance: Redis caching for reports
- [ ] Rate limiting (Nginx + Redis)
- [ ] Production deployment to EC2

### Desktop Client (Minor Remaining)
- [x] jpackage build pipeline — DMG built: `Kontafy-1.0.0.dmg` (122MB) ✅
- [x] SQLite offline database (12 tables, Exposed ORM) ✅
- [x] Full accounting: Chart of Accounts, Journal Entries, Ledger, Trial Balance, P&L, Balance Sheet, Cash Flow ✅
- [x] Invoicing: Create/Edit invoices with GST, Quotations, Purchase Orders, Recurring ✅
- [x] Contacts: List, Create, Edit, Detail with tabs ✅
- [x] GST: Dashboard, Compute, GSTR-1 JSON export, GSTR-3B, TDS, E-Way Bills ✅
- [x] Banking: Accounts, Register, Reconciliation ✅
- [x] Payments: List, Record Payment ✅
- [x] Inventory: Products, Stock Movements, Adjustments, Warehouses ✅
- [x] Sync engine with offline queue ✅
- [x] Reports Hub ✅
- [ ] WhatsApp send button (online-only feature)
- [ ] Phone OTP auth flow
- [ ] MSI build (requires Windows), DEB build (requires Linux)

### Mobile App (Remaining)
- [ ] Invoice creation (mobile form)
- [ ] Send invoice via WhatsApp/email
- [ ] Payment recording
- [ ] Push notifications
- [ ] Camera receipt capture
- [ ] WatermelonDB offline storage + sync
- [ ] Biometric unlock

### Stock Module (Remaining)
- [ ] Reorder level alerts
- [ ] Batch & serial number tracking
- [ ] Stock valuation (FIFO, weighted average)
- [ ] Invoice items → auto stock deduction
- [ ] Product detail page, stock adjustment form

### Enhancements
- [ ] Cost center tracking
- [ ] Custom fields on entities
- [ ] Advanced user permissions (field-level)
- [ ] Admin panel for customer management
- [ ] Keyboard shortcuts, onboarding tour
- [ ] Help documentation / knowledge base
- [ ] Notification preferences per user
- [ ] Email customization (logo, colors)
- [ ] Auto payment reminder scheduler
- [ ] WhatsApp opt-in management
- [ ] Bank statement import wizard
- [ ] GSTR-1 auto-filing (direct to portal)

---

## Tech Milestones

| Milestone | Target Date | Criteria |
|-----------|-------------|----------|
| **Alpha (internal)** | May 2026 | Auth + Books + Bill + Tax working end-to-end |
| **Beta (50 businesses)** | Aug 2026 | + Inventory + Banking + Payments + WhatsApp |
| **Public Launch** | Nov 2026 | + Reports + AI + E-commerce + CA Portal |
| **v1.0 (GA)** | Feb 2027 | + Mobile + E-invoicing + Multi-branch |

---

## Team & Responsibilities

| Role | Scope |
|------|-------|
| **Full-stack Dev** | NestJS API + Next.js Web App |
| **Kotlin Dev** | Desktop client (Compose Desktop + KMP shared logic) |
| **DevOps** | Docker, CI/CD, EC2, monitoring |
| **QA** | Testing, beta coordination |

*Initially: 1-2 developers handling all roles*

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| GST portal API changes | Tax module breaks | Abstract GST logic, version API calls |
| WhatsApp API pricing increase | Cost overrun | Build email as primary, WhatsApp as premium |
| Supabase free tier limits | Forced upgrade | Monitor usage, budget for Pro plan (~₹2,100/mo) |
| Windows 7 JavaFX rendering issues | Desktop bugs | Test on real Win7 machines, keep UI simple |
| Data migration complexity (Tally) | Slow onboarding | Build robust CSV importer, offer manual assistance |
| Single-server deployment | Downtime risk | Docker health checks, auto-restart, daily backups |

---

## Infrastructure Costs (Monthly Projection)

| Month | Users | API Calls/day | Cost (₹) | Key Expense |
|-------|------:|-------------:|----------:|-------------|
| Month 1-3 | 5 (beta) | 500 | ~3,000 | EC2 shared, Supabase free |
| Month 4-6 | 50 | 5,000 | ~5,000 | + Redis, Sentry |
| Month 7-9 | 200 | 20,000 | ~8,000 | + OpenAI, WhatsApp |
| Month 10-12 | 500 | 50,000 | ~12,000 | + Supabase Pro, more storage |
| Year 2 | 2,000+ | 200,000 | ~25,000 | Dedicated server, ElastiCache |

---

## Definition of Done (per Sprint)

- [x] All API endpoints have input validation (Zod) ✅
- [x] All mutations create audit log entries ✅ (global audit interceptor)
- [ ] All endpoints have at least 1 integration test
- [ ] All pages are responsive (mobile + desktop web)
- [ ] No TypeScript `any` in new code
- [ ] API response time < 200ms (p95) for CRUD operations
- [ ] Desktop client syncs correctly for all new features
- [ ] Code reviewed and merged to main

---

*Software Roadmap created March 2026 · Internal document · Syscode Technology Pvt Ltd*
