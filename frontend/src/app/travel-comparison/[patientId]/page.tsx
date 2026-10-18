import React from 'react';
import TravelOptimizationDashboard from '@/components/travel/TravelOptimizationDashboard';

interface PageProps {
  params: Promise<{ patientId: string }>;
}

export default async function TravelComparisonPatientPage({ params }: PageProps) {
  const resolvedParams = await params;
  const patientId = resolvedParams.patientId;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
          <span>Travel Options</span>
          <span>•</span>
          <span>Clinical Safety &amp; Transit Optimization</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Transit Optimization &amp; Safety Escalation Matrix
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Active Patient Assessment: <strong className="text-white font-mono">{patientId}</strong>.
          Evaluates multimodal travel burden vs. accredited local follow-up clinics, enforcing emergency hospital escalation when surgical red flags are present.
        </p>
      </div>

      <TravelOptimizationDashboard initialPatientId={patientId} />
    </div>
  );
}
