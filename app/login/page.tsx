'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Activity 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const localDemoAccounts = process.env.NODE_ENV === 'development'
    ? [
        { label: 'Patient', email: 'demo.patient@teleflow.local', password: 'LocalDemoPatient!2026' },
        { label: 'Doctor', email: 'demo.doctor@teleflow.local', password: 'LocalDemoDoctor!2026' },
        { label: 'Administrator', email: 'demo.admin@teleflow.local', password: 'LocalDemoAdmin!2026' },
      ]
    : [];

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'CLINICIAN') router.push('/clinician/dashboard');
      else if (user.role === 'COORDINATOR') router.push('/coordinator/dashboard');
      else if (user.role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/patients/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid credentials.');
      }

      login(data.data.user);
      router.push(data.data.redirectUrl || '/patients/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FF] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-100 selection:text-blue-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-[#1745D8] to-[#0D9488] shadow-lg shadow-blue-500/20 text-white mb-2 ring-4 ring-white">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E1C30] tracking-tight">
            Tele-Follow-Up Orchestrator
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Post-Surgical Coordination & Recovery Clinical Decision Support
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Signed sessions · role-scoped access</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#DCE5F5] shadow-xl shadow-slate-200/60 p-7 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Access your authorized patient records or clinician portal</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  id="login-email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1745D8] focus:border-[#1745D8] transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#1745D8] hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1745D8] focus:border-[#1745D8] transition-all outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-button"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-600/20 text-sm font-semibold text-white bg-[#1745D8] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1745D8] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {localDemoAccounts.length > 0 && (
            <section className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4" aria-label="Local demo accounts">
              <div>
                <h3 className="text-xs font-bold text-blue-950">Local demo accounts</h3>
                <p className="mt-0.5 text-[11px] text-blue-900">Seed the local database with <code>npm run seed:demo</code> first.</p>
              </div>
              {localDemoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => { setEmail(account.email); setPassword(account.password); setError(null); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2 text-left text-xs hover:border-blue-400"
                >
                  <span className="font-semibold text-slate-900">{account.label}</span>
                  <span className="font-mono text-[10px] text-slate-600">{account.email}</span>
                </button>
              ))}
            </section>
          )}

          <div className="text-center text-xs text-slate-600 pt-2">
            Don&apos;t have a patient account?{' '}
            <Link href="/signup" className="font-semibold text-[#1745D8] hover:underline">
              Register as New Patient
            </Link>
          </div>
          <div className="text-center text-xs text-slate-600">
            Doctor?{' '}
            <Link href="/doctor-register" className="font-semibold text-[#1745D8] hover:underline">
              Apply for clinician access
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
          Academic CDS Follow-Up Orchestration Platform. In medical emergencies, immediately contact local emergency services (112 / 108).
        </p>
      </div>
    </div>
  );
}
