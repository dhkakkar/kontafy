"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Landmark,
  GitMerge,
  Building2,
  Link2,
  FileUp,
  Banknote,
  BookOpen,
  Tags,
  FileText,
  Calculator,
  Globe,
  LayoutList,
  Receipt,
  MessageCircle,
  CreditCard,
  RefreshCw,
  Palette,
  ScanBarcode,
  Package,
  Hash,
  Bell,
  RotateCw,
  BarChart3,
  ShieldCheck,
  Scale,
  FileCheck,
  Truck,
  ClipboardCheck,
  Search,
  Brain,
  TrendingUp,
  PieChart,
  FileBarChart2,
  LineChart,
  Lightbulb,
  Wallet,
  QrCode,
  ArrowLeftRight,
  Clock,
  Layers,
  ShoppingBag,
  Store,
  PackageCheck,
  BarChart,
  Undo2,
  Monitor,
  Plug,
  Zap,
  Headphones,
  Code,
  Share2,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Icon registry                                                      */
/* ------------------------------------------------------------------ */

const iconMap: Record<string, LucideIcon> = {
  Landmark, GitMerge, Building2, Link2, FileUp, Banknote,
  BookOpen, Tags, FileText, Calculator, Globe, LayoutList,
  Receipt, MessageCircle, CreditCard, RefreshCw, Palette, ScanBarcode,
  Package, Hash, Bell, RotateCw, BarChart3, ShieldCheck,
  Scale, FileCheck, Truck, ClipboardCheck, Search, Brain,
  TrendingUp, PieChart, FileBarChart2, LineChart, Lightbulb,
  Wallet, QrCode, ArrowLeftRight, Clock, Layers,
  ShoppingBag, Store, PackageCheck, BarChart, Undo2, Monitor,
  Plug, Zap, Headphones, Code, Share2, Settings,
  CheckCircle2, ArrowRight,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

export interface BenefitItem {
  title: string;
  description: string;
}

export interface FeaturePageData {
  eyebrow: string;
  title: string;
  titleGreen: string;
  subtitle: string;
  heroDescription: string;
  features: FeatureItem[];
  workflowTitle: string;
  workflowDescription: string;
  workflowSteps: WorkflowStep[];
  benefits: BenefitItem[];
  ctaTitle: string;
  ctaDescription: string;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
});

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */

function HeroSection({
  eyebrow,
  title,
  titleGreen,
  subtitle,
  heroDescription,
}: Pick<FeaturePageData, "eyebrow" | "title" | "titleGreen" | "subtitle" | "heroDescription">) {
  const idx = title.indexOf(titleGreen);
  const before = idx >= 0 ? title.slice(0, idx) : title;
  const after = idx >= 0 ? title.slice(idx + titleGreen.length) : "";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-ink py-24 md:py-32">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-green/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-green/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.span
          {...fadeUp(0)}
          className="mb-4 inline-block rounded-full bg-green/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green"
        >
          {eyebrow}
        </motion.span>

        <motion.h1
          {...fadeUp(0.05)}
          className="font-heading text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl"
        >
          {before}
          <span className="text-green">{titleGreen}</span>
          {after}
        </motion.h1>

        <motion.p
          {...fadeUp(0.1)}
          className="mx-auto mt-3 text-lg font-medium text-white/80 md:text-xl"
        >
          {subtitle}
        </motion.p>

        <motion.p
          {...fadeUp(0.15)}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60"
        >
          {heroDescription}
        </motion.p>

        <motion.div {...fadeUp(0.2)} className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <CTAButton variant="primary" size="lg" href="/signup">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </CTAButton>
          <CTAButton variant="ghost" size="lg" href="/pricing" className="border-white/20 text-white hover:bg-white/10">
            View Pricing
          </CTAButton>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features Grid                                                      */
/* ------------------------------------------------------------------ */

function FeaturesSection({ features }: { features: FeatureItem[] }) {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything you need, built in"
          greenText="built in"
          description="Powerful features designed for Indian businesses to streamline operations and stay compliant."
          centered
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon] || CheckCircle2;
            return (
              <motion.div
                key={feature.title}
                {...fadeUp(i * 0.06)}
                className="group rounded-2xl border border-border bg-white p-6 transition-shadow duration-200 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green/10 text-green transition-colors group-hover:bg-green group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow Section                                                    */
/* ------------------------------------------------------------------ */

function WorkflowSection({
  workflowTitle,
  workflowDescription,
  workflowSteps,
}: Pick<FeaturePageData, "workflowTitle" | "workflowDescription" | "workflowSteps">) {
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How It Works"
          title={workflowTitle}
          description={workflowDescription}
          centered
        />

        <div className="relative mt-16">
          {/* Connector line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-border lg:block" />

          <div className="space-y-12 lg:space-y-0">
            {workflowSteps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={step.step}
                  {...fadeUp(i * 0.1)}
                  className={cn(
                    "relative flex flex-col items-center gap-6 lg:flex-row lg:gap-12",
                    !isEven && "lg:flex-row-reverse",
                    i > 0 && "lg:mt-12"
                  )}
                >
                  {/* Content */}
                  <div className={cn("flex-1", isEven ? "lg:text-right" : "lg:text-left")}>
                    <span className="text-xs font-bold uppercase tracking-widest text-green">
                      {step.step}
                    </span>
                    <h3 className="mt-2 font-heading text-xl font-bold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>

                  {/* Center dot */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green text-sm font-bold text-white shadow-lg">
                    {i + 1}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Benefits Section                                                   */
/* ------------------------------------------------------------------ */

function BenefitsSection({ benefits }: { benefits: BenefitItem[] }) {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Benefits"
          title="Why businesses choose Kontafy"
          greenText="choose Kontafy"
          centered
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              {...fadeUp(i * 0.06)}
              className="flex items-start gap-4 rounded-xl border border-border bg-surface/50 p-6"
            >
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green" />
              <div>
                <h3 className="font-heading text-base font-bold text-ink">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Section                                                        */
/* ------------------------------------------------------------------ */

function CTASection({
  ctaTitle,
  ctaDescription,
}: Pick<FeaturePageData, "ctaTitle" | "ctaDescription">) {
  return (
    <section className="bg-gradient-to-br from-navy via-navy to-ink py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2
          {...fadeIn(0)}
          className="font-heading text-3xl font-extrabold text-white md:text-4xl"
        >
          {ctaTitle}
        </motion.h2>
        <motion.p
          {...fadeIn(0.05)}
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70"
        >
          {ctaDescription}
        </motion.p>
        <motion.div {...fadeIn(0.1)} className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <CTAButton variant="primary" size="lg" href="/signup">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </CTAButton>
          <CTAButton variant="ghost" size="lg" href="/contact" className="border-white/20 text-white hover:bg-white/10">
            Talk to Sales
          </CTAButton>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                         */
/* ------------------------------------------------------------------ */

export default function FeaturePageClient({ data }: { data: FeaturePageData }) {
  return (
    <div className="bg-white">
      <HeroSection
        eyebrow={data.eyebrow}
        title={data.title}
        titleGreen={data.titleGreen}
        subtitle={data.subtitle}
        heroDescription={data.heroDescription}
      />
      <FeaturesSection features={data.features} />
      <WorkflowSection
        workflowTitle={data.workflowTitle}
        workflowDescription={data.workflowDescription}
        workflowSteps={data.workflowSteps}
      />
      <BenefitsSection benefits={data.benefits} />
      <CTASection ctaTitle={data.ctaTitle} ctaDescription={data.ctaDescription} />
    </div>
  );
}
