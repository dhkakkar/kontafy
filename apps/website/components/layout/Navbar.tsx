"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinks, productModules } from "@/lib/constants";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Logo (inline SVG)                                                  */
/* ------------------------------------------------------------------ */
function Logo() {
  return (
    <Link href="/" aria-label="Kontafy home" className="flex items-center gap-2.5">
      {/* Icon mark — navy rounded square with green spine + white K */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="7" fill="#0F2D5E" />
        {/* Book body */}
        <rect x="7" y="6" width="18" height="20" rx="2" fill="#1A3F7A" />
        {/* Spine */}
        <rect x="11" y="6" width="3" height="20" fill="#0A8A54" />
        {/* K letterform */}
        <path
          d="M18 10v4.5l3.5-4.5h2.2l-3.8 4.8L24 20h-2.3l-3.7-4.7V20h-1.8V10H18Z"
          fill="white"
        />
      </svg>

      {/* Wordmark */}
      <span className="text-xl font-extrabold font-heading tracking-tight">
        <span className="text-navy">Konta</span>
        <span className="text-green">fy</span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Products Mega-menu (3-column)                                      */
/* ------------------------------------------------------------------ */
function ProductsDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-full z-50 mt-2 w-[680px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white p-5 shadow-xl lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {productModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              role="menuitem"
              onClick={onClose}
              className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green/10 text-green transition-colors group-hover:bg-green group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{mod.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">
                  {mod.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile menu (full-screen overlay)                                  */
/* ------------------------------------------------------------------ */
function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [productsOpen, setProductsOpen] = useState(false);

  /* Lock body scroll when open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-md p-2 text-ink transition-colors hover:bg-surface"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Links */}
      <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-5 py-6">
        <ul className="space-y-1">
          {navLinks.map((link) =>
            link.dropdown ? (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => setProductsOpen((p) => !p)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface"
                >
                  {link.label}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted transition-transform",
                      productsOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {productsOpen && (
                  <ul className="mt-1 space-y-1 pl-3">
                    {productModules.map((mod) => {
                      const Icon = mod.icon;
                      return (
                        <li key={mod.href}>
                          <Link
                            href={mod.href}
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface"
                          >
                            <Icon className="h-5 w-5 shrink-0 text-green" aria-hidden="true" />
                            <span className="text-sm font-medium text-ink">
                              {mod.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ) : (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block rounded-lg px-3 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface"
                >
                  {link.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <CTAButton variant="ghost" href="/sign-in" className="w-full justify-center">
            Sign in
          </CTAButton>
          <CTAButton variant="primary" href="/signup" className="w-full justify-center">
            Start Free
          </CTAButton>
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  /* Shadow on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur transition-shadow duration-200",
        scrolled && "shadow-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left — Logo */}
        <Logo />

        {/* Center — Desktop nav */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {navLinks.map((link) =>
            link.dropdown ? (
              <div key={link.label} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface hover:text-navy",
                    dropdownOpen && "bg-surface text-navy",
                  )}
                >
                  {link.label}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted transition-transform",
                      dropdownOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {dropdownOpen && <ProductsDropdown onClose={closeDropdown} />}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface hover:text-navy"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        {/* Right — CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <CTAButton variant="ghost" size="sm" href="/sign-in">
            Sign in
          </CTAButton>
          <CTAButton variant="primary" size="md" href="/signup" className="px-6 py-2.5">
            Start Free
          </CTAButton>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-ink transition-colors hover:bg-surface md:hidden"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile full-screen overlay */}
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
