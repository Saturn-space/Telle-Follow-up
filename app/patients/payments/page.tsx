'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PaymentStatusView } from '@/components/billing/PaymentStatusView';

export default function PatientPaymentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!user?.patientId) return () => { active = false; };
    fetch(`/api/integration/cross-module?patientId=${encodeURIComponent(user.patientId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Your saved care plan could not be loaded.');
        const available = (result.data.member5_orchestration?.plans || []).find((item: any) => item.appointments?.length);
        if (active) setPlan(available || null);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Your saved care plan could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.patientId, authLoading]);

  return (
    <div className="min-h-screen bg-[#F6F8FF]">
      <main className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-[#DCE5F5] bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700"><CreditCard className="h-6 w-6" /></div>
            <div><h1 className="text-lg font-bold text-[#0E1C30]">Billing &amp; Payment</h1><p className="text-xs text-slate-500">Payments are available only for saved care plans and appointments.</p></div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl space-y-5 p-6">
          {authLoading || (Boolean(user?.patientId) && loading) ? <div className="rounded-2xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">Loading saved care details…</div>
            : !user?.patientId ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">A patient profile is not linked to this account.</div>
            : error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error}</div>
              : plan ? <PaymentStatusView plan={plan} />
                : <div className="rounded-2xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">No care plan with a scheduled appointment is available for payment.</div>}
        </div>
      </main>
    </div>
  );
}
