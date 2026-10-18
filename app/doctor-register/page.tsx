'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';

type FormFields = {
  fullName: string;
  email: string;
  password: string;
  medicalLicenseNumber: string;
  specialty: string;
  institution: string;
  phone: string;
  city: string;
};

const emptyForm: FormFields = {
  fullName: '',
  email: '',
  password: '',
  medicalLicenseNumber: '',
  specialty: '',
  institution: '',
  phone: '',
  city: '',
};

export default function DoctorRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/clinician-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Application could not be submitted.');
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Application could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F6F8FF] px-4 py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />
      </div>
      <div className="relative w-full max-w-2xl space-y-6">
        <Link href="/signup" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4" /> Back to patient registration
        </Link>
        <section className="rounded-3xl border border-[#DCE5F5] bg-white/95 p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-tr from-[#1745D8] to-[#0D9488] p-3 text-white shadow-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#0E1C30]">Clinician registration</h1>
              <p className="text-sm text-slate-600">Submit your details for administrator review.</p>
            </div>
          </div>

          <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p>Registration does not grant clinical access automatically. An administrator must review your license details and approve the application before you can sign in as a clinician.</p>
          </div>

          {submitted ? (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> Application submitted for review</div>
              <p className="text-sm">You can sign in after an administrator approves your credentials. We do not send email notifications yet.</p>
              <button type="button" onClick={() => router.push('/login')} className="rounded-lg bg-[#1745D8] px-4 py-2 text-sm font-semibold text-white">Go to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" required />
              <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required />
              <Field label="Password (12+ characters)" name="password" type="password" value={form.password} onChange={handleChange} minLength={12} autoComplete="new-password" required />
              <Field label="Medical license number" name="medicalLicenseNumber" value={form.medicalLicenseNumber} onChange={handleChange} required />
              <Field label="Specialty" name="specialty" value={form.specialty} onChange={handleChange} placeholder="e.g. Cardiology" required />
              <Field label="Hospital / institution" name="institution" value={form.institution} onChange={handleChange} required />
              <Field label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" />
              <Field label="City (optional)" name="city" value={form.city} onChange={handleChange} autoComplete="address-level2" />
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1745D8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:col-span-2">
                <UserPlus className="h-4 w-4" /> {submitting ? 'Submitting application…' : 'Submit clinician application'}
              </button>
            </form>
          )}
        </section>
        <p className="text-center text-xs text-slate-500">Already approved? <Link href="/login" className="font-semibold text-[#1745D8] hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
      {label}
      <input {...inputProps} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-[#1745D8] focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}
