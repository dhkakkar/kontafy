export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#0F2D5E" />
              <rect x="7" y="6" width="18" height="20" rx="2" fill="#1A3F7A" />
              <rect x="11" y="6" width="3" height="20" fill="#0A8A54" />
              <path d="M18 10v4.5l3.5-4.5h2.2l-3.8 4.8L24 20h-2.3l-3.7-4.7V20h-1.8V10H18Z" fill="white" />
            </svg>
            <span className="text-2xl font-bold text-white tracking-tight">
              Kontafy
            </span>
          </div>
          <p className="mt-2 text-primary-200 text-sm">
            Modern accounting for Indian businesses
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
