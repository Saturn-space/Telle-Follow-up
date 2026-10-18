import Link from 'next/link';
import { Activity, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F6F8FF] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative max-w-md w-full space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-[#1745D8] to-[#0D9488] shadow-lg text-white mb-2 ring-4 ring-white">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0E1C30]">Password Recovery</h1>
          <p className="text-sm text-slate-600">Self-service password reset is unavailable.</p>
        </header>

        <section className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xl p-7 space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Password reset tokens and email delivery are not configured, so this page cannot send a recovery link. Contact your system administrator for account assistance. Do not share your password.</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1745D8] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Return to sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
