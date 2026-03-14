# Kontafy — Website Build Roadmap

> Multi-page production website for India's cloud-native accounting platform
> **Timeline:** 8 Weeks · **Pages:** ~35 · **Cost:** ~₹800/yr

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | Next.js 15 | App Router, Standalone Docker build |
| CMS | Sanity v3 | Embedded studio at `/studio` |
| Styling | Tailwind v4 + shadcn/ui | Zero runtime overhead |
| Animations | Motion (Framer Motion v12) | Scroll-triggered, declarative |
| Database + Auth | Supabase | PostgreSQL + Auth (phone OTP) |
| Storage | Cloudflare R2 | `syscode-uploads` bucket, `kontafy/` prefix |
| DNS + CDN | Cloudflare | Proxied, auto SSL |
| Hosting | AWS EC2 | Docker + Nginx (13.235.184.17) |
| Analytics | Google Analytics 4 | + Google Search Console |
| Email | Nodemailer | Gmail SMTP (free) |
| Domain | Hostinger | kontafy.com + kontafy.in |
| Icons | Lucide React | Tree-shakeable |

---

## Phase 1 — Foundation + Homepage `Week 1–2`

> **Milestone:** kontafy.com goes LIVE with homepage + pricing + contact

### 1.1 Project Setup

- [ ] Scaffold Next.js 15 project (App Router)
- [ ] Configure Tailwind v4 + shadcn/ui
- [ ] Set up fonts (Plus Jakarta Sans + Inter)
- [ ] Set up Sanity v3 (embedded studio at `/studio`)
- [ ] Set up Supabase project (DB + Auth)
- [ ] Configure Cloudflare R2 for image storage
- [ ] Google Analytics 4 + Search Console integration
- [ ] Docker + Nginx config for EC2 deployment
- [ ] GitHub repo setup + CI/CD pipeline

### 1.2 Dynamic SEO System

- [ ] `generateMetadata()` on every page — title, description, OG pulled from Sanity CMS
- [ ] Sanity schema: `seoMeta` object (title, description, ogImage, canonical, noIndex)
- [ ] Reusable `getSeoMeta(slug)` helper — fetches SEO fields from Sanity per page
- [ ] Dynamic `sitemap.ts` — auto-discovers all pages from Sanity (blog, features, industries, comparisons)
- [ ] Dynamic `robots.ts` — programmatic rules
- [ ] JSON-LD structured data factory — generates Organization, Product, FAQ, Article, BreadcrumbList based on page type
- [ ] Dynamic OG image generation via `opengraph-image.tsx` (auto-generates branded OG images per page)
- [ ] Canonical URLs with `alternates.canonical` on every page
- [ ] Sanity webhook → `revalidateTag` — SEO meta updates live without redeploy

### 1.3 Shared Components

- [ ] Announcement Bar (dismissible)
- [ ] Navbar — mega menu (desktop + mobile hamburger)
- [ ] Footer — 4-column + bottom bar
- [ ] Floating WhatsApp widget
- [ ] CTA Button variants
- [ ] Section heading component

### 1.4 Homepage — 14 Sections

- [ ] Hero (confrontational headline + dashboard mockup + trust badges)
- [ ] Pain-to-Solution Bridge (Old Way vs Kontafy Way — 5 rows)
- [ ] Module Carousel (9 scrollable cards)
- [ ] WhatsApp Billing Spotlight (phone mockup)
- [ ] E-commerce Sync Spotlight (marketplace flow diagram)
- [ ] AI Insight Spotlight (forecast dashboard)
- [ ] Social Proof (founding story + testimonials + CA endorsements + security)
- [ ] Industry Tabs (6 verticals — tabbed)
- [ ] Pricing Snapshot (3 plans preview)
- [ ] Migration Section ("Switch from Tally/Busy — free in 48hrs")
- [ ] Final CTA block
- [ ] Scroll animations (Motion — fade up, slide in)

### 1.5 Core Pages

- [ ] **Pricing** — 5 plans + comparison table + FAQ accordion
- [ ] **Contact** — form + WhatsApp + Google Maps
- [ ] **Signup** — phone OTP flow via Supabase Auth

### 1.6 Deploy

- [ ] Dockerfile (standalone build)
- [ ] docker-compose.yml
- [ ] Nginx server block (kontafy.com)
- [ ] kontafy.in → kontafy.com redirect (Nginx)
- [ ] www → root redirect (Nginx)
- [ ] First deploy to EC2

---

## Phase 2 — Product Pages + Trust `Week 3–4`

> **Milestone:** Full product story online. Comparison pages start ranking.

### 2.1 Feature Pages (10 pages)

- [ ] `/features` — overview page
- [ ] `/features/books` — Kontafy Books (Accounting)
- [ ] `/features/bill` — Kontafy Bill (Invoicing + WhatsApp)
- [ ] `/features/stock` — Kontafy Stock (Inventory)
- [ ] `/features/tax` — Kontafy Tax (GST & TDS)
- [ ] `/features/bank` — Kontafy Bank (Reconciliation)
- [ ] `/features/insight` — Kontafy Insight (AI Analytics)
- [ ] `/features/pay` — Kontafy Pay (Payments)
- [ ] `/features/commerce` — Kontafy Commerce (E-commerce Sync)
- [ ] `/features/connect` — Kontafy Connect (Integrations)

Each page includes: hero with screenshot, 4-5 feature details, use case scenario, integration points, FAQ, CTA

### 2.2 Comparison Pages (4 pages)

- [ ] `/compare/kontafy-vs-tally` — **Priority #1**
- [ ] `/compare/kontafy-vs-busy`
- [ ] `/compare/kontafy-vs-zoho-books`
- [ ] `/compare/tally-alternative` — SEO listicle

Each page includes: feature-by-feature table, pricing comparison, key differentiators, migration CTA, switcher testimonial

### 2.3 Trust Pages (4 pages)

- [ ] `/about` — Syscode story, team, Yamunanagar, vision
- [ ] `/security` — encryption, data hosting, backups, compliance
- [ ] `/terms` — Terms of Service
- [ ] `/privacy` — Privacy Policy

---

## Phase 3 — Growth Engine `Week 5–6`

> **Milestone:** Content engine running. SEO pipeline active.

### 3.1 Industry Verticals (7 pages)

- [ ] `/industries` — overview
- [ ] `/industries/retail` — Retail & FMCG
- [ ] `/industries/manufacturing` — Manufacturing
- [ ] `/industries/services` — Professional Services
- [ ] `/industries/ecommerce` — E-commerce Sellers
- [ ] `/industries/traders` — Traders & Distributors
- [ ] `/industries/freelancers` — Freelancers & Consultants

Each page includes: industry pain points, relevant modules, testimonial, CTA

### 3.2 Blog + Content (Sanity CMS)

- [ ] `/blog` — listing page with pagination, category filter, search
- [ ] `/blog/[slug]` — individual post (ISR via Sanity webhook)
- [ ] Sanity schemas: post, author, category, tag
- [ ] **Scheduled Publishing:**
  - [ ] `publishedAt` datetime field in Sanity post schema
  - [ ] `scheduledPublishAt` field — set future date/time for auto-publish
  - [ ] Sanity Scheduled Publishing plugin (`@sanity/scheduled-publishing`)
  - [ ] GROQ query filter: `publishedAt <= now()` — only show published posts
  - [ ] Cron job or Sanity webhook to trigger ISR revalidation at scheduled time
  - [ ] Draft preview mode — authors can preview unpublished posts via `/api/preview`
  - [ ] Status indicators in Sanity Studio: Draft / Scheduled / Published
- [ ] **First 5 blog posts:**
  1. "Complete Guide to GST Filing for Small Businesses 2026"
  2. "5 Signs Your Business Has Outgrown Tally"
  3. "Desktop vs Cloud Accounting — 2026 Comparison"
  4. "How WhatsApp Billing Reduces Payment Collection Time by 60%"
  5. "AI Cash Flow Forecasting — How It Works"

### 3.3 Resources

- [ ] `/resources/gst-guide` — GST Compliance Guide (pillar content, 5000+ words)
- [ ] `/resources/switch-from-tally` — Migration playbook with screenshots
- [ ] `/resources/accounting-glossary` — 100+ accounting terms

### 3.4 Partnerships & Leads

- [ ] `/partners` — CA/Tax Professional partner program
- [ ] `/demo` — Book a Demo (calendar embed + form)
- [ ] Newsletter signup (Supabase + Nodemailer)

### 3.5 SEO Infrastructure (extends Phase 1.2 dynamic SEO system)

- [ ] Verify dynamic sitemap includes all Sanity-managed pages (blog, resources)
- [ ] Verify JSON-LD auto-generates Article schema for blog posts
- [ ] Verify OG images auto-generate for new blog posts
- [ ] SEO audit — check all pages have unique meta via Sanity
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Search Console alerts for indexing issues

---

## Phase 4 — Polish + Optimize `Week 7–8`

> **Milestone:** Production-grade. Performance optimized. Ready to market.

### 4.1 Performance

- [ ] Core Web Vitals audit (LCP < 2.5s, CLS < 0.1)
- [ ] Mobile responsiveness QA across devices
- [ ] Cross-browser testing
- [ ] Image optimization audit

### 4.2 Analytics + Conversion

- [ ] GA4 conversion tracking (signup, demo, contact)
- [ ] A/B test hero headlines
- [ ] Exit-intent popup for non-homepage pages
- [ ] Custom 404 page with search + popular links

### 4.3 Free SEO Tools

- [ ] GST Calculator (interactive)
- [ ] Invoice Generator (PDF download)
- [ ] Social media meta verification

---

## SEO Target Keywords

| Page | Primary Keyword | Monthly Searches | Priority |
|------|----------------|----------------:|----------|
| `/resources/gst-guide` | GST guide for small business | 8,100 | 🔴 High |
| `/features/bill` | GST billing software | 6,600 | 🔴 High |
| `/compare/kontafy-vs-tally` | tally alternative | 5,400 | 🔴 High |
| `/features/tax` | GST filing software | 4,400 | 🔴 High |
| `/features/stock` | inventory management software India | 3,600 | 🟠 Med |
| `/compare/tally-alternative` | best tally alternative 2026 | 3,200 | 🔴 High |
| `/` | cloud accounting software India | 2,400 | 🟠 Med |
| `/industries/retail` | accounting software for retail | 1,900 | 🟠 Med |
| `/resources/switch-from-tally` | how to migrate from tally | 1,600 | 🟠 Med |
| `/pricing` | accounting software price India | 1,300 | 🟡 Low |
| `/industries/ecommerce` | accounting for Amazon sellers India | 720 | 🟡 Low |
| `/features/commerce` | e-commerce accounting software | 720 | 🟡 Low |
| `/features/insight` | cash flow forecasting software | 590 | 🟡 Low |
| `/features/connect` | WhatsApp invoicing software | 480 | 🟡 Low |

---

## Competitive Differentiators

| Feature | Tally | Busy | Zoho Books | **Kontafy** |
|---------|-------|------|------------|-------------|
| Architecture | Desktop-first | Desktop + Cloud | Cloud | **Cloud-native** |
| WhatsApp Billing | ❌ | ❌ | ❌ | **✅ Built-in** |
| AI Cash Flow | ❌ | ❌ | Basic | **✅ 30+ day forecast** |
| E-commerce Sync | ❌ | BUSY Recom | Partial | **✅ Full (Amazon, Flipkart, Shopify)** |
| UX / Design | Dated | Dated | Good | **Modern (shadcn/ui)** |
| Free Plan | 7-day trial | Express (limited) | Limited | **✅ Unlimited** |
| Migration | Manual | Manual | Assisted | **✅ Free, 48-hour guarantee** |

---

## Complete Sitemap

```
CORE
/                               Homepage (14 sections)
/pricing                        5 plans + comparison table + FAQ
/about                          Syscode story, team, Yamunanagar
/contact                        Form + WhatsApp + map
/demo                           Book demo + interactive product tour
/signup                         Free plan activation (phone OTP)
/security                       Data hosting, encryption, compliance

PRODUCT — 9 Module Pages
/features                       All features overview
/features/books                 Kontafy Books — Accounting
/features/bill                  Kontafy Bill — Invoicing + WhatsApp
/features/stock                 Kontafy Stock — Inventory
/features/tax                   Kontafy Tax — GST/TDS
/features/bank                  Kontafy Bank — Reconciliation
/features/insight               Kontafy Insight — AI Analytics
/features/pay                   Kontafy Pay — Payments
/features/commerce              Kontafy Commerce — E-commerce Sync
/features/connect               Kontafy Connect — Integrations

INDUSTRIES — 6 Verticals
/industries                     Overview
/industries/retail              Retail & FMCG
/industries/manufacturing       Manufacturing
/industries/services            Professional Services
/industries/ecommerce           E-commerce Sellers
/industries/traders             Traders & Distributors
/industries/freelancers         Freelancers & Consultants

COMPARISON — 4 High-Intent SEO Pages
/compare                        Comparison hub
/compare/kontafy-vs-tally       #1 priority
/compare/kontafy-vs-busy
/compare/kontafy-vs-zoho-books
/compare/tally-alternative      SEO listicle

RESOURCES & CONTENT
/blog                           Blog listing (Sanity CMS)
/blog/[slug]                    Individual posts (ISR)
/resources/gst-guide            Pillar content — GST compliance
/resources/switch-from-tally    Migration playbook
/resources/accounting-glossary  100+ terms

OTHER
/partners                       CA/Tax Professional program
/terms                          Terms of Service
/privacy                        Privacy Policy
```

---

## Summary

| Phase | Deliverable | Timeline | Pages |
|-------|------------|----------|------:|
| **1** | Live website — Homepage + Pricing + Contact + Signup | Week 1–2 | 4 |
| **2** | Product + Comparisons + Trust | Week 3–4 | 18 |
| **3** | Industries + Blog + Resources + Partners | Week 5–6 | 14+ |
| **4** | Polish + SEO tools + Optimization | Week 7–8 | — |
| | **Total** | **8 weeks** | **~35** |

---

*Kontafy — A product of Syscode Technology Pvt Ltd · Yamunanagar, Haryana*
*Roadmap created March 2026 · Internal document*
