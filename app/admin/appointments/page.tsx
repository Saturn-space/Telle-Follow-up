'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const readAppointments = async () => {
    const response = await fetch('/api/admin/appointments', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error?.message || 'Appointment records could not be loaded.');
    return result.data.appointments || [];
  };

  useEffect(() => {
    let active = true;
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && role !== 'ADMIN') router.replace(role === 'CLINICIAN' ? '/clinician/dashboard' : role === 'COORDINATOR' ? '/coordinator/dashboard' : '/patients/dashboard');
    else if (isAuthenticated && role === 'ADMIN') {
      readAppointments()
        .then((items) => { if (active) setAppointments(items); })
        .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Appointment records could not be loaded.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [authLoading, isAuthenticated, role, router]);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      setAppointments(await readAppointments());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Appointment records could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (isAuthenticated && role !== 'ADMIN')) return <div className="p-8 text-sm text-slate-600">Checking administrator access…</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE5F5] bg-white p-5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><CalendarDays className="h-6 w-6" /></div><div><h1 className="text-lg font-bold text-[#0E1C30]">All appointment records</h1><p className="text-xs text-slate-500">System-wide, read-only appointment, payment, and consultation status.</p></div></div>
        <button type="button" onClick={() => { setLoading(true); setError(null); void loadAppointments(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">Read-only system-wide appointment records. Patients and assigned clinicians join live consultations from their own accounts.</div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loading ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">Loading appointment records…</div>
        : appointments.length === 0 ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-8 text-center text-sm text-slate-600">No appointments have been scheduled.</div>
          : <div className="grid gap-4">{appointments.map((appointment) => <article key={appointment.id} className="rounded-2xl border border-[#DCE5F5] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{appointment.patient.fullName} <span className="font-mono text-xs font-medium text-slate-500">· {appointment.patient.mrn}</span></h2><p className="mt-1 text-xs text-slate-600">{appointment.type.replaceAll('_', ' ')} · {appointment.locationOrService}</p><p className="mt-1 text-xs text-slate-500">{new Date(appointment.scheduledStartTime).toLocaleString()} – {new Date(appointment.scheduledEndTime).toLocaleTimeString()}</p></div><div className="flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{appointment.status}</span>{appointment.teleSession && <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-800">Room {appointment.teleSession.status}</span>}</div></div>
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3"><div><span className="font-semibold text-slate-500">Care plan</span><div>{appointment.plan.title} · {appointment.plan.status}</div></div><div><span className="font-semibold text-slate-500">Assigned clinician</span><div>{appointment.plan.approvedByClinician || 'Not assigned'}</div></div><div><span className="font-semibold text-slate-500">Consultation record</span><div>{appointment.outcomeRecord ? `Completed ${new Date(appointment.outcomeRecord.completedAt).toLocaleString()}` : 'No outcome recorded'}</div></div></div>
            {appointment.paymentOrders.length > 0 && <div className="mt-3 border-t border-slate-100 pt-3 text-xs"><span className="font-semibold text-slate-500">Payments</span>{appointment.paymentOrders.map((payment: any) => <p key={payment.id} className="mt-1">₹{(payment.amount / 100).toFixed(2)} {payment.currency} · {payment.status} · {payment.receipt}</p>)}</div>}
          </article>)}</div>}
    </div>
  );
}
