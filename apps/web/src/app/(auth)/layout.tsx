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
            <div className="h-11 w-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white">K</span>
            </div>
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
