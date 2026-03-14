import Link from "next/link";
import { footerLinks, footer as footerContent } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Logo (small version for footer — white text on dark bg)            */
/* ------------------------------------------------------------------ */
function FooterLogo() {
  return (
    <Link href="/" aria-label="Kontafy home" className="flex items-center gap-2.5">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="7" fill="#1A3F7A" />
        <rect x="7" y="6" width="18" height="20" rx="2" fill="#0F2D5E" />
        <rect x="11" y="6" width="3" height="20" fill="#0A8A54" />
        <path
          d="M18 10v4.5l3.5-4.5h2.2l-3.8 4.8L24 20h-2.3l-3.7-4.7V20h-1.8V10H18Z"
          fill="white"
        />
      </svg>
      <span className="text-lg font-extrabold font-heading tracking-tight text-white">
        Konta<span className="text-green-accent">fy</span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
export default function Footer() {
  return (
    <footer className="bg-navy">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {/* Top section */}
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <FooterLogo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {footerContent.tagline}
            </p>
          </div>

          {/* Link columns — 4 cols on lg, 2 on sm, 1 on mobile */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            {footerLinks.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-xs text-muted">
                {footerContent.copyright}
              </p>
              <p className="mt-1 text-xs text-muted/70">
                A product of Syscode Technology Pvt Ltd &middot; Yamunanagar, Haryana
              </p>
            </div>

            {/* Social icons placeholder */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-muted transition-colors hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125ZM6.81 20.452H3.86V9h2.95v11.452Z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="text-muted transition-colors hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="text-muted transition-colors hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
