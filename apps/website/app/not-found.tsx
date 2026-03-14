import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-extrabold text-navy font-heading">404</h1>
      <p className="mt-4 text-xl font-semibold text-ink">Page not found</p>
      <p className="mt-2 max-w-md text-muted">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-green px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Go Home
        </Link>
        <Link
          href="/contact"
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-ink transition hover:bg-surface"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}
