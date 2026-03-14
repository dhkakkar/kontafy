# Kontafy — Software Architecture & Tech Stack

> Cloud-native accounting platform for Indian businesses
> **Product of Syscode Technology Pvt Ltd · Yamunanagar, Haryana**

---

## 1. Architecture Overview

### Pattern: Modular Monolith → Microservices

Start as a **modular monolith** (single deployable, internally bounded modules). This gives you:
- Fast development with a small team
- Shared database with clear module boundaries
- Easy refactoring and debugging
- Upgrade path to microservices when scale demands it

```
┌──────────────────────────────────────────────────────────────────┐
│                        KONTAFY PLATFORM                         │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Books   │ │   Bill   │ │  Stock   │ │   Tax    │           │
│  │(Accounts)│ │(Invoices)│ │(Inventory)│ │(GST/TDS)│           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │            │             │                  │
│  ┌────┴─────┐ ┌────┴─────┐ ┌───┴──────┐ ┌───┴──────┐          │
│  │   Bank   │ │ Insight  │ │   Pay    │ │ Commerce │           │
│  │(Banking) │ │(AI/Rpts) │ │(Payments)│ │(E-comm)  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │            │             │                  │
│  ┌────┴─────┐      │            │             │                  │
│  │ Connect  │      │            │             │                  │
│  │(Integr.) │      │            │             │                  │
│  └──────────┘      │            │             │                  │
│                    │            │             │                  │
│  ═══════════════ SHARED CORE ═════════════════════════           │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Auth   │ │  Tenant  │ │  Events  │ │  Files   │            │
│  │(Users)  │ │(Multi-co)│ │(EventBus)│ │(Storage) │            │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────────────────────────────────────────────────┘
         │              │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │PostgreSQL│   │  Redis  │   │   R2    │   │WhatsApp │
    │(Supabase)│   │ (Cache) │   │(Storage)│   │  API    │
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

---

## 2. Tech Stack

### Backend (API Server)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 22 LTS | Same ecosystem as website, large hiring pool in India |
| **Framework** | NestJS 11 | Enterprise patterns (DI, modules, guards), TypeScript-first, familiar from TMS project |
| **ORM** | Prisma 6 | Type-safe queries, migrations, works great with Supabase PostgreSQL |
| **Validation** | Zod + class-validator | Runtime schema validation for API inputs |
| **Auth** | Supabase Auth | Phone OTP (primary), email/password, Google OAuth |
| **Queue** | BullMQ + Redis | Background jobs: PDF generation, GST filing, bulk operations, WhatsApp |
| **Cache** | Redis | Session cache, rate limiting, frequently accessed data |
| **Search** | PostgreSQL Full-Text Search | Start simple, move to Meilisearch if needed |
| **Real-time** | Supabase Realtime / Socket.io | Live dashboard updates, notification pushes |
| **PDF Engine** | Puppeteer (headless Chrome) | Invoice PDFs, GST reports, financial statements |
| **Email** | Nodemailer + Gmail SMTP | Transactional emails (invoices, OTP, reports) |
| **WhatsApp** | WhatsApp Business API (via Gupshup/Wati) | Invoice delivery, payment reminders, notifications |
| **AI/ML** | OpenAI API (GPT-4o-mini) | Cash flow forecasting, expense categorization, anomaly detection |

### Frontend (Web App)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR for SEO pages, client for app dashboard |
| **UI Library** | shadcn/ui + Radix | Accessible, customizable, no vendor lock-in |
| **Styling** | Tailwind CSS v4 | Consistent with marketing website |
| **State** | Zustand + TanStack Query | Lightweight store + server state management |
| **Forms** | React Hook Form + Zod | Form validation with shared schemas |
| **Charts** | Recharts | Lightweight, React-native charting |
| **Tables** | TanStack Table | Virtual scrolling, sorting, filtering for ledgers |
| **Date Handling** | day.js | Lightweight, Indian fiscal year support |
| **Animations** | Motion (Framer Motion) | Consistent with website |

### Desktop Client (Windows — Phase 2)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | Kotlin | Modern JVM language, excellent Java interop, KMP for code sharing |
| **UI Framework** | JavaFX 21 (via Azul Zulu JDK) | Only modern UI toolkit supporting Windows 7 SP1+, hardware-accelerated |
| **JDK** | Azul Zulu 21 LTS (with JavaFX bundled) | Free commercial use, extended Windows 7 support, 10+ year LTS |
| **Theme** | AtlantaFX | Modern Material/Fluent-style theming for JavaFX, no custom CSS needed |
| **Local Database** | SQLite (via sqlite-jdbc) | Offline-first, zero-config, reliable, small footprint |
| **Sync Protocol** | Event-sourced (via REST API) | Offline edits stored as events, synced when online, conflict resolution |
| **Packaging** | jpackage (JDK 21) | Creates native `.msi`/`.exe` installer, bundles JRE, no Java install required |
| **Code Sharing** | Kotlin Multiplatform (KMP) | Share business logic (validation, GST calc, models) with Android app |
| **HTTP Client** | Ktor Client | Kotlin-native, coroutine-based, multiplatform compatible |
| **DI** | Koin | Lightweight, Kotlin-first dependency injection |

**Why JavaFX over Electron/Tauri/Flutter:**
- Windows 7 SP1 is a hard requirement (40%+ target users)
- Electron requires Windows 10+, Tauri requires WebView2 (Win 10+), Flutter Desktop requires Win 10+
- JavaFX on Azul Zulu 21 is the **only** modern UI framework that works on Windows 7 SP1+
- ~50MB installer (vs 200MB+ Electron), low RAM usage, native performance

### Mobile App (Phase 3)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native (Expo) | Code sharing with web, single team needed |
| **Offline** | WatermelonDB | SQLite-based offline-first storage |
| **Sync** | Custom sync protocol over REST | Conflict resolution for offline edits |

### Infrastructure

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Database** | Supabase PostgreSQL | Managed, Row Level Security, real-time, free tier |
| **Hosting** | AWS EC2 (ap-south-1) | Already have infrastructure, Mumbai = low latency for India |
| **Container** | Docker + Docker Compose | Consistent deploys, same as existing projects |
| **Reverse Proxy** | Nginx | SSL termination, rate limiting, load balancing |
| **Object Storage** | Cloudflare R2 | Invoice PDFs, attachments, backups (syscode-uploads bucket, `kontafy/` prefix) |
| **CDN** | Cloudflare | DNS, DDoS protection, edge caching |
| **CI/CD** | GitHub Actions | Build, test, deploy on push to main |
| **Monitoring** | Sentry (errors) + Uptime Robot (availability) | Free tiers sufficient initially |
| **Logging** | Pino (structured JSON) → CloudWatch | Searchable logs, alerting |
| **Redis** | Self-hosted on EC2 (Docker) | Start self-hosted, move to ElastiCache when needed |
| **Secrets** | .env files (local) → AWS Secrets Manager (prod) | Secure credential management |

---

## 3. Database Design

### Multi-Tenancy Strategy

**Shared database, schema-level isolation using `organization_id`** on every table.

Row Level Security (RLS) in Supabase ensures users can only access their organization's data.

### Core Schema (simplified)

```sql
-- ═══════════════════════════════════════════════════════════════
-- CORE: Auth & Organizations
-- ═══════════════════════════════════════════════════════════════

-- Managed by Supabase Auth
-- auth.users → id, phone, email, email_confirmed_at, etc.

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  legal_name      TEXT,
  gstin           VARCHAR(15),        -- GST Identification Number
  pan             VARCHAR(10),        -- PAN
  cin             VARCHAR(21),        -- Company Identification Number
  business_type   TEXT,               -- proprietorship, partnership, pvt_ltd, llp
  industry        TEXT,               -- retail, manufacturing, services, etc.
  address         JSONB,              -- {line1, line2, city, state, pincode}
  phone           VARCHAR(15),
  email           TEXT,
  logo_url        TEXT,
  fiscal_year_start INTEGER DEFAULT 4, -- April (Indian FY)
  currency        VARCHAR(3) DEFAULT 'INR',
  plan            TEXT DEFAULT 'starter', -- starter, silver, gold, platinum, enterprise
  plan_expires_at TIMESTAMPTZ,
  settings        JSONB DEFAULT '{}', -- invoice prefix, decimal places, etc.
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,      -- owner, admin, accountant, viewer, ca
  permissions     JSONB DEFAULT '{}', -- granular: {modules: ["books","bill"], actions: ["read","write"]}
  invited_by      UUID REFERENCES auth.users(id),
  joined_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Books (Chart of Accounts & General Ledger)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code            VARCHAR(20),        -- Account code (e.g., 1001)
  name            TEXT NOT NULL,       -- e.g., "Cash in Hand"
  type            TEXT NOT NULL,       -- asset, liability, equity, income, expense
  sub_type        TEXT,                -- current_asset, fixed_asset, etc.
  parent_id       UUID REFERENCES accounts(id), -- For account hierarchy
  is_system       BOOLEAN DEFAULT false, -- System accounts can't be deleted
  opening_balance DECIMAL(15,2) DEFAULT 0,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number    SERIAL,
  date            DATE NOT NULL,
  narration       TEXT,
  reference       TEXT,               -- Linked document (invoice, payment, etc.)
  reference_type  TEXT,               -- invoice, payment, expense, manual
  reference_id    UUID,
  is_posted       BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE journal_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES accounts(id),
  debit           DECIMAL(15,2) DEFAULT 0,
  credit          DECIMAL(15,2) DEFAULT 0,
  description     TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Bill (Invoicing & Contacts)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,       -- customer, vendor, both
  name            TEXT NOT NULL,
  company_name    TEXT,
  gstin           VARCHAR(15),
  pan             VARCHAR(10),
  email           TEXT,
  phone           VARCHAR(15),
  whatsapp        VARCHAR(15),
  billing_address JSONB,
  shipping_address JSONB,
  payment_terms   INTEGER DEFAULT 30, -- Days
  credit_limit    DECIMAL(15,2),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,       -- Auto-generated: KTF/24-25/001
  type            TEXT NOT NULL,       -- sale, purchase, credit_note, debit_note
  status          TEXT DEFAULT 'draft', -- draft, sent, partially_paid, paid, overdue, cancelled
  contact_id      UUID REFERENCES contacts(id),
  date            DATE NOT NULL,
  due_date        DATE,
  place_of_supply VARCHAR(2),          -- State code for GST
  is_igst         BOOLEAN DEFAULT false, -- Inter-state supply
  subtotal        DECIMAL(15,2),
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  total           DECIMAL(15,2),
  amount_paid     DECIMAL(15,2) DEFAULT 0,
  balance_due     DECIMAL(15,2),
  notes           TEXT,
  terms           TEXT,
  pdf_url         TEXT,               -- Stored in R2
  e_invoice_irn   TEXT,               -- E-invoice IRN from GST portal
  e_invoice_ack   TEXT,               -- E-invoice acknowledgement
  eway_bill_no    TEXT,               -- E-way bill number
  whatsapp_sent   BOOLEAN DEFAULT false,
  email_sent      BOOLEAN DEFAULT false,
  journal_id      UUID REFERENCES journal_entries(id),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     TEXT NOT NULL,
  hsn_code        VARCHAR(8),          -- HSN/SAC code
  quantity        DECIMAL(10,3) NOT NULL,
  unit            TEXT DEFAULT 'pcs',  -- pcs, kg, ltr, hrs, etc.
  rate            DECIMAL(15,2) NOT NULL,
  discount_pct    DECIMAL(5,2) DEFAULT 0,
  taxable_amount  DECIMAL(15,2),
  cgst_rate       DECIMAL(5,2) DEFAULT 0,
  cgst_amount     DECIMAL(15,2) DEFAULT 0,
  sgst_rate       DECIMAL(5,2) DEFAULT 0,
  sgst_amount     DECIMAL(15,2) DEFAULT 0,
  igst_rate       DECIMAL(5,2) DEFAULT 0,
  igst_amount     DECIMAL(15,2) DEFAULT 0,
  cess_rate       DECIMAL(5,2) DEFAULT 0,
  cess_amount     DECIMAL(15,2) DEFAULT 0,
  total           DECIMAL(15,2)
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Stock (Inventory)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sku             TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'goods', -- goods, services
  hsn_code        VARCHAR(8),
  unit            TEXT DEFAULT 'pcs',
  purchase_price  DECIMAL(15,2),
  selling_price   DECIMAL(15,2),
  tax_rate        DECIMAL(5,2),        -- GST rate: 0, 5, 12, 18, 28
  track_inventory BOOLEAN DEFAULT true,
  reorder_level   DECIMAL(10,3),
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE warehouses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         JSONB,
  is_default      BOOLEAN DEFAULT false
);

CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  type            TEXT NOT NULL,       -- purchase, sale, return, adjustment, transfer
  quantity        DECIMAL(10,3) NOT NULL, -- +ve for in, -ve for out
  reference_type  TEXT,               -- invoice, purchase_order, manual
  reference_id    UUID,
  batch_number    TEXT,
  serial_number   TEXT,
  cost_price      DECIMAL(15,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stock_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  quantity        DECIMAL(10,3) DEFAULT 0,
  reserved        DECIMAL(10,3) DEFAULT 0, -- Reserved for pending orders
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, product_id, warehouse_id)
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Tax (GST Returns & TDS)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE gst_returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  return_type     TEXT NOT NULL,       -- GSTR1, GSTR3B, GSTR9, GSTR2A
  period          TEXT NOT NULL,       -- "2026-03" (month) or "2025-26" (annual)
  status          TEXT DEFAULT 'draft', -- draft, validated, filed, error
  data            JSONB,              -- Computed return data
  filed_at        TIMESTAMPTZ,
  arn             TEXT,               -- Acknowledgement Reference Number
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tds_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  section         TEXT NOT NULL,       -- 194C, 194J, 194H, etc.
  transaction_date DATE NOT NULL,
  gross_amount    DECIMAL(15,2),
  tds_rate        DECIMAL(5,2),
  tds_amount      DECIMAL(15,2),
  payment_id      UUID,
  status          TEXT DEFAULT 'pending', -- pending, deducted, deposited, filed
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Bank (Banking & Reconciliation)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_name    TEXT NOT NULL,
  bank_name       TEXT,
  account_number  TEXT,
  ifsc            VARCHAR(11),
  account_type    TEXT,               -- savings, current, overdraft
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  account_id      UUID REFERENCES accounts(id), -- Link to chart of accounts
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bank_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id),
  date            DATE NOT NULL,
  description     TEXT,
  reference       TEXT,               -- Cheque no, UTR, etc.
  amount          DECIMAL(15,2) NOT NULL,
  type            TEXT NOT NULL,       -- credit, debit
  balance         DECIMAL(15,2),
  source          TEXT DEFAULT 'manual', -- manual, import, api
  is_reconciled   BOOLEAN DEFAULT false,
  matched_entry_id UUID REFERENCES journal_entries(id),
  ai_suggestion   JSONB,             -- AI-suggested match
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Pay (Payments)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,       -- received, made
  contact_id      UUID REFERENCES contacts(id),
  amount          DECIMAL(15,2) NOT NULL,
  date            DATE NOT NULL,
  method          TEXT,               -- cash, bank_transfer, upi, cheque, card
  reference       TEXT,               -- UTR, cheque no, etc.
  bank_account_id UUID REFERENCES bank_accounts(id),
  notes           TEXT,
  journal_id      UUID REFERENCES journal_entries(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payment_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id),
  amount          DECIMAL(15,2) NOT NULL
);

CREATE TABLE payment_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id),
  amount          DECIMAL(15,2),
  link_url        TEXT,               -- Razorpay/Cashfree payment link
  status          TEXT DEFAULT 'active', -- active, paid, expired
  expires_at      TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  gateway_ref     TEXT,               -- Gateway reference ID
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Commerce (E-commerce Sync)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE marketplace_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,       -- amazon, flipkart, shopify, woocommerce
  store_name      TEXT,
  credentials     JSONB,              -- Encrypted API keys/tokens
  settings        JSONB,              -- Sync preferences
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE marketplace_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id   UUID REFERENCES marketplace_connections(id),
  external_order_id TEXT NOT NULL,
  platform        TEXT NOT NULL,
  order_date      TIMESTAMPTZ,
  status          TEXT,               -- pending, shipped, delivered, returned, cancelled
  items           JSONB,
  subtotal        DECIMAL(15,2),
  platform_fees   DECIMAL(15,2),
  shipping_fees   DECIMAL(15,2),
  tax_amount      DECIMAL(15,2),
  net_amount      DECIMAL(15,2),
  settlement_id   TEXT,
  invoice_id      UUID REFERENCES invoices(id), -- Linked Kontafy invoice
  synced_at       TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Insight (AI & Reports)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,       -- profit_loss, balance_sheet, cash_flow, trial_balance, etc.
  period_start    DATE,
  period_end      DATE,
  data            JSONB,             -- Computed report data
  generated_at    TIMESTAMPTZ DEFAULT now(),
  generated_by    UUID REFERENCES auth.users(id)
);

CREATE TABLE ai_forecasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,       -- cash_flow, revenue, expense
  forecast_date   DATE,               -- Date being forecasted
  predicted_value DECIMAL(15,2),
  confidence      DECIMAL(5,2),       -- Confidence level 0-100
  factors         JSONB,              -- What influenced the forecast
  generated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,       -- anomaly, suggestion, alert
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT DEFAULT 'info', -- info, warning, critical
  data            JSONB,
  is_read         BOOLEAN DEFAULT false,
  is_dismissed    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MODULE: Connect (CA Portal & Integrations)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE ca_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ca_user_id      UUID REFERENCES auth.users(id),
  ca_email        TEXT,
  permissions     JSONB,              -- What the CA can access
  status          TEXT DEFAULT 'pending', -- pending, accepted, revoked
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- SHARED: Audit Log, Notifications, Files
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  action          TEXT NOT NULL,       -- create, update, delete, login, export
  entity_type     TEXT,               -- invoice, payment, contact, etc.
  entity_id       UUID,
  changes         JSONB,              -- Before/after diff
  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  type            TEXT NOT NULL,       -- invoice_overdue, payment_received, gst_due, stock_low, etc.
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB,
  channel         TEXT DEFAULT 'in_app', -- in_app, email, whatsapp, sms
  is_read         BOOLEAN DEFAULT false,
  sent_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE file_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     TEXT,               -- invoice, expense, contact, etc.
  entity_id       UUID,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,       -- R2 URL
  file_size       INTEGER,
  mime_type       TEXT,
  uploaded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Indexes (Critical for Performance)

```sql
-- Multi-tenant isolation (every query needs org_id)
CREATE INDEX idx_invoices_org ON invoices(org_id, status, date);
CREATE INDEX idx_journal_entries_org ON journal_entries(org_id, date);
CREATE INDEX idx_contacts_org ON contacts(org_id, type);
CREATE INDEX idx_products_org ON products(org_id, is_active);
CREATE INDEX idx_stock_levels_org ON stock_levels(org_id, product_id);
CREATE INDEX idx_bank_txns_org ON bank_transactions(org_id, bank_account_id, date);
CREATE INDEX idx_payments_org ON payments(org_id, date);
CREATE INDEX idx_audit_org ON audit_log(org_id, created_at);

-- Search
CREATE INDEX idx_contacts_search ON contacts USING gin(to_tsvector('english', name || ' ' || COALESCE(company_name, '')));
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(sku, '')));
```

---

## 4. API Design

### Structure

```
/api/v1/
├── /auth
│   ├── POST   /auth/otp/send          # Send OTP to phone
│   ├── POST   /auth/otp/verify         # Verify OTP
│   ├── POST   /auth/signup             # Register new user
│   ├── POST   /auth/login              # Email/password login
│   └── POST   /auth/refresh            # Refresh JWT token
│
├── /organizations
│   ├── POST   /organizations           # Create org
│   ├── GET    /organizations/:id       # Get org details
│   ├── PATCH  /organizations/:id       # Update org
│   ├── POST   /organizations/:id/members   # Invite member
│   └── GET    /organizations/:id/members   # List members
│
├── /books (Accounting)
│   ├── GET    /accounts                # Chart of accounts
│   ├── POST   /accounts                # Create account
│   ├── GET    /journal-entries         # List entries
│   ├── POST   /journal-entries         # Create journal entry
│   ├── GET    /ledger/:accountId       # Account ledger
│   └── GET    /trial-balance           # Trial balance
│
├── /bill (Invoicing)
│   ├── GET    /invoices                # List invoices (filterable)
│   ├── POST   /invoices                # Create invoice
│   ├── GET    /invoices/:id            # Get invoice detail
│   ├── PATCH  /invoices/:id            # Update invoice
│   ├── POST   /invoices/:id/send       # Send via email/WhatsApp
│   ├── POST   /invoices/:id/pdf        # Generate PDF
│   ├── POST   /invoices/:id/e-invoice  # Generate e-invoice
│   ├── GET    /contacts                # List contacts
│   ├── POST   /contacts                # Create contact
│   └── PATCH  /contacts/:id            # Update contact
│
├── /stock (Inventory)
│   ├── GET    /products                # List products
│   ├── POST   /products                # Create product
│   ├── GET    /products/:id/stock      # Stock levels
│   ├── POST   /stock/adjust            # Manual adjustment
│   ├── GET    /warehouses              # List warehouses
│   └── POST   /warehouses              # Create warehouse
│
├── /tax (GST)
│   ├── GET    /gst/summary             # GST summary for period
│   ├── GET    /gst/gstr1/:period       # GSTR-1 data
│   ├── GET    /gst/gstr3b/:period      # GSTR-3B data
│   ├── POST   /gst/validate/:period    # Validate return
│   ├── POST   /gst/file/:period        # File return (future: GST portal API)
│   └── GET    /tds/entries             # TDS entries
│
├── /bank (Banking)
│   ├── GET    /bank-accounts           # List bank accounts
│   ├── POST   /bank-accounts           # Add bank account
│   ├── POST   /bank-accounts/:id/import  # Import statement (CSV/OFX)
│   ├── GET    /bank-transactions       # Unreconciled transactions
│   ├── POST   /bank-transactions/:id/match  # Reconcile
│   └── GET    /bank-transactions/suggestions  # AI match suggestions
│
├── /pay (Payments)
│   ├── GET    /payments                # List payments
│   ├── POST   /payments                # Record payment
│   ├── POST   /payment-links           # Create payment link
│   └── POST   /payment-links/webhook   # Payment gateway webhook
│
├── /commerce (E-commerce)
│   ├── GET    /marketplace/connections  # List connected stores
│   ├── POST   /marketplace/connect      # Connect marketplace
│   ├── POST   /marketplace/:id/sync     # Trigger sync
│   └── GET    /marketplace/orders       # Synced orders
│
├── /insight (Reports & AI)
│   ├── GET    /reports/profit-loss      # P&L statement
│   ├── GET    /reports/balance-sheet    # Balance sheet
│   ├── GET    /reports/cash-flow        # Cash flow statement
│   ├── GET    /reports/receivables      # Accounts receivable aging
│   ├── GET    /reports/payables         # Accounts payable aging
│   ├── GET    /ai/forecast              # Cash flow forecast
│   ├── GET    /ai/insights              # AI-generated insights
│   └── GET    /dashboard                # Dashboard aggregates
│
├── /connect (Integrations)
│   ├── POST   /ca/invite               # Invite CA
│   ├── GET    /ca/clients              # CA: list client orgs
│   └── GET    /integrations             # Available integrations
│
└── /shared
    ├── GET    /notifications           # User notifications
    ├── PATCH  /notifications/:id/read  # Mark read
    ├── GET    /audit-log               # Audit trail
    ├── POST   /files/upload            # Upload to R2
    └── GET    /files/:id               # Download file
```

### Authentication Flow

```
1. User opens app → /auth/otp/send { phone: "+919876543210" }
2. Supabase sends OTP via SMS
3. User enters OTP → /auth/otp/verify { phone, otp }
4. Supabase returns JWT (access_token + refresh_token)
5. All subsequent API calls include: Authorization: Bearer <access_token>
6. JWT payload: { sub: user_id, org_id, role, permissions }
7. Middleware validates JWT + checks RLS policies
```

---

## 5. Module Architecture (NestJS)

```
src/
├── main.ts
├── app.module.ts
│
├── common/                     # Shared utilities
│   ├── decorators/             # @CurrentUser, @OrgId, @RequireModule
│   ├── guards/                 # AuthGuard, RoleGuard, PlanGuard
│   ├── interceptors/           # AuditLogInterceptor, ResponseInterceptor
│   ├── pipes/                  # ZodValidationPipe
│   ├── filters/                # GlobalExceptionFilter
│   └── utils/                  # Indian number formatting, GST calc, etc.
│
├── auth/                       # Authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── strategies/             # JWT, OTP strategies
│
├── organization/               # Org & member management
│   ├── organization.module.ts
│   ├── organization.controller.ts
│   └── organization.service.ts
│
├── books/                      # MODULE: Accounting
│   ├── books.module.ts
│   ├── accounts/
│   │   ├── accounts.controller.ts
│   │   └── accounts.service.ts
│   ├── journal/
│   │   ├── journal.controller.ts
│   │   └── journal.service.ts
│   └── ledger/
│       ├── ledger.controller.ts
│       └── ledger.service.ts
│
├── bill/                       # MODULE: Invoicing
│   ├── bill.module.ts
│   ├── invoices/
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   └── pdf.service.ts      # Invoice PDF generation
│   ├── contacts/
│   │   ├── contacts.controller.ts
│   │   └── contacts.service.ts
│   └── whatsapp/
│       ├── whatsapp.controller.ts
│       └── whatsapp.service.ts  # WhatsApp Business API
│
├── stock/                      # MODULE: Inventory
│   ├── stock.module.ts
│   ├── products/
│   ├── warehouses/
│   └── movements/
│
├── tax/                        # MODULE: GST & TDS
│   ├── tax.module.ts
│   ├── gst/
│   │   ├── gst.controller.ts
│   │   ├── gst.service.ts
│   │   └── gst-compute.service.ts  # GSTR-1, 3B computation
│   └── tds/
│
├── bank/                       # MODULE: Banking
│   ├── bank.module.ts
│   ├── accounts/
│   ├── transactions/
│   └── reconciliation/
│       └── reconciliation.service.ts  # AI-assisted matching
│
├── pay/                        # MODULE: Payments
│   ├── pay.module.ts
│   ├── payments/
│   └── payment-links/
│       └── razorpay.service.ts  # Razorpay integration
│
├── commerce/                   # MODULE: E-commerce
│   ├── commerce.module.ts
│   ├── connectors/
│   │   ├── amazon.connector.ts
│   │   ├── flipkart.connector.ts
│   │   ├── shopify.connector.ts
│   │   └── woocommerce.connector.ts
│   └── sync/
│       └── sync.service.ts
│
├── insight/                    # MODULE: Reports & AI
│   ├── insight.module.ts
│   ├── reports/
│   │   ├── profit-loss.service.ts
│   │   ├── balance-sheet.service.ts
│   │   └── cash-flow.service.ts
│   ├── ai/
│   │   ├── forecast.service.ts      # OpenAI-powered forecasting
│   │   ├── categorize.service.ts    # Expense auto-categorization
│   │   └── anomaly.service.ts       # Anomaly detection
│   └── dashboard/
│       └── dashboard.service.ts
│
├── connect/                    # MODULE: Integrations
│   ├── connect.module.ts
│   └── ca-portal/
│
├── notification/               # Notifications
│   ├── notification.module.ts
│   ├── notification.service.ts
│   ├── channels/
│   │   ├── email.channel.ts
│   │   ├── whatsapp.channel.ts
│   │   └── in-app.channel.ts
│   └── templates/              # Email/WhatsApp templates
│
├── storage/                    # File storage (R2)
│   ├── storage.module.ts
│   └── r2.service.ts
│
├── queue/                      # Background jobs
│   ├── queue.module.ts
│   ├── processors/
│   │   ├── pdf.processor.ts
│   │   ├── email.processor.ts
│   │   ├── whatsapp.processor.ts
│   │   ├── sync.processor.ts
│   │   └── forecast.processor.ts
│   └── schedules/
│       ├── overdue-check.cron.ts     # Daily: check overdue invoices
│       ├── forecast-refresh.cron.ts  # Daily: refresh AI forecasts
│       └── marketplace-sync.cron.ts  # Hourly: sync marketplace orders
│
└── prisma/
    ├── schema.prisma
    └── seed.ts                 # Default chart of accounts, HSN codes
```

---

## 6. Key Implementation Details

### GST Computation Engine

```typescript
// Simplified GST calculation logic
interface GSTResult {
  taxableAmount: number;
  cgst: number;   // Central GST (intra-state)
  sgst: number;   // State GST (intra-state)
  igst: number;   // Integrated GST (inter-state)
  cess: number;
  total: number;
}

function computeGST(
  amount: number,
  gstRate: number,       // 5, 12, 18, 28
  cessRate: number,
  isInterState: boolean,
): GSTResult {
  const taxableAmount = amount;
  const cessAmount = taxableAmount * (cessRate / 100);

  if (isInterState) {
    const igst = taxableAmount * (gstRate / 100);
    return { taxableAmount, cgst: 0, sgst: 0, igst, cess: cessAmount, total: taxableAmount + igst + cessAmount };
  }

  const halfRate = gstRate / 2;
  const cgst = taxableAmount * (halfRate / 100);
  const sgst = taxableAmount * (halfRate / 100);
  return { taxableAmount, cgst, sgst, igst: 0, cess: cessAmount, total: taxableAmount + cgst + sgst + cessAmount };
}
```

### Double-Entry Bookkeeping (Auto Journal Creation)

Every financial transaction automatically creates balanced journal entries:

| Transaction | Debit | Credit |
|-------------|-------|--------|
| Sale Invoice | Accounts Receivable | Sales Revenue + GST Payable |
| Purchase Invoice | Purchase Expense + GST Receivable | Accounts Payable |
| Payment Received | Bank/Cash | Accounts Receivable |
| Payment Made | Accounts Payable | Bank/Cash |
| Expense | Expense Account | Bank/Cash/Payable |

### AI Features (OpenAI Integration)

```typescript
// Cash Flow Forecasting
async function forecastCashFlow(orgId: string, days: number = 30) {
  // 1. Fetch historical data (last 12 months)
  const historicalCashFlow = await getHistoricalCashFlow(orgId, 365);
  const pendingReceivables = await getPendingReceivables(orgId);
  const pendingPayables = await getPendingPayables(orgId);
  const recurringExpenses = await getRecurringExpenses(orgId);

  // 2. Send to OpenAI for prediction
  const forecast = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "You are a financial forecasting AI for Indian SMBs. Analyze the data and predict daily cash flow for the next N days. Consider seasonal patterns, payment cycles, and Indian business calendar (festivals, quarter-ends, GST deadlines)."
    }, {
      role: "user",
      content: JSON.stringify({ historicalCashFlow, pendingReceivables, pendingPayables, recurringExpenses, forecastDays: days })
    }],
    response_format: { type: "json_object" }
  });

  // 3. Store predictions
  return saveForecast(orgId, forecast);
}
```

### WhatsApp Integration Flow

```
1. User creates invoice → System generates PDF → Stores in R2
2. User clicks "Send via WhatsApp"
3. BullMQ job queued → WhatsApp Business API (Gupshup/Wati)
4. Message template: Invoice PDF + UPI payment link
5. Delivery status tracked via webhook
6. Payment received → Auto-match to invoice → Mark as paid
7. Confirmation sent via WhatsApp
```

---

## 7. Security

| Area | Implementation |
|------|---------------|
| **Authentication** | Supabase Auth (JWT), phone OTP primary |
| **Authorization** | Row Level Security (RLS) + API-level role checks |
| **Encryption** | TLS 1.3 (Cloudflare), AES-256 for sensitive fields (bank credentials) |
| **Data Isolation** | `org_id` on every table, RLS policies enforce tenant boundaries |
| **Audit Trail** | Every mutation logged with user, timestamp, before/after diff |
| **Rate Limiting** | Nginx + Redis: 100 req/min per user, 1000/min per org |
| **Input Validation** | Zod schemas on every API endpoint |
| **OWASP** | Helmet.js, CORS whitelist, parameterized queries (Prisma), CSP headers |
| **Backup** | Daily PostgreSQL dump to R2, 30-day retention |
| **Secrets** | Environment variables, no credentials in code |

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare CDN                     │
│              (DNS, DDoS, SSL, Caching)               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│              EC2 (13.235.184.17)                     │
│                                                      │
│  ┌──────────────────────────────────┐               │
│  │            Nginx                  │               │
│  │  kontafy.com → :5000 (website)   │               │
│  │  app.kontafy.com → :5001 (app)   │               │
│  │  api.kontafy.com → :5002 (api)   │               │
│  └──────────────────────────────────┘               │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Website  │  │ Web App  │  │   API    │          │
│  │ Next.js  │  │ Next.js  │  │ NestJS   │          │
│  │  :5000   │  │  :5001   │  │  :5002   │          │
│  └──────────┘  └──────────┘  └────┬─────┘          │
│                                    │                 │
│  ┌──────────┐  ┌──────────┐      │                 │
│  │  Redis   │  │  BullMQ  │◄─────┘                 │
│  │  :6379   │  │  Workers │                         │
│  └──────────┘  └──────────┘                         │
└──────────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐         ┌────┴────┐
    │Supabase │         │Cloudflare│
    │PostgreSQL│         │   R2    │
    │ (Cloud) │         │(Storage)│
    └─────────┘         └─────────┘
```

### Docker Compose Structure

```yaml
services:
  kontafy-website:    # Marketing website (port 5000)
  kontafy-app:        # Web application (port 5001)
  kontafy-api:        # NestJS API server (port 5002)
  kontafy-worker:     # BullMQ job processor
  redis:              # Cache + job queue
```

---

## 9. Development Phases

### Phase 1: Core (Months 1-3)
- Auth (phone OTP signup/login)
- Organization setup (GSTIN, business details)
- Books (chart of accounts, journal entries, ledger)
- Bill (invoices, contacts, PDF generation)
- Tax (basic GST computation, GSTR-1/3B reports)
- Dashboard (revenue, outstanding, GST due)

### Phase 2: Growth (Months 3-5)
- Stock (products, inventory tracking, warehouses)
- Bank (bank accounts, statement import, reconciliation)
- Pay (payment recording, payment links via Razorpay)
- WhatsApp billing (invoice delivery + payment reminders)
- Email notifications

### Phase 3: Intelligence (Months 5-7)
- Insight (P&L, balance sheet, cash flow reports)
- AI forecasting (cash flow predictions)
- AI expense categorization
- Commerce (Amazon, Flipkart sync)
- Connect (CA portal)

### Phase 4: Scale (Months 7-9)
- Mobile app (React Native)
- Offline mode (WatermelonDB sync)
- E-invoice integration (GST portal API)
- E-way bill generation
- Multi-branch support
- Advanced AI insights

---

## 10. Payment Gateway Integration

| Gateway | Use Case | Why |
|---------|----------|-----|
| **Razorpay** | Payment links on invoices, UPI, cards | Best Indian developer API, instant activation |
| **Cashfree** | Backup/alternative gateway | Good payout API for vendor payments |

### Subscription Billing

Kontafy's own subscription (Starter/Silver/Gold/Platinum/Enterprise) will use Razorpay Subscriptions API:
- Monthly/Annual billing
- Auto-renewal
- Webhook for payment success/failure
- Grace period on failed payments
- Plan upgrade/downgrade proration

---

## 11. Third-Party Integrations

| Service | Purpose | API |
|---------|---------|-----|
| **Supabase** | Database, Auth, Realtime | Official SDK |
| **Cloudflare R2** | File storage (invoices, attachments) | S3-compatible API |
| **Razorpay** | Payment links, subscriptions | REST API |
| **Gupshup / Wati** | WhatsApp Business API | REST API |
| **OpenAI** | AI forecasting, categorization | Chat Completions API |
| **Gmail SMTP** | Transactional emails | Nodemailer |
| **Amazon SP-API** | E-commerce order sync | REST API |
| **Flipkart Seller API** | E-commerce order sync | REST API |
| **Shopify Admin API** | E-commerce order sync | GraphQL |
| **GSTN (future)** | Direct GST filing | ASP/GSP API |

---

## 12. Estimated Infrastructure Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| EC2 (t3.large) | ~₹4,000 | Already shared with other projects |
| Supabase | Free → ₹2,100 | Free tier up to 500MB, then Pro |
| Cloudflare R2 | Free → ₹500 | 10GB free, then $0.015/GB |
| Razorpay | 2% per txn | Only on payment link transactions |
| OpenAI API | ~₹1,500 | GPT-4o-mini, ~10K forecasts/month |
| WhatsApp Business | ~₹2,000 | Per-message pricing via Gupshup |
| Domain | ~₹800/yr | kontafy.com + kontafy.in |
| **Total (initial)** | **~₹3,000/mo** | Before WhatsApp/AI usage |
| **Total (at scale)** | **~₹10,000/mo** | 1000+ active businesses |

---

## 13. Monorepo Structure

```
kontafy/
├── apps/
│   ├── website/          # Marketing website (Next.js) — already built
│   ├── web/              # Web application (Next.js 15)
│   ├── api/              # Backend API (NestJS)
│   └── mobile/           # Mobile app (React Native/Expo) — Phase 4
│
├── packages/
│   ├── shared/           # Shared types, constants, utils
│   │   ├── types/        # TypeScript interfaces (Invoice, Contact, etc.)
│   │   ├── constants/    # GST rates, state codes, HSN codes
│   │   ├── validators/   # Zod schemas (shared between API + frontend)
│   │   └── utils/        # Indian number formatting, date helpers
│   │
│   ├── ui/               # Shared UI components (shadcn/ui based)
│   └── db/               # Prisma schema + client (shared)
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.website
│   └── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── ci.yml        # Lint, type-check, test
│       └── deploy.yml    # Build + deploy to EC2
│
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

**Package Manager:** pnpm (workspace monorepo, same as TMS project)
**Build System:** Turborepo (parallel builds, caching)

---

*Architecture created March 2026 · Internal document · Syscode Technology Pvt Ltd*
