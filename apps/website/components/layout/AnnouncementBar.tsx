"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="banner"
      className="relative z-50 w-full bg-gradient-to-r from-green-accent to-green py-2.5 text-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-4 sm:px-6">
        <p className="font-medium leading-snug text-white">
          <span className="font-semibold">Launch Offer:</span> Kontafy Silver
          FREE for 3&nbsp;months &mdash; first 1,000 businesses
        </p>

        <a
          href="/pricing"
          className="inline-flex shrink-0 items-center rounded-full bg-white px-4 py-1 text-xs font-bold text-green transition-colors hover:bg-white/90"
        >
          Claim Offer
        </a>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
