'use client';

import React from 'react';
import TravelOptimizationDashboard from '@/components/travel/TravelOptimizationDashboard';
import { Compass } from 'lucide-react';

export default function TravelApprovalsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
          <Compass className="w-4 h-4" />
          <span>Travel Options • Administrative Approvals</span>
          <span>•</span>
          <span>Clinician Approvals</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Travel Optimization &amp; Care Transfer Approvals
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Review transit costs, travel hours, and local provider alternatives for recovering patients. Confirms safety criteria before approving local care substitution.
        </p>
      </div>

      <TravelOptimizationDashboard initialPatientId="pt-101" />
    </div>
  );
}
